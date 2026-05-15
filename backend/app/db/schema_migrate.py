"""Lightweight SQLite patches (no Alembic) for MVP demos."""

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def ensure_conversation_owner_id(engine: Engine) -> None:
    """Add ``owner_id`` to ``conversations`` when upgrading an older DB file."""
    insp = inspect(engine)
    if not insp.has_table("conversations"):
        return
    cols = {c["name"] for c in insp.get_columns("conversations")}
    if "owner_id" in cols:
        return
    with engine.begin() as conn:
        conn.execute(
            text(
                "ALTER TABLE conversations ADD COLUMN owner_id VARCHAR(64) "
                "NOT NULL DEFAULT 'default'",
            ),
        )
