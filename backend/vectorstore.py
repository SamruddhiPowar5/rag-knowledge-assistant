import os
from typing import List, Dict, Any, Optional
from pinecone import Pinecone, ServerlessSpec
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

# ── Setup ──────────────────────────────────────────────────────────────────────

PINECONE_API_KEY    = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "rag-knowledge-base")
OPENAI_API_KEY      = os.getenv("OPENAI_API_KEY")
EMBEDDING_MODEL     = "text-embedding-3-small"
DIMENSION           = 1536

openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)

# Connect to Pinecone
pc = Pinecone(api_key=PINECONE_API_KEY)
existing = [i.name for i in pc.list_indexes()]
if PINECONE_INDEX_NAME not in existing:
    pc.create_index(
        name=PINECONE_INDEX_NAME,
        dimension=DIMENSION,
        metric="cosine",
        spec=ServerlessSpec(cloud="aws", region="us-east-1"),
    )
index = pc.Index(PINECONE_INDEX_NAME)


# ── Helper ─────────────────────────────────────────────────────────────────────

async def _embed(texts: List[str]) -> List[List[float]]:
    """Convert a list of strings into embedding vectors."""
    response = await openai_client.embeddings.create(model=EMBEDDING_MODEL, input=texts)
    return [item.embedding for item in response.data]


# ── Public Functions ───────────────────────────────────────────────────────────

async def store_document(processed_doc: dict) -> str:
    """Save all chunks of a document into Pinecone."""
    chunks = processed_doc["chunks"]
    doc_id = processed_doc["document_id"]

    # Process in batches of 100
    for i in range(0, len(chunks), 100):
        batch = chunks[i:i + 100]
        texts = [c["content"] for c in batch]
        embeddings = await _embed(texts)

        vectors = []
        for chunk, embedding in zip(batch, embeddings):
            vectors.append({
                "id": chunk["chunk_id"],
                "values": embedding,
                "metadata": {
                    "document_id": doc_id,
                    "filename": chunk["filename"],
                    "content": chunk["content"],
                    "chunk_index": chunk["chunk_index"],
                    "total_chunks": chunk["total_chunks"],
                },
            })
        index.upsert(vectors=vectors)

    return doc_id


async def search_documents(query: str, top_k: int = 5) -> List[Dict]:
    """Find the most relevant chunks for a query."""
    query_embedding = await _embed([query])

    results = index.query(vector=query_embedding[0], top_k=top_k, include_metadata=True)

    chunks = []
    for match in results.matches:
        chunks.append({
            "chunk_id":   match.id,
            "score":      match.score,
            "content":    match.metadata.get("content", ""),
            "filename":   match.metadata.get("filename", ""),
            "document_id": match.metadata.get("document_id", ""),
            "chunk_index": match.metadata.get("chunk_index", 0),
        })
    return chunks


async def list_all_documents() -> List[Dict]:
    """Return a list of unique documents stored in Pinecone."""
    dummy = [0.0] * DIMENSION
    results = index.query(vector=dummy, top_k=10000, include_metadata=True)

    seen = {}
    for match in results.matches:
        doc_id = match.metadata.get("document_id")
        if doc_id and doc_id not in seen:
            seen[doc_id] = {
                "document_id":  doc_id,
                "filename":     match.metadata.get("filename", "Unknown"),
                "total_chunks": match.metadata.get("total_chunks", 0),
            }
    return list(seen.values())


async def delete_document_by_id(document_id: str):
    """Delete all vectors for a given document."""
    dummy = [0.0] * DIMENSION
    results = index.query(
        vector=dummy,
        top_k=10000,
        include_metadata=True,
        filter={"document_id": {"$eq": document_id}},
    )
    ids = [m.id for m in results.matches]
    if ids:
        index.delete(ids=ids)


async def get_index_stats() -> Dict:
    """Return basic stats about the Pinecone index."""
    stats = index.describe_index_stats()
    return {
        "total_vectors": stats.total_vector_count,
        "index_name":    PINECONE_INDEX_NAME,
        "dimension":     DIMENSION,
    }