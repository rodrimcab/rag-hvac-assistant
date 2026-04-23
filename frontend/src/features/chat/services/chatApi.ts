import { getApiBaseUrl } from "../../../lib/apiBaseUrl";
import type { ChatDocumentSource } from "../types/message.types";

export type ChatApiResponse = {
  answer: string;
  sources: ChatDocumentSource[];
};

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const data: unknown = await res.json();
    if (data && typeof data === "object" && "detail" in data) {
      const detail = (data as { detail: unknown }).detail;
      if (typeof detail === "string") return detail;
      if (Array.isArray(detail)) {
        const first = detail[0];
        if (first && typeof first === "object" && "msg" in first) {
          return String((first as { msg: unknown }).msg);
        }
      }
    }
  } catch {
    // ignore JSON parse errors
  }
  return res.statusText || "Request failed";
}

export async function postChat(message: string): Promise<ChatApiResponse> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    const msg = await readErrorMessage(res);
    throw new Error(msg);
  }
  return (await res.json()) as ChatApiResponse;
}
