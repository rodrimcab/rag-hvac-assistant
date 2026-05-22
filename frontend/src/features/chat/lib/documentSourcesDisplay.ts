import type { ChatDocumentSource } from "../types/message.types";

const MIN_SNIPPET_CHARS = 12;
/** Alineado con backend `rag_source_score_floor` (similitud exp(-distancia Chroma)). */
const MIN_SOURCE_SCORE = 0.515;
/** Galería: solo imágenes con similitud alta (`rag_gallery_min_image_score`). */
const MIN_GALLERY_IMAGE_SCORE = 0.535;

function hasDocumentReference(s: ChatDocumentSource): boolean {
  if (s.file_name?.trim()) return true;
  const p = s.page_number;
  return typeof p === "number" && Number.isFinite(p) && p >= 1;
}

export function filterDisplayableDocumentSources(
  sources: ChatDocumentSource[] | undefined | null,
): ChatDocumentSource[] {
  if (!sources?.length) return [];
  return sources.filter((s) => {
    const text = (s.text ?? "").trim();
    if (text.length < MIN_SNIPPET_CHARS) return false;
    if (!hasDocumentReference(s)) return false;
    if (s.score != null && !Number.isNaN(Number(s.score)) && Number(s.score) < MIN_SOURCE_SCORE) {
      return false;
    }
    return true;
  });
}

/** Fuentes con imágenes de alta similitud (0..6; mejor score primero). */
export function sourcesWithDiagramImages(
  sources: ChatDocumentSource[] | undefined | null,
): ChatDocumentSource[] {
  if (!sources?.length) return [];
  return sources
    .filter((s) => {
      if (!(s.image_urls?.length ?? 0)) return false;
      if (!hasDocumentReference(s)) return false;
      const score = s.score != null ? Number(s.score) : null;
      if (score == null || Number.isNaN(score) || score < MIN_GALLERY_IMAGE_SCORE) {
        return false;
      }
      return true;
    })
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}
