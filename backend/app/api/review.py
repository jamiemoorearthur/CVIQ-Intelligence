import re
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends

from app.ingestion.loader import load_text_from_bytes
from app.rag.pipeline import run_review_pipeline
from app.review.scorer import validate_and_clean
from app.Models.cv_models import ReviewResponse
from app.core.exceptions import CVReviewerError
from app.core.auth import get_current_user, get_user_tier

router = APIRouter()

# ── Input gate limits ────────────────────────────────────────────────────────
MAX_CV_CHARS = 15_000
MAX_JD_CHARS = 5_000

# ── Prompt injection patterns ────────────────────────────────────────────────
_INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|rules?)",
    r"disregard\s+(all\s+)?(previous|system)\s+(instructions?|prompts?|rules?)",
    r"forget\s+(everything|all|previous|your\s+instructions?)",
    r"override\s+(your\s+)?(system\s+)?(prompt|instructions?)",
    r"reveal\s+(your\s+)?(system\s+)?prompt",
    r"you\s+are\s+now\s+a",
    r"new\s+(system\s+)?persona",
    r"pretend\s+(you\s+are|to\s+be)",
]

# ── Presidio PII detection ───────────────────────────────────────────────────
_pii_analyzer = None
try:
    from presidio_analyzer import AnalyzerEngine
    from presidio_analyzer.nlp_engine import NlpEngineProvider
    _nlp_engine = NlpEngineProvider(nlp_configuration={
        "nlp_engine_name": "spacy",
        "models": [{"lang_code": "en", "model_name": "en_core_web_sm"}],
    }).create_engine()
    _pii_analyzer = AnalyzerEngine(nlp_engine=_nlp_engine, supported_languages=["en"])
    print("[pii-gate] Presidio analyzer initialized")
except BaseException as e:
    print(f"[pii-gate] Presidio not available: {e}")


def _check_prompt_injection(text: str, source: str) -> None:
    lower = text.lower()
    for pattern in _INJECTION_PATTERNS:
        if re.search(pattern, lower):
            print(f"[guardrail] gate=input reason=prompt_injection source={source}")
            raise HTTPException(status_code=400, detail="Input contains disallowed content.")


def _check_length(text: str, max_chars: int, source: str) -> None:
    if len(text) > max_chars:
        print(f"[guardrail] gate=input reason=length_exceeded source={source} chars={len(text)} limit={max_chars}")
        raise HTTPException(
            status_code=400,
            detail=f"{source.upper()} exceeds maximum length of {max_chars} characters.",
        )


def _detect_pii(text: str) -> None:
    if not _pii_analyzer:
        return
    try:
        results = _pii_analyzer.analyze(text=text, language="en")
        if results:
            entity_types = sorted({r.entity_type for r in results})
            print(f"[guardrail] gate=input reason=pii_detected entities={entity_types} count={len(results)}")
    except Exception:
        pass



@router.post("/review", response_model=ReviewResponse)
async def review_cv(
    cv_file: UploadFile = File(...),
    job_description: str = Form(...),
    user: Optional[dict] = Depends(get_current_user),
):
    file_bytes = await cv_file.read()

    try:
        cv_text = load_text_from_bytes(file_bytes, cv_file.filename)
    except CVReviewerError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # ── Input gate ────────────────────────────────────────────────────────────
    _check_length(cv_text, MAX_CV_CHARS, "cv")
    _check_length(job_description, MAX_JD_CHARS, "jd")
    _check_prompt_injection(cv_text, "cv")
    _check_prompt_injection(job_description, "jd")
    _detect_pii(cv_text)

    # ── Pipeline ──────────────────────────────────────────────────────────────
    tier = get_user_tier(user)
    try:
        raw_review = run_review_pipeline(cv_text, job_description, tier=tier)
    except CVReviewerError as e:
        raise HTTPException(status_code=500, detail=str(e))

    # ── Output gate ───────────────────────────────────────────────────────────
    cleaned = validate_and_clean(raw_review)

    return cleaned
