import logging
import re
from time import perf_counter

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import get_rag_service
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.rag_service import RAGService

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
) -> ChatResponse:
    """Run one RAG query using local manuals and return answer + sources."""
    started = perf_counter()
    try:
        result = rag_service.query(
            payload.message,
            mode=payload.mode,
            brand=payload.brand,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=_friendly_bad_request_message(str(exc)),
        ) from exc
    except Exception as exc:
        logger.exception("chat_query_failed")
        raise _map_exception_to_http(exc) from exc

    elapsed_ms = round((perf_counter() - started) * 1000, 2)
    logger.info(
        "chat_query_ok mode=%s brand=%s sources=%d latency_ms=%s",
        payload.mode or "auto",
        (payload.brand or "").strip() or "all",
        len(result.sources),
        elapsed_ms,
    )

    return ChatResponse(answer=result.answer, sources=result.sources)
