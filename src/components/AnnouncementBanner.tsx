import { useMemo, useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { X, Megaphone } from "lucide-react";
import { useAdmin, announcementIsActive, type Audience } from "@/lib/admin-store";
import { AdminIcon } from "@/components/AdminIcon";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "hh_dismissed_announcements_v1";

function loadDismissed(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(DISMISS_KEY) || "[]"); } catch { return []; }
}

export function AnnouncementBanner({ audience = "all" as Audience }: { audience?: Audience }) {
  const { state } = useAdmin();
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => { setDismissed(loadDismissed()); }, []);

  const active = useMemo(() => {
    if (!state.flags.announcements) return [];
    return state.announcements
      .filter(announcementIsActive)
      .filter((a) => a.audience === "all" || a.audience === audience)
      .filter((a) => !dismissed.includes(a.id))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned));
  }, [state.announcements, state.flags.announcements, audience, dismissed]);

  if (active.length === 0) return null;

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
  };

  return (
    <div className="space-y-2">
      {active.map((a) => (
        <div key={a.id} className="flex items-start gap-3 rounded-lg border border-[var(--brand)]/40 bg-[var(--brand)]/10 p-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[var(--brand-dark)] text-white">
            <AdminIcon name={a.icon || "megaphone"} className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[var(--brand-dark)] flex items-center gap-2">
              {a.pinned && <span className="rounded bg-[var(--brand-dark)] text-white text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5">Pinned</span>}
              {a.headline}
            </p>
            <p className="mt-0.5 text-sm text-foreground/80">{a.body}</p>
            {a.ctaLabel && a.ctaHref && (
              <Button asChild size="sm" variant="link" className="h-auto px-0 mt-1">
                <Link to={a.ctaHref}>{a.ctaLabel} →</Link>
              </Button>
            )}
          </div>
          {a.dismissible && (
            <button type="button" aria-label="Dismiss announcement" onClick={() => dismiss(a.id)}
              className="rounded-md p-1 hover:bg-black/5 text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export function AnnouncementBannerFallback() {
  return (
    <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground flex items-center gap-2">
      <Megaphone className="h-3.5 w-3.5" /> No active announcements.
    </div>
  );
}
