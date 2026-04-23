import { getApiBaseUrl } from "../../../lib/apiBaseUrl";
import type { IngestStatus, ManualDocument, UploadAcceptedResponse } from "../types/manual.types";

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const data: unknown = await res.json();
    if (data && typeof data === "object" && "detail" in data) {
      const detail = (data as { detail: unknown }).detail;
      if (typeof detail === "string") return detail;
    }
  } catch {
    // ignore JSON parse errors
  }
  return res.statusText || "Error desconocido";
}

export async function listManuals(): Promise<ManualDocument[]> {
  const res = await fetch(`${getApiBaseUrl()}/api/documents`);
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json() as Promise<ManualDocument[]>;
}

export async function getIngestStatus(): Promise<IngestStatus> {
  const res = await fetch(`${getApiBaseUrl()}/api/documents/ingest-status`);
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json() as Promise<IngestStatus>;
}

export async function uploadManual(file: File): Promise<UploadAcceptedResponse> {
  const form = new FormData();
  form.append("file", file, file.name);
  const res = await fetch(`${getApiBaseUrl()}/api/documents/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(await readErrorMessage(res));
  return res.json() as Promise<UploadAcceptedResponse>;
}

export async function deleteManual(filename: string): Promise<void> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/documents/${encodeURIComponent(filename)}`,
    { method: "DELETE" },
  );
  if (!res.ok) throw new Error(await readErrorMessage(res));
}
