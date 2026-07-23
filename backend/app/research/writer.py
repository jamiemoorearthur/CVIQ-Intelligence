import hashlib
import threading
from datetime import datetime, timezone

from app.embeddings.embedder import embed_texts
from app.vectorstore.chroma import get_collection, add_documents

KNOWLEDGE_BASE_COLLECTION = "knowledge_base"


def already_researched(company: str) -> bool:
    """Return True if we already have research chunks for this company in the KB."""
    if not company:
        return False
    try:
        collection = get_collection(KNOWLEDGE_BASE_COLLECTION)
        results = collection.get(
            where={"company": {"$eq": company.lower()}},
            limit=1,
        )
        return len(results["ids"]) > 0
    except Exception:
        return False


def write_chunks_to_kb(chunks: list[str], company: str | None, role: str | None) -> None:
    """Embed and upsert research chunks into ChromaDB with source metadata."""
    if not chunks:
        return
    try:
        embeddings = embed_texts(chunks)
        collection = get_collection(KNOWLEDGE_BASE_COLLECTION)
        timestamp = datetime.now(timezone.utc).isoformat()

        ids, metadatas = [], []
        for i, chunk in enumerate(chunks):
            chunk_hash = hashlib.sha256(chunk.encode()).hexdigest()[:16]
            ids.append(f"research_{chunk_hash}_{i}")
            metadatas.append({
                "source": "research_agent",
                "company": company.lower() if company else "unknown",
                "role": role.lower() if role else "unknown",
                "ingested_at": timestamp,
            })

        add_documents(collection, chunks, embeddings, ids, metadatas)
        print(f"[research-agent] wrote {len(chunks)} chunks company={company} role={role}")
    except Exception as e:
        print(f"[research-agent] KB write failed: {e}")


def write_chunks_background(chunks: list[str], company: str | None, role: str | None) -> None:
    """Fire-and-forget: write chunks to ChromaDB in a daemon thread."""
    t = threading.Thread(target=write_chunks_to_kb, args=(chunks, company, role), daemon=True)
    t.start()
