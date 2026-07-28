import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  analyticsMetrics,
  funnelStages,
  outstandingActions,
  readinessBreakdown,
  regionCompletion,
  topSupportTopics,
} from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { useAdmin } from "@/lib/admin-store";
import { AlertCircle, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Executive Analytics — Team Huntington Hub" },
      { name: "description", content: "Executive analytics dashboard for Team Huntington Ride Weekend readiness. Sample data." },
      { property: "og:title", content: "Executive Analytics" },
      { property: "og:description", content: "Team Huntington executive analytics — sample data." },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { user } = useStore();
  const { state } = useAdmin();
  const [filter, setFilter] = useState<"all" | "riders" | "volunteers">("all");
  const metrics = useMemo(() => analyticsMetrics(filter), [filter]);

  if (!user.isAdmin || !state.flags.executiveAnalytics) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Executive Analytics unavailable</h1>
        <p className="mt-2 text-muted-foreground">Requires admin access and the feature to be enabled.</p>
      </div>
    );
  }

  const maxFunnel = funnelStages[0].value;
  const maxTopic = Math.max(...topSupportTopics.map((t) => t.value));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--brand)]/15 px-2.5 py-1 text-xs font-semibold text-[var(--brand-dark)]">
            Sample Data
          </div>
          <h1 className="mt-2 text-3xl font-black text-[var(--brand-dark)]">Executive Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Team Huntington · Pelotonia 2027 · Ride Weekend readiness overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="riders">Riders</TabsTrigger>
              <TabsTrigger value="volunteers">Volunteers</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button asChild variant="outline"><Link to="/admin"><ArrowLeft className="mr-1 h-4 w-4" /> Admin</Link></Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {metrics.map((m) => (
          <Card key={m.id}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p className="mt-1 text-2xl font-black text-[var(--brand-dark)]">{m.value}</p>
              {m.delta && <p className="mt-1 text-xs text-[var(--brand-dark)]/70">{m.delta}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Registration funnel</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {funnelStages.map((s) => {
              const pct = Math.round((s.value / maxFunnel) * 100);
              return (
                <div key={s.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">{s.label}</span>
                    <span className="tabular-nums text-muted-foreground">{s.value.toLocaleString()} · {pct}%</span>
                  </div>
                  <div className="mt-1 h-3 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-[var(--brand)]" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Top support topics</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {topSupportTopics.map((t) => {
              const pct = Math.round((t.value / maxTopic) * 100);
              return (
                <div key={t.label}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{t.label}</span>
                    <span className="tabular-nums text-muted-foreground">{t.value}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-[var(--brand-dark)]" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Readiness breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {readinessBreakdown.map((r) => (
              <div key={r.label} className="flex items-center gap-3">
                <div className="w-40 shrink-0 text-sm">{r.label}</div>
                <Progress value={r.value} className="flex-1 h-2 [&>div]:bg-[var(--brand)]" />
                <div className="w-10 text-right text-sm font-mono">{r.value}%</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Registration completion by region</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {regionCompletion.map((r) => (
              <div key={r.label} className="flex items-center gap-3">
                <div className="w-40 shrink-0 text-sm">{r.label}</div>
                <Progress value={r.value} className="flex-1 h-2 [&>div]:bg-[var(--brand-dark)]" />
                <div className="w-10 text-right text-sm font-mono">{r.value}%</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-[var(--brand-dark)]" /> Outstanding action items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2">
              {outstandingActions.map((a) => (
                <li key={a} className="flex items-start gap-2 rounded-lg border p-3 text-sm">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--brand)]" />
                  {a}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
