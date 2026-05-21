"""Gemini vision calls used only during PDF ingestion (diagram-heavy pages)."""

from __future__ import annotations

import logging
import time
from typing import TYPE_CHECKING

from app.rag.google_keys import (
    iter_google_api_keys,
    is_retryable_google_quota_error,
)

if TYPE_CHECKING:
    from app.core.config import Settings

logger = logging.getLogger(__name__)


def _normalize_model_id(model: str) -> str:
    return model.removeprefix("models/").strip()


def describe_manual_page_image(
    *,
    image_bytes: bytes,
    mime_type: str,
    page_number: int,
    file_name: str,
    brand_hint: str | None,
    settings: "Settings",
    last_call_monotonic: list[float] | None = None,
) -> str:
    """
    Describe a single rendered PDF page for semantic retrieval.

    Uses the Google GenAI SDK (``google-genai``). Intended for background
    ingestion only — not per chat message.
    """
    from google import genai
    from google.genai import types

    keys = list(iter_google_api_keys(settings))
    if not keys:
        logger.warning("diagram_vision_skipped_no_api_key")
        return ""

    model = _normalize_model_id(
        settings.gemini_vision_model or settings.gemini_llm_model,
    )

    interval = settings.effective_diagram_vision_min_interval_seconds
    if interval > 0 and last_call_monotonic is not None:
        wait = interval - (time.monotonic() - last_call_monotonic[0])
        if wait > 0:
            time.sleep(wait)

    brand_clause = f" Marca de contexto del archivo: {brand_hint}." if brand_hint else ""
    prompt = (
        f"Imagen renderizada de la página {page_number} del PDF «{file_name}».{brand_clause}\n"
        "Sos un asistente para técnicos de HVAC. Describí con precisión:\n"
        "- diagramas esquemáticos, flujos de refrigerante, cableado o bloques funcionales;\n"
        "- componentes numerados o etiquetados y su función si se deduce del dibujo;\n"
        "- tablas o leyendas legibles en la figura.\n"
        "Respondé en español técnico neutro, en párrafos breves.\n"
        "Si no hay figuras técnicas útiles (solo texto borroso o página casi vacía), "
        "respondé exactamente: Sin figuras relevantes.\n"
        "No inventes códigos de error, valores de presión ni datos que no se vean."
    )

    free_interval = settings.free_diagram_vision_min_interval_seconds
    last_exc: BaseException | None = None

    for index, api_key in enumerate(keys):
        if index > 0:
            logger.warning(
                "diagram_vision_retrying_with_fallback_api_key page=%s attempt=%s",
                page_number,
                index + 1,
            )
            if free_interval > 0:
                time.sleep(free_interval)

        client = genai.Client(api_key=api_key)
        try:
            response = client.models.generate_content(
                model=model,
                contents=[
                    types.Part.from_text(text=prompt),
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                ],
                config=types.GenerateContentConfig(
                    temperature=float(settings.diagram_vision_temperature),
                    max_output_tokens=int(settings.diagram_vision_max_output_tokens),
                ),
            )
        except Exception as exc:
            last_exc = exc
            if index >= len(keys) - 1 or not is_retryable_google_quota_error(exc):
                logger.warning("diagram_vision_call_failed page=%s err=%s", page_number, exc)
                return ""
            continue

        if last_call_monotonic is not None:
            last_call_monotonic[0] = time.monotonic()

        if not getattr(response, "candidates", None):
            return ""

        text = (getattr(response, "text", None) or "").strip()
        return text

    if last_exc is not None:
        logger.warning("diagram_vision_call_failed page=%s err=%s", page_number, last_exc)
    return ""
