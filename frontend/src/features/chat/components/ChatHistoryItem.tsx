import { Trash2 } from "lucide-react";
import { cn } from "../../../lib/cn";
import type { ChatThread } from "../types/thread.types";

type ChatHistoryItemProps = {
  thread: ChatThread;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onRequestDelete?: (thread: ChatThread) => void;
  disabled?: boolean;
};

export function ChatHistoryItem({
  thread,
  selected,
  onSelect,
  onRequestDelete,
  disabled = false,
}: ChatHistoryItemProps) {
  return (
    <div
      className={cn(
        "group flex w-full items-center gap-0.5 rounded-xl py-2 pl-3 pr-1 transition-colors",
        selected ? "bg-surface text-primary" : "text-text-primary hover:bg-surface/80",
        disabled && "pointer-events-none opacity-45",
      )}
    >
      <button
        type="button"
        onClick={() => onSelect?.(thread.id)}
        disabled={disabled}
        className={cn(
          "min-w-0 flex-1 truncate py-0.5 text-left text-sm leading-snug focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-border-focus",
          selected && "font-semibold",
        )}
      >
        {thread.title}
      </button>
      {onRequestDelete ? (
        <button
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            onRequestDelete(thread);
          }}
          className={cn(
            "shrink-0 rounded-lg p-2 text-text-secondary transition-[opacity,colors] hover:bg-red-50 hover:text-red-600",
            "opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100",
            "focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-border-focus",
          )}
          aria-label="Eliminar conversación"
        >
          <Trash2 className="size-4" strokeWidth={2} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
