from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

_engine: Engine | None = None
SessionLocal: sessionmaker[Session] | None = None


def configure_engine(database_url: str) -> None:
    """Initialize (once) the SQLAlchemy engine and session factory."""
    global _engine, SessionLocal
    if _engine is not None:
        return
    _engine = create_engine(database_url, connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)


def get_engine() -> Engine:
    if _engine is None:
        raise RuntimeError("Database engine not configured; call configure_engine from app lifespan.")
    return _engine


def get_db() -> Generator[Session, None, None]:
    if SessionLocal is None:
        raise RuntimeError("Database session factory not configured.")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
