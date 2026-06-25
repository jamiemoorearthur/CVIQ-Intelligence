import hashlib
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import health, review, upload, knowledge_base, download, auth, testimonials
from app.core.config import settings
from app.ingestion.chunker import chunk_text
from app.embeddings.embedder import embed_texts
from app.vectorstore.chroma import get_collection, add_documents
KNOWLEDGE_BASE_DIR = Path("knowledge_base")
COLLECTION_NAME = "knowledge_base"


def _load_knowledge_base() -> None:
    """Read all markdown files, chunk them, embed them, and store in ChromaDB.

    Uses document IDs to skip files that are already loaded — safe to call on
    every startup without re-embedding everything each time.
    """
    collection = get_collection(COLLECTION_NAME)

    for md_file in KNOWLEDGE_BASE_DIR.glob("*.md"):
        raw = md_file.read_text(encoding="utf-8")
        doc_hash = hashlib.sha256(raw.encode()).hexdigest()
        chunks = chunk_text(raw)

        ids = [f"{md_file.stem}_{i}" for i in range(len(chunks))]

        existing = set(collection.get(ids=ids)["ids"])
        new_ids = [id_ for id_ in ids if id_ not in existing]
        new_chunks = [chunks[ids.index(id_)] for id_ in new_ids]

        if not new_chunks:
            continue

        ingested_at = datetime.now(timezone.utc).isoformat()
        metadatas = [
            {
                "source": md_file.name,
                "doc_hash": doc_hash,
                "chunk_index": ids.index(id_),
                "ingested_at": ingested_at,
            }
            for id_ in new_ids
        ]

        embeddings = embed_texts(new_chunks)
        add_documents(collection, new_chunks, embeddings, new_ids, metadatas)
        print(f"Loaded {len(new_chunks)} chunks from {md_file.name} (hash={doc_hash[:8]})")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Runs once when the server starts — load knowledge base into ChromaDB
    _load_knowledge_base()
    yield
    # Anything after yield runs on shutdown (nothing needed here)


app = FastAPI(title="CV Reviewer API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(testimonials.router)
app.include_router(upload.router)
app.include_router(review.router)
app.include_router(download.router)
app.include_router(knowledge_base.router)

@app.get("/")
def root():
    return {"message": "CV Reviewer API is running"}
