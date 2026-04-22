# Backend (Phase 1)

Python **FastAPI** service: configuration, CORS, OpenAPI docs, and a health endpoint. RAG stack (LlamaIndex, Gemini, ChromaDB) is introduced in later phases.

## Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # optional; defaults match Vite on port 5173
```

## Run

From the `backend` directory (so the `app` package resolves):

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Endpoints

| Path | Description |
|------|-------------|
| `GET /` | Service metadata and links |
| `GET /api/health` | Health check |
| `GET /docs` | Swagger UI |

The frontend (Vite) is expected on `http://localhost:5173`; adjust `CORS_ORIGINS` in `.env` if needed.
