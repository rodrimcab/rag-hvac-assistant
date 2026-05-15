import { getApiBaseUrl } from "../../../lib/apiBaseUrl";
import { demoOwnerFetchHeaders } from "../../../lib/demoAccounts";
import { parseBackendDateTime } from "../../../lib/parseBackendDateTime";
import type { ChatDocumentSource } from "../types/message.types";
import type { ChatMessage } from "../types/message.types";
import type { ChatThread } from "../types/thread.types";

export type ApiConversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type ApiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  sources?: ChatDocumentSource[] | null;
};

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const data: unknown = await res.json();
    if (data && typeof data === "object" && "detail" in data) {
      const detail = (data as { detail: unknown }).detail;
      if (typeof detail === "string") return detail;
    }
  } catch {
    // ignore
  }
  return res.statusText || "Request failed";
}

export function mapApiConversationToThread(row: ApiConversation): ChatThread {
  return { id: row.id, title: row.title, updatedAt: parseBackendDateTime(row.updated_at) };
}

export function mapApiMessageToChatMessage(row: ApiMessage): ChatMessage {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: parseBackendDateTime(row.created_at),
    ...(row.sources?.length ? { sources: row.sources } : {}),
  };
}

export async function listConversations(demoOwnerId: string): Promise<ApiConversation[]> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/conversations`, {
    headers: demoOwnerFetchHeaders(demoOwnerId),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return (await res.json()) as ApiConversation[];
}

export async function createConversation(
  demoOwnerId: string,
  body?: { title?: string | null },
): Promise<ApiConversation> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/conversations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...demoOwnerFetchHeaders(demoOwnerId),
    },
    body: JSON.stringify({ title: body?.title ?? null }),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  return (await res.json()) as ApiConversation;
}

export async function getConversationMessages(
  demoOwnerId: string,
  conversationId: string,
): Promise<ApiMessage[]> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/conversations/${encodeURIComponent(conversationId)}/messages`, {
    headers: demoOwnerFetchHeaders(demoOwnerId),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
  const data = (await res.json()) as { messages?: ApiMessage[] };
  return Array.isArray(data.messages) ? data.messages : [];
}

export async function deleteConversation(demoOwnerId: string, conversationId: string): Promise<void> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/conversations/${encodeURIComponent(conversationId)}`, {
    method: "DELETE",
    headers: demoOwnerFetchHeaders(demoOwnerId),
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(await readErrorMessage(res));
  }
}

export async function patchConversationTitle(
  demoOwnerId: string,
  conversationId: string,
  title: string,
): Promise<void> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/conversations/${encodeURIComponent(conversationId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...demoOwnerFetchHeaders(demoOwnerId),
    },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }
}
