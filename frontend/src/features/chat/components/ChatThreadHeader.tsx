type ChatThreadHeaderProps = {
  title: string;
};

export function ChatThreadHeader({ title }: ChatThreadHeaderProps) {
  return (
    <header className="shrink-0 border-b border-border bg-white px-4 py-3 sm:px-6 sm:py-3.5">
      <h1 className="truncate text-base font-semibold tracking-tight text-text-primary sm:text-lg">
        {title}
      </h1>
    </header>
  );
}
