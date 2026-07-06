import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from supabase import Client

from app.core.auth import get_current_user
from app.core.database import get_supabase
from app.core.config import settings
from app.models.schemas import DocumentResponse
from app.services.pdf_processor import extract_text_from_pdf, chunk_text
from app.services.embeddings import embed_batch
from app.services.vector_store import store_chunks, delete_document_chunks

router = APIRouter(prefix="/documents", tags=["documents"])
BUCKET = "documents"


def _row_to_doc(row: dict) -> DocumentResponse:
    return DocumentResponse(
        id=row["id"],
        user_id=row["user_id"],
        filename=row["filename"],
        file_size=row["file_size"],
        page_count=row.get("page_count"),
        storage_path=row["storage_path"],
        status=row["status"],
        created_at=row["created_at"],
    )


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    file_bytes = await file.read()
    if len(file_bytes) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 50MB)")

    db: Client = get_supabase()
    doc_id = str(uuid.uuid4())
    storage_path = f"{user_id}/{doc_id}/{file.filename}"

    # Upload to Supabase Storage
    db.storage.from_(BUCKET).upload(
        storage_path,
        file_bytes,
        {"content-type": "application/pdf"},
    )

    # Extract + chunk + embed
    text_content, page_count = extract_text_from_pdf(file_bytes)
    if not text_content.strip():
        raise HTTPException(status_code=422, detail="Could not extract text from PDF")

    # Insert document record FIRST (chunks have FK constraint on documents.id)
    now = datetime.now(timezone.utc).isoformat()
    doc_data = {
        "id": doc_id,
        "user_id": user_id,
        "filename": file.filename,
        "file_size": len(file_bytes),
        "page_count": page_count,
        "storage_path": storage_path,
        "status": "processing",
        "created_at": now,
        "updated_at": now,
    }
    db.table("documents").insert(doc_data).execute()

    # Now chunk + embed + store
    chunks = chunk_text(text_content, settings.chunk_size, settings.chunk_overlap)
    texts = [c["content"] for c in chunks]
    embeddings = await embed_batch(texts)
    await store_chunks(db, doc_id, user_id, chunks, embeddings, page_count)

    # Mark ready
    result = db.table("documents").update({"status": "ready", "updated_at": datetime.now(timezone.utc).isoformat()}).eq("id", doc_id).execute()
    return _row_to_doc(result.data[0])


@router.get("/", response_model=list[DocumentResponse])
async def list_documents(user_id: str = Depends(get_current_user)):
    db: Client = get_supabase()
    result = (
        db.table("documents")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return [_row_to_doc(row) for row in result.data]


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    user_id: str = Depends(get_current_user),
):
    db: Client = get_supabase()
    result = (
        db.table("documents")
        .select("*")
        .eq("id", document_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Document not found")

    row = result.data[0]
    try:
        db.storage.from_(BUCKET).remove([row["storage_path"]])
    except Exception:
        pass

    await delete_document_chunks(db, document_id, user_id)

    db.table("conversations").delete().eq("document_id", document_id).eq("user_id", user_id).execute()
    db.table("documents").delete().eq("id", document_id).eq("user_id", user_id).execute()
    return {"message": "Document deleted successfully"}


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    user_id: str = Depends(get_current_user),
):
    db: Client = get_supabase()
    result = (
        db.table("documents")
        .select("*")
        .eq("id", document_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Document not found")
    return _row_to_doc(result.data[0])
