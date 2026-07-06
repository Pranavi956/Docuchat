import uuid
from supabase import Client
from app.services.embeddings import embed_text
from app.services.pdf_processor import estimate_page_for_chunk


async def store_chunks(
    db: Client,
    document_id: str,
    user_id: str,
    chunks: list[dict],
    embeddings: list[list[float]],
    total_pages: int,
) -> None:
    total_chunks = len(chunks)
    rows = []
    for chunk, embedding in zip(chunks, embeddings):
        page_num = estimate_page_for_chunk(chunk["chunk_index"], total_chunks, total_pages)
        rows.append({
            "id": str(uuid.uuid4()),
            "document_id": document_id,
            "user_id": user_id,
            "content": chunk["content"],
            "embedding": embedding,
            "chunk_index": chunk["chunk_index"],
            "page_number": page_num,
        })

    # Insert in batches of 50
    for i in range(0, len(rows), 50):
        db.table("document_chunks").insert(rows[i : i + 50]).execute()


async def similarity_search(
    db: Client,
    document_id: str,
    user_id: str,
    query: str,
    top_k: int = 5,
) -> list[dict]:
    query_embedding = await embed_text(query)

    result = db.rpc(
        "match_chunks",
        {
            "query_embedding": query_embedding,
            "match_document_id": document_id,
            "match_user_id": user_id,
            "match_count": top_k,
        },
    ).execute()

    return [
        {
            "content": row["content"],
            "chunk_index": row["chunk_index"],
            "page_number": row["page_number"],
            "similarity": float(row["similarity"]),
        }
        for row in result.data
    ]


async def delete_document_chunks(db: Client, document_id: str, user_id: str) -> None:
    db.table("document_chunks").delete().eq("document_id", document_id).eq("user_id", user_id).execute()
