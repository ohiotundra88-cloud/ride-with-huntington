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
import { MyEventsCard } from "@/components/MyEventsCard";

import { ApiManagedField } from "@/components/ApiManagedField";
import { InlineEditText } from "@/components/InlineEditText";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getRiderFundraising } from "@/lib/pelotonia.functions";
import { pelotoniaStatus, travelStatus, bikeStatus, apparelStatus } from "@/lib/registration-progress";
import { useJourneyReadiness } from "@/lib/journey-readiness";



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

function DashboardPage() {
  const { user, registration } = useStore();
  const { state, resetSection, setState } = useAdmin();
  const { copy, setCopy } = useJourneyEdits();
  const [view, setView] = useState<"rider" | "family">("rider");
  const [editing, setEditing] = useState(false);
  const cd = useCountdown(RIDE_WEEKEND_DATE);
  const firstName = user.name.split(" ")[0];
  const canEdit = user.isSuperUser;

  const { merged, score, riderFundraising } = useJourneyReadiness();
  const readiness = useMemo(
    () => merged.filter((r: EditableReadinessItem) => r.active && r.publish === "published"),
    [merged]
  );


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
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
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
              <div className="w-full rounded-xl bg-white/10 px-4 py-3 ring-1 ring-white/15 sm:w-auto">

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

        <MyFundraisingCard riderId={registration.pelotonia.confirmation} />

        <MyEventsCard />




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

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/**
 * Individual fundraising progress, pulled live from Pelotonia using the
 * participant's public/rider ID captured during registration.
 */
function MyFundraisingCard({ riderId }: { riderId: string }) {
  const fetchRider = useServerFn(getRiderFundraising);
  const id = (riderId ?? "").trim();
  const { data, isLoading } = useQuery({
    queryKey: ["rider-fundraising", id],
    queryFn: () => fetchRider({ data: { publicId: id } }),
    enabled: id.length > 0,
    staleTime: 5 * 60_000,
  });

  if (!id) {
    return (
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <h3 className="font-bold text-[var(--brand-dark)]">My fundraising</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your Pelotonia public/rider ID to see your live fundraising total here.
            </p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/register" search={{ step: "B" }}>Add rider ID</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-5 text-sm text-muted-foreground">Loading your fundraising total…</CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-5">
          <h3 className="font-bold text-[var(--brand-dark)]">My fundraising</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            We couldn't find rider ID <span className="font-semibold">{id}</span> on the Team Huntington roster yet.
            It can take a day or two after registration to appear.
          </p>
        </CardContent>
      </Card>
    );
  }

  const commitment = data.committed || data.goal;
  const pct = commitment > 0 ? Math.min(100, Math.round((data.raised / commitment) * 100)) : 0;
  const showGoal = data.goal > 0 && data.goal !== commitment;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <DollarSign className="h-3.5 w-3.5" /> My fundraising · live
            </div>
            <p className="mt-1 text-3xl font-black text-[var(--brand-dark)]">{usd(data.raised)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Rider ID {data.publicId}
              {commitment > 0 && <> · {pct}% of {usd(commitment)} commitment</>}
              {showGoal && <> · goal {usd(data.goal)}</>}
              {data.teamName && <> · {data.teamName.replace(/^Team Huntington Bank\s*-\s*/, "")}</>}
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div>All-time raised</div>
            <div className="text-base font-bold text-[var(--brand-dark)]">{usd(data.allTimeRaised)}</div>
          </div>
        </div>
        {commitment > 0 && (
          <div className="mt-4">
            <Progress value={pct} className="h-2.5 [&>div]:bg-[var(--brand)]" aria-label={`Fundraising ${pct}%`} />
          </div>
        )}
      </CardContent>
    </Card>
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
          {readiness
            .filter((r) => r.action !== "fundraising")
            .map((r) => {
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
          <QuickAction icon={ArrowRight} copyKey="qaContinue" label={copy.qaContinue} onEdit={setCopy} to="/register" />
          {state.flags.packingList && <QuickAction icon={ListChecks} copyKey="qaPacking" label={copy.qaPacking} onEdit={setCopy} to="/packing" />}
          {state.flags.familyMode && <QuickAction icon={Users} copyKey="qaFamily" label={copy.qaFamily} onEdit={setCopy} to="/family" />}
          {state.flags.concierge && <QuickAction icon={MessageSquare} copyKey="qaConcierge" label={copy.qaConcierge} onEdit={setCopy} onClick={openConcierge} />}
          <QuickAction icon={CalendarDays} copyKey="qaEvents" label={copy.qaEvents} onEdit={setCopy} to="/team" />
          {state.flags.fundraisingProgress && <QuickAction icon={DollarSign} copyKey="qaFundraising" label={copy.qaFundraising} onEdit={setCopy} to="/team" />}

        </div>
      )}

      {state.flags.dashboardTimeline && <Timeline />}
    </>
  );
}

function FamilyView() {
  const { state } = useAdmin();
  const editing = useEditing();
  const { setFamilySection } = useJourneyEdits();
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
              <h3 className="mt-4 font-bold text-[var(--brand-dark)]">
                <InlineEditText editing={editing} value={s.title} onCommit={(v) => setFamilySection(s.id, { title: v })} placeholder="Section title" />
              </h3>
              <div className={`mt-1 text-sm text-muted-foreground ${editing ? "" : "line-clamp-3"}`}>
                <InlineEditText as="div" multiline editing={editing} value={s.body} onCommit={(v) => setFamilySection(s.id, { body: v })} placeholder="Section body" />
              </div>
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


function QuickAction({ icon: Icon, label, to, onClick, copyKey, onEdit }: {
  icon: typeof ArrowRight;
  label: string;
  to?: string;
  onClick?: () => void;
  copyKey?: string;
  onEdit?: (key: string, value: string) => void;
}) {
  const editing = useEditing();
  const inner = (
    <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 hover:bg-accent transition-colors">
      <span className="flex items-center gap-2 text-sm font-semibold text-[var(--brand-dark)]">
        <Icon className="h-4 w-4" />
        {editing && copyKey && onEdit ? (
          <InlineEditText editing value={label} onCommit={(v) => onEdit(copyKey, v)} placeholder="Button label" />
        ) : (
          label
        )}
      </span>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </div>
  );
  if (onClick) return <button type="button" onClick={onClick} className="text-left rounded-lg">{inner}</button>;
  return <Link to={to!} className="rounded-lg">{inner}</Link>;
}

/**
 * Presentation-only overlay: reflect the participant's registration answers on
 * timeline steps so they aren't told to do things they opted out of.
 */
function mergeTimelineWithRegistration(
  items: EditableTimelineItem[],
  reg: Registration
): EditableTimelineItem[] {
  const isRider = reg.participation === "rider" || reg.participation === "both";
  const bikeTitle = /bike/i;
  const pelDone = pelotoniaStatus(reg) === "complete";
  return items.map((item) => {
    // Never present a step as done when the answers aren't on file yet.
    if (/pelotonia registration/i.test(item.title) && !pelDone) {
      return {
        ...item,
        state: "current",
        time: "Action needed",
        instructions: "Register with Pelotonia, then add your Rider ID and HB number to your profile.",
      };
    }
    if (!bikeTitle.test(item.title)) return item;

    if (reg.participation && !isRider) {
      return {
        ...item,
        state: "completed",
        time: "Not applicable",
        instructions: "You're registered as a Volunteer — no bike needed.",
        note: undefined,
        location: undefined,
      };
    }
    if (reg.bike.needs === "no") {
      return {
        ...item,
        title: "Bring your own bike",
        state: "completed",
        time: "Confirmed",
        instructions: "You're using your own bike — no rental to reserve. Optional free inspections run Friday at packet pickup.",
        note: undefined,
        location: undefined,
        ctaLabel: "Update bike plan",
      };
    }
    return item;
  });
}

function Timeline() {
  const { state } = useAdmin();
  const { registration } = useStore();
  const editing = useEditing();
  const { copy, setCopy } = useJourneyEdits();
  const byPhase = useMemo(() => {
    const g: Record<string, EditableTimelineItem[]> = {};
    mergeTimelineWithRegistration(state.timeline, registration)
      .filter((t) => t.publish === "published")
      .sort((a, b) => a.order - b.order)
      .forEach((i) => { (g[i.phase] ||= []).push(i); });
    return g;
  }, [state.timeline, registration]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-[var(--brand)]" />
          <InlineEditText editing={editing} value={copy.timelineHeading} onCommit={(v) => setCopy("timelineHeading", v)} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {timelineSections.map((sec) => {
          const items = byPhase[sec.phase] ?? [];
          if (items.length === 0) return null;
          const key = `phase.${sec.phase}`;
          return (
            <div key={sec.phase}>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--brand-dark)]/70">
                <InlineEditText editing={editing} value={copy[key] ?? sec.label} onCommit={(v) => setCopy(key, v)} />
              </p>
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
  const editing = useEditing();
  const { setTimeline } = useJourneyEdits();
  const [open, setOpen] = useState(item.state === "current");
  useEffect(() => { if (editing) setOpen(true); }, [editing]);
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
              <InlineEditText editing={editing} value={item.title} onCommit={(v) => setTimeline(item.id, { title: v })} placeholder="Timeline title" />
            </p>
            {(item.time || editing) && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <InlineEditText editing={editing} value={item.time ?? ""} onCommit={(v) => setTimeline(item.id, { time: v })} placeholder="Add time" />
              </p>
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
            {(item.location || editing) && (
              <p className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                <InlineEditText editing={editing} value={item.location ?? ""} onCommit={(v) => setTimeline(item.id, { location: v })} placeholder="Add location" />
              </p>
            )}
            {(item.instructions || editing) && (
              <InlineEditText as="div" multiline editing={editing} value={item.instructions ?? ""} onCommit={(v) => setTimeline(item.id, { instructions: v })} placeholder="Add instructions" />
            )}
            {(item.note || editing) && (
              <p className="text-xs text-muted-foreground">
                Note: <InlineEditText editing={editing} value={item.note ?? ""} onCommit={(v) => setTimeline(item.id, { note: v })} placeholder="Add note" />
              </p>
            )}
            {(item.contact || editing) && (
              <p className="text-xs text-muted-foreground">
                Contact: <InlineEditText editing={editing} value={item.contact ?? ""} onCommit={(v) => setTimeline(item.id, { contact: v })} placeholder="Add contact" />
              </p>
            )}
            {editing ? (
              <p className="text-xs text-muted-foreground">
                Button: <InlineEditText editing value={item.ctaLabel ?? ""} onCommit={(v) => setTimeline(item.id, { ctaLabel: v })} placeholder="Add button label" />
              </p>
            ) : item.ctaLabel ? (
              item.action === "concierge" ? (
                <Button size="sm" variant="outline" onClick={openConcierge} className="mt-1">
                  <MessageSquare className="mr-1 h-3.5 w-3.5" /> {item.ctaLabel}
                </Button>
              ) : item.href ? (
                <Button asChild size="sm" variant="outline" className="mt-1">
                  <Link to={item.href}>{item.ctaLabel}</Link>
                </Button>
              ) : null
            ) : null}
          </div>
        </CollapsibleContent>

      </Collapsible>
    </li>
  );
}
