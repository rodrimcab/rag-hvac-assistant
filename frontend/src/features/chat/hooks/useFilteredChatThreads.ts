import { useMemo } from "react";
import type { ChatThread } from "../types/thread.types";
import { filterThreadsByQuery } from "../utils/filterThreadsByQuery";

export function useFilteredChatThreads(threads: ChatThread[], query: string): ChatThread[] {
  return useMemo(() => {
    const filtered = filterThreadsByQuery(threads, query);
    return [...filtered].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }, [threads, query]);
}
