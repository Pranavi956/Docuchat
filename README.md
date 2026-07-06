# DocuChat — AI Document Q&A SaaS

Upload PDFs and chat with them using AI. Built with Next.js 14, FastAPI, pgvector, and Gemini 2.5 Flash.

**Live demo**: [docuchat-plum.vercel.app](https://docuchat-plum.vercel.app)

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌──────────────────┐
│   Next.js 14    │────▶│   FastAPI       │────▶│  Supabase        │
│   (App Router)  │     │   (Python)      │     │  PostgreSQL      │
│   Clerk Auth    │     │   Gemini API    │     │  pgvector        │
│   Tailwind CSS  │◀────│   RAG Pipeline  │     │  Storage (PDFs)  │
└─────────────────┘     └─────────────────┘     └──────────────────┘
```

## Features

- **Auth**: Sign up / sign in via Clerk
- **PDF Upload**: Drag & drop, up to 50MB
- **RAG Pipeline**: Extract → Chunk → Embed (gemini-embedding-001) → Store in pgvector
- **Streaming Chat**: Real-time responses via Server-Sent Events
- **Source Citations**: See which pages/sections were used to answer
- **Conversation History**: Persisted per document

## Setup

### 1. Clone and install

```bash
# Frontend
cd frontend
npm install

# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment variables

**Frontend** — copy `.env.local.example` to `.env.local`:
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_FALLBACK_REDIRECT_URL=/documents
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Backend** — copy `.env.example` to `.env`:
```
GEMINI_API_KEY=...
SUPABASE_URL=https://[project].supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
CLERK_SECRET_KEY=sk_...
CLERK_PUBLISHABLE_KEY=pk_...
FRONTEND_URL=http://localhost:3000
```

### 3. Set up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Enable the **pgvector** extension in **Database → Extensions**
3. Run the migration in Supabase SQL Editor:
   ```sql
   -- Copy contents of backend/migrations/init.sql and run
   ```
4. Create a storage bucket named `documents` with **private** access

### 4. Set up Clerk

1. Create a Clerk app at [clerk.com](https://clerk.com)
2. Copy the publishable key and secret key to the env files

### 5. Set up Gemini API

1. Get an API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Add it to `backend/.env`

### 6. Run the apps

```bash
# Terminal 1 — Backend
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
docuchat/
├── frontend/                    # Next.js 14 app
│   ├── app/
│   │   ├── (auth)/             # Sign-in / Sign-up pages (Clerk)
│   │   ├── (dashboard)/        # Protected routes
│   │   │   ├── documents/      # Document library
│   │   │   └── chat/[id]/      # Chat interface
│   │   ├── layout.tsx
│   │   └── page.tsx            # Landing page
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── chat-interface.tsx  # Main chat UI with streaming
│   │   ├── document-upload.tsx # Drag & drop uploader
│   │   └── document-list.tsx   # Document grid
│   └── lib/
│       ├── api.ts              # API client + SSE streaming
│       └── utils.ts
│
├── backend/                     # FastAPI app
│   ├── app/
│   │   ├── api/
│   │   │   ├── documents.py    # Upload, list, delete endpoints
│   │   │   └── chat.py         # Streaming chat + history endpoints
│   │   ├── core/
│   │   │   ├── config.py       # Pydantic settings
│   │   │   ├── database.py     # Supabase REST client
│   │   │   └── auth.py         # Clerk JWT verification
│   │   ├── models/schemas.py   # Pydantic models
│   │   ├── services/
│   │   │   ├── pdf_processor.py  # Text extraction + chunking
│   │   │   ├── embeddings.py     # Gemini gemini-embedding-001 (768d)
│   │   │   ├── vector_store.py   # pgvector similarity search
│   │   │   └── chat_service.py   # Gemini 2.5 Flash streaming
│   │   └── main.py
│   └── migrations/init.sql     # pgvector schema + match_chunks RPC
│
└── README.md
```

## RAG Pipeline

1. **Upload**: PDF → Supabase Storage
2. **Extract**: pdfplumber → plain text
3. **Chunk**: Sliding window (1000 chars, 200 overlap)
4. **Embed**: `gemini-embedding-001` (768 dimensions)
5. **Store**: pgvector `document_chunks` table
6. **Query**: Cosine similarity search → top-5 chunks via `match_chunks` RPC
7. **Generate**: Gemini 2.5 Flash with context + streaming SSE

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/documents/upload` | Upload & process PDF |
| `GET` | `/api/documents/` | List user's documents |
| `GET` | `/api/documents/{id}` | Get document metadata |
| `DELETE` | `/api/documents/{id}` | Delete document + chunks |
| `POST` | `/api/chat/stream` | Streaming chat (SSE) |
| `GET` | `/api/chat/history/{id}` | Get conversation history |
| `DELETE` | `/api/chat/history/{id}` | Clear conversation |

## Production Deployment

- **Frontend**: Vercel — set env vars in project settings, set `NEXT_PUBLIC_API_URL` to your backend URL
- **Backend**: Render — set env vars, set `FRONTEND_URL` to your Vercel URL
- After inserting significant data, create the IVFFlat index for faster vector search:
  ```sql
  CREATE INDEX idx_chunks_embedding ON document_chunks 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
  ```
