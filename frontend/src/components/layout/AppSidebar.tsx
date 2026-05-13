import { X } from "lucide-react";
import { useState } from "react";
import { ChatHistoryList } from "../../features/chat/components/ChatHistoryList";
import { DeleteChatConfirmModal } from "../../features/chat/components/DeleteChatConfirmModal";
import { NewDiagnosisButton } from "../../features/chat/components/NewDiagnosisButton";
import { SidebarSearchInput } from "../../features/chat/components/SidebarSearchInput";
import { SidebarSystemNav } from "../../features/chat/components/SidebarSystemNav";
import { useChatWorkspace } from "../../features/chat/hooks/useChatWorkspace";
import { useFilteredChatThreads } from "../../features/chat/hooks/useFilteredChatThreads";
import type { ChatThread } from "../../features/chat/types/thread.types";
import { useMobileSidebar } from "../../hooks/useMobileSidebar";
import { cn } from "../../lib/cn";
import { DemoAccountSwitcher } from "../../features/demo-account/DemoAccountSwitcher";
import { SidebarAccountFooter } from "./SidebarAccountFooter";
import { SidebarBrandHeader } from "./SidebarBrandHeader";

type AppSidebarProps = {
  className?: string;
  manualsCount: number;
  manualsNavActive?: boolean;
  /** When true, chat navigation and system nav are disabled (e.g. manual import in progress). */
  navigationLocked?: boolean;
  onNewDiagnosis?: () => void;
  onManualsClick?: () => void;
  onSelectThread?: () => void;
};

export function AppSidebar({
  className,
  manualsCount,
  manualsNavActive,
  navigationLocked = false,
  onNewDiagnosis,
  onManualsClick,
  onSelectThread,
}: AppSidebarProps) {
  const { threads, selectedThreadId, setSelectedThreadId, startNewDiagnosis, deleteThread } =
    useChatWorkspace();
  const { setOpen } = useMobileSidebar();

  const handleSelectThread = (id: string) => {
    setSelectedThreadId(id);
    onSelectThread?.();
  };
  const [query, setQuery] = useState("");
  const [threadPendingDelete, setThreadPendingDelete] = useState<ChatThread | null>(null);
  const listThreads = useFilteredChatThreads(threads, query);

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-border bg-background",
        className,
      )}
    >
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-4 p-4",
          navigationLocked && "opacity-55",
        )}
      >
        <div className="flex items-center gap-2">
          <SidebarBrandHeader className="flex-1" />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className={cn(
              "rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-border-focus lg:hidden",
              navigationLocked && "relative z-20",
            )}
            aria-label="Cerrar menú"
          >
            <X className="size-5" strokeWidth={2} />
          </button>
        </div>
        <NewDiagnosisButton
          disabled={navigationLocked}
          onClick={() => {
            startNewDiagnosis();
            onNewDiagnosis?.();
          }}
        />
        <SidebarSearchInput value={query} onChange={setQuery} disabled={navigationLocked} />
        <DemoAccountSwitcher disabled={navigationLocked} />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
          <ChatHistoryList
            threads={listThreads}
            selectedId={selectedThreadId}
            onSelect={handleSelectThread}
            onRequestDelete={navigationLocked ? undefined : setThreadPendingDelete}
            disabled={navigationLocked}
          />
        </div>
      </div>

      <DeleteChatConfirmModal
        open={threadPendingDelete !== null}
        chatTitle={threadPendingDelete?.title ?? ""}
        onCancel={() => setThreadPendingDelete(null)}
        onConfirm={() => {
          if (threadPendingDelete) deleteThread(threadPendingDelete.id);
          setThreadPendingDelete(null);
        }}
      />

      <div
        className={cn(
          "shrink-0 space-y-4 border-t border-border bg-background p-4",
          navigationLocked && "pointer-events-none opacity-55",
        )}
      >
        <SidebarSystemNav
          manualsCount={manualsCount}
          manualsActive={manualsNavActive}
          onManualsClick={onManualsClick}
          disabled={navigationLocked}
        />
        <SidebarAccountFooter />
      </div>
    </aside>
  );
}
