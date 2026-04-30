import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  getPersistedAppState,
  hydrateChatFromStorage,
  serializeChatSlice,
  updatePersistedAppState,
} from "../../../lib/persistedAppState";
import { postChat } from "../services/chatApi";
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
  const initialChat = useMemo(() => hydrateChatFromStorage(getPersistedAppState().chat), []);
  const [threads, setThreads] = useState<ChatThread[]>(initialChat.threads);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(initialChat.selectedThreadId);
  const [extraByThread, setExtraByThread] = useState<Record<string, ChatMessage[]>>(
    initialChat.extraByThread,
  );
  const [newDiagnosisFocusNonce, setNewDiagnosisFocusNonce] = useState(0);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const messages = useMemo(() => {
    if (!selectedThreadId) return [];
    return extraByThread[selectedThreadId] ?? [];
  }, [extraByThread, selectedThreadId]);

  const activeTitle = useMemo(() => {
    if (!selectedThreadId) return "Nuevo diagnóstico";
    return threads.find((t) => t.id === selectedThreadId)?.title ?? "Chat";
  }, [threads, selectedThreadId]);

  const isNewDiagnosisSession = selectedThreadId === null;

  useEffect(() => {
    updatePersistedAppState((prev) => ({
      ...prev,
      chat: serializeChatSlice(threads, selectedThreadId, extraByThread),
    }));
  }, [threads, selectedThreadId, extraByThread]);

  const startNewDiagnosis = useCallback(() => {
    setSelectedThreadId(null);
    setNewDiagnosisFocusNonce((n) => n + 1);
  }, []);

  const clearChatError = useCallback(() => {
    setChatError(null);
  }, []);

  const renameSelectedThread = useCallback(
    (nextTitle: string) => {
      if (!selectedThreadId) return;
      const title = truncateThreadTitle(nextTitle);
      setThreads((prev) =>
        prev.map((t) =>
          t.id === selectedThreadId ? { ...t, title, updatedAt: new Date() } : t,
        ),
      );
    },
    [selectedThreadId],
  );

  const sendUserMessage = useCallback(
    async (
      text: string,
      attachments: ChatAttachment[] = [],
      options?: { brand?: string | null },
    ): Promise<boolean> => {
      const trimmed = text.trim();
      const list = attachments.length ? attachments : undefined;
      if (!trimmed && !list?.length) return false;

      const titleSource = trimmed || attachments[0]?.name || "Nuevo diagnóstico";
      const now = new Date();
      let targetThreadId: string;

      if (!selectedThreadId) {
        targetThreadId = `thread-${now.getTime()}`;
        const userMsg: ChatMessage = {
          id: `local-${now.getTime()}-u`,
          role: "user",
          content: trimmed,
          createdAt: now,
          ...(list ? { attachments: list } : {}),
        };
        setThreads((prev) => [
          { id: targetThreadId, title: truncateThreadTitle(titleSource), updatedAt: now },
          ...prev,
        ]);
        setExtraByThread((prev) => ({
          ...prev,
          [targetThreadId]: [userMsg],
        }));
        setSelectedThreadId(targetThreadId);
      } else {
        targetThreadId = selectedThreadId;
        const userMsg: ChatMessage = {
          id: `local-${now.getTime()}-u`,
          role: "user",
          content: trimmed,
          createdAt: now,
          ...(list ? { attachments: list } : {}),
        };
        setThreads((prev) =>
          prev
            .map((t) => (t.id === targetThreadId ? { ...t, updatedAt: now } : t))
            .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
        );
        setExtraByThread((prev) => ({
          ...prev,
          [targetThreadId]: [...(prev[targetThreadId] ?? []), userMsg],
        }));
      }

      if (!trimmed.length) {
        setChatError(
          "Para consultar al asistente necesitás escribir una pregunta. Los adjuntos aún no se envían al backend.",
        );
        return false;
      }

      setIsChatLoading(true);
      setChatError(null);
      try {
        const { answer, sources: rawSources } = await postChat(trimmed, {
          brand: options?.brand?.trim() || undefined,
        });
        const sources = rawSources ?? [];
        const assistantMsg: ChatMessage = {
          id: `local-${Date.now()}-a`,
          role: "assistant",
          content: answer,
          createdAt: new Date(),
          ...(sources.length ? { sources } : {}),
        };
        setExtraByThread((prev) => ({
          ...prev,
          [targetThreadId]: [...(prev[targetThreadId] ?? []), assistantMsg],
        }));
        setThreads((prev) =>
          prev
            .map((t) =>
              t.id === targetThreadId ? { ...t, updatedAt: new Date() } : t,
            )
            .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()),
        );
        return true;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "No se pudo obtener respuesta. Verificá que el backend esté en ejecución.";
        setChatError(message);
        return false;
      } finally {
        setIsChatLoading(false);
      }
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
      renameSelectedThread,
      sendUserMessage,
      isChatLoading,
      chatError,
      clearChatError,
    }),
    [
      threads,
      selectedThreadId,
      messages,
      activeTitle,
      isNewDiagnosisSession,
      newDiagnosisFocusNonce,
      startNewDiagnosis,
      renameSelectedThread,
      sendUserMessage,
      isChatLoading,
      chatError,
      clearChatError,
    ],
  );

  return <ChatWorkspaceContext.Provider value={value}>{children}</ChatWorkspaceContext.Provider>;
}
