from app.review.rubric import RUBRIC_WEIGHTS, VALID_ROLE_ALIGNMENT_LABELS

_CATEGORY_KEYS = list(RUBRIC_WEIGHTS.keys())


def validate_and_clean(raw: dict) -> dict:
    """Clamp scores to 0–100 and normalise any fields GPT may have returned incorrectly."""

    # Clamp scores to their valid ranges
    raw["overall_score"] = max(0, min(100, int(raw.get("overall_score", 0))))
    raw["ats_score"] = max(0, min(100, int(raw.get("ats_score", 0))))
    raw["recruiter_score"] = max(0, min(10, int(raw.get("recruiter_score", 0))))

    # Clamp each category score; default to 0 if GPT omitted any key
    cat = raw.get("category_scores") or {}
    raw["category_scores"] = {
        k: max(0, min(100, int(cat.get(k, 0)))) for k in _CATEGORY_KEYS
    }

    # If GPT returned an unexpected label, default to "Moderate"
    if raw.get("role_alignment") not in VALID_ROLE_ALIGNMENT_LABELS:
        raw["role_alignment"] = "Moderate"

    # Ensure list fields are always lists
    raw["missing_keywords"] = raw.get("missing_keywords") or []
    raw["strengths"] = raw.get("strengths") or []
    raw["weaknesses"] = raw.get("weaknesses") or []
    raw["section_recommendations"] = raw.get("section_recommendations") or []
    raw["suggested_bullets"] = raw.get("suggested_bullets") or []

    # Ensure recruiter_reasoning is always a string
    raw["recruiter_reasoning"] = raw.get("recruiter_reasoning") or ""

    # Ensure category_breakdowns has all 7 keys with valid structure
    _blank_breakdown = {"explanation": "", "what_is_weak": "", "how_to_improve": ""}
    breakdowns = raw.get("category_breakdowns") or {}
    raw["category_breakdowns"] = {
        k: breakdowns.get(k) or _blank_breakdown for k in _CATEGORY_KEYS
    }

    return raw
