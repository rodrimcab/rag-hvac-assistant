import { BookOpen, Settings, type LucideIcon } from "lucide-react";
import { SectionLabel } from "../../../components/ui/SectionLabel";
import { cn } from "../../../lib/cn";

type NavButtonProps = {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  badge?: number;
};

function SystemNavButton({ icon: Icon, label, onClick, badge }: NavButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-text-primary transition-colors",
        "hover:bg-surface/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-border-focus",
      )}
    >
      <Icon className="size-4 shrink-0 text-text-secondary" strokeWidth={2} aria-hidden />
      <span className="min-w-0 flex-1">{label}</span>
      {badge != null && badge > 0 ? (
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </button>
  );
}

type SidebarSystemNavProps = {
  manualsCount?: number;
  onManualsClick?: () => void;
  onSettingsClick?: () => void;
  className?: string;
};

export function SidebarSystemNav({
  manualsCount = 24,
  onManualsClick,
  onSettingsClick,
  className,
}: SidebarSystemNavProps) {
  return (
    <nav className={cn("flex flex-col gap-1", className)} aria-label="Sistema">
      <SectionLabel>Sistema</SectionLabel>
      <SystemNavButton
        icon={BookOpen}
        label="Manuales técnicos"
        onClick={onManualsClick}
        badge={manualsCount}
      />
      <SystemNavButton icon={Settings} label="Ajustes" onClick={onSettingsClick} />
    </nav>
  );
}
