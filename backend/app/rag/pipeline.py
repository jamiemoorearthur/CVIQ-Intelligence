from app.core.config import settings
from app.rag.retriever import retrieve_context
from app.rag.generator import generate_review

_langfuse = None

try:
    if settings.langfuse_public_key:
        from langfuse import Langfuse
        _langfuse = Langfuse(
            public_key=settings.langfuse_public_key,
            secret_key=settings.langfuse_secret_key,
            host=settings.langfuse_host,
        )
except Exception:
    pass


def run_review_pipeline(cv_text: str, job_description: str) -> dict:
    trace = None
    try:
        if _langfuse:
            trace = _langfuse.trace(
                name="cv-review",
                metadata={"cv_chars": len(cv_text), "jd_chars": len(job_description)},
            )
    except Exception:
        trace = None

    query = f"{cv_text[:1000]}\n\n{job_description[:500]}"
    context_chunks = retrieve_context(query, n_results=6, trace=trace)
    result = generate_review(cv_text, job_description, context_chunks, trace=trace)

    try:
        if trace:
            trace.update(output={"overall_score": result.get("overall_score")})
    except Exception:
        pass

    return result
