import { X } from "lucide-react";
import { useState } from "react";
import { ChatHistoryList } from "../../features/chat/components/ChatHistoryList";
import { NewDiagnosisButton } from "../../features/chat/components/NewDiagnosisButton";
import { SidebarSearchInput } from "../../features/chat/components/SidebarSearchInput";
import { SidebarSystemNav } from "../../features/chat/components/SidebarSystemNav";
import { useChatWorkspace } from "../../features/chat/hooks/useChatWorkspace";
import { useFilteredChatThreads } from "../../features/chat/hooks/useFilteredChatThreads";
import { useMobileSidebar } from "../../hooks/useMobileSidebar";
import { cn } from "../../lib/cn";
import { SidebarAccountFooter } from "./SidebarAccountFooter";
import { SidebarBrandHeader } from "./SidebarBrandHeader";

type AppSidebarProps = {
  className?: string;
  manualsCount: number;
  manualsNavActive?: boolean;
  onNewDiagnosis?: () => void;
  onManualsClick?: () => void;
  onSelectThread?: () => void;
  onSettingsClick?: () => void;
};

export function AppSidebar({
  className,
  manualsCount,
  manualsNavActive,
  onNewDiagnosis,
  onManualsClick,
  onSelectThread,
  onSettingsClick,
}: AppSidebarProps) {
  const { threads, selectedThreadId, setSelectedThreadId, startNewDiagnosis } = useChatWorkspace();
  const { setOpen } = useMobileSidebar();

  const handleSelectThread = (id: string) => {
    setSelectedThreadId(id);
    onSelectThread?.();
  };
  const [query, setQuery] = useState("");
  const listThreads = useFilteredChatThreads(threads, query);

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-border bg-background",
        className,
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
        <div className="flex items-center gap-2">
          <SidebarBrandHeader className="flex-1" />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-border-focus lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="size-5" strokeWidth={2} />
          </button>
        </div>
        <NewDiagnosisButton
          onClick={() => {
            startNewDiagnosis();
            onNewDiagnosis?.();
          }}
        />
        <SidebarSearchInput value={query} onChange={setQuery} />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
          <ChatHistoryList
            threads={listThreads}
            selectedId={selectedThreadId}
            onSelect={handleSelectThread}
          />
        </div>
      </div>

      <div className="shrink-0 space-y-4 border-t border-border bg-background p-4">
        <SidebarSystemNav
          manualsCount={manualsCount}
          manualsActive={manualsNavActive}
          onManualsClick={onManualsClick}
          onSettingsClick={onSettingsClick}
        />
        <SidebarAccountFooter />
      </div>
    </aside>
  );
}
