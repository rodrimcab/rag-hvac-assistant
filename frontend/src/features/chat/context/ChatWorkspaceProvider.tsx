import { useCallback, useMemo, useState, type ReactNode } from "react";
import { getMockMessagesForThread } from "../services/message.service";
import { getMockThreads } from "../services/thread.service";
import type { ChatAttachment, ChatMessage } from "../types/message.types";
import type { ChatThread } from "../types/thread.types";
import { ChatWorkspaceContext } from "./chat-workspace-context";

type ChatWorkspaceProviderProps = {
  children: ReactNode;
};

function truncateThreadTitle(text: string, max = 52): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (!t.length) return "Nuevo diagnóstico";
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

export function ChatWorkspaceProvider({ children }: ChatWorkspaceProviderProps) {
  const [anchor] = useState(() => new Date());
  const [threads, setThreads] = useState<ChatThread[]>(() => getMockThreads(anchor));
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>("1");
  const [extraByThread, setExtraByThread] = useState<Record<string, ChatMessage[]>>({});
  const [newDiagnosisFocusNonce, setNewDiagnosisFocusNonce] = useState(0);

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

  const isNewDiagnosisSession = selectedThreadId === null;

  const startNewDiagnosis = useCallback(() => {
    setSelectedThreadId(null);
    setNewDiagnosisFocusNonce((n) => n + 1);
  }, []);

  const sendUserMessage = useCallback(
    (text: string, attachments: ChatAttachment[] = []) => {
      const trimmed = text.trim();
      const list = attachments.length ? attachments : undefined;
      if (!trimmed && !list?.length) return;

      const titleSource = trimmed || attachments[0]?.name || "Nuevo diagnóstico";

      if (!selectedThreadId) {
        const newId = `thread-${Date.now()}`;
        const now = new Date();
        const userMsg: ChatMessage = {
          id: `local-${now.getTime()}-u`,
          role: "user",
          content: trimmed,
          createdAt: now,
          ...(list ? { attachments: list } : {}),
        };
        setThreads((prev) => [
          { id: newId, title: truncateThreadTitle(titleSource), updatedAt: now },
          ...prev,
        ]);
        setExtraByThread((prev) => ({
          ...prev,
          [newId]: [userMsg],
        }));
        setSelectedThreadId(newId);
        return;
      }

      const msg: ChatMessage = {
        id: `local-${Date.now()}`,
        role: "user",
        content: trimmed,
        createdAt: new Date(),
        ...(list ? { attachments: list } : {}),
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
      isNewDiagnosisSession,
      newDiagnosisFocusNonce,
      startNewDiagnosis,
      sendUserMessage,
    }),
    [
      threads,
      selectedThreadId,
      messages,
      activeTitle,
      isNewDiagnosisSession,
      newDiagnosisFocusNonce,
      startNewDiagnosis,
      sendUserMessage,
    ],
  );

  return <ChatWorkspaceContext.Provider value={value}>{children}</ChatWorkspaceContext.Provider>;
}
