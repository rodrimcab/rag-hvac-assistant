# Backend

Python **FastAPI** service for the RAG HVAC assistant.

## Phases

- **Phase 1**: configuration, CORS, OpenAPI docs, health endpoint.
- **Phase 2**: LlamaIndex + Gemini (Google GenAI) wiring, local PDF ingestion under `data/manuals/`, in-memory vector index, and `RAGService` for programmatic queries. Defaults: **`gemini-3-flash-preview`** (generation, aligns with current free-tier options in Gemini API) and **`gemini-embedding-001`** (embeddings). Set `GEMINI_LLM_MODEL` in `.env` to match what **AI Studio → Usage / models** lists for your project (for example, `gemini-3.1-flash-lite-preview` for lower cost or `gemini-2.5-pro` when available).
- **Phase 3**: HTTP chat endpoint (`POST /api/chat`) connected to `RAGService.query()` and returning answer plus retrieved source snippets.

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

`uvicorn` is installed **inside** the virtualenv. Activate it first, then run from the `backend` directory (so the `app` package resolves):

```bash
cd backend
source .venv/bin/activate          # Windows: .venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

If you see `zsh: command not found: uvicorn`, you skipped `source .venv/bin/activate` or used a different shell without the venv.

**Optional — load `.env` into the shell** (only if you need env vars for tools other than the app; FastAPI already reads `backend/.env` via Pydantic). Values with spaces must be quoted, e.g. `APP_NAME="RAG HVAC Assistant API"`:

```bash
cd /path/to/rag-hvac-assistant
set -a && source backend/.env && set +a
cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Try the RAG stack (Phase 2 service check)

1. Put one or more `*.pdf` files in `data/manuals/`.
2. Export `GOOGLE_API_KEY` (or set `google_api_key` in `.env`).
3. From `backend/` with the virtualenv active:

```bash
python -c "from app.core.dependencies import get_rag_service; print(get_rag_service().query('¿Qué precauciones generales indica el manual?').model_dump())"
```

The first call builds an **in-memory** index (re-run after changing manuals, or call `get_rag_service().invalidate_index()` in a fresh process).

If indexing fails with **429 / RESOURCE_EXHAUSTED** from Google, you hit embedding **rate limits or quota** on a large PDF. Wait a minute and retry, use a smaller manual while developing, or tune `.env`: larger `RAG_CHUNK_SIZE` (up to ~2048 tokens) and lower `EMBEDDING_BATCH_SIZE` to reduce bursts. For sustained load, check [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) and billing on your Google AI project.

## Diagram-heavy manuals (Gemini Vision at ingest time)

During **PDF upload / ingestion**, the service renders select pages and calls **Gemini Flash (vision)** to write a searchable text description of schematics and figures. That text is embedded together with the page text so retrieval can answer diagram-related questions without sending images on every chat turn.

- Controlled by `DIAGRAM_VISION_*` settings in `.env` (see `.env.example`). Set `DIAGRAM_VISION_ENABLED=false` to disable extra vision calls.
- **Re-indexing required**: delete the manual in the UI and upload again (or clear the Chroma collection) so existing vectors pick up `page_number` and diagram descriptions.

## Try HTTP chat (Phase 3)

With the API running from `backend/`, execute:

```bash
curl -X POST "http://localhost:8000/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message":"¿Qué precauciones generales indica el manual para mantenimiento?"}'
```

Expected response shape:

```json
{
  "answer": "....",
  "sources": [
    {
      "text": "....",
      "file_name": "Example.pdf",
      "score": 0.87,
      "page_number": 62,
      "has_diagram_context": true
    }
  ]
}
```

## Endpoints (Phase 3 surface)

| Path | Description |
|------|-------------|
| `GET /` | Service metadata and links |
| `GET /api/health` | Health check |
| `POST /api/chat` | RAG query endpoint (message -> answer + sources) |
| `GET /docs` | Swagger UI |

The frontend (Vite) is expected on `http://localhost:5173`; adjust `CORS_ORIGINS` in `.env` if needed.

## Chat SQLite (`data/conversations.db`)

El historial de conversaciones (por cuenta demo, cabecera `X-Demo-User`) vive en **`data/conversations.db`**. Para que el equipo vea el mismo historial al clonar o hacer `git pull`, **ese archivo está pensado para versionarse** en el repo (demo acotada). Si dos personas escriben a la vez sobre el mismo archivo en Git, pueden aparecer conflictos de merge: en ese caso conviene que solo una persona actualice el `.db` o usar un backend compartido con volumen persistente.
