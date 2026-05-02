import { useEffect, useState } from "react";
import { getApiBaseUrl } from "../../../lib/apiBaseUrl";
import type { ChatDocumentSource } from "../types/message.types";

type Props = { sources: ChatDocumentSource[] };

type DiagramEntry = { url: string; fullUrl: string; page: number | null };

function collectDiagrams(sources: ChatDocumentSource[], max = 4): DiagramEntry[] {
  const sorted = [...sources].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const seen = new Set<string>();
  const result: DiagramEntry[] = [];
  const base = getApiBaseUrl();

  for (const source of sorted) {
    for (const url of source.image_urls ?? []) {
      if (!seen.has(url)) {
        seen.add(url);
        result.push({ url, fullUrl: `${base}${url}`, page: source.page_number ?? null });
      }
    }
    if (result.length >= max) break;
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
        </p>
        <div className="flex flex-wrap gap-2">
          {diagrams.map(({ url, fullUrl, page }) => (
            <button
              key={url}
              type="button"
              onClick={() => setLightboxUrl(fullUrl)}
              className="cursor-zoom-in overflow-hidden rounded-md border border-border transition-colors hover:border-primary"
              title={page ? `Diagrama — pág. ${page}` : "Ver diagrama"}
            >
              <img
                src={fullUrl}
                alt={page ? `Diagrama pág. ${page}` : "Diagrama"}
                loading="lazy"
                className="max-h-40 w-auto max-w-[13rem] object-contain"
              />
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
