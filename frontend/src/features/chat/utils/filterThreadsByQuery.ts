import type { ChatThread } from "../types/thread.types";

/** Minúsculas y sin tildes / diacríticos para comparar búsqueda con títulos. */
function normalizeForSearch(s: string): string {
  return s
    .trim()
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLocaleLowerCase("es");
}

export function filterThreadsByQuery(threads: ChatThread[], query: string): ChatThread[] {
  const q = normalizeForSearch(query);
  if (!q) return threads;
  return threads.filter((t) => normalizeForSearch(t.title).includes(q));
}
