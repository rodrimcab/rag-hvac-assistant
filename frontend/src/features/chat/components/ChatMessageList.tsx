import { Fragment } from "react";
import { useAuth } from "../../../hooks/useAuth";
import type { ChatMessage } from "../types/message.types";
import { formatDaySeparatorLabel } from "../utils/formatDaySeparatorLabel";
import { sameCalendarDay } from "../utils/sameCalendarDay";
import { ChatMessageBubble } from "./ChatMessageBubble";

type ChatMessageListProps = {
  messages: ChatMessage[];
  isNewDiagnosisSession?: boolean;
};

function DaySeparator({ date }: { date: Date }) {
  return (
    <div className="flex justify-center py-3">
      <span className="rounded-full bg-surface/80 px-3 py-1 text-xs font-medium text-text-secondary capitalize">
        {formatDaySeparatorLabel(date)}
      </span>
    </div>
  );
}

export function ChatMessageList({ messages, isNewDiagnosisSession }: ChatMessageListProps) {
  const { user } = useAuth();
  const initials = user?.initials ?? "?";

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center sm:px-6">
        <p className="max-w-sm text-sm leading-relaxed text-text-secondary">
          {isNewDiagnosisSession
            ? "Describí el síntoma, el modelo del equipo o el código de error para iniciar un diagnóstico nuevo."
            : "No hay mensajes en este diagnóstico."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2 py-3 sm:px-4 sm:py-4">
      {messages.map((message, index) => {
        const prev = messages[index - 1];
        const showSeparator = !prev || !sameCalendarDay(prev.createdAt, message.createdAt);

        return (
          <Fragment key={message.id}>
            {showSeparator ? <DaySeparator date={message.createdAt} /> : null}
            <ChatMessageBubble message={message} userInitials={initials} />
          </Fragment>
        );
      })}
    </div>
  );
}
