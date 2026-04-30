export type ManualDocument = {
  file_name: string;
  size_bytes: number;
  indexed: boolean;
};

export type IngestStatus = {
  status: "idle" | "processing" | "done" | "error";
  filename: string | null;
  chunks_total: number;
  chunks_done: number;
  error_message: string | null;
  /** Backend phase while ``status === "processing"``. */
  ingest_step?: "validating" | "reading_pages" | "chunking" | "indexing" | null;
};

export type UploadAcceptedResponse = {
  filename: string;
  status: "processing";
};

