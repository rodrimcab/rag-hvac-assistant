import { cn } from "../../../lib/cn";
import type { ChatThread } from "../types/thread.types";

type ChatHistoryItemProps = {
  thread: ChatThread;
  selected?: boolean;
  onSelect?: (id: string) => void;
};

export function ChatHistoryItem({ thread, selected, onSelect }: ChatHistoryItemProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(thread.id)}
      className={cn(
        "w-full rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-border-focus",
        selected
          ? "bg-surface font-semibold text-primary"
          : "text-text-primary hover:bg-surface/80",
      )}
    >
      <span className="block truncate leading-snug">{thread.title}</span>
    </button>
  );
}
