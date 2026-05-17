import { useEffect, useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import { ChatPanel } from "./features/chat/components/ChatPanel";
import { ManualIngestBlockingLayer } from "./features/manuals/components/ManualIngestBlockingLayer";
import { TechnicalManualsPanel } from "./features/manuals/components/TechnicalManualsPanel";
import { ProjectCreditsPanel } from "./features/settings/components/ProjectCreditsPanel";
import { MobileSidebarProvider } from "./components/providers/MobileSidebarProvider";
import { useManuals } from "./features/manuals/hooks/useManuals";
import { getPersistedAppState, updatePersistedAppState, type WorkspaceView } from "./lib/persistedAppState";

function inferBrandFromFilename(fileName: string): string {
  const stem = fileName.replace(/\.pdf$/i, "").replace(/^\d+_ServiceManual_/, "");
  return (stem.split("_")[0] || "").trim();
}

function App() {
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>(
    () => getPersistedAppState().workspaceView,
  );

  useEffect(() => {
    updatePersistedAppState((prev) => ({ ...prev, workspaceView }));
  }, [workspaceView]);
  const {
    manuals,
    ingestStatus,
    isLoading,
    error,
    upload,
    remove,
    manualsWorkflowLocked,
    isUploadingFile,
    uploadDisplayName,
    completionHold,
  } = useManuals();

  const manualsCount = manuals.filter((m) => m.indexed).length;
  const availableBrands = Array.from(
    new Set(
      manuals
        .filter((m) => m.indexed)
        .map((m) => inferBrandFromFilename(m.file_name))
        .filter((brand) => brand.length > 0),
    ),
  ).sort((a, b) => a.localeCompare(b));

  return (
    <div className="h-[100dvh] min-h-0 bg-background font-sans text-text-primary antialiased">
      <MobileSidebarProvider>
        <AppShell
          manualsCount={manualsCount}
          manualsNavActive={workspaceView === "manuals"}
          settingsNavActive={workspaceView === "settings"}
          navigationLocked={manualsWorkflowLocked}
          onManualsClick={() => setWorkspaceView("manuals")}
          onSettingsClick={() => setWorkspaceView("settings")}
          onNewDiagnosis={() => setWorkspaceView("chat")}
          onSelectThread={() => setWorkspaceView("chat")}
        >
          <ManualIngestBlockingLayer
            locked={manualsWorkflowLocked}
            isUploadingFile={isUploadingFile}
            uploadDisplayName={uploadDisplayName}
            ingestStatus={ingestStatus}
            completionHold={completionHold}
          >
            {workspaceView === "chat" ? (
              <ChatPanel availableBrands={availableBrands} interactionLocked={manualsWorkflowLocked} />
            ) : workspaceView === "manuals" ? (
              <TechnicalManualsPanel
                manuals={manuals}
                ingestStatus={ingestStatus}
                isLoading={isLoading}
                error={error}
                onUpload={upload}
                onRemove={remove}
              />
            ) : (
              <ProjectCreditsPanel />
            )}
          </ManualIngestBlockingLayer>
        </AppShell>
      </MobileSidebarProvider>
    </div>
  );
}

export default App;
