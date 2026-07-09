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
  "category_breakdowns": {{
    "role_alignment": {{
      "explanation": "<why this score — reference specific CV content>",
      "what_is_weak": "<what specifically lets this category down>",
      "how_to_improve": "<concrete action to raise the score>"
    }},
    "skills_match": {{
      "explanation": "<why this score>",
      "what_is_weak": "<what is weak>",
      "how_to_improve": "<how to improve>"
    }},
    "experience_relevance": {{
      "explanation": "<why this score>",
      "what_is_weak": "<what is weak>",
      "how_to_improve": "<how to improve>"
    }},
    "ats_keyword_match": {{
      "explanation": "<why this score>",
      "what_is_weak": "<what is weak>",
      "how_to_improve": "<how to improve>"
    }},
    "bullet_point_quality": {{
      "explanation": "<why this score>",
      "what_is_weak": "<what is weak>",
      "how_to_improve": "<how to improve>"
    }},
    "structure_readability": {{
      "explanation": "<why this score>",
      "what_is_weak": "<what is weak>",
      "how_to_improve": "<how to improve>"
    }},
    "missing_evidence": {{
      "explanation": "<why this score>",
      "what_is_weak": "<what is weak>",
      "how_to_improve": "<how to improve>"
    }}
  }},
  "recruiter_reasoning": "<2-3 sentences written as a recruiter explaining your overall impression, referencing specific CV content. Be direct — would you shortlist this candidate and why?>",
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
- recruiter_score is how likely a recruiter is to shortlist this CV in a 6-second scan (0-10)
- category_scores contains the raw score (0-100) for each of the 7 rubric categories
- category_breakdowns must reference specific content from the CV — never give generic advice
- recruiter_reasoning must be written in first person as a recruiter, referencing specific CV lines or sections
- missing_keywords must be exact terms from the job description that are absent from the CV
- section_recommendations lists specific sections to add or remove. Return empty list if structure is appropriate.
- suggested_bullets must quote exact text from the CV — do not invent bullets
- suggested_bullets count: 4-6 for overall_score below 50, 2-3 for 50-74, 0-1 for 75 and above
- Return valid JSON only. No markdown, no explanation, no extra text."""
