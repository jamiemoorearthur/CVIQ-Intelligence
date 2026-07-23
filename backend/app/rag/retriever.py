import time
from app.embeddings.embedder import embed_single
from app.vectorstore.chroma import get_collection, query_collection

KNOWLEDGE_BASE_COLLECTION = "knowledge_base"
RELEVANCE_THRESHOLD = 0.8


def retrieve_company_chunks(company: str, n_results: int = 3) -> list[str]:
    """Return KB chunks written by the research agent for a specific company."""
    try:
        collection = get_collection(KNOWLEDGE_BASE_COLLECTION)
        results = collection.get(
            where={"company": {"$eq": company.lower()}},
            limit=n_results,
            include=["documents"],
        )
        return results["documents"] or []
    except Exception as e:
        print(f"[retrieval] company metadata fetch failed: {e}")
        return []


def retrieve_context(query: str, n_results: int = 6, trace=None) -> tuple[list[str], bool]:
    """
    Returns (chunks, is_weak).
    is_weak=True when more than half the chunks are dropped or fewer than 2 survive —
    this signals the research agent to fetch external context.
    """
    t0 = time.perf_counter()
    span = trace.span(name="retrieval") if trace else None

    collection = get_collection(KNOWLEDGE_BASE_COLLECTION)
    query_embedding = embed_single(query)
    chunks, distances = query_collection(collection, query_embedding, n_results=n_results)

    filtered = [c for c, d in zip(chunks, distances) if d <= RELEVANCE_THRESHOLD]
    dropped = len(chunks) - len(filtered)
    is_weak = dropped > n_results // 2 or len(filtered) < 2
    elapsed_ms = (time.perf_counter() - t0) * 1000

    if dropped:
        print(
            f"[guardrail] gate=retrieval reason=relevance_threshold "
            f"dropped={dropped} threshold={RELEVANCE_THRESHOLD}"
        )
    print(
        f"[retrieval] chunks={len(chunks)} kept={len(filtered)} "
        f"weak={is_weak} latency={elapsed_ms:.0f}ms"
    )

    if span:
        span.end(output={
            "chunks_retrieved": len(chunks),
            "chunks_after_threshold": len(filtered),
            "chunks_dropped": dropped,
            "is_weak": is_weak,
        }, metadata={"latency_ms": round(elapsed_ms)})

    return filtered, is_weak
