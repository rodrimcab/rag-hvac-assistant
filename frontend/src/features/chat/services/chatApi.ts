import { getApiBaseUrl } from "../../../lib/apiBaseUrl";
import type { ChatDocumentSource } from "../types/message.types";

export type ChatApiResponse = {
  answer: string;
  sources: ChatDocumentSource[];
};

type PostChatOptions = {
  brand?: string;
};

const REQUEST_TIMEOUT_MS = 30_000;
const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);

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

function mapHttpError(status: number, detail: string): string {
  if (status === 429) return "Límite temporal alcanzado en el proveedor IA. Intenta nuevamente en unos segundos.";
  if (status === 400 && detail.toLowerCase().includes("manuales indexados")) {
    return "No hay manuales indexados todavía. Sube un PDF en Manuales técnicos para empezar.";
  }
  if (status === 400 && detail.toLowerCase().includes("api key")) {
    return "Falta configurar GOOGLE_API_KEY en el backend.";
  }
  if (status >= 500) {
    return "El backend devolvió un error interno. Revisa logs del servidor e intenta otra vez.";
  }
  return detail;
}

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function requestChat(
  message: string,
  options?: PostChatOptions,
): Promise<ChatApiResponse> {
  const base = getApiBaseUrl();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${base}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        ...(options?.brand ? { brand: options.brand } : {}),
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) {
    const msg = await readErrorMessage(res);
    throw new HttpError(res.status, mapHttpError(res.status, msg));
  }
  return (await res.json()) as ChatApiResponse;
}

export async function postChat(message: string, options?: PostChatOptions): Promise<ChatApiResponse> {
  try {
    return await requestChat(message, options);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("La consulta tardó demasiado. Verifica conexión o intenta con una pregunta más específica.");
    }
    if (err instanceof HttpError) {
      if (RETRYABLE_STATUS.has(err.status)) {
        return requestChat(message, options);
      }
      throw err;
    }
    throw new Error("No se pudo obtener respuesta. Verifica que el backend esté en ejecución.");
  }
}
