import time
import logging
from app.core.config import settings
from app.rag.retriever import retrieve_context, retrieve_company_chunks
from app.rag.generator import generate_review
from app.research.agent import run_research_agent
from app.research.extractor import extract_company_and_role
from app.research.writer import already_researched

logger = logging.getLogger(__name__)

_PIPELINE_LATENCY_ALERT_MS = 15_000  # alert if full pipeline (retrieval + inference) exceeds 15 s

_langfuse = None

try:
    if settings.langfuse_public_key:
        from langfuse import Langfuse
        _langfuse = Langfuse(
            public_key=settings.langfuse_public_key,
            secret_key=settings.langfuse_secret_key,
            host=settings.langfuse_host,
        )
except Exception as e:
    logger.warning(f"Langfuse init failed: {e}")


def run_review_pipeline(cv_text: str, job_description: str, tier: str = "paid") -> dict:
    t0 = time.perf_counter()
    trace = None
    try:
        if _langfuse:
            from app.rag.prompts import PROMPT_VERSION
            trace = _langfuse.trace(
                name="cv-review",
                metadata={
                    "cv_chars": len(cv_text),
                    "jd_chars": len(job_description),
                    "prompt_version": PROMPT_VERSION,
                },
            )
    except Exception as e:
        logger.warning(f"Langfuse trace failed: {e}")
        trace = None

    query = f"{cv_text[:1000]}\n\n{job_description[:500]}"
    context_chunks, is_weak = retrieve_context(query, n_results=6, trace=trace)

    # Extract company name cheaply — drives both the trigger and metadata retrieval
    meta = extract_company_and_role(job_description)
    company = meta.get("company")

    company_in_kb = bool(company and already_researched(company))
    should_research = is_weak or (company and not company_in_kb)

    if should_research:
        print(f"[pipeline] research trigger: is_weak={is_weak} company={company} in_kb={company_in_kb}")
        research_chunks = run_research_agent(job_description)
        if research_chunks:
            # Fresh research chunks first — most specific context at the top
            context_chunks = research_chunks + context_chunks
    elif company_in_kb:
        # Company already in KB: surface its chunks via metadata filter, not just cosine distance
        company_chunks = retrieve_company_chunks(company, n_results=3)
        if company_chunks:
            print(f"[pipeline] metadata retrieval: {len(company_chunks)} chunks for {company}")
            # Company-specific chunks first, keep 3 general chunks for broader advice
            context_chunks = company_chunks + context_chunks[:3]

    result = generate_review(cv_text, job_description, context_chunks, trace=trace, tier=tier)

    total_ms = (time.perf_counter() - t0) * 1000
    print(f"[pipeline] total_latency={total_ms:.0f}ms")

    if total_ms > _PIPELINE_LATENCY_ALERT_MS:
        print(f"[alert] type=pipeline_latency_spike total_ms={total_ms:.0f} threshold={_PIPELINE_LATENCY_ALERT_MS}ms")
        try:
            if trace:
                trace.event(name="pipeline_latency_spike", metadata={"total_ms": round(total_ms), "threshold_ms": _PIPELINE_LATENCY_ALERT_MS})
        except Exception:
            pass

    try:
        if trace:
            trace.update(output={
                "overall_score": result.get("overall_score"),
            }, metadata={"total_latency_ms": round(total_ms)})
    except Exception as e:
        logger.warning(f"Langfuse trace update failed: {e}")

    return result
