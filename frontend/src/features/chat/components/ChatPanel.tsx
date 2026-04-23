import { useChatWorkspace } from "../hooks/useChatWorkspace";
import { ChatComposer } from "./ChatComposer";
import { ChatMessageList } from "./ChatMessageList";
import { ChatThreadHeader } from "./ChatThreadHeader";

export function ChatPanel() {
  const { activeTitle, messages, isNewDiagnosisSession, isChatLoading } = useChatWorkspace();

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <ChatThreadHeader title={activeTitle} />
      <ChatMessageList
        messages={messages}
        isNewDiagnosisSession={isNewDiagnosisSession}
        isAssistantLoading={isChatLoading}
      />
      <ChatComposer />
    </div>
  );
}
