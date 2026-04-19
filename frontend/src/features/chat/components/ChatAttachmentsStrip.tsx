import { FileText, X } from "lucide-react";
import { cn } from "../../../lib/cn";
import type { ChatAttachment } from "../types/message.types";

type ChatAttachmentsStripProps = {
  attachments: ChatAttachment[];
  /** Chips sobre el fondo del compositor */
  tone?: "composer" | "message-user";
  onRemove?: (id: string) => void;
};

export function ChatAttachmentsStrip({
  attachments,
  tone = "composer",
  onRemove,
}: ChatAttachmentsStripProps) {
  if (!attachments.length) return null;

  const isUserBubble = tone === "message-user";

  return (
    <ul
      className="flex max-w-full gap-2 overflow-x-auto overscroll-x-contain py-0.5 [scrollbar-width:thin]"
      aria-label="Archivos adjuntos"
    >
      {attachments.map((a) => (
        <li
          key={a.id}
          className={cn(
            "relative shrink-0 overflow-hidden rounded-lg border",
            isUserBubble ? "border-white/25 bg-white/10" : "border-border bg-white",
          )}
        >
          {a.kind === "image" ? (
            <a
              href={a.previewUrl}
              target="_blank"
              rel="noreferrer"
              className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-border-focus"
              title={a.name}
            >
              <img
                src={a.previewUrl}
                alt={a.name}
                className="size-16 object-cover sm:size-[4.5rem]"
              />
            </a>
          ) : (
            <a
              href={a.previewUrl}
              target="_blank"
              rel="noreferrer"
              className={cn(
                "flex h-16 w-28 items-center gap-2 px-2 sm:h-[4.5rem] sm:w-32",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-border-focus",
                isUserBubble ? "text-white" : "text-text-primary",
              )}
              title={a.name}
            >
              <FileText
                className={cn("size-7 shrink-0", isUserBubble ? "text-white/90" : "text-primary")}
                strokeWidth={2}
                aria-hidden
              />
              <span className="line-clamp-2 text-left text-xs font-medium leading-snug">{a.name}</span>
            </a>
          )}
          {onRemove ? (
            <button
              type="button"
              onClick={() => onRemove(a.id)}
              className={cn(
                "absolute right-0.5 top-0.5 flex size-6 items-center justify-center rounded-full shadow-sm transition-colors",
                isUserBubble
                  ? "bg-slate-900/70 text-white hover:bg-slate-900/90"
                  : "bg-white/95 text-text-secondary hover:bg-error hover:text-white",
              )}
              aria-label={`Quitar ${a.name}`}
            >
              <X className="size-3.5" strokeWidth={2.5} aria-hidden />
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function fileToAttachmentKind(file: File): "image" | "file" {
  return file.type.startsWith("image/") ? "image" : "file";
}
