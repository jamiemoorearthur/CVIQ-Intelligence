from pathlib import Path
from app.core.config import settings

_PROMPTS_DIR = Path(__file__).parent.parent.parent / "prompts"

PROMPT_VERSION = settings.prompt_version

def _load_system_prompt() -> str:
    path = _PROMPTS_DIR / f"system_{PROMPT_VERSION}.txt"
    return path.read_text(encoding="utf-8").strip()

SYSTEM_PROMPT = _load_system_prompt()


def build_review_prompt(cv_text: str, job_description: str, context_chunks: list[str]) -> str:
    context = "\n\n---\n\n".join(context_chunks)

    return f"""## Knowledge Base Context

{context}

---

## CV Submitted for Review

{cv_text}

---

## Job Description

{job_description}

---

## Task

Review the CV against the job description using the rubric and guidelines above.

Return ONLY a JSON object with this exact structure:

{{
  "overall_score": <integer 0-100>,
  "ats_score": <integer 0-100>,
  "role_alignment": <"Strong" | "Good" | "Moderate" | "Weak">,
  "missing_keywords": [<list of strings>],
  "strengths": [<list of strings, max 4>],
  "weaknesses": [<list of strings, max 4>],
  "suggested_bullets": [
    {{
      "original": "<exact text of a weak bullet from the CV>",
      "improved": "<rewritten version following Action + Task + Result format>"
    }}
  ]
}}

Rules:
- overall_score is the weighted average across all 7 rubric categories
- ats_score is specifically the ATS keyword match score
- missing_keywords must be exact terms from the job description that are absent from the CV
- suggested_bullets must quote exact text from the CV — do not invent bullets
- Return at least 2 suggested_bullets if any weak bullets exist
- Return valid JSON only. No markdown, no explanation, no extra text."""
