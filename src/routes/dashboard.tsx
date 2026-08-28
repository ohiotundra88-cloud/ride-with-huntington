import { createFileRoute, Link } from "@tanstack/react-router";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useStore, type Registration } from "@/lib/store";
import {
  ArrowRight, CalendarClock, CheckCircle2, ChevronDown, Clock,
  DollarSign, ListChecks, MessageSquare, MapPin, Users, CalendarDays,
  Lock as LockIcon, Pencil, Check, RotateCcw,
} from "lucide-react";
import { openConcierge } from "@/components/Concierge";
import { RIDE_WEEKEND_DATE, timelineSections, type ReadinessStatus } from "@/lib/mock-data";
import { useAdmin, readinessScore, journeyCopyDefaults, type EditableReadinessItem, type EditableTimelineItem } from "@/lib/admin-store";
import { AdminIcon } from "@/components/AdminIcon";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { ApiManagedField } from "@/components/ApiManagedField";
import { InlineEditText } from "@/components/InlineEditText";
import { toast } from "sonner";

/** True when the signed-in Super User has switched on inline text editing. */
const EditCtx = createContext(false);
const useEditing = () => useContext(EditCtx);

/** Hooks for committing inline edits back into the admin store. */
function useJourneyEdits() {
  const { state, setState, audit } = useAdmin();
  return {
    copy: { ...journeyCopyDefaults, ...state.journeyCopy },
    setCopy: (key: string, value: string) => {
      setState((s) => ({ ...s, journeyCopy: { ...s.journeyCopy, [key]: value } }));
      audit({ action: "update", entity: "Journey copy", entityId: key, detail: value });
    },
    setReadiness: (id: string, patch: Partial<EditableReadinessItem>) => {
      setState((s) => ({
        ...s,
        readiness: s.readiness.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r)),
      }));
      audit({ action: "update", entity: "Readiness", entityId: id, detail: Object.keys(patch).join(", ") });
    },
    setTimeline: (id: string, patch: Partial<EditableTimelineItem>) => {
      setState((s) => ({
        ...s,
        timeline: s.timeline.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t)),
      }));
      audit({ action: "update", entity: "Timeline", entityId: id, detail: Object.keys(patch).join(", ") });
    },
    setFamilySection: (id: string, patch: { title?: string; body?: string }) => {
      setState((s) => ({
        ...s,
        family: { ...s.family, sections: s.family.sections.map((x) => (x.id === id ? { ...x, ...patch } : x)) },
      }));
      audit({ action: "update", entity: "Family section", entityId: id, detail: Object.keys(patch).join(", ") });
    },
  };
}


export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "My Journey — Team Huntington Hub" },
      { name: "description", content: "Your Ride Weekend Command Center: readiness, timeline, and quick actions." },
      { property: "og:title", content: "My Journey — Team Huntington Hub" },
      { property: "og:description", content: "Your Ride Weekend Command Center." },
    ],
  }),
  component: DashboardPage,
});

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function useCountdown(iso: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const diff = new Date(iso).getTime() - now;
  return {
    days: Math.max(0, Math.floor(diff / 86_400_000)),
    hours: Math.max(0, Math.floor((diff % 86_400_000) / 3_600_000)),
    past: diff <= 0,
  };
}

const statusStyles: Record<ReadinessStatus, { label: string; className: string }> = {
  complete: { label: "Complete", className: "bg-[var(--brand)]/20 text-[var(--brand-dark)] border-[var(--brand)]/40" },
  reserved: { label: "Reserved", className: "bg-[var(--brand)]/15 text-[var(--brand-dark)] border-[var(--brand)]/30" },
  in_progress: { label: "In progress", className: "bg-amber-100 text-amber-900 border-amber-200" },
  action_needed: { label: "Action needed", className: "bg-orange-100 text-orange-900 border-orange-200" },
  ordered: { label: "Ordered", className: "bg-sky-100 text-sky-900 border-sky-200" },
  not_applicable: { label: "Not applicable", className: "bg-muted text-muted-foreground border-border" },
};

/** Readiness card id -> registration wizard step key for deep linking. */
const REGISTER_STEP_BY_CARD: Record<string, "A" | "B" | "C" | "D" | "E" | "F" | undefined> = {
  pelotonia: "B",
  hotel: "C",
  travel: "C",
  bike: "D",
  apparel: "E",
  mailing: "E",
  volunteer: "A",
};

/**
 * Presentation-only overlay: derive readiness card status/detail from the
 * participant's actual registration answers. Seeded demo content remains the
 * fallback for any step the participant hasn't answered yet.
 */
function mergeReadinessWithRegistration(
  items: EditableReadinessItem[],
  reg: Registration
): EditableReadinessItem[] {
  const participation = reg.participation;
  const isRider = participation === "rider" || participation === "both";
  const isVolunteer = participation === "volunteer" || participation === "both";

  return items.map((item) => {
    const over = (status: ReadinessStatus, detail?: string, ctaLabel?: string): EditableReadinessItem => ({
      ...item,
      status,
      detail: detail ?? item.detail,
      ctaLabel: ctaLabel ?? item.ctaLabel,
    });

    switch (item.id) {
      case "pelotonia": {
        const p = reg.pelotonia;
        if (p.status === "complete") {
          return over("complete", p.confirmation ? `Registered · Rider ID ${p.confirmation}` : "Pelotonia registration confirmed.", "View registration");
        }
        if (p.status === "pending") return over("in_progress", "Pelotonia registration started — add your Rider ID and HB number.", "Finish registration");
        return item;
      }
      case "hotel": {
        const t = reg.travel;
        if (t.needs === "none") return over("not_applicable", "No travel or hotel needed.", "Update travel");
        if (t.status === "complete") {
          const detail = t.hotelName
            ? `${t.hotelName}${t.hotelCheckIn ? ` · ${t.hotelCheckIn} – ${t.hotelCheckOut}` : ""}`
            : "Travel and hotel details confirmed.";
          return over("reserved", detail, "View travel");
        }
        if (t.status === "pending") return over("in_progress", "Travel details started — confirm your dates.", "Finish travel");
        if (participation) return over("action_needed", "Add your travel and hotel plans before Jul 22.", "Add travel");
        return item;
      }
      case "bike": {
        const b = reg.bike;
        if (participation && !isRider) return over("not_applicable", "You're registered as a Volunteer — no bike needed.", "View bike step");
        if (b.needs === "no") return over("complete", "Bringing your own bike — no rental needed.", "Update bike plan");
        if (b.needs === "yes") {
          if (b.status === "complete") {
            const specs = [b.bikeType, b.bikeSize && `Size ${b.bikeSize}`, b.pedals].filter(Boolean).join(" · ");
            return over("reserved", specs ? `Rental requested · ${specs}` : "Rental requested.", "View bike details");
          }
          return over("action_needed", "Finish your rental details — size, type, pedals and dates.", "Finish bike rental");
        }
        if (b.needs === "unsure") return over("in_progress", "Still deciding — confirm your bike plan before Jul 22.", "Decide bike plan");
        return item;
      }
      case "volunteer": {
        if (!participation) return item;
        if (!isVolunteer) return over("not_applicable", "You're registered as a Rider — no shift needed.", item.ctaLabel);
        return over("in_progress", "Volunteer shift assignments open closer to Ride Weekend.", "Volunteer info");
      }
      case "apparel": {
        const a = reg.apparel;
        if (a.status === "complete") {
          const bits = [a.jerseyStyle && a.jerseyStyle.replace("-", " "), a.jerseySize && `jersey (${a.jerseySize})`].filter(Boolean).join(" ");
          return over("ordered", bits ? `${bits.charAt(0).toUpperCase() + bits.slice(1)} · confirmed` : "Apparel selections confirmed.", "View apparel");
        }
        if (a.status === "pending") return over("in_progress", "Apparel started — confirm sizes and mailing address.", "Finish apparel");
        return item;
      }
      default:
        return item;
    }
  });
}


function DashboardPage() {
  const { user, registration } = useStore();
  const { state, resetSection, setState } = useAdmin();
  const { copy, setCopy } = useJourneyEdits();
  const [view, setView] = useState<"rider" | "family">("rider");
  const [editing, setEditing] = useState(false);
  const cd = useCountdown(RIDE_WEEKEND_DATE);
  const firstName = user.name.split(" ")[0];
  const canEdit = user.isSuperUser;

  const merged = useMemo(
    () => mergeReadinessWithRegistration(state.readiness, registration),
    [state.readiness, registration]
  );
  const readiness = useMemo(
    () => merged.filter((r) => r.active && r.publish === "published"),
    [merged]
  );
  const score = useMemo(() => readinessScore(merged), [merged]);

  return (
    <EditCtx.Provider value={canEdit && editing}>
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <AnnouncementBanner />

        {canEdit && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-[var(--brand)]/60 bg-[var(--brand)]/5 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              {editing
                ? "Edit mode on — click any highlighted text to change it. Changes save as you go."
                : "Super User: you can edit the text on this page."}
            </p>
            <div className="flex gap-2">
              {editing && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    resetSection("readiness");
                    resetSection("timeline");
                    setState((s) => ({ ...s, journeyCopy: { ...journeyCopyDefaults } }));
                    toast.success("Journey text reset to defaults");
                  }}
                >
                  <RotateCcw className="mr-1 h-3.5 w-3.5" /> Reset text
                </Button>
              )}
              <Button
                size="sm"
                variant={editing ? "default" : "outline"}
                className={editing ? "bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90" : ""}
                onClick={() => { setEditing((v) => !v); if (editing) toast.success("Edits saved"); }}
              >
                {editing ? <><Check className="mr-1 h-3.5 w-3.5" /> Done editing</> : <><Pencil className="mr-1 h-3.5 w-3.5" /> Edit text</>}
              </Button>
            </div>
          </div>
        )}

        <Card className="overflow-hidden border-0 bg-gradient-to-br from-[var(--brand-dark)] to-[var(--brand-dark)]/85 text-white">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-wider text-white/60">
                  <InlineEditText editing={canEdit && editing} value={copy.heroEyebrow} onCommit={(v) => setCopy("heroEyebrow", v)} />
                </p>
                <h1 className="mt-1 text-3xl sm:text-4xl font-black">{greeting()}, {firstName}</h1>
                <p className="mt-2 text-white/85 text-base sm:text-lg">
                  <InlineEditText editing={canEdit && editing} value={copy.heroReadyPrefix} onCommit={(v) => setCopy("heroReadyPrefix", v)} />{" "}
                  <span className="font-bold text-[var(--brand)]">{score}%</span>{" "}
                  <InlineEditText editing={canEdit && editing} value={copy.heroReadySuffix} onCommit={(v) => setCopy("heroReadySuffix", v)} />
                </p>
                <div className="mt-4 max-w-md">
                  <Progress value={score} className="h-2.5 bg-white/10 [&>div]:bg-[var(--brand)]" aria-label={`Readiness ${score}%`} />
                </div>
              </div>
              <div className="rounded-xl bg-white/10 px-4 py-3 ring-1 ring-white/15">
                <div className="flex items-center gap-2 text-white/70 text-xs uppercase tracking-wider">
                  <CalendarClock className="h-3.5 w-3.5" />
                  <InlineEditText editing={canEdit && editing} value={copy.countdownLabel} onCommit={(v) => setCopy("countdownLabel", v)} />
                </div>
                <p className="mt-1 text-2xl sm:text-3xl font-black">
                  {cd.past ? "Ride day!" : <>{cd.days}<span className="text-base font-semibold text-white/70"> d </span>{cd.hours}<span className="text-base font-semibold text-white/70"> h</span></>}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-white/60">
                  <InlineEditText editing={canEdit && editing} value={copy.countdownCaption} onCommit={(v) => setCopy("countdownCaption", v)} />
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {state.flags.familyMode && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs value={view} onValueChange={(v) => setView(v as "rider" | "family")}>
              <TabsList>
                <TabsTrigger value="rider">Rider View</TabsTrigger>
                <TabsTrigger value="family">Family View</TabsTrigger>
              </TabsList>
            </Tabs>
            <p className="text-xs text-muted-foreground">
              <InlineEditText editing={canEdit && editing} value={copy.viewSwitchNote} onCommit={(v) => setCopy("viewSwitchNote", v)} />
            </p>
          </div>
        )}

        {view === "rider" || !state.flags.familyMode ? <RiderView readiness={readiness} /> : <FamilyView />}
      </div>
    </EditCtx.Provider>
  );
}


function RiderView({ readiness }: { readiness: EditableReadinessItem[] }) {
  const { state, isApiManaged } = useAdmin();
  const editing = useEditing();
  const { copy, setCopy, setReadiness } = useJourneyEdits();

  return (
    <>
      {state.flags.dashboardReadiness && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {readiness.map((r) => {
            const s = statusStyles[r.status];
            const managed = isApiManaged(`readiness.${r.id}.status`) || isApiManaged(`readiness.${r.id}.current`);
            const CardInner = (
              <Card className="h-full hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--brand)]/15 text-[var(--brand-dark)]">
                      <AdminIcon name={r.icon} className="h-5 w-5" />
                    </div>
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${s.className}`}>
                      {s.label}
                    </span>
                  </div>
                  <h3 className="mt-4 font-bold text-[var(--brand-dark)]">
                    <InlineEditText editing={editing} value={r.title} onCommit={(v) => setReadiness(r.id, { title: v })} placeholder="Card title" />
                  </h3>
                  <div className="mt-1 text-sm text-muted-foreground">
                    <InlineEditText as="div" multiline editing={editing} value={r.detail} onCommit={(v) => setReadiness(r.id, { detail: v })} placeholder="Card description" />
                  </div>
                  {r.progressGoal && r.progressCurrent !== undefined && (
                    <div className="mt-3">
                      <Progress value={Math.round((r.progressCurrent / r.progressGoal) * 100)} className="h-2 [&>div]:bg-[var(--brand)]" />
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center text-sm font-semibold text-[var(--brand-dark)]">
                      <InlineEditText editing={editing} value={r.ctaLabel} onCommit={(v) => setReadiness(r.id, { ctaLabel: v })} placeholder="Link label" />
                      <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </span>

                    {managed && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--brand-dark)]/20 bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--brand-dark)]/80" title={`Synced from ${managed.source}`}>
                        <LockIcon className="h-3 w-3" /> Synced
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
            const wizardStep = REGISTER_STEP_BY_CARD[r.id];
            const wrap = (inner: React.ReactNode) =>
              r.action === "concierge" ? (
                <button key={r.id} type="button" onClick={openConcierge} className="text-left rounded-lg">{inner}</button>
              ) : r.action === "fundraising" ? (
                <Link key={r.id} to="/team" className="rounded-lg">{inner}</Link>
              ) : wizardStep && (r.href ?? "/register").startsWith("/register") ? (
                <Link key={r.id} to="/register" search={{ step: wizardStep }} className="rounded-lg">{inner}</Link>
              ) : (
                <Link key={r.id} to={r.href ?? "/dashboard"} className="rounded-lg">{inner}</Link>
              );

            return wrap(CardInner);
          })}
        </div>
      )}

      {state.flags.dashboardQuickActions && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <QuickAction icon={ArrowRight} label="Continue My Journey" to="/register" />
          {state.flags.packingList && <QuickAction icon={ListChecks} label="View Packing List" to="/packing" />}
          {state.flags.familyMode && <QuickAction icon={Users} label="Family Guide" to="/family" />}
          {state.flags.concierge && <QuickAction icon={MessageSquare} label="Ask the Concierge" onClick={openConcierge} />}
          <QuickAction icon={CalendarDays} label="View Team Events" to="/team" />
          {state.flags.fundraisingProgress && <QuickAction icon={DollarSign} label="Fundraising Resources" to="/team" />}
        </div>
      )}

      {state.flags.dashboardTimeline && <Timeline />}
    </>
  );
}

function FamilyView() {
  const { state } = useAdmin();
  const sections = state.family.sections
    .filter((s) => s.active && s.publish === "published")
    .sort((a, b) => a.order - b.order);
  if (sections.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          No Family Guide sections are published yet. Ask a Super User to publish sections from Admin → Family Guide.
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {sections.map((s) => (
        <Link key={s.id} to="/family" hash={s.id} className="rounded-lg">
          <Card className="h-full hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--brand-dark)] text-white">
                <AdminIcon name={s.icon} className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-bold text-[var(--brand-dark)]">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{s.body}</p>
              <span className="mt-3 inline-flex items-center text-sm font-semibold text-[var(--brand-dark)]">
                Open <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </span>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}


function QuickAction({ icon: Icon, label, to, onClick }: {
  icon: typeof ArrowRight; label: string; to?: string; onClick?: () => void;
}) {
  const inner = (
    <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 hover:bg-accent transition-colors">
      <span className="flex items-center gap-2 text-sm font-semibold text-[var(--brand-dark)]">
        <Icon className="h-4 w-4" /> {label}
      </span>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </div>
  );
  if (onClick) return <button type="button" onClick={onClick} className="text-left rounded-lg">{inner}</button>;
  return <Link to={to!} className="rounded-lg">{inner}</Link>;
}

function Timeline() {
  const { state } = useAdmin();
  const byPhase = useMemo(() => {
    const g: Record<string, EditableTimelineItem[]> = {};
    state.timeline
      .filter((t) => t.publish === "published")
      .sort((a, b) => a.order - b.order)
      .forEach((i) => { (g[i.phase] ||= []).push(i); });
    return g;
  }, [state.timeline]);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-[var(--brand)]" /> My Ride Weekend timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {timelineSections.map((sec) => {
          const items = byPhase[sec.phase] ?? [];
          if (items.length === 0) return null;
          return (
            <div key={sec.phase}>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--brand-dark)]/70">{sec.label}</p>
              <ol className="relative mt-3 border-l-2 border-dashed border-[var(--brand)]/40 pl-6">
                {items.map((item) => (<TimelineEntry key={item.id} item={item} />))}
              </ol>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function TimelineEntry({ item }: { item: EditableTimelineItem }) {
  const [open, setOpen] = useState(item.state === "current");
  const dot = item.state === "completed" ? "bg-[var(--brand)] text-[var(--brand-foreground)]"
    : item.state === "current" ? "bg-[var(--brand-dark)] text-white ring-4 ring-[var(--brand)]/30"
    : "bg-muted text-muted-foreground";
  return (
    <li className="relative pb-4">
      <span className={`absolute -left-[33px] top-1 grid h-6 w-6 place-items-center rounded-full ${dot}`}>
        {item.state === "completed" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="h-2 w-2 rounded-full bg-current" />}
      </span>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={`font-semibold ${item.state === "completed" ? "text-muted-foreground line-through" : "text-[var(--brand-dark)]"}`}>
              {item.title}
            </p>
            {item.time && (
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {item.time}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {item.state === "current" && <Badge className="bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand)]">Now</Badge>}
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" aria-label={open ? "Collapse" : "Expand"}>
                <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>
        <CollapsibleContent>
          <div className="mt-2 rounded-md border bg-muted/30 p-3 text-sm space-y-1.5">
            {item.location && <p className="flex items-center gap-1.5 text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {item.location}</p>}
            {item.instructions && <p>{item.instructions}</p>}
            {item.note && <p className="text-xs text-muted-foreground">Note: {item.note}</p>}
            {item.contact && <p className="text-xs text-muted-foreground">Contact: {item.contact}</p>}
            {item.ctaLabel && (
              item.action === "concierge" ? (
                <Button size="sm" variant="outline" onClick={openConcierge} className="mt-1">
                  <MessageSquare className="mr-1 h-3.5 w-3.5" /> {item.ctaLabel}
                </Button>
              ) : item.href ? (
                <Button asChild size="sm" variant="outline" className="mt-1">
                  <Link to={item.href}>{item.ctaLabel}</Link>
                </Button>
              ) : null
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}
