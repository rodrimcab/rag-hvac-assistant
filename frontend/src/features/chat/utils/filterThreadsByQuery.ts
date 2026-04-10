import type { ChatThread } from "../types/thread.types";

export function filterThreadsByQuery(threads: ChatThread[], query: string): ChatThread[] {
  const q = query.trim().toLowerCase();
  if (!q) return threads;
  return threads.filter((t) => t.title.toLowerCase().includes(q));
}
