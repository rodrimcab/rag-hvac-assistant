import { useChatWorkspace } from "../hooks/useChatWorkspace";
import { ChatComposer } from "./ChatComposer";
import { ChatMessageList } from "./ChatMessageList";
import { ChatThreadHeader } from "./ChatThreadHeader";

export function ChatPanel() {
  const { activeTitle, messages, isNewDiagnosisSession } = useChatWorkspace();

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <ChatThreadHeader title={activeTitle} />
      <ChatMessageList messages={messages} isNewDiagnosisSession={isNewDiagnosisSession} />
      <ChatComposer />
    </div>
  );
}
