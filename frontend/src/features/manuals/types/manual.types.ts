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
};

export type UploadAcceptedResponse = {
  filename: string;
  status: "processing";
};
