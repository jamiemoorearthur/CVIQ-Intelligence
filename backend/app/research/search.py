from tavily import TavilyClient
from app.core.config import settings


def search_company_role(company: str | None, role: str | None) -> list[str]:
    """
    LangGraph node: search.
    Runs up to 2 Tavily searches and returns raw content strings.
    """
    if not settings.tavily_api_key:
        print("[research-agent] TAVILY_API_KEY not set — skipping search")
        return []

    client = TavilyClient(api_key=settings.tavily_api_key)

    queries = []
    if company and role:
        queries.append(f"{company} {role} requirements skills tech stack")
        queries.append(f"{company} engineering culture interview process")
    elif company:
        queries.append(f"{company} engineering team culture tech stack")
    elif role:
        queries.append(f"{role} requirements skills experience 2025")

    results = []
    for query in queries[:2]:
        try:
            response = client.search(query, max_results=3)
            for r in response.get("results", []):
                if r.get("content"):
                    results.append(r["content"])
        except Exception as e:
            print(f"[research-agent] search failed for '{query}': {e}")

    return results
