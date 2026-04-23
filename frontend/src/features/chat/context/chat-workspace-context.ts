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
  /**
   * Sends the user message, then requests an assistant reply from `POST /api/chat`.
   * Resolves `true` if the assistant reply was stored; `false` if nothing was sent or the request failed.
   */
  sendUserMessage: (text: string, attachments?: ChatAttachment[]) => Promise<boolean>;
  isChatLoading: boolean;
  chatError: string | null;
  clearChatError: () => void;
};

export const ChatWorkspaceContext = createContext<ChatWorkspaceContextValue | null>(null);
