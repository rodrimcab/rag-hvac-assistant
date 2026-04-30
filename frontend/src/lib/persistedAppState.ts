import type { ChatMessage } from "../features/chat/types/message.types";
import type { ChatThread } from "../features/chat/types/thread.types";

const STORAGE_KEY = "rag-hvac-assistant:ui-state-v1";

export type WorkspaceView = "chat" | "manuals";

type PersistedMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  sources?: ChatMessage["sources"];
};

export type PersistedAppStateV1 = {
  v: 1;
  workspaceView: WorkspaceView;
  chat: {
    threads: Array<{ id: string; title: string; updatedAt: string }>;
    selectedThreadId: string | null;
    extraByThread: Record<string, PersistedMessage[]>;
  };
};

const DEFAULT_STATE: PersistedAppStateV1 = {
  v: 1,
  workspaceView: "chat",
  chat: { threads: [], selectedThreadId: null, extraByThread: {} },
};

function parseStored(raw: string | null): PersistedAppStateV1 | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as unknown;
    if (!o || typeof o !== "object") return null;
    const rec = o as Record<string, unknown>;
    if (rec.v !== 1) return null;
    if (rec.workspaceView !== "chat" && rec.workspaceView !== "manuals") return null;
    const chat = rec.chat;
    if (!chat || typeof chat !== "object") return null;
    const c = chat as Record<string, unknown>;
    return {
      v: 1,
      workspaceView: rec.workspaceView,
      chat: {
        threads: Array.isArray(c.threads) ? (c.threads as PersistedAppStateV1["chat"]["threads"]) : [],
        selectedThreadId:
          typeof c.selectedThreadId === "string" || c.selectedThreadId === null
            ? (c.selectedThreadId as string | null)
            : null,
        extraByThread:
          c.extraByThread && typeof c.extraByThread === "object"
            ? (c.extraByThread as Record<string, PersistedMessage[]>)
            : {},
      },
    };
  } catch {
    return null;
  }
}

export function getPersistedAppState(): PersistedAppStateV1 {
  if (typeof window === "undefined") return DEFAULT_STATE;
  const parsed = parseStored(window.localStorage.getItem(STORAGE_KEY));
  return parsed ?? DEFAULT_STATE;
}

export function updatePersistedAppState(updater: (prev: PersistedAppStateV1) => PersistedAppStateV1): void {
  if (typeof window === "undefined") return;
  const next = updater(getPersistedAppState());
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // quota / private mode — ignore
  }
}

function serializeMessage(m: ChatMessage): PersistedMessage {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    ...(m.sources?.length ? { sources: m.sources } : {}),
  };
}

export function serializeChatSlice(
  threads: ChatThread[],
  selectedThreadId: string | null,
  extraByThread: Record<string, ChatMessage[]>,
): PersistedAppStateV1["chat"] {
  const threadIds = new Set(threads.map((t) => t.id));
  const extra: Record<string, PersistedMessage[]> = {};
  for (const id of threadIds) {
    const list = extraByThread[id];
    if (list?.length) extra[id] = list.map(serializeMessage);
  }
  return {
    threads: threads.map((t) => ({
      id: t.id,
      title: t.title,
      updatedAt: t.updatedAt.toISOString(),
    })),
    selectedThreadId:
      selectedThreadId && threadIds.has(selectedThreadId) ? selectedThreadId : null,
    extraByThread: extra,
  };
}

function hydrateMessage(m: PersistedMessage): ChatMessage {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    createdAt: new Date(m.createdAt),
    ...(m.sources?.length ? { sources: m.sources } : {}),
  };
}

export type HydratedChatSlice = {
  threads: ChatThread[];
  selectedThreadId: string | null;
  extraByThread: Record<string, ChatMessage[]>;
};

export function hydrateChatFromStorage(chat: PersistedAppStateV1["chat"]): HydratedChatSlice {
  const threads: ChatThread[] = (chat.threads ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    updatedAt: new Date(t.updatedAt),
  }));
  threads.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  const threadIds = new Set(threads.map((t) => t.id));
  const selectedThreadId =
    chat.selectedThreadId && threadIds.has(chat.selectedThreadId) ? chat.selectedThreadId : null;

  const extraByThread: Record<string, ChatMessage[]> = {};
  const raw = chat.extraByThread ?? {};
  for (const id of threadIds) {
    const list = raw[id];
    if (list?.length) extraByThread[id] = list.map(hydrateMessage);
  }

  return { threads, selectedThreadId, extraByThread };
}
