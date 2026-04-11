import { createContext } from "react";
import type { ChatMessage } from "../types/message.types";
import type { ChatThread } from "../types/thread.types";

export type ChatWorkspaceContextValue = {
  threads: ChatThread[];
  selectedThreadId: string | null;
  setSelectedThreadId: (id: string | null) => void;
  messages: ChatMessage[];
  activeTitle: string;
  sendUserMessage: (text: string) => void;
};

export const ChatWorkspaceContext = createContext<ChatWorkspaceContextValue | null>(null);
