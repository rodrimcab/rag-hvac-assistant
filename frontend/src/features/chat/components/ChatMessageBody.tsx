type ChatMessageBodyProps = {
  text: string;
  className?: string;
};

/** Resalta fragmentos entre **dobles asteriscos** como negrita. */
export function ChatMessageBody({ text, className }: ChatMessageBodyProps) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return (
    <div className={className}>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
          return (
            <strong key={i} className="font-semibold">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return (
          <span key={i} className="whitespace-pre-wrap">
            {part}
          </span>
        );
      })}
    </div>
  );
}
