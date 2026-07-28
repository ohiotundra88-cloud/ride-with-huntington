import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useStore } from "@/lib/store";
import {
  ArrowRight,
  Bike,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock,
  DollarSign,
  ListChecks,
  MessageSquare,
  MapPin,
  Users,
  Tent,
  Baby,
  Accessibility,
  AlertTriangle,
  Car,
  CalendarDays,
  Radio,
} from "lucide-react";
import { openConcierge } from "@/components/Concierge";
import {
  RIDE_WEEKEND_DATE,
  overallReadiness,
  readinessItems,
  timelineItems,
  timelineSections,
  type ReadinessStatus,
  type TimelineItem,
} from "@/lib/mock-data";

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
  const days = Math.max(0, Math.floor(diff / 86_400_000));
  const hours = Math.max(0, Math.floor((diff % 86_400_000) / 3_600_000));
  return { days, hours, past: diff <= 0 };
}

const statusStyles: Record<ReadinessStatus, { label: string; className: string }> = {
  complete: { label: "Complete", className: "bg-[var(--brand)]/20 text-[var(--brand-dark)] border-[var(--brand)]/40" },
  reserved: { label: "Reserved", className: "bg-[var(--brand)]/15 text-[var(--brand-dark)] border-[var(--brand)]/30" },
  in_progress: { label: "In progress", className: "bg-amber-100 text-amber-900 border-amber-200" },
  action_needed: { label: "Action needed", className: "bg-orange-100 text-orange-900 border-orange-200" },
  ordered: { label: "Ordered", className: "bg-sky-100 text-sky-900 border-sky-200" },
  not_applicable: { label: "Not applicable", className: "bg-muted text-muted-foreground border-border" },
};

function DashboardPage() {
  const { user } = useStore();
  const nav = useNavigate();
  const [view, setView] = useState<"rider" | "family">("rider");
  const cd = useCountdown(RIDE_WEEKEND_DATE);
  const firstName = user.name.split(" ")[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* HERO */}
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-[var(--brand-dark)] to-[var(--brand-dark)]/85 text-white">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wider text-white/60">Your Ride Weekend Command Center</p>
              <h1 className="mt-1 text-3xl sm:text-4xl font-black">{greeting()}, {firstName}</h1>
              <p className="mt-2 text-white/85 text-base sm:text-lg">
                You're <span className="font-bold text-[var(--brand)]">{overallReadiness}%</span> ready for Ride Weekend.
              </p>
              <div className="mt-4 max-w-md">
                <Progress
                  value={overallReadiness}
                  className="h-2.5 bg-white/10 [&>div]:bg-[var(--brand)]"
                  aria-label={`Readiness ${overallReadiness}%`}
                />
              </div>
            </div>
            <div className="rounded-xl bg-white/10 px-4 py-3 ring-1 ring-white/15">
              <div className="flex items-center gap-2 text-white/70 text-xs uppercase tracking-wider">
                <CalendarClock className="h-3.5 w-3.5" /> Countdown
              </div>
              <p className="mt-1 text-2xl sm:text-3xl font-black">
                {cd.past ? "Ride day!" : <>{cd.days}<span className="text-base font-semibold text-white/70"> d </span>{cd.hours}<span className="text-base font-semibold text-white/70"> h</span></>}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-wide text-white/60">Sat Aug 7, 2027 · demo date</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View toggle */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={view} onValueChange={(v) => setView(v as "rider" | "family")}>
          <TabsList>
            <TabsTrigger value="rider">Rider View</TabsTrigger>
            <TabsTrigger value="family">Family View</TabsTrigger>
          </TabsList>
        </Tabs>
        <p className="text-xs text-muted-foreground">Switch views without losing your place — sample content.</p>
      </div>

      {view === "rider" ? <RiderView /> : <FamilyView />}
    </div>
  );
}

function RiderView() {
  return (
    <>
      {/* Readiness cards */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {readinessItems.map((r) => {
          const s = statusStyles[r.status];
          const CardInner = (
            <Card className="h-full hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--brand)]/15 text-[var(--brand-dark)]">
                    <r.icon className="h-5 w-5" />
                  </div>
                  <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${s.className}`}>
                    {s.label}
                  </span>
                </div>
                <h3 className="mt-4 font-bold text-[var(--brand-dark)]">{r.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{r.detail}</p>
                {r.progress && (
                  <div className="mt-3">
                    <Progress
                      value={Math.round((r.progress.current / r.progress.goal) * 100)}
                      className="h-2 [&>div]:bg-[var(--brand)]"
                      aria-label={`${r.title} progress`}
                    />
                  </div>
                )}
                <div className="mt-4">
                  <span className="inline-flex items-center text-sm font-semibold text-[var(--brand-dark)]">
                    {r.ctaLabel} <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </span>
                </div>
              </CardContent>
            </Card>
          );
          if (r.action === "concierge") {
            return (
              <button key={r.id} type="button" onClick={openConcierge} className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] rounded-lg">
                {CardInner}
              </button>
            );
          }
          if (r.action === "fundraising") {
            return <Link key={r.id} to="/team" className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] rounded-lg">{CardInner}</Link>;
          }
          return <Link key={r.id} to={r.href ?? "/dashboard"} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] rounded-lg">{CardInner}</Link>;
        })}
      </div>

      {/* Quick actions */}
      <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <QuickAction icon={ArrowRight} label="Continue My Journey" to="/register" />
        <QuickAction icon={ListChecks} label="View Packing List" to="/packing" />
        <QuickAction icon={Users} label="Family Guide" to="/family" />
        <QuickAction icon={MessageSquare} label="Ask the Concierge" onClick={openConcierge} />
        <QuickAction icon={CalendarDays} label="View Team Events" to="/team" />
        <QuickAction icon={DollarSign} label="Fundraising Resources" to="/team" />
      </div>

      {/* Timeline */}
      <Timeline />
    </>
  );
}

function FamilyView() {
  const cards = [
    { icon: Car, title: "Spectator parking", body: "McFerson & Neil Ave. garages. Arrive by 6 AM Saturday.", href: "/family" },
    { icon: MapPin, title: "Best viewing locations", body: "Miles 12, 34, 68, and the finish at Hilton Columbus.", href: "/family" },
    { icon: Radio, title: "Rider tracking", body: "Live tracker link posts Ride Day (placeholder).", href: "/family" },
    { icon: Tent, title: "Team Huntington tent", body: "Finish village + rest stops 2 & 4. Bright lime canopy.", href: "/family" },
    { icon: Baby, title: "Kids activities", body: "Face painting, obstacle course, story-time tent at the finish.", href: "/family" },
    { icon: Accessibility, title: "Accessibility", body: "Accessible parking with placard, restrooms, and viewing platforms.", href: "/family" },
    { icon: AlertTriangle, title: "Emergency guidance", body: "Call 911. Medical tents at every rest stop and the finish.", href: "/family" },
    { icon: CalendarDays, title: "Ride Weekend schedule", body: "Fri packet & gathering · Sat Ride Day · Sun brunch.", href: "/family" },
  ] as const;
  return (
    <>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.title} to={c.href} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] rounded-lg">
            <Card className="h-full hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--brand-dark)] text-white">
                  <c.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-bold text-[var(--brand-dark)]">{c.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{c.body}</p>
                <span className="mt-3 inline-flex items-center text-sm font-semibold text-[var(--brand-dark)]">
                  Open <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <QuickAction icon={Users} label="Open Family Guide" to="/family" />
        <QuickAction icon={MessageSquare} label="Ask the Concierge" onClick={openConcierge} />
        <QuickAction icon={CalendarDays} label="Team Events" to="/team" />
      </div>
    </>
  );
}

function QuickAction({
  icon: Icon,
  label,
  to,
  onClick,
}: {
  icon: typeof ArrowRight;
  label: string;
  to?: string;
  onClick?: () => void;
}) {
  const inner = (
    <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 hover:bg-accent transition-colors">
      <span className="flex items-center gap-2 text-sm font-semibold text-[var(--brand-dark)]">
        <Icon className="h-4 w-4" /> {label}
      </span>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </div>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] rounded-lg">
        {inner}
      </button>
    );
  }
  return (
    <Link to={to!} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] rounded-lg">
      {inner}
    </Link>
  );
}

function Timeline() {
  const byPhase = useMemo(() => {
    const g: Record<string, TimelineItem[]> = {};
    timelineItems.forEach((i) => {
      (g[i.phase] ||= []).push(i);
    });
    return g;
  }, []);
  return (
    <Card className="mt-8">
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
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--brand-dark)]/70">
                {sec.label}
              </p>
              <ol className="relative mt-3 border-l-2 border-dashed border-[var(--brand)]/40 pl-6">
                {items.map((item) => (
                  <TimelineEntry key={item.id} item={item} />
                ))}
              </ol>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function TimelineEntry({ item }: { item: TimelineItem }) {
  const [open, setOpen] = useState(item.state === "current");
  const dot =
    item.state === "completed"
      ? "bg-[var(--brand)] text-[var(--brand-foreground)]"
      : item.state === "current"
        ? "bg-[var(--brand-dark)] text-white ring-4 ring-[var(--brand)]/30"
        : "bg-muted text-muted-foreground";
  return (
    <li className="relative pb-4">
      <span className={`absolute -left-[33px] top-1 grid h-6 w-6 place-items-center rounded-full ${dot}`}>
        {item.state === "completed" ? (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ) : (
          <span className="h-2 w-2 rounded-full bg-current" />
        )}
      </span>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={`font-semibold ${item.state === "completed" ? "text-muted-foreground line-through" : "text-[var(--brand-dark)]"}`}>
              {item.title}
            </p>
            {item.time && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> {item.time}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {item.state === "current" && (
              <Badge className="bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand)]">Now</Badge>
            )}
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" aria-label={open ? "Collapse" : "Expand"}>
                <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
          </div>
        </div>
        <CollapsibleContent>
          <div className="mt-2 rounded-md border bg-muted/30 p-3 text-sm space-y-1.5">
            {item.location && (
              <p className="flex items-center gap-1.5 text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {item.location}</p>
            )}
            {item.instructions && <p>{item.instructions}</p>}
            {item.note && <p className="text-xs text-muted-foreground">Note: {item.note}</p>}
            {item.contact && <p className="text-xs text-muted-foreground">Contact: {item.contact}</p>}
            {item.ctaLabel && (
              item.action === "concierge" ? (
                <Button size="sm" variant="outline" onClick={openConcierge} className="mt-1">
                  <MessageSquare className="mr-1 h-3.5 w-3.5" /> {item.ctaLabel}
                </Button>
              ) : item.action === "packing" ? (
                <Button asChild size="sm" variant="outline" className="mt-1">
                  <Link to="/packing">{item.ctaLabel}</Link>
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
