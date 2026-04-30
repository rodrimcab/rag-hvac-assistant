import type { ChatDocumentSource } from "../types/message.types";
import { ChatMessageBody } from "./ChatMessageBody";

type ChatMessageSourcesProps = {
  sources: ChatDocumentSource[];
};

function formatScore(score: number | null | undefined): string | null {
  if (score == null || Number.isNaN(Number(score))) return null;
  return Number(score).toFixed(3);
}

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
          const scoreLabel = formatScore(source.score);

          return (
            <li
              key={`${label}-${index}`}
              className="rounded-lg bg-surface/70 px-3 py-2 text-xs text-text-secondary"
            >
              <div className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="font-medium text-text-primary">{label}</span>
                {scoreLabel ? (
                  <span className="text-[10px] font-medium tabular-nums text-text-secondary/90">
                    score {scoreLabel}
                  </span>
                ) : null}
              </div>
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
