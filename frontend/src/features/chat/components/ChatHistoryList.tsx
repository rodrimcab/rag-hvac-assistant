import type { ChatThread } from "../types/thread.types";
import { ChatHistoryItem } from "./ChatHistoryItem";

type ChatHistoryListProps = {
  threads: ChatThread[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function ChatHistoryList({ threads, selectedId, onSelect }: ChatHistoryListProps) {
  if (threads.length === 0) {
    return (
      <p className="px-3 py-6 text-center text-sm text-text-secondary">No hay conversaciones.</p>
    );
  }

  return (
    <ul className="flex flex-col gap-0.5">
      {threads.map((thread) => (
        <li key={thread.id}>
          <ChatHistoryItem
            thread={thread}
            selected={thread.id === selectedId}
            onSelect={onSelect}
          />
        </li>
      ))}
    </ul>
  );
}
