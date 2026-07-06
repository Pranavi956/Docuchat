import io
from typing import Generator
import pdfplumber


def extract_text_from_pdf(file_bytes: bytes) -> tuple[str, int]:
    """Return (full_text, page_count)."""
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        pages = []
        for page in pdf.pages:
            text = page.extract_text() or ""
            pages.append(text)
        return "\n\n".join(pages), len(pages)


def chunk_text(
    text: str,
    chunk_size: int = 1000,
    chunk_overlap: int = 200,
) -> list[dict]:
    """Split text into overlapping chunks, return list of {content, chunk_index}."""
    if not text.strip():
        return []

    chunks = []
    start = 0
    idx = 0

    while start < len(text):
        end = start + chunk_size
        chunk_content = text[start:end].strip()
        if chunk_content:
            chunks.append({"content": chunk_content, "chunk_index": idx})
            idx += 1
        start = end - chunk_overlap
        if start >= len(text):
            break

    return chunks


def estimate_page_for_chunk(chunk_index: int, total_chunks: int, total_pages: int) -> int:
    """Rough page estimate for a chunk."""
    if total_pages <= 1:
        return 1
    ratio = chunk_index / max(total_chunks - 1, 1)
    return max(1, round(ratio * (total_pages - 1)) + 1)
