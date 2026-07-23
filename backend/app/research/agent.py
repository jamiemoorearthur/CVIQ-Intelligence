"""
Research agent — triggered when RAG retrieval is weak.

Linear pipeline (each function is a future LangGraph node):
  extract -> search -> summarise -> write (background)

Returns chunks ready to inject into the current review context.
The KB write happens in a daemon thread so it does not block the review response.
"""
from app.research.extractor import extract_company_and_role
from app.research.search import search_company_role
from app.research.summariser import summarise_to_chunks
from app.research.writer import already_researched, write_chunks_background


def run_research_agent(job_description: str) -> list[str]:
    print("[research-agent] triggered — weak retrieval detected")

    # Node 1: extract
    extracted = extract_company_and_role(job_description)
    company = extracted.get("company")
    role = extracted.get("role")
    print(f"[research-agent] extracted company={company} role={role}")

    # Skip if we already have KB chunks for this company
    if company and already_researched(company):
        print(f"[research-agent] skipping — {company} already in KB")
        return []

    # Node 2: search
    search_results = search_company_role(company, role)
    if not search_results:
        print("[research-agent] no search results — skipping")
        return []
    print(f"[research-agent] got {len(search_results)} search results")

    # Node 3: summarise
    chunks = summarise_to_chunks(search_results, company, role)
    if not chunks:
        print("[research-agent] summarisation returned no chunks")
        return []
    print(f"[research-agent] produced {len(chunks)} KB chunks")

    # Node 4: write to KB in background, return chunks for immediate use
    write_chunks_background(chunks, company, role)

    return chunks
