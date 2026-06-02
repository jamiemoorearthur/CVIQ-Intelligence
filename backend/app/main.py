from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import health, review, upload
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
        text = md_file.read_text(encoding="utf-8")
        chunks = chunk_text(text)

        # Build a unique ID for each chunk: filename + chunk index
        ids = [f"{md_file.stem}_{i}" for i in range(len(chunks))]

        # Check which IDs are already in the collection — skip those
        existing = set(collection.get(ids=ids)["ids"])
        new_ids = [id_ for id_ in ids if id_ not in existing]
        new_chunks = [chunks[ids.index(id_)] for id_ in new_ids]

        if not new_chunks:
            continue  # all chunks from this file are already stored

        embeddings = embed_texts(new_chunks)
        add_documents(collection, new_chunks, embeddings, new_ids)
        print(f"Loaded {len(new_chunks)} chunks from {md_file.name}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Runs once when the server starts — load knowledge base into ChromaDB
    _load_knowledge_base()
    yield
    # Anything after yield runs on shutdown (nothing needed here)


app = FastAPI(title="CV Reviewer API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(upload.router)
app.include_router(review.router)


@app.get("/")
def root():
    return {"message": "CV Reviewer API is running"}
