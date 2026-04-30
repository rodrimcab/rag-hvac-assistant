import logging
from time import perf_counter

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import get_rag_service
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.rag_service import RAGService

router = APIRouter(tags=["chat"])
logger = logging.getLogger(__name__)


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
            detail=str(exc),
        ) from exc
    except Exception as exc:
        logger.exception("chat_query_failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unexpected backend error while processing chat query.",
        ) from exc

    elapsed_ms = round((perf_counter() - started) * 1000, 2)
    logger.info(
        "chat_query_ok mode=%s brand=%s sources=%d latency_ms=%s",
        payload.mode or "auto",
        (payload.brand or "").strip() or "all",
        len(result.sources),
        elapsed_ms,
    )

    return ChatResponse(answer=result.answer, sources=result.sources)
