"""Build LlamaIndex ``Document`` objects from PDFs with optional diagram vision."""

from __future__ import annotations

import logging
from collections.abc import Callable
from pathlib import Path
from typing import TYPE_CHECKING

from llama_index.core import Document

from app.rag.diagram_vision import describe_manual_page_image

if TYPE_CHECKING:
    from app.core.config import Settings

logger = logging.getLogger(__name__)


def _page_visual_complexity(page: object) -> tuple[int, int]:
    """Return (embedded_image_count, capped_vector_drawing_count)."""
    try:
        imgs = len(page.get_images(full=True))  # type: ignore[attr-defined]
    except Exception:
        imgs = 0
    try:
        draws = len(page.get_drawings())  # type: ignore[attr-defined]
    except Exception:
        draws = 0
    return imgs, min(draws, 500)


def _page_needs_vision(
    text: str,
    img_count: int,
    draw_count: int,
    settings: "Settings",
) -> bool:
    tlen = len(text.strip())
    if tlen >= settings.diagram_skip_vision_min_text_chars:
        return False
    if img_count >= settings.diagram_vision_min_images:
        return True
    if draw_count >= settings.diagram_vision_min_drawings:
        return True
    return False


def _render_page_jpeg(page: object, settings: "Settings") -> tuple[bytes, str]:
    import fitz

    zoom = float(settings.diagram_page_render_dpi) / 72.0
    mat = fitz.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat, alpha=False)  # type: ignore[attr-defined]
    max_w = int(settings.diagram_page_image_max_width)
    if pix.width > max_w:
        scale = max_w / float(pix.width)
        mat2 = fitz.Matrix(zoom * scale, zoom * scale)
        pix = page.get_pixmap(matrix=mat2, alpha=False)  # type: ignore[attr-defined]
    return pix.tobytes("jpeg", jpg_quality=int(settings.diagram_jpeg_quality)), "image/jpeg"


def build_documents_from_pdf(
    pdf_path: Path,
    settings: "Settings",
    *,
    file_name: str,
    brand: str | None,
    page_progress: Callable[[int, int], None] | None = None,
) -> list[Document]:
    """
    One ``Document`` per PDF page so chunk metadata keeps ``page_number``.

    Optionally calls Gemini Vision on diagram-heavy pages during ingestion.
    """
    try:
        import fitz
    except ImportError as exc:
        raise RuntimeError(
            "PyMuPDF (``pymupdf``) is required for diagram-aware ingestion. "
            "Install backend dependencies from requirements.txt."
        ) from exc

    documents: list[Document] = []
    last_call = [0.0]  # mutable monotonic anchor for throttling vision calls

    with fitz.open(pdf_path) as doc:
        total = doc.page_count
        candidates: list[tuple[int, int, int, int]] = []
        # (page_index, text_len, img_count, draw_count)
        for i in range(total):
            page = doc.load_page(i)
            body = (page.get_text("text") or "").strip()
            ic, dc = _page_visual_complexity(page)
            if settings.diagram_vision_enabled and _page_needs_vision(body, ic, dc, settings):
                candidates.append((i, len(body), ic, dc))

        max_v = int(settings.diagram_vision_max_pages_per_pdf)
        if len(candidates) > max_v:
            candidates.sort(key=lambda x: (x[1], -(x[2] * 50 + min(x[3], 200))))
            vision_pages = {c[0] for c in candidates[:max_v]}
            logger.info(
                "diagram_vision_capped file=%s selected=%d of=%d",
                file_name,
                max_v,
                len(candidates),
            )
        else:
            vision_pages = {c[0] for c in candidates}

        for i in range(total):
            page = doc.load_page(i)
            pn = i + 1
            body = (page.get_text("text") or "").strip()
            vision_note = ""

            if settings.diagram_vision_enabled and i in vision_pages:
                try:
                    jpeg_bytes, mime = _render_page_jpeg(page, settings)
                    vision_note = describe_manual_page_image(
                        image_bytes=jpeg_bytes,
                        mime_type=mime,
                        page_number=pn,
                        file_name=file_name,
                        brand_hint=brand,
                        settings=settings,
                        last_call_monotonic=last_call,
                    )
                except Exception as exc:
                    logger.warning("diagram_vision_page_failed page=%s err=%s", pn, exc)
                    vision_note = ""

            parts: list[str] = [f"[Manual — página {pn}]\n"]
            if body:
                parts.append(body)
            if vision_note:
                parts.append("\n\n[Descripción de diagramas / figuras para búsqueda]\n")
                parts.append(vision_note)

            text = "".join(parts).strip()
            if not text:
                text = f"[Manual — página {pn}]\n(sin texto extraíble en esta página)"

            has_diagram = bool(
                vision_note
                and "sin figuras relevantes" not in vision_note.lower()[:120],
            )

            meta: dict[str, object] = {
                "file_name": file_name,
                "page_number": pn,
                "page_label": str(pn),
                "has_diagram_context": has_diagram,
            }
            if brand:
                meta["brand"] = brand

            documents.append(Document(text=text, metadata=meta))
            if page_progress:
                page_progress(i + 1, total)

    return documents
