import chromadb

# One persistent client shared across the app — data survives restarts
_client = chromadb.PersistentClient(path="data/chroma")


def get_collection(name: str) -> chromadb.Collection:
    # get_or_create means it's safe to call this multiple times without error
    return _client.get_or_create_collection(
        name=name,
        metadata={"hnsw:space": "cosine"},  # cosine similarity for semantic search
    )


def add_documents(
    collection: chromadb.Collection,
    texts: list[str],
    embeddings: list[list[float]],
    ids: list[str],
    metadatas: list[dict] | None = None,
) -> None:
    collection.add(
        documents=texts,
        embeddings=embeddings,
        ids=ids,
        metadatas=metadatas,
    )


def delete_by_source(
    collection: chromadb.Collection,
    source: str,
) -> dict:
    """Delete all chunks whose metadata source field matches `source`.

    Returns a summary dict with the IDs removed and the doc_hash from the
    first matching chunk (all chunks from the same file share the same hash).
    """
    results = collection.get(
        where={"source": {"$eq": source}},
        include=["metadatas"],
    )
    ids = results["ids"]
    if not ids:
        return {"ids_deleted": [], "doc_hash": None}

    doc_hash = (results["metadatas"][0] or {}).get("doc_hash")
    collection.delete(ids=ids)
    return {"ids_deleted": ids, "doc_hash": doc_hash}


def query_collection(
    collection: chromadb.Collection,
    query_embedding: list[float],
    n_results: int = 5,
    where: dict | None = None,
) -> tuple[list[str], list[float]]:
    kwargs: dict = dict(
        query_embeddings=[query_embedding],
        n_results=n_results,
        include=["documents", "distances"],
    )
    if where:
        kwargs["where"] = where
    results = collection.query(**kwargs)
    return results["documents"][0], results["distances"][0]
