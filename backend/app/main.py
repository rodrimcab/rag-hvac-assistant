from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes_chat import router as chat_router
from app.api.routes_documents import router as documents_router
from app.api.routes_health import router as health_router
from app.core.dependencies import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(documents_router, prefix="/api")


@app.get("/")
def root() -> dict[str, str]:
    return {
        "service": settings.app_name,
        "docs": "/docs",
        "health": "/api/health",
        "chat": "/api/chat",
        "documents": "/api/documents",
    }
