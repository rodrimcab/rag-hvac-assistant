"""Gemini vision calls used only during PDF ingestion (diagram-heavy pages)."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

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
) -> str:
    """
    Describe a single rendered PDF page for semantic retrieval.

    Uses the Google GenAI SDK (``google-genai``). Intended for background
    ingestion only — not per chat message.
    """
    from google import genai
    from google.genai import types

    api_key = settings.google_api_key
    if not api_key:
        import os

        api_key = os.getenv("GOOGLE_API_KEY") or ""

    if not api_key:
        logger.warning("diagram_vision_skipped_no_api_key")
        return ""

    model = _normalize_model_id(
        settings.gemini_vision_model or settings.gemini_llm_model,
    )

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
        logger.warning("diagram_vision_call_failed page=%s err=%s", page_number, exc)
        return ""

    if not getattr(response, "candidates", None):
        return ""

    text = (getattr(response, "text", None) or "").strip()
    return text
