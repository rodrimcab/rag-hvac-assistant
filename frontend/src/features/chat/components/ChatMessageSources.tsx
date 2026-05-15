import { getApiBaseUrl } from "../../../lib/apiBaseUrl";
import type { ChatDocumentSource } from "../types/message.types";
import { ChatMessageBody } from "./ChatMessageBody";

type ChatMessageSourcesProps = {
  sources: ChatDocumentSource[];
};

export function ChatMessageSources({ sources }: ChatMessageSourcesProps) {
  if (!sources.length) return null;

  return (
    <div className="mt-3 border-t border-border pt-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
        Respaldo documental
      </p>
      <ul className="flex flex-col gap-2.5">
        {sources.map((source, index) => {
          const label = source.file_name?.trim() || "Fragmento del manual";
          const pageNum =
            typeof source.page_number === "number" && Number.isFinite(source.page_number)
              ? source.page_number
              : null;
          const downloadHref =
            source.file_name?.trim() && pageNum != null
              ? `${getApiBaseUrl()}/api/documents/${encodeURIComponent(source.file_name.trim())}/download`
              : null;

          return (
            <li
              key={`${label}-${index}`}
              className="rounded-lg bg-surface/70 px-3 py-2 text-xs text-text-secondary"
            >
              <div className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="font-medium text-text-primary">{label}</span>
                {pageNum != null ? (
                  <span className="text-[10px] font-medium text-text-secondary/90">pág. {pageNum}</span>
                ) : null}
                {source.has_diagram_context ? (
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                    diagrama
                  </span>
                ) : null}
              </div>
              {downloadHref && pageNum != null ? (
                <p className="mb-1.5 text-[10px] text-text-secondary/80">
                  <a
                    href={downloadHref}
                    download={source.file_name?.trim()}
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    Abrir PDF
                  </a>
                  <span className="text-text-secondary/70"> — revisá la página {pageNum} en el visor.</span>
                </p>
              ) : null}
              <div className="max-h-28 overflow-y-auto pr-0.5">
                <ChatMessageBody
                  text={source.text.trim() || "—"}
                  className="leading-relaxed text-text-secondary"
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
