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
Allow the AI to fully rewrite the CV to improve it, but do not invent any new information. Only rewrite what is present in the CV.
Review the CV against the job description using the rubric and guidelines above.

Return ONLY a JSON object with this exact structure:

{{
  "overall_score": <integer 0-100>,
  "ats_score": <integer 0-100>,
  "recruiter_score": <integer 0-10>,
  "category_scores": {{
    "role_alignment": <integer 0-100>,
    "skills_match": <integer 0-100>,
    "experience_relevance": <integer 0-100>,
    "ats_keyword_match": <integer 0-100>,
    "bullet_point_quality": <integer 0-100>,
    "structure_readability": <integer 0-100>,
    "missing_evidence": <integer 0-100>
  }},
  "role_alignment": <"Strong" | "Good" | "Moderate" | "Weak">,
  "missing_keywords": [<list of strings>],
  "strengths": [<list of strings, max 4>],
  "weaknesses": [<list of strings, max 4>],
  "section_recommendations": [<list of strings>],
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
- recruiter_score is how likely a recruiter is to shortlist this CV in a 6-second scan (0-10). Weight ATS keyword presence, role alignment, bullet clarity, and quantified achievements most heavily. A 10 means near-certain shortlist; a 0 means immediate rejection.
- category_scores contains the raw score (0-100) for each of the 7 rubric categories before weighting
- missing_keywords must be exact terms from the job description that are absent from the CV
- section_recommendations lists specific sections to add or remove (e.g. "Add a Technical Skills section", "Remove the Hobbies section — not relevant for this role"). Return an empty list if the CV structure is appropriate.
- suggested_bullets must quote exact text from the CV — do not invent bullets
- suggested_bullets count scales with CV quality: return 4-6 for overall_score below 50, 2-3 for 50-74, 0-1 for 75 and above (only if a clearly weak bullet exists)
- Return valid JSON only. No markdown, no explanation, no extra text."""
