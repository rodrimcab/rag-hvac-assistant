from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes_chat import router as chat_router
from app.api.routes_conversations import router as conversations_router
from app.api.routes_documents import router as documents_router
from app.api.routes_health import router as health_router
from app.core.dependencies import get_settings

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    import app.db.models  # noqa: F401 — register ORM tables with metadata

    from app.db.base import Base
    from app.db.session import configure_engine, get_engine

    db_path = settings.conversations_db_absolute_path
    db_path.parent.mkdir(parents=True, exist_ok=True)
    configure_engine(f"sqlite:///{db_path}")
    engine = get_engine()
    Base.metadata.create_all(bind=engine)
    from app.db.schema_migrate import ensure_conversation_owner_id

    ensure_conversation_owner_id(engine)
    yield


app = FastAPI(
    title=settings.app_name,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

settings.images_path.mkdir(parents=True, exist_ok=True)
app.mount("/images", StaticFiles(directory=str(settings.images_path)), name="images")

app.include_router(health_router, prefix="/api")
app.include_router(conversations_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(documents_router, prefix="/api")


@app.get("/")
def root() -> dict[str, str]:
    return {
        "service": settings.app_name,
        "docs": "/docs",
        "health": "/api/health",
        "chat": "/api/chat",
        "conversations": "/api/conversations",
        "documents": "/api/documents",
    }
