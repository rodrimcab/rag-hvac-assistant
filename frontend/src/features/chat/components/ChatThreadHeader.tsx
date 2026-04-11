type ChatThreadHeaderProps = {
  title: string;
};

export function ChatThreadHeader({ title }: ChatThreadHeaderProps) {
  return (
    <header className="shrink-0 border-b border-border bg-white px-6 py-3.5">
      <h1 className="truncate text-lg font-semibold tracking-tight text-text-primary">{title}</h1>
    </header>
  );
}
