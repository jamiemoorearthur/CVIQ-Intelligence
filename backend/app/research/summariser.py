import anthropic
from app.core.config import settings


def summarise_to_chunks(
    search_results: list[str],
    company: str | None,
    role: str | None,
) -> list[str]:
    """
    LangGraph node: summarise.
    Uses Claude Haiku to turn raw search results into structured KB chunks.
    Returns a list of paragraph-length strings ready for embedding.
    """
    if not search_results or not settings.anthropic_api_key:
        return []

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    company_label = company or "this company"
    role_label = role or "this role"
    combined = "\n\n".join(search_results[:5])

    prompt = (
        f"You are building a knowledge base for a CV review system. "
        f"Based on the search results below about {company_label} and the {role_label} role, "
        f"write 3-5 concise factual knowledge base entries that would help evaluate a candidate's CV.\n\n"
        f"Focus on: required technical skills and tools, company culture and values, "
        f"role-specific responsibilities, and industry context.\n\n"
        f"Write each entry as a separate paragraph. Be specific and factual. "
        f"Do not include preamble, numbering, or headers.\n\n"
        f"Search results:\n{combined[:4000]}"
    )

    try:
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=800,
            messages=[{"role": "user", "content": prompt}],
        )
        text = message.content[0].text.strip()
        chunks = [p.strip() for p in text.split("\n\n") if p.strip() and len(p.strip()) > 50]
        return chunks
    except Exception as e:
        print(f"[research-agent] summarisation failed: {e}")
        return []
