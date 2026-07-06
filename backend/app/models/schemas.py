from datetime import datetime
from typing import Optional
from pydantic import BaseModel, UUID4


class DocumentBase(BaseModel):
    filename: str
    file_size: int
    page_count: Optional[int] = None


class DocumentCreate(DocumentBase):
    user_id: str
    storage_path: str


class DocumentResponse(DocumentBase):
    id: UUID4
    user_id: str
    storage_path: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class MessageBase(BaseModel):
    role: str
    content: str


class MessageCreate(MessageBase):
    document_id: UUID4
    user_id: str


class MessageResponse(MessageBase):
    id: UUID4
    document_id: UUID4
    created_at: datetime
    sources: Optional[list[dict]] = None

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    document_id: str
    message: str
    conversation_history: list[dict] = []


class SourceChunk(BaseModel):
    content: str
    page_number: Optional[int] = None
    chunk_index: int
    similarity: float
