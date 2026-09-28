import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listColleagues } from "@/lib/participants-admin.functions";
import { getPelotoniaTeamData } from "@/lib/pelotonia.functions";
import {
  matchesRole,
  outstandingActions,
  summarizeRegistrations,
  type RoleFilter,
  type StepCounts,
} from "@/lib/registration-analytics";
import { formatCurrencyUSD } from "@/lib/admin-content";
import { useStore } from "@/lib/store";
import { useAdmin } from "@/lib/admin-store";
import { AlertCircle, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Executive Analytics — Team Huntington Hub" },
      {
        name: "description",
        content:
          "Team Huntington registration progress, from colleagues' registrations in the Hub.",
      },
      { property: "og:title", content: "Executive Analytics" },
      {
        property: "og:description",
        content: "Team Huntington registration progress for Ride Weekend.",
      },
    ],
  }),
  component: AnalyticsPage,
});

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

function AnalyticsPage() {
  const { user, authReady } = useStore();
  const { state } = useAdmin();
  const [filter, setFilter] = useState<RoleFilter>("all");
  const allowed = user.isAdmin || user.isSuperUser;

  const fetchColleagues = useServerFn(listColleagues);
  const colleagues = useQuery({
    queryKey: ["admin-colleagues"],
    queryFn: () => fetchColleagues(),
    enabled: allowed,
    staleTime: 60_000,
  });
  const fetchTeam = useServerFn(getPelotoniaTeamData);
  const { data: team } = useQuery({
    queryKey: ["pelotonia-team-data"],
    queryFn: () => fetchTeam(),
    enabled: allowed,
    staleTime: 5 * 60 * 1000,
  });

  const summary = useMemo(
    () => summarizeRegistrations((colleagues.data ?? []).filter((r) => matchesRole(r, filter))),
    [colleagues.data, filter],
  );

  if (!authReady) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center text-sm text-muted-foreground">
        Checking your access…
      </div>
    );
  }

  if (!allowed || !state.flags.executiveAnalytics) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Executive Analytics unavailable</h1>
        <p className="mt-2 text-muted-foreground">
          Requires admin access and the feature to be enabled.
        </p>
      </div>
    );
  }

  const stepRows: { label: string; counts: StepCounts }[] = [
    { label: "Pelotonia registration", counts: summary.steps.pelotonia },
    { label: "Travel & hotel", counts: summary.steps.travel },
    { label: "Bike plan (riders)", counts: summary.steps.bike },
    { label: "Apparel", counts: summary.steps.apparel },
  ];
  const metrics = [
    { label: "Colleagues registered", value: summary.total.toLocaleString() },
    { label: "Riders", value: summary.roles.rider.toLocaleString() },
    { label: "Volunteers", value: summary.roles.volunteer.toLocaleString() },
    { label: "Challengers", value: summary.roles.challenger.toLocaleString() },
    { label: "Registrations submitted", value: summary.submitted.toLocaleString() },
    { label: "Average readiness", value: `${summary.averageCompletion}%` },
    { label: "Hotel requests", value: summary.hotelRequests.toLocaleString() },
    { label: "Bike rental requests", value: summary.bikeRentals.toLocaleString() },
    {
      label: "Team fundraising",
      value: team ? formatCurrencyUSD(team.raised) : "Unavailable",
      helper: team?.goal
        ? `${pct(team.raised, team.goal)}% of ${formatCurrencyUSD(team.goal)}`
        : "",
    },
  ];
  const actions = outstandingActions(summary);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--brand-dark)]">Executive Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Team Huntington · Ride Weekend readiness, from colleagues' registrations in the Hub
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as RoleFilter)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="riders">Riders</TabsTrigger>
              <TabsTrigger value="volunteers">Volunteers</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button asChild variant="outline">
            <Link to="/admin">
              <ArrowLeft className="mr-1 h-4 w-4" /> Admin
            </Link>
          </Button>
        </div>
      </div>

      {colleagues.isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading registrations…</p>
      ) : colleagues.isError ? (
        <Card className="mt-8">
          <CardContent className="p-5 text-sm text-muted-foreground">
            Registrations couldn't be loaded right now.{" "}
            <Button variant="link" className="h-auto p-0" onClick={() => void colleagues.refetch()}>
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : summary.total === 0 ? (
        <Card className="mt-8">
          <CardContent className="p-5 text-sm text-muted-foreground">
            No registrations yet
            {filter === "all" ? "" : ` for ${filter}`}. Figures appear here as colleagues register
            in the Hub.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {metrics.map((m) => (
              <Card key={m.label}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className="mt-1 text-2xl font-black text-[var(--brand-dark)]">{m.value}</p>
                  {m.helper && (
                    <p className="mt-1 text-xs text-[var(--brand-dark)]/70">{m.helper}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Registration steps completed</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {stepRows.map(({ label, counts }) => {
                  const done = pct(counts.complete, counts.applicable);
                  return (
                    <div key={label}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold">{label}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {counts.complete.toLocaleString()} of {counts.applicable.toLocaleString()}{" "}
                          · {done}%
                        </span>
                      </div>
                      <div className="mt-1 h-3 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-[var(--brand)]" style={{ width: `${done}%` }} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Readiness breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {summary.completionBands.map((b) => {
                  const share = pct(b.count, summary.total);
                  return (
                    <div key={b.label} className="flex items-center gap-3">
                      <div className="w-44 shrink-0 text-sm">{b.label}</div>
                      <Progress
                        value={share}
                        className="h-2 flex-1 [&>div]:bg-[var(--brand)]"
                        aria-label={`${b.label}: ${share}% of colleagues`}
                      />
                      <div className="w-16 text-right font-mono text-sm">
                        {b.count} · {share}%
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Average readiness by region</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {summary.regions.map((r) => (
                  <div key={r.region} className="flex items-center gap-3">
                    <div className="w-44 shrink-0 text-sm">
                      {r.region} <span className="text-xs text-muted-foreground">({r.people})</span>
                    </div>
                    <Progress
                      value={r.averageCompletion}
                      className="h-2 flex-1 [&>div]:bg-[var(--brand-dark)]"
                      aria-label={`${r.region}: average ${r.averageCompletion}% complete`}
                    />
                    <div className="w-10 text-right font-mono text-sm">{r.averageCompletion}%</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-[var(--brand-dark)]" /> Outstanding action
                  items
                </CardTitle>
              </CardHeader>
              <CardContent>
                {actions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Everyone is up to date.</p>
                ) : (
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {actions.map((a) => (
                      <li key={a} className="flex items-start gap-2 rounded-lg border p-3 text-sm">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--brand)]" />
                        {a}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
