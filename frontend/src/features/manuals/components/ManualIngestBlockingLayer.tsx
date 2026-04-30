import type { ReactNode } from "react";
import type { IngestStatus } from "../types/manual.types";
import { ManualImportProgressDock } from "./ManualImportProgressDock";

type ManualIngestBlockingLayerProps = {
  children: ReactNode;
  locked: boolean;
  isUploadingFile: boolean;
  uploadDisplayName: string | null;
  ingestStatus: IngestStatus;
  completionHold: boolean;
};

export function ManualIngestBlockingLayer({
  children,
  locked,
  isUploadingFile,
  uploadDisplayName,
  ingestStatus,
  completionHold,
}: ManualIngestBlockingLayerProps) {
  const filename = uploadDisplayName ?? ingestStatus.filename;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {children}

      {locked ? (
        <>
          <div
            className="absolute inset-0 z-[15] bg-white/60 backdrop-blur-[1px]"
            aria-hidden="true"
          />
          <div className="absolute bottom-0 left-0 right-0 z-[25] flex justify-center px-3 pb-4 pt-6 sm:px-6">
            <ManualImportProgressDock
              filename={filename}
              isUploadingFile={isUploadingFile}
              ingestStatus={ingestStatus}
              completionHold={completionHold}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
