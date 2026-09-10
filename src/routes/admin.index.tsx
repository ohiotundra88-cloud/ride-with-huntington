import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPelotoniaTeamData } from "@/lib/pelotonia.functions";
import { AdminShell } from "@/components/AdminShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAdmin, announcementIsActive, formatCurrencyUSD } from "@/lib/admin-store";
import {
  Plus, Megaphone, Bell, Target, FileText, ListChecks,
  MessageSquare, CalendarDays, ArrowRight, ClipboardList, History,
  BarChart3, Users, ShieldCheck, Settings, Mail,
} from "lucide-react";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [
    { title: "Super User — Team Huntington Hub" },
    { name: "description", content: "Super User administration dashboard for Team Huntington Hub demo." },
  ] }),
  component: SuperUserDashboard,
});

function SuperUserDashboard() {
  const { state } = useAdmin();
  const fetchLive = useServerFn(getPelotoniaTeamData);
  const { data: live } = useQuery({
    queryKey: ["pelotonia-team-data"],
    queryFn: () => fetchLive(),
    staleTime: 5 * 60 * 1000,
  });
  const goalCurrent = live?.raised ?? state.team.goalCurrent;
  const goalTarget = live?.goal || state.team.goalTarget;


  const activeAnnouncements = state.announcements.filter(announcementIsActive);
  const drafts = [
    ...state.announcements.filter((a) => a.publish === "draft").map((a) => ({ type: "Announcement", title: a.headline, at: a.updatedAt })),
    ...state.notifications.filter((n) => n.publish === "draft").map((n) => ({ type: "Notification", title: n.title, at: n.updatedAt })),
    ...state.timeline.filter((t) => t.publish === "draft").map((t) => ({ type: "Timeline item", title: t.title, at: t.updatedAt })),
    ...state.goals.filter((g) => g.publish === "draft").map((g) => ({ type: "Goal", title: g.name, at: g.updatedAt })),
  ].slice(0, 6);

  const recent = [...state.audit].slice(0, 6);

  const readinessTotalWeight = state.readiness.filter((r) => r.active).reduce((n, r) => n + r.weight, 0);
  const config: { label: string; ok: boolean; hint: string }[] = [
    { label: "Readiness weights total 100%", ok: readinessTotalWeight === 100, hint: `Currently ${readinessTotalWeight}%` },
    { label: "At least one published announcement", ok: activeAnnouncements.length > 0, hint: activeAnnouncements.length === 0 ? "None published" : `${activeAnnouncements.length} active` },
    { label: "Concierge fallback set", ok: !!state.concierge.fallbackBody, hint: state.concierge.fallbackBody ? "Configured" : "Missing" },
    { label: "Feature flags configured", ok: true, hint: `${Object.values(state.flags).filter(Boolean).length} enabled` },
  ];

  const upcomingDeadlines = state.timeline
    .filter((t) => t.publish === "published" && t.time && (t.time.includes("Jul") || t.time.includes("Aug") || t.time.includes("Due")))
    .slice(0, 5);

  const teamPct = goalTarget > 0 ? Math.round((goalCurrent / goalTarget) * 100) : 0;

  const quickActions = [
    { icon: Plus, label: "Add FAQ", to: "/admin/faqs" },
    { icon: FileText, label: "Manage Resources", to: "/admin/faqs" },
    { icon: Target, label: "Update Fundraising Goal", to: "/admin/goals" },
    { icon: Megaphone, label: "Add Announcement", to: "/admin/announcements" },
    { icon: CalendarDays, label: "Edit Ride Schedule", to: "/admin/journey" },
    { icon: ListChecks, label: "Update Packing List", to: "/admin/packing" },
    { icon: MessageSquare, label: "Edit Concierge Answers", to: "/admin/concierge" },
    { icon: Bell, label: "Manage Notifications", to: "/admin/notifications" },
    { icon: BarChart3, label: "Executive Analytics", to: "/analytics" },
    { icon: Users, label: "Preview Participant Experience", to: "/dashboard" },
    { icon: ShieldCheck, label: "Roles & permissions", to: "/admin/flags" },
    { icon: Settings, label: "Feature flags & audit", to: "/admin/flags" },
    { icon: Mail, label: "Send test emails", to: "/admin/test-emails" },
  ];

  return (
    <AdminShell
      title="Super User dashboard"
      description="Centralized control for Team Huntington Hub content, goals, notifications, and configuration. Every change here applies to everyone and is recorded in the audit log."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active announcements" value={activeAnnouncements.length} />
        <StatCard label="FAQs" value="Manage" sub="open the FAQ manager" href="/admin/faqs" />
        <StatCard label="Draft items" value={drafts.length} />
        <StatCard label="Team goal" value={`${formatCurrencyUSD(goalCurrent)} / ${formatCurrencyUSD(goalTarget)}`} sub={`${teamPct}% of goal${live ? " · live" : ""}`} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Quick actions</CardTitle></CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {quickActions.map((q) => (
              <Button key={q.label} asChild variant="outline" className="justify-start h-auto py-3">
                <Link to={q.to}>
                  <q.icon className="mr-2 h-4 w-4 text-[var(--brand-dark)]" />
                  <span>{q.label}</span>
                  <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Configuration health</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {config.map((c) => (
              <div key={c.label} className="flex items-start justify-between gap-2 rounded-md border p-2">
                <div>
                  <p className="font-medium">{c.label}</p>
                  <p className="text-xs text-muted-foreground">{c.hint}</p>
                </div>
                <Badge className={c.ok ? "bg-[var(--brand)] text-[var(--brand-foreground)]" : "bg-amber-500 text-black"}>
                  {c.ok ? "OK" : "Attention"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Draft content awaiting review</CardTitle></CardHeader>
          <CardContent>
            {drafts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No drafts pending.</p>
            ) : (
              <ul className="divide-y">
                {drafts.map((d, i) => (
                  <li key={i} className="py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{d.title}</p>
                      <p className="text-xs text-muted-foreground">{d.type} · updated {new Date(d.at).toLocaleString()}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">Draft</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Upcoming deadlines</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {upcomingDeadlines.length === 0 ? (
              <p className="text-muted-foreground">None flagged.</p>
            ) : upcomingDeadlines.map((t) => (
              <div key={t.id} className="rounded-md border p-2">
                <p className="font-medium">{t.title}</p>
                <p className="text-xs text-muted-foreground">{t.time}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Current goals</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {state.goals.slice(0, 5).map((g) => {
              // Keep the team fundraising row consistent with the live figures
              // shown in the stat cards above instead of the stored snapshot.
              const isTeamFundraising = g.unit === "dollars" && /team .*fundrais/i.test(g.name);
              const current = isTeamFundraising && live ? goalCurrent : g.current;
              const target = isTeamFundraising && live ? goalTarget : g.target;
              return (
              <div key={g.id} className="flex items-center justify-between rounded-md border p-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">{g.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {g.unit === "dollars" ? `${formatCurrencyUSD(current)} / ${formatCurrencyUSD(target)}${isTeamFundraising && live ? " · live" : ""}` :
                     g.unit === "percentage" ? `${current}% / ${target}%` :
                     `${current.toLocaleString()} / ${target.toLocaleString()} ${g.unit}`}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] uppercase">{g.status.replace("_", " ")}</Badge>
              </div>
              );
            })}

          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-4 w-4" /> Recent activity</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {recent.length === 0 ? (
              <p className="text-muted-foreground">No changes yet this session.</p>
            ) : recent.map((r) => (
              <div key={r.id} className="rounded-md border p-2">
                <p className="font-medium text-xs uppercase tracking-wide text-[var(--brand-dark)]">
                  {r.action} · {r.entity}
                </p>
                <p className="mt-0.5 text-sm">{r.detail}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">by {r.user} · {new Date(r.at).toLocaleString()}</p>
              </div>
            ))}
            <Button asChild variant="link" className="px-0 h-auto"><Link to="/admin/flags">View full audit log →</Link></Button>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}

function StatCard({ label, value, sub, href }: { label: string; value: React.ReactNode; sub?: string; href?: string }) {
  const inner = (
    <Card className="h-full">
      <CardContent className="p-5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-black text-[var(--brand-dark)]">{value}</p>
        {sub && <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
  return href ? <Link to={href}>{inner}</Link> : inner;
}
