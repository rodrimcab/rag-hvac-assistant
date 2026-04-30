import { useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import { ChatPanel } from "./features/chat/components/ChatPanel";
import { TechnicalManualsPanel } from "./features/manuals/components/TechnicalManualsPanel";
import { MobileSidebarProvider } from "./components/providers/MobileSidebarProvider";
import { useManuals } from "./features/manuals/hooks/useManuals";

type WorkspaceView = "chat" | "manuals";

function inferBrandFromFilename(fileName: string): string {
  const stem = fileName.replace(/\.pdf$/i, "").replace(/^\d+_ServiceManual_/, "");
  return (stem.split("_")[0] || "").trim();
}

function App() {
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("chat");
  const { manuals, ingestStatus, isLoading, error, upload, remove } = useManuals();

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
          onManualsClick={() => setWorkspaceView("manuals")}
          onNewDiagnosis={() => setWorkspaceView("chat")}
          onSelectThread={() => setWorkspaceView("chat")}
        >
          {workspaceView === "chat" ? (
            <ChatPanel availableBrands={availableBrands} />
          ) : (
            <TechnicalManualsPanel
              manuals={manuals}
              ingestStatus={ingestStatus}
              isLoading={isLoading}
              error={error}
              onUpload={upload}
              onRemove={remove}
            />
          )}
        </AppShell>
      </MobileSidebarProvider>
    </div>
  );
}

export default App;
