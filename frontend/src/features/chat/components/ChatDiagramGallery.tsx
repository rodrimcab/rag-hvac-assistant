import { useEffect, useState } from "react";
import { getApiBaseUrl } from "../../../lib/apiBaseUrl";
import type { ChatDocumentSource } from "../types/message.types";

type Props = { sources: ChatDocumentSource[] };

type DiagramEntry = { url: string; fullUrl: string; page: number | null };

/** Tope alineado con backend `rag_max_gallery_image_sources` (el backend puede enviar menos). */
const MAX_DIAGRAMS = 6;

/**
 * Solo imágenes ya filtradas por el backend; tope de seguridad en UI.
 * No rellena hasta el máximo: si hay 1 relevante, muestra 1.
 */
function collectDiagrams(sources: ChatDocumentSource[], max = MAX_DIAGRAMS): DiagramEntry[] {
  const sorted = [...sources].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const seen = new Set<string>();
  const result: DiagramEntry[] = [];
  const base = getApiBaseUrl();

  for (const source of sorted) {
    const rawPage = source.page_number;
    const page =
      typeof rawPage === "number" && Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : null;

    for (const url of source.image_urls ?? []) {
      if (seen.has(url)) continue;
      seen.add(url);
      result.push({ url, fullUrl: `${base}${url}`, page });
      if (result.length >= max) return result;
    }
  }
  return result;
}

export function ChatDiagramGallery({ sources }: Props) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const diagrams = collectDiagrams(sources);

  useEffect(() => {
    if (!lightboxUrl) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxUrl(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxUrl]);

  if (!diagrams.length) return null;

  return (
    <>
      <div className="mt-3 border-t border-border pt-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
          Diagramas relevantes
          {diagrams.length > 1 ? (
            <span className="ml-1.5 font-normal normal-case tracking-normal text-text-disabled">
              ({diagrams.length})
            </span>
          ) : null}
        </p>
        <div className="flex flex-wrap gap-2">
          {diagrams.map(({ url, fullUrl, page }) => (
            <button
              key={url}
              type="button"
              onClick={() => setLightboxUrl(fullUrl)}
              className="relative cursor-zoom-in overflow-hidden rounded-md border border-border transition-colors hover:border-primary"
              title={page ? `Diagrama — pág. ${page}` : "Ver diagrama"}
            >
              <img
                src={fullUrl}
                alt={page ? `Diagrama pág. ${page}` : "Diagrama"}
                loading="lazy"
                className="max-h-40 w-auto max-w-[13rem] object-contain"
              />
              {page ? (
                <span className="absolute bottom-1 right-1 rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  p. {page}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {lightboxUrl ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <div
            className="relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxUrl(null)}
              className="absolute -right-3 -top-3 flex size-7 items-center justify-center rounded-full bg-white text-xs font-bold text-gray-700 shadow-md hover:bg-gray-100"
              aria-label="Cerrar diagrama"
            >
              ✕
            </button>
            <img
              src={lightboxUrl}
              alt="Diagrama completo"
              className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain shadow-xl"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
