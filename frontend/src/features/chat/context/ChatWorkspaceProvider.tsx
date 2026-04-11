import { useCallback, useMemo, useState, type ReactNode } from "react";
import { getMockMessagesForThread } from "../services/message.service";
import { getMockThreads } from "../services/thread.service";
import type { ChatMessage } from "../types/message.types";
import { ChatWorkspaceContext } from "./chat-workspace-context";

type ChatWorkspaceProviderProps = {
  children: ReactNode;
};

export function ChatWorkspaceProvider({ children }: ChatWorkspaceProviderProps) {
  const [anchor] = useState(() => new Date());
  const threads = useMemo(() => getMockThreads(anchor), [anchor]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>("1");
  const [extraByThread, setExtraByThread] = useState<Record<string, ChatMessage[]>>({});

  const baseMessages = useMemo(
    () => (selectedThreadId ? getMockMessagesForThread(selectedThreadId) : []),
    [selectedThreadId],
  );

  const messages = useMemo(() => {
    if (!selectedThreadId) return [];
    const extra = extraByThread[selectedThreadId] ?? [];
    return [...baseMessages, ...extra];
  }, [baseMessages, extraByThread, selectedThreadId]);

  const activeTitle = useMemo(() => {
    if (!selectedThreadId) return "Nuevo diagnóstico";
    return threads.find((t) => t.id === selectedThreadId)?.title ?? "Chat";
  }, [threads, selectedThreadId]);

  const sendUserMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !selectedThreadId) return;
      const msg: ChatMessage = {
        id: `local-${Date.now()}`,
        role: "user",
        content: trimmed,
        createdAt: new Date(),
      };
      setExtraByThread((prev) => ({
        ...prev,
        [selectedThreadId]: [...(prev[selectedThreadId] ?? []), msg],
      }));
    },
    [selectedThreadId],
  );

  const value = useMemo(
    () => ({
      threads,
      selectedThreadId,
      setSelectedThreadId,
      messages,
      activeTitle,
      sendUserMessage,
    }),
    [threads, selectedThreadId, messages, activeTitle, sendUserMessage],
  );

  return <ChatWorkspaceContext.Provider value={value}>{children}</ChatWorkspaceContext.Provider>;
}
