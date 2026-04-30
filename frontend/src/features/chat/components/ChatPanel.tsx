import { useChatWorkspace } from "../hooks/useChatWorkspace";
import { ChatComposer } from "./ChatComposer";
import { ChatMessageList } from "./ChatMessageList";
import { ChatThreadHeader } from "./ChatThreadHeader";

type ChatPanelProps = {
  availableBrands: string[];
  /** While a manual is importing, disable chat actions to avoid mixed workflows. */
  interactionLocked?: boolean;
};

export function ChatPanel({ availableBrands, interactionLocked = false }: ChatPanelProps) {
  const {
    activeTitle,
    messages,
    isNewDiagnosisSession,
    isChatLoading,
    renameSelectedThread,
    selectedThreadId,
  } = useChatWorkspace();

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <ChatThreadHeader
        title={activeTitle}
        canRename={Boolean(selectedThreadId) && !interactionLocked}
        onRename={renameSelectedThread}
      />
      <ChatMessageList
        messages={messages}
        isNewDiagnosisSession={isNewDiagnosisSession}
        isAssistantLoading={isChatLoading}
      />
      <ChatComposer availableBrands={availableBrands} interactionLocked={interactionLocked} />
    </div>
  );
}
