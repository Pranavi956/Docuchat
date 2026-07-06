import json
from typing import AsyncGenerator

import google.generativeai as genai

from app.core.config import settings

genai.configure(api_key=settings.gemini_api_key)

CHAT_MODEL = "gemini-2.5-flash"

SYSTEM_PROMPT = """You are DocuChat, an AI assistant that answers questions based on the provided document context.

Rules:
- Answer ONLY from the provided context chunks.
- If the context doesn't contain enough information, say so honestly.
- Be concise and precise.
- When referencing information, mention the page number if available.
- Format responses with markdown when helpful.
"""


def build_rag_prompt(query: str, context_chunks: list[dict]) -> str:
    context_text = "\n\n---\n\n".join(
        f"[Page {c.get('page_number', '?')}] {c['content']}"
        for c in context_chunks
    )
    return f"""Context from the document:

{context_text}

---

User question: {query}

Please answer based on the context above."""


async def stream_chat_response(
    query: str,
    context_chunks: list[dict],
    conversation_history: list[dict],
) -> AsyncGenerator[str, None]:
    model = genai.GenerativeModel(
        model_name=CHAT_MODEL,
        system_instruction=SYSTEM_PROMPT,
    )

    history = []
    for msg in conversation_history[-10:]:  # keep last 10 turns
        role = "user" if msg["role"] == "user" else "model"
        history.append({"role": role, "parts": [msg["content"]]})

    chat = model.start_chat(history=history)
    prompt = build_rag_prompt(query, context_chunks)

    response = await chat.send_message_async(prompt, stream=True)

    async for chunk in response:
        if chunk.text:
            yield chunk.text
