import { createContext } from "react";
import type { ChatAttachment, ChatMessage } from "../types/message.types";
import type { ChatThread } from "../types/thread.types";

export type ChatWorkspaceContextValue = {
  threads: ChatThread[];
  selectedThreadId: string | null;
  setSelectedThreadId: (id: string | null) => void;
  messages: ChatMessage[];
  activeTitle: string;
  isNewDiagnosisSession: boolean;
  newDiagnosisFocusNonce: number;
  startNewDiagnosis: () => void;
  sendUserMessage: (text: string, attachments?: ChatAttachment[]) => void;
};

export const ChatWorkspaceContext = createContext<ChatWorkspaceContextValue | null>(null);
