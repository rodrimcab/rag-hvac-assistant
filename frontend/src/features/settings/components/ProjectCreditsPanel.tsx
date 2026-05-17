import ucaLogo from "../../../assets/uca-logo.svg";
import { cn } from "../../../lib/cn";
import { PROJECT_CREDITS } from "../data/projectCredits";

function CreditsHeader() {
  return (
    <header className="shrink-0 border-b border-border bg-white px-4 py-2.5 sm:px-6">
      <p className="text-sm text-text-secondary">
        Créditos institucionales y equipo del proyecto de graduación.
      </p>
    </header>
  );
}

function CoverDivider({ className }: { className?: string }) {
  return <div className={cn("mx-auto h-px w-14 bg-border/80", className)} aria-hidden />;
}

export function ProjectCreditsPanel() {
  const { university, faculty, degree, title, authors, advisor, date, location } = PROJECT_CREDITS;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <CreditsHeader />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-background px-4 py-4 sm:px-6 sm:py-6">
        <article
          className={cn(
            "mx-auto max-w-xl rounded-2xl border border-border/70 bg-white px-6 py-10 shadow-sm sm:px-10 sm:py-12",
            "font-serif text-text-primary",
          )}
          aria-label="Portada del proyecto de graduación"
        >
          <div className="flex flex-col items-center text-center">
            <img
              src={ucaLogo}
              alt="Escudo UCA"
              className="h-[72px] w-auto brightness-0"
              width={53}
              height={72}
            />

            <p className="mt-6 text-[11px] font-semibold uppercase leading-snug tracking-[0.14em] text-text-primary sm:text-xs">
              {university}
            </p>

            <CoverDivider className="my-6" />

            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary sm:text-[11px]">
              {faculty}
            </p>

            <h2 className="mt-8 text-sm font-semibold uppercase leading-relaxed tracking-wide text-text-primary sm:text-[15px]">
              {title}
            </h2>

            <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.1em] text-text-secondary">
              {degree}
            </p>

            <CoverDivider className="my-8" />

            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-secondary">Por</p>

            <ul className="mt-4 space-y-2.5">
              {authors.map((name) => (
                <li
                  key={name}
                  className="text-[13px] font-medium uppercase leading-snug tracking-wide text-text-primary sm:text-sm"
                >
                  {name}
                </li>
              ))}
            </ul>

            <CoverDivider className="my-8" />

            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-secondary">
              Catedrático asesor
            </p>
            <p className="mt-4 text-[13px] font-medium uppercase leading-snug tracking-wide text-text-primary sm:text-sm">
              {advisor}
            </p>

            <CoverDivider className="my-8" />

            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">{date}</p>
            <p className="mt-2 text-[10px] uppercase tracking-[0.1em] text-text-secondary">{location}</p>
          </div>
        </article>

        <p className="mx-auto mt-6 max-w-xl text-center text-xs text-text-secondary">
          Proyecto de graduación desarrollado en el marco de la carrera de {degree}, UCA.
        </p>
      </div>
    </div>
  );
}
