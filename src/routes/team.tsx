import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Award, CalendarDays, Users, HandHeart, Megaphone, DollarSign, RefreshCw } from "lucide-react";
import { useAdmin, formatCurrencyUSD } from "@/lib/admin-store";
import { ApiManagedField } from "@/components/ApiManagedField";
import { getPelotoniaTeamData } from "@/lib/pelotonia.functions";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "Team Huntington Hub — Team snapshot" },
      { name: "description", content: "Team Huntington roster, live fundraising progress, and recent activity for Pelotonia." },
      { property: "og:title", content: "Team Huntington Hub" },
      { property: "og:description", content: "Live team fundraising totals, subteam breakdown, and recent activity." },
    ],
  }),
  component: TeamHub,
});

function TeamHub() {
  const { state } = useAdmin();
  const { team, flags } = state;
  const fetchLive = useServerFn(getPelotoniaTeamData);
  const { data: live, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["pelotonia-team-data"],
    queryFn: () => fetchLive(),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
  });

  const raised = live?.raised ?? team.goalCurrent;
  const goal = live?.goal || team.goalTarget;
  const pct = goal > 0 ? Math.round((raised / goal) * 100) : 0;

  const liveMetrics = live
    ? [
        { id: "members", label: "Team members", value: live.members.toLocaleString(), note: "live" },
        { id: "riders", label: "Riders", value: live.riders.toLocaleString(), note: "live" },
        { id: "challengers", label: "Challengers", value: live.challengers.toLocaleString(), note: "live" },
        { id: "volunteers", label: "Volunteers", value: live.volunteers.toLocaleString(), note: "live" },
        { id: "hr", label: "High rollers", value: live.highRollers.toLocaleString(), note: "live" },
        { id: "survivors", label: "Survivors", value: live.survivors.toLocaleString(), note: "live" },
      ]
    : null;

  const updatedLabel = live?.lastUpdated ? new Date(live.lastUpdated).toLocaleString() : null;

  const quickLinks = [
    { icon: CalendarDays, label: "Team Events", href: "/events" },
    { icon: DollarSign, label: "Fundraising Resources", href: "/resources" },
    { icon: Award, label: "Recognition", href: "/resources" },
    { icon: HandHeart, label: "Volunteer Opportunities", href: "/register" },
    { icon: Megaphone, label: "Team Updates", href: "/dashboard" },
  ] as const;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="rounded-2xl bg-[var(--brand-dark)] p-6 sm:p-8 text-white">
        <p className="text-xs uppercase tracking-wider text-white/60">{live?.teamName ?? "Team Huntington"}</p>
        <h1 className="mt-1 text-3xl sm:text-4xl font-black">Team Huntington Hub</h1>
        <p className="mt-3 max-w-2xl text-white/80 leading-relaxed">
          Live roster and fundraising figures from the Pelotonia team dashboard, refreshed at 7 AM, 1 PM, and 7 PM daily.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-white/70">
          <Badge className="bg-[var(--brand)] text-[var(--brand-foreground)]">
            {live ? "Live data" : isLoading ? "Loading…" : "Cached sample data"}
          </Badge>
          {updatedLabel && <span>Source updated {updatedLabel}</span>}
          <Button
            size="sm"
            variant="outline"
            className="h-7 border-white/30 bg-transparent text-white hover:bg-white/10"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`mr-1 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {flags.teamMetrics && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {(liveMetrics ?? team.metrics).map((m) => (
            <Card key={m.id}>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p className="mt-1 text-2xl sm:text-3xl font-black text-[var(--brand-dark)]">{m.value}</p>
                {m.note && <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{m.note}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {flags.fundraisingProgress && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-[var(--brand)]" /> Fundraising campaign
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ApiManagedField
              fieldKey="team.goal.current"
              label="Cumulative team raised"
              value={
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-3xl font-black text-[var(--brand-dark)]">
                      {formatCurrencyUSD(raised)}
                      <span className="text-base font-semibold text-muted-foreground"> / {formatCurrencyUSD(goal)} goal</span>
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {live
                        ? `${live.donationsCount.toLocaleString()} donations · incl. ${formatCurrencyUSD(live.kidsRaised)} Pelotonia Kids · ${formatCurrencyUSD(live.totalCommitted)} committed · ${formatCurrencyUSD(live.allTimeRaised)} all-time`
                        : "Sample data — live totals unavailable right now."}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-[var(--brand-dark)]">{pct}%</p>
                    <p className="text-xs text-muted-foreground">of team goal</p>
                  </div>
                </div>
              }
            />
            <Progress value={Math.min(pct, 100)} className="mt-3 h-2.5 [&>div]:bg-[var(--brand)]" aria-label={`Team fundraising ${pct}%`} />
          </CardContent>
        </Card>
      )}

      {live && live.subteams.length > 0 && (
        <Card className="mt-6">
          <CardHeader><CardTitle>Subteam breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {live.subteams.map((s) => {
              const share = live.raised > 0 ? Math.round((s.raised / live.raised) * 100) : 0;
              return (
                <div key={s.name} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-[var(--brand-dark)]">{s.name}</p>
                    <p className="text-sm font-bold tabular-nums">{formatCurrencyUSD(s.raised)}</p>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {s.total.toLocaleString()} members · {s.riders.toLocaleString()} riders · {s.challengers.toLocaleString()} challengers · {s.volunteers.toLocaleString()} volunteers · {s.highRollers} high rollers
                  </p>
                  <Progress value={share} className="mt-2 h-1.5 [&>div]:bg-[var(--brand-dark)]" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[var(--brand-dark)]" /> Recent team activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {live && live.recentDaily.length > 0
              ? live.recentDaily.map((d) => (
                  <div key={d.date} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--brand-dark)]">
                        {new Date(`${d.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                      </p>
                      <p className="text-xs text-muted-foreground">{d.count.toLocaleString()} donations</p>
                    </div>
                    <p className="text-sm font-bold tabular-nums">{formatCurrencyUSD(d.amount)}</p>
                  </div>
                ))
              : team.activity.map((a) => (
                  <div key={a.id} className="flex gap-3 rounded-lg border p-3">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--brand)]" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-[var(--brand-dark)]">{a.title}</p>
                      <p className="text-sm text-muted-foreground">{a.body}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{a.time} · sample</p>
                    </div>
                  </div>
                ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Quick links</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {quickLinks.map((l) => (
              <Button key={l.label} asChild variant="outline" className="w-full justify-start">
                <Link to={l.href}><l.icon className="mr-2 h-4 w-4" /> {l.label}</Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
