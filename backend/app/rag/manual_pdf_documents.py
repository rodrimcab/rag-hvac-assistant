"""Build LlamaIndex ``Document`` objects from PDFs with optional diagram vision."""

from __future__ import annotations

import json
import logging
from collections.abc import Callable
from pathlib import Path
from typing import TYPE_CHECKING

from llama_index.core import Document

from app.rag.diagram_vision import describe_manual_page_image

if TYPE_CHECKING:
    from app.core.config import Settings

logger = logging.getLogger(__name__)

_IMG_MIN_SIDE     = 100    # px — filtra iconos y logos pequeños
_IMG_MIN_BYTES    = 2_048  # bytes — filtra imágenes triviales
_IMG_MAX_RATIO    = 20.0   # filtra reglas/separadores horizontales
_RENDER_DPI       = 150    # DPI para render de páginas vectoriales
_VECTOR_THRESHOLD = 150    # mínimo de trazados vectoriales para render completo


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


def extract_page_images(pdf_path: Path, images_base_dir: Path) -> dict[int, list[str]]:
    """
    Extrae imágenes relevantes de cada página del PDF con PyMuPDF.

    Modo 1: imágenes embebidas (filtradas por tamaño y proporción).
    Modo 2: render completo para páginas sólo vectoriales (trazados >= threshold).
    Retorna {page_num: ["/images/{stem}/filename", ...]} — URLs relativas para FastAPI.
    """
    import fitz

    stem = pdf_path.stem
    out_dir = images_base_dir / stem
    out_dir.mkdir(parents=True, exist_ok=True)

    page_images: dict[int, list[str]] = {}
    with fitz.open(str(pdf_path)) as doc:
        for idx, page in enumerate(doc):
            pn = idx + 1
            saved: list[str] = []

            # Modo 1: imágenes embebidas
            for ii, img_info in enumerate(page.get_images(full=True)):
                xref = img_info[0]
                try:
                    base = doc.extract_image(xref)
                    w, h, size = base["width"], base["height"], len(base["image"])
                    if w < _IMG_MIN_SIDE or h < _IMG_MIN_SIDE or size < _IMG_MIN_BYTES:
                        continue
                    if max(w, h) / max(min(w, h), 1) > _IMG_MAX_RATIO:
                        continue
                    pix = fitz.Pixmap(doc, xref)
                    if pix.n > 4:  # CMYK → RGB
                        pix = fitz.Pixmap(fitz.csRGB, pix)
                    fname = f"page{pn}_img{ii}.{base['ext']}"
                    pix.save(str(out_dir / fname))
                    saved.append(f"/images/{stem}/{fname}")
                except Exception:
                    continue

            # Modo 2: render completo para páginas sólo vectoriales
            if not saved:
                try:
                    draw_count = len(page.get_drawings())
                except Exception:
                    draw_count = 0
                if draw_count >= _VECTOR_THRESHOLD:
                    pix = page.get_pixmap(dpi=_RENDER_DPI)
                    fname = f"page{pn}_render.png"
                    pix.save(str(out_dir / fname))
                    saved.append(f"/images/{stem}/{fname}")

            if saved:
                page_images[pn] = saved

    return page_images


def build_documents_from_pdf(
    pdf_path: Path,
    settings: "Settings",
    *,
    file_name: str,
    brand: str | None,
    page_progress: Callable[[int, int], None] | None = None,
    images_base_dir: Path | None = None,
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

    page_images: dict[int, list[str]] = {}
    if images_base_dir is not None:
        try:
            page_images = extract_page_images(pdf_path, images_base_dir)
        except Exception as exc:
            logger.warning("image_extraction_failed file=%s err=%s", file_name, exc)

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
                "image_urls": json.dumps(page_images.get(pn, [])),
            }
            if brand:
                meta["brand"] = brand

            documents.append(Document(text=text, metadata=meta))
            if page_progress:
                page_progress(i + 1, total)

    return documents
