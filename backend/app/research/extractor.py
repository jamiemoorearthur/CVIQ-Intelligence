import re
import json
import anthropic
from app.core.config import settings


def extract_company_and_role(job_description: str) -> dict:
    """
    LangGraph node: extract.
    Uses Claude Haiku to pull the company name and role title from the JD.
    Returns {"company": str|None, "role": str|None}.
    """
    if not settings.anthropic_api_key:
        return {"company": None, "role": None}

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    try:
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=100,
            messages=[{
                "role": "user",
                "content": (
                    "Extract the company name and job title from this job description. "
                    "Return ONLY a JSON object with keys \"company\" and \"role\". "
                    "If either cannot be determined, use null.\n\n"
                    f"Job description:\n{job_description[:2000]}"
                ),
            }],
        )
        text = message.content[0].text.strip()
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            return json.loads(match.group())
    except Exception as e:
        print(f"[research-agent] extraction failed: {e}")

    return {"company": None, "role": None}
