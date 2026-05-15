import json
import logging
import re
import uuid
from datetime import datetime, timezone
from time import perf_counter

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.demo_owner import get_demo_owner_id
from app.core.dependencies import get_rag_service
from app.db.models import Conversation, Message
from app.db.session import get_db
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.rag_service import RAGService
from app.util.conversation_text import format_prior_messages_for_prompt, truncate_conversation_title

router = APIRouter(tags=["chat"])
logger = logging.getLogger(__name__)


def _friendly_bad_request_message(raw: str) -> str:
    msg = (raw or "").lower()
    if "manuales indexados" in msg:
        return "Aún no hay manuales listos para consultar. Sube un manual y vuelve a intentarlo."
    if "api key" in msg or "google_api_key" in msg:
        return "El asistente no está disponible en este momento. Intenta más tarde."
    if "question must not be empty" in msg:
        return "Escribe una pregunta para continuar."
    return "No se pudo procesar la consulta. Revisa tu mensaje e intenta nuevamente."


def _friendly_quota_message(raw: str) -> str:
    retry_match = re.search(r"retry in\s+(\d+)", raw, re.IGNORECASE)
    if retry_match:
        seconds = int(retry_match.group(1))
        wait = max(1, round(seconds / 60))
        return f"El asistente alcanzó su límite temporal de uso. Intenta nuevamente en aproximadamente {wait} minuto(s)."
    return "El asistente alcanzó su límite temporal de uso. Intenta nuevamente en unos minutos."


def _map_exception_to_http(exc: Exception) -> HTTPException:
    # Google GenAI errors expose ``status_code``; we keep user-facing messages non-technical.
    status_code = getattr(exc, "status_code", None)
    raw_message = str(exc)
    if status_code == 429:
        return HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=_friendly_quota_message(raw_message),
        )
    if status_code in {500, 502, 503, 504}:
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="El asistente no está disponible en este momento. Intenta nuevamente en unos minutos.",
        )
    return HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="No pudimos completar tu consulta en este momento. Intenta nuevamente en unos minutos.",
    )


@router.post("/chat", response_model=ChatResponse)
def chat(
    payload: ChatRequest,
    rag_service: RAGService = Depends(get_rag_service),
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_demo_owner_id),
) -> ChatResponse:
    """Run one RAG query using local manuals and return answer + sources."""
    started = perf_counter()
    now = datetime.now(timezone.utc)
    cid = (payload.conversation_id or "").strip() or None

    conv: Conversation | None = None
    if cid:
        conv = db.get(Conversation, cid)
        if not conv or conv.owner_id != owner_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    else:
        msg_for_title = payload.message.strip()
        conv = Conversation(
            id=str(uuid.uuid4()),
            owner_id=owner_id,
            title=truncate_conversation_title(msg_for_title),
            created_at=now,
            updated_at=now,
        )
        db.add(conv)
        db.flush()

    prior_rows = db.scalars(
        select(Message)
        .where(Message.conversation_id == conv.id)
        .order_by(Message.created_at.asc()),
    ).all()
    prior_pairs = [(m.role, m.content) for m in prior_rows]
    conversation_context = format_prior_messages_for_prompt(prior_pairs)

    user_row = Message(
        id=str(uuid.uuid4()),
        conversation_id=conv.id,
        role="user",
        content=payload.message.strip(),
        sources_json=None,
        created_at=now,
    )
    db.add(user_row)
    db.flush()

    try:
        result = rag_service.query(
            payload.message,
            mode=payload.mode,
            brand=payload.brand,
            conversation_context=conversation_context,
        )
    except ValueError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=_friendly_bad_request_message(str(exc)),
        ) from exc
    except Exception as exc:
        db.rollback()
        logger.exception("chat_query_failed")
        raise _map_exception_to_http(exc) from exc

    sources_json: str | None = None
    if result.sources:
        sources_json = json.dumps([s.model_dump() for s in result.sources])

    assistant_row = Message(
        id=str(uuid.uuid4()),
        conversation_id=conv.id,
        role="assistant",
        content=result.answer,
        sources_json=sources_json,
        created_at=datetime.now(timezone.utc),
    )
    db.add(assistant_row)
    conv.updated_at = assistant_row.created_at
    db.commit()

    elapsed_ms = round((perf_counter() - started) * 1000, 2)
    logger.info(
        "chat_query_ok mode=%s brand=%s sources=%d latency_ms=%s conversation_id=%s owner_id=%s",
        payload.mode or "auto",
        (payload.brand or "").strip() or "all",
        len(result.sources),
        elapsed_ms,
        conv.id,
        owner_id,
    )

    return ChatResponse(
        answer=result.answer,
        sources=result.sources,
        conversation_id=conv.id,
    )
