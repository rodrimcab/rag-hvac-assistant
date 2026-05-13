import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  getPersistedAppState,
  serializeChatSlice,
  updatePersistedAppState,
} from "../../../lib/persistedAppState";
import { postChat } from "../services/chatApi";
import {
  createConversation,
  deleteConversation,
  getConversationMessages,
  listConversations,
  mapApiConversationToThread,
  mapApiMessageToChatMessage,
  patchConversationTitle,
} from "../services/conversationsApi";
import { useDemoAccount } from "../../demo-account/DemoAccountProvider";
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
  const { ownerId } = useDemoAccount();
  const persistedSelectedId = useMemo(() => getPersistedAppState().chat.selectedThreadId, []);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(persistedSelectedId);
  const [extraByThread, setExtraByThread] = useState<Record<string, ChatMessage[]>>({});
  const [newDiagnosisFocusNonce, setNewDiagnosisFocusNonce] = useState(0);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const skipNextMessageFetchRef = useRef(false);
  const prevDemoOwnerRef = useRef<string | null>(null);

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

  useEffect(() => {
    const prev = prevDemoOwnerRef.current;
    const isAccountSwitch = prev !== null && prev !== ownerId;
    prevDemoOwnerRef.current = ownerId;

    if (isAccountSwitch) {
      setThreads([]);
      setExtraByThread({});
      setSelectedThreadId(null);
      updatePersistedAppState((prevState) => ({
        ...prevState,
        chat: { threads: [], selectedThreadId: null, extraByThread: {} },
      }));
    }

    let cancelled = false;
    (async () => {
      try {
        const rows = await listConversations(ownerId);
        if (cancelled) return;
        const mapped = rows.map(mapApiConversationToThread);
        setThreads(mapped);
        if (!isAccountSwitch) {
          setSelectedThreadId((cur) => {
            if (cur && !mapped.some((t) => t.id === cur)) return null;
            return cur;
          });
        }
      } catch {
        // Backend no disponible: el chat mostrará error al enviar.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ownerId]);

  useEffect(() => {
    if (!selectedThreadId) return;
    if (skipNextMessageFetchRef.current) {
      skipNextMessageFetchRef.current = false;
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const rows = await getConversationMessages(ownerId, selectedThreadId);
        if (cancelled) return;
        setExtraByThread((prev) => ({
          ...prev,
          [selectedThreadId]: rows.map(mapApiMessageToChatMessage),
        }));
      } catch {
        // Mantener mensajes locales si existen.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedThreadId, ownerId]);

  const startNewDiagnosis = useCallback(() => {
    setSelectedThreadId(null);
    setNewDiagnosisFocusNonce((n) => n + 1);
  }, []);

  const clearChatError = useCallback(() => {
    setChatError(null);
  }, []);

  const renameSelectedThread = useCallback(
    async (nextTitle: string) => {
      if (!selectedThreadId) return;
      const title = truncateThreadTitle(nextTitle);
      try {
        await patchConversationTitle(ownerId, selectedThreadId, title);
      } catch {
        // Si falla el backend, igual actualizamos el título en UI local.
      }
      setThreads((prev) =>
        prev.map((t) =>
          t.id === selectedThreadId ? { ...t, title, updatedAt: new Date() } : t,
        ),
      );
    },
    [selectedThreadId, ownerId],
  );

  const deleteThread = useCallback(async (threadId: string) => {
    try {
      await deleteConversation(ownerId, threadId);
    } catch {
      setChatError("No se pudo eliminar la conversación. Intentá de nuevo.");
      return;
    }
    setThreads((prev) => prev.filter((t) => t.id !== threadId));
    setExtraByThread((prev) => {
      if (!(threadId in prev)) return prev;
      const next = { ...prev };
      delete next[threadId];
      return next;
    });
    setSelectedThreadId((current) => (current === threadId ? null : current));
  }, [ownerId]);

  const sendUserMessage = useCallback(
    async (
      text: string,
      attachments: ChatAttachment[] = [],
      options?: { brand?: string | null },
    ): Promise<boolean> => {
      const trimmed = text.trim();
      const list = attachments.length ? attachments : undefined;
      if (!trimmed && !list?.length) return false;

      if (!trimmed.length) {
        setChatError("Para consultar al asistente necesitás escribir una pregunta.");
        return false;
      }

      const titleSource = trimmed || attachments[0]?.name || "Nuevo diagnóstico";
      const now = new Date();
      const wasNewSession = selectedThreadId === null;
      let targetThreadId: string;

      if (!selectedThreadId) {
        let created;
        try {
          created = await createConversation(ownerId, { title: truncateThreadTitle(titleSource) });
        } catch {
          setChatError("No se pudo iniciar el diagnóstico. Verificá que el backend esté en ejecución.");
          return false;
        }
        targetThreadId = created.id;
        const thread = mapApiConversationToThread(created);
        const userMsg: ChatMessage = {
          id: `local-${now.getTime()}-u`,
          role: "user",
          content: trimmed,
          createdAt: now,
          ...(list ? { attachments: list } : {}),
        };
        setThreads((prev) =>
          [thread, ...prev.filter((t) => t.id !== thread.id)].sort(
            (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
          ),
        );
        setExtraByThread((prev) => ({
          ...prev,
          [targetThreadId]: [userMsg],
        }));
        skipNextMessageFetchRef.current = true;
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

      setIsChatLoading(true);
      setChatError(null);
      try {
        const { answer, sources: rawSources } = await postChat(trimmed, {
          brand: options?.brand?.trim() || undefined,
          conversationId: targetThreadId,
          demoOwnerId: ownerId,
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
        try {
          const serverMsgs = await getConversationMessages(ownerId, targetThreadId);
          if (serverMsgs.length) {
            setExtraByThread((prev) => ({
              ...prev,
              [targetThreadId]: serverMsgs.map(mapApiMessageToChatMessage),
            }));
          }
        } catch {
          // mantener estado optimista
        }
        return true;
      } catch (err) {
        if (wasNewSession) {
          void deleteConversation(ownerId, targetThreadId).catch(() => {});
          setThreads((prev) => prev.filter((t) => t.id !== targetThreadId));
          setExtraByThread((prev) => {
            if (!(targetThreadId in prev)) return prev;
            const next = { ...prev };
            delete next[targetThreadId];
            return next;
          });
          setSelectedThreadId(null);
        }
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
    [selectedThreadId, ownerId],
  );

  const value = useMemo(
    () => ({
      threads,
      selectedThreadId,
      setSelectedThreadId,
      deleteThread,
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
      deleteThread,
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
