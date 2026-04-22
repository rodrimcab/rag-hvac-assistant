# Backend

Python **FastAPI** service for the RAG HVAC assistant.

## Phases

- **Phase 1**: configuration, CORS, OpenAPI docs, health endpoint.
- **Phase 2**: LlamaIndex + Gemini (Google GenAI) wiring, local PDF ingestion under `data/manuals/`, in-memory vector index, and `RAGService` for programmatic queries. Defaults: **`gemini-3-flash-preview`** (generation, aligns with current free-tier options in Gemini API) and **`gemini-embedding-001`** (embeddings). Set `GEMINI_LLM_MODEL` in `.env` to match what **AI Studio → Usage / models** lists for your project (for example, `gemini-3.1-flash-lite-preview` for lower cost or `gemini-2.5-pro` when available). **ChromaDB** and **`/api/chat`** arrive in later phases.

## Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Set GOOGLE_API_KEY and copy PDF manuals into data/manuals/
```

## Run API

From the `backend` directory (so the `app` package resolves):

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Try the RAG stack (Phase 2, no HTTP chat yet)

1. Put one or more `*.pdf` files in `data/manuals/` (you can copy them from `frontend/src/assets/` while developing).
2. Export `GOOGLE_API_KEY` (or set `google_api_key` in `.env`).
3. From `backend/` with the virtualenv active:

```bash
python -c "from app.core.dependencies import get_rag_service; print(get_rag_service().query('¿Qué precauciones generales indica el manual?').model_dump())"
```

The first call builds an **in-memory** index (re-run after changing manuals, or call `get_rag_service().invalidate_index()` in a fresh process).

If indexing fails with **429 / RESOURCE_EXHAUSTED** from Google, you hit embedding **rate limits or quota** on a large PDF. Wait a minute and retry, use a smaller manual while developing, or tune `.env`: larger `RAG_CHUNK_SIZE` (up to ~2048 tokens) and lower `EMBEDDING_BATCH_SIZE` to reduce bursts. For sustained load, check [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) and billing on your Google AI project.

## Endpoints (Phase 1 surface)

| Path | Description |
|------|-------------|
| `GET /` | Service metadata and links |
| `GET /api/health` | Health check |
| `GET /docs` | Swagger UI |

The frontend (Vite) is expected on `http://localhost:5173`; adjust `CORS_ORIGINS` in `.env` if needed.
