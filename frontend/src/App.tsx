import { useCallback, useMemo, useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import { ChatPanel } from "./features/chat/components/ChatPanel";
import { TechnicalManualsPanel } from "./features/manuals/components/TechnicalManualsPanel";
import { SAMPLE_MANUALS } from "./features/manuals/sample-manuals";

type WorkspaceView = "chat" | "manuals";

function App() {
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("chat");
  const [removedManualIds, setRemovedManualIds] = useState<Set<string>>(() => new Set());

  const manualsCount = SAMPLE_MANUALS.length - removedManualIds.size;

  const handleRemoveManual = useCallback((id: string) => {
    setRemovedManualIds((prev) => new Set(prev).add(id));
  }, []);

  const manualsPanelProps = useMemo(
    () => ({
      removedIds: removedManualIds,
      onRemoveManual: handleRemoveManual,
    }),
    [removedManualIds, handleRemoveManual],
  );

  return (
    <div className="h-screen min-h-0 bg-background font-sans text-text-primary antialiased">
      <AppShell
        manualsCount={manualsCount}
        manualsNavActive={workspaceView === "manuals"}
        onManualsClick={() => setWorkspaceView("manuals")}
        onSelectThread={() => setWorkspaceView("chat")}
      >
        {workspaceView === "chat" ? (
          <ChatPanel />
        ) : (
          <TechnicalManualsPanel {...manualsPanelProps} />
        )}
      </AppShell>
    </div>
  );
}

export default App;