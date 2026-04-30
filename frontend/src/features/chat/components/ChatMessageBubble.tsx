import { Snowflake } from "lucide-react";
import { cn } from "../../../lib/cn";
import type { ChatMessage } from "../types/message.types";
import { ChatAttachmentsStrip } from "./ChatAttachmentsStrip";
import { ChatMessageBody } from "./ChatMessageBody";
import { ChatMessageSources } from "./ChatMessageSources";

type ChatMessageBubbleProps = {
  message: ChatMessage;
  userInitials: string;
};

export function ChatMessageBubble({ message, userInitials }: ChatMessageBubbleProps) {
  const isUser = message.role === "user";

  if (isUser) {
    const hasAttachments = Boolean(message.attachments?.length);
    const hasText = Boolean(message.content.trim());

    return (
      <div className="flex justify-end gap-2">
        <div
          className={cn(
            "max-w-[min(100%,36rem)] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-white shadow-sm",
            hasAttachments && "flex flex-col gap-2",
          )}
        >
          {hasAttachments ? (
            <ChatAttachmentsStrip attachments={message.attachments!} tone="message-user" />
          ) : null}
          {hasText ? <ChatMessageBody text={message.content} /> : null}
        </div>
        <div
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-bold text-primary-active"
          aria-hidden
        >
          {userInitials}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start gap-2">
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface text-primary"
        aria-hidden
      >
        <Snowflake className="size-4" strokeWidth={2} />
      </div>
      <div
        className={cn(
          "max-w-[min(100%,36rem)] rounded-2xl rounded-bl-md border border-border bg-white px-4 py-2.5 text-sm text-text-primary shadow-sm",
        )}
      >
        <ChatMessageBody text={message.content} />
        {message.sources?.length ? <ChatMessageSources sources={message.sources} /> : null}
      </div>
    </div>
  );
}
