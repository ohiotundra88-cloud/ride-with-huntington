import { Check, X, AlertCircle, PartyPopper } from "lucide-react";
import {
  trackerPhases, type FundraiserRequest, type TrackerPhase,
} from "@/lib/fundraiser-requests.shared";

function dotClasses(p: TrackerPhase) {
  if (p.state === "declined") return "bg-destructive text-destructive-foreground border-destructive";
  if (p.state === "changes") return "bg-amber-500 text-white border-amber-500";
  if (p.state === "done") return "bg-[var(--brand)] text-[var(--brand-dark)] border-[var(--brand)]";
  if (p.state === "current") return "bg-background text-[var(--brand-dark)] border-[var(--brand)] ring-4 ring-[var(--brand)]/25 animate-pulse";
  return "bg-muted text-muted-foreground border-border";
}

function railClasses(p: TrackerPhase) {
  if (p.state === "declined") return "bg-destructive";
  if (p.state === "changes") return "bg-amber-400";
  if (p.state === "done") return "bg-[var(--brand)]";
  return "bg-border";
}

function DotIcon({ phase }: { phase: TrackerPhase }) {
  if (phase.state === "declined") return <X className="h-3.5 w-3.5" />;
  if (phase.state === "changes") return <AlertCircle className="h-3.5 w-3.5" />;
  if (phase.state === "done") return <Check className="h-3.5 w-3.5" strokeWidth={3} />;
  if (phase.key === "calendar") return <PartyPopper className="h-3.5 w-3.5" />;
  return <span className="h-1.5 w-1.5 rounded-full bg-current" />;
}

export function ApprovalTracker({ request }: { request: FundraiserRequest }) {
  const { phases, message, updatedLabel } = trackerPhases(request);

  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      {/* Horizontal rail (sm and up) */}
      <ol className="hidden sm:flex sm:items-start">
        {phases.map((p, i) => (
          <li key={p.key} className="relative flex flex-1 flex-col items-center last:flex-none last:w-24">
            {i < phases.length - 1 && (
              <span
                aria-hidden
                className={`absolute left-1/2 top-3.5 h-1 w-full -translate-y-1/2 rounded-full ${railClasses(p)}`}
              />
            )}
            <span
              className={`relative z-10 grid h-7 w-7 place-items-center rounded-full border-2 ${dotClasses(p)}`}
            >
              <DotIcon phase={p} />
            </span>
            <span className="mt-2 text-center text-[11px] font-semibold leading-tight text-[var(--brand-dark)]">
              {p.label}
            </span>
            {p.detail && <span className="text-center text-[10px] text-muted-foreground">{p.detail}</span>}
            {p.chips && (
              <span className="mt-1.5 flex flex-wrap justify-center gap-1">
                {p.chips.map((c) => (
                  <span
                    key={c.label}
                    className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                      c.state === "done"
                        ? "bg-[var(--brand)]/25 text-[var(--brand-dark)]"
                        : c.state === "changes"
                          ? "bg-amber-100 text-amber-800"
                          : c.state === "declined"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {c.label}
                  </span>
                ))}
              </span>
            )}
          </li>
        ))}
      </ol>

      {/* Vertical timeline (mobile) */}
      <ol className="space-y-3 sm:hidden">
        {phases.map((p, i) => (
          <li key={p.key} className="relative flex gap-3 pb-1">
            {i < phases.length - 1 && (
              <span aria-hidden className={`absolute left-3.5 top-7 h-[calc(100%-1rem)] w-1 -translate-x-1/2 rounded-full ${railClasses(p)}`} />
            )}
            <span className={`relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 ${dotClasses(p)}`}>
              <DotIcon phase={p} />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-[var(--brand-dark)]">{p.label}</span>
              {p.detail && <span className="block text-[11px] text-muted-foreground">{p.detail}</span>}
              {p.chips && (
                <span className="mt-1 flex flex-wrap gap-1">
                  {p.chips.map((c) => (
                    <span
                      key={c.label}
                      className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                        c.state === "done"
                          ? "bg-[var(--brand)]/25 text-[var(--brand-dark)]"
                          : c.state === "changes"
                            ? "bg-amber-100 text-amber-800"
                            : c.state === "declined"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {c.label}
                    </span>
                  ))}
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>

      <p className="mt-4 text-sm font-medium text-[var(--brand-dark)]">{message}</p>
      {updatedLabel && <p className="mt-0.5 text-[11px] text-muted-foreground">Updated {updatedLabel}</p>}
    </div>
  );
}
