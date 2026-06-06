from langfuse import Langfuse
from app.core.config import settings
from app.rag.retriever import retrieve_context
from app.rag.generator import generate_review

langfuse = Langfuse(
    public_key=settings.langfuse_public_key,
    secret_key=settings.langfuse_secret_key,
    host=settings.langfuse_host,
) if settings.langfuse_public_key else None


def run_review_pipeline(cv_text: str, job_description: str) -> dict:
    trace = langfuse.trace(
        name="cv-review",
        metadata={"cv_chars": len(cv_text), "jd_chars": len(job_description)},
    ) if langfuse else None

    query = f"{cv_text[:1000]}\n\n{job_description[:500]}"
    context_chunks = retrieve_context(query, n_results=6, trace=trace)
    result = generate_review(cv_text, job_description, context_chunks, trace=trace)

    if trace:
        trace.update(output={"overall_score": result.get("overall_score")})

    return result
