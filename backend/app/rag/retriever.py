from app.embeddings.embedder import embed_single
from app.vectorstore.chroma import get_collection, query_collection

KNOWLEDGE_BASE_COLLECTION = "knowledge_base"


def retrieve_context(query: str, n_results: int = 6, trace=None) -> list[str]:
    span = trace.span(name="retrieval") if trace else None
    collection = get_collection(KNOWLEDGE_BASE_COLLECTION)
    query_embedding = embed_single(query)
    chunks = query_collection(collection, query_embedding, n_results=n_results)
    if span:
        span.end(output={"chunks_retrieved": len(chunks)})
    return chunks
