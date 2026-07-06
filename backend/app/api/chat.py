import json
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from supabase import Client

from app.core.auth import get_current_user
from app.core.database import get_supabase
from app.core.config import settings
from app.models.schemas import ChatRequest, MessageResponse
from app.services.vector_store import similarity_search
from app.services.chat_service import stream_chat_response

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/stream")
async def chat_stream(
    request: ChatRequest,
    user_id: str = Depends(get_current_user),
):
    db: Client = get_supabase()
    doc_result = (
        db.table("documents")
        .select("*")
        .eq("id", request.document_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not doc_result.data:
        raise HTTPException(status_code=404, detail="Document not found")

    context_chunks = await similarity_search(
        db, request.document_id, user_id, request.message, settings.top_k_results
    )

    user_msg_id = str(uuid.uuid4())
    ai_msg_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    db.table("conversations").insert({
        "id": user_msg_id,
        "document_id": request.document_id,
        "user_id": user_id,
        "role": "user",
        "content": request.message,
        "created_at": now,
    }).execute()

    async def generate():
        full_response = ""

        if context_chunks:
            yield f"data: {json.dumps({'type': 'sources', 'sources': context_chunks})}\n\n"

        async for chunk in stream_chat_response(
            request.message, context_chunks, request.conversation_history
        ):
            full_response += chunk
            yield f"data: {json.dumps({'type': 'token', 'content': chunk})}\n\n"

        db.table("conversations").insert({
            "id": ai_msg_id,
            "document_id": request.document_id,
            "user_id": user_id,
            "role": "assistant",
            "content": full_response,
            "sources": json.dumps(context_chunks) if context_chunks else None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }).execute()

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/history/{document_id}", response_model=list[MessageResponse])
async def get_conversation_history(
    document_id: str,
    user_id: str = Depends(get_current_user),
):
    db: Client = get_supabase()
    result = (
        db.table("conversations")
        .select("*")
        .eq("document_id", document_id)
        .eq("user_id", user_id)
        .order("created_at", desc=False)
        .execute()
    )
    return [
        MessageResponse(
            id=row["id"],
            document_id=row["document_id"],
            role=row["role"],
            content=row["content"],
            created_at=row["created_at"],
            sources=json.loads(row["sources"]) if row.get("sources") else None,
        )
        for row in result.data
    ]


@router.delete("/history/{document_id}")
async def clear_conversation_history(
    document_id: str,
    user_id: str = Depends(get_current_user),
):
    db: Client = get_supabase()
    db.table("conversations").delete().eq("document_id", document_id).eq("user_id", user_id).execute()
    return {"message": "Conversation history cleared"}
