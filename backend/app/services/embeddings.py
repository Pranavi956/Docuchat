import asyncio
import google.generativeai as genai
from app.core.config import settings

genai.configure(api_key=settings.gemini_api_key)

EMBEDDING_MODEL = "models/gemini-embedding-001"
EMBED_DIM = 768  # request 768 dims to match pgvector column


async def embed_text(text: str) -> list[float]:
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None,
        lambda: genai.embed_content(
            model=EMBEDDING_MODEL,
            content=text,
            output_dimensionality=EMBED_DIM,
        ),
    )
    return result["embedding"]


async def embed_batch(texts: list[str]) -> list[list[float]]:
    """Embed multiple texts concurrently in small batches."""
    batch_size = 20
    results = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        embeddings = await asyncio.gather(*[embed_text(t) for t in batch])
        results.extend(embeddings)
    return results
