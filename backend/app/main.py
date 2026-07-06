import traceback
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.api import documents, chat

app = FastAPI(
    title="DocuChat API",
    description="AI-powered document Q&A backend",
    version="1.0.0",
)

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    settings.frontend_url,
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
)

app.include_router(documents.router, prefix="/api")
app.include_router(chat.router, prefix="/api")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    tb = traceback.format_exc()
    print(f"\n=== UNHANDLED EXCEPTION ===\n{tb}\n===========================\n")
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "traceback": tb},
        headers={"Access-Control-Allow-Origin": "http://localhost:3000"},
    )


@app.get("/health")
async def health():
    return {"status": "ok", "service": "DocuChat API"}
