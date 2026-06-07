"""
Retrieval regression tests.

Uses an in-memory ChromaDB collection with controlled embeddings to verify
the retrieval pipeline returns the right results and applies the relevance
threshold correctly. No OpenAI calls are made.
"""
import uuid
import chromadb
import pytest
from unittest.mock import patch

from app.vectorstore.chroma import add_documents, query_collection
from app.rag.retriever import retrieve_context, RELEVANCE_THRESHOLD

# Small fixed dimension — enough to control cosine distances precisely.
_DIMS = 8


def _unit(index: int) -> list[float]:
    """Unit vector with 1.0 at position `index`, 0.0 elsewhere."""
    v = [0.0] * _DIMS
    v[index] = 1.0
    return v


def _make_collection(chunks: list[str], embeddings: list[list[float]]) -> chromadb.Collection:
    """Fresh in-memory ChromaDB collection with known chunks and embeddings.

    Uses a unique collection name per call because EphemeralClient shares
    in-memory state across the whole test process — reusing the same name
    would cause ID conflicts between tests.
    """
    client = chromadb.EphemeralClient()
    collection = client.get_or_create_collection(
        name=f"test_{uuid.uuid4().hex}",
        metadata={"hnsw:space": "cosine"},
    )
    ids = [f"chunk_{i}" for i in range(len(chunks))]
    add_documents(collection, chunks, embeddings, ids)
    return collection


# ── query_collection ─────────────────────────────────────────────────────────

def test_query_returns_closest_chunk():
    """The chunk whose embedding matches the query exactly should come first."""
    chunks = ["Python FastAPI guide", "React TypeScript tutorial", "PostgreSQL schema design"]
    embeddings = [_unit(0), _unit(1), _unit(2)]
    collection = _make_collection(chunks, embeddings)

    results, distances = query_collection(collection, _unit(0), n_results=1)

    assert results[0] == "Python FastAPI guide"
    assert distances[0] < 0.01  # near-zero = perfect cosine match


def test_query_returns_n_results():
    """query_collection should return exactly n_results chunks."""
    chunks = [f"chunk {i}" for i in range(5)]
    embeddings = [_unit(i) for i in range(5)]
    collection = _make_collection(chunks, embeddings)

    results, distances = query_collection(collection, _unit(0), n_results=3)

    assert len(results) == 3
    assert len(distances) == 3


def test_query_results_ordered_by_distance():
    """Results must be ordered by distance ascending (closest first)."""
    chunks = ["exact match", "partial match", "no match"]
    embeddings = [_unit(0), _unit(0), _unit(1)]  # first two match query, third doesn't
    collection = _make_collection(chunks, embeddings)

    _, distances = query_collection(collection, _unit(0), n_results=3)

    assert distances[0] <= distances[1] <= distances[2]


# ── relevance threshold (retrieve_context) ───────────────────────────────────

def test_threshold_drops_distant_chunks():
    """Chunks with cosine distance > RELEVANCE_THRESHOLD must be filtered out."""
    # _unit(0) vs _unit(0) → distance ≈ 0.0 (kept)
    # _unit(0) vs _unit(1) → distance ≈ 1.0 (dropped — orthogonal vectors)
    chunks = ["relevant chunk", "irrelevant chunk"]
    embeddings = [_unit(0), _unit(1)]
    collection = _make_collection(chunks, embeddings)

    with patch("app.rag.retriever.get_collection", return_value=collection):
        with patch("app.rag.retriever.embed_single", return_value=_unit(0)):
            results = retrieve_context("any query", n_results=2)

    assert "relevant chunk" in results
    assert "irrelevant chunk" not in results


def test_threshold_keeps_all_close_chunks():
    """All chunks below the distance threshold should be returned."""
    chunks = ["chunk A", "chunk B", "chunk C"]
    embeddings = [_unit(0), _unit(0), _unit(0)]  # all identical to query
    collection = _make_collection(chunks, embeddings)

    with patch("app.rag.retriever.get_collection", return_value=collection):
        with patch("app.rag.retriever.embed_single", return_value=_unit(0)):
            results = retrieve_context("any query", n_results=3)

    assert len(results) == 3


def test_threshold_returns_empty_when_all_filtered():
    """If every chunk exceeds the threshold, retrieve_context returns []."""
    chunks = ["far chunk A", "far chunk B"]
    embeddings = [_unit(1), _unit(2)]  # both orthogonal to query → distance ≈ 1.0
    collection = _make_collection(chunks, embeddings)

    with patch("app.rag.retriever.get_collection", return_value=collection):
        with patch("app.rag.retriever.embed_single", return_value=_unit(0)):
            results = retrieve_context("any query", n_results=2)

    assert results == []


def test_threshold_value_is_not_changed():
    """Guard against accidental threshold changes — expected value is 0.8."""
    assert RELEVANCE_THRESHOLD == 0.8
