import { useState } from "react";
import { ChatHistoryList } from "../../features/chat/components/ChatHistoryList";
import { NewDiagnosisButton } from "../../features/chat/components/NewDiagnosisButton";
import { SidebarSearchInput } from "../../features/chat/components/SidebarSearchInput";
import { SidebarSystemNav } from "../../features/chat/components/SidebarSystemNav";
import { useChatThreads } from "../../features/chat/hooks/useChatThreads";
import { useFilteredChatThreads } from "../../features/chat/hooks/useFilteredChatThreads";
import { cn } from "../../lib/cn";
import { SidebarAccountFooter } from "./SidebarAccountFooter";
import { SidebarBrandHeader } from "./SidebarBrandHeader";

type AppSidebarProps = {
  className?: string;
  onNewDiagnosis?: () => void;
  onManualsClick?: () => void;
  onSettingsClick?: () => void;
};

export function AppSidebar({
  className,
  onNewDiagnosis,
  onManualsClick,
  onSettingsClick,
}: AppSidebarProps) {
  const threads = useChatThreads();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>("1");
  const listThreads = useFilteredChatThreads(threads, query);

  return (
    <aside
      className={cn(
        "flex h-full w-72 shrink-0 flex-col border-r border-border bg-background",
        className,
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
        <SidebarBrandHeader />
        <NewDiagnosisButton onClick={onNewDiagnosis} />
        <SidebarSearchInput value={query} onChange={setQuery} />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
          <ChatHistoryList threads={listThreads} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
      </div>

      <div className="shrink-0 space-y-4 border-t border-border bg-background p-4">
        <SidebarSystemNav onManualsClick={onManualsClick} onSettingsClick={onSettingsClick} />
        <SidebarAccountFooter />
      </div>
    </aside>
  );
}
