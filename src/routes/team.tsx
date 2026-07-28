import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Award, CalendarDays, Users, HandHeart, Megaphone, DollarSign } from "lucide-react";
import { teamActivities, teamGoal, teamMetrics } from "@/lib/mock-data";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "Team Huntington Hub — Team snapshot" },
      { name: "description", content: "Team Huntington roster, fundraising progress, and recent activity for Pelotonia 2027." },
      { property: "og:title", content: "Team Huntington Hub" },
      { property: "og:description", content: "Team roster, fundraising, and recent activity." },
    ],
  }),
  component: TeamHub,
});

function TeamHub() {
  const pct = Math.round((teamGoal.current / teamGoal.goal) * 100);
  const fmt = (n: number) => `$${n.toLocaleString()}`;

  const quickLinks = [
    { icon: CalendarDays, label: "Team Events", href: "/family" },
    { icon: DollarSign, label: "Fundraising Resources", href: "/resources" },
    { icon: Award, label: "Recognition", href: "/resources" },
    { icon: HandHeart, label: "Volunteer Opportunities", href: "/register" },
    { icon: Megaphone, label: "Team Updates", href: "/dashboard" },
  ] as const;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="rounded-2xl bg-[var(--brand-dark)] p-6 sm:p-8 text-white">
        <p className="text-xs uppercase tracking-wider text-white/60">Team Huntington</p>
        <h1 className="mt-1 text-3xl sm:text-4xl font-black">Team Huntington Hub</h1>
        <p className="mt-3 max-w-2xl text-white/80 leading-relaxed">
          A snapshot of the team, our fundraising progress, and the latest updates from colleagues.
          Figures marked "sample" reflect demonstration data.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {teamMetrics.map((m) => (
          <Card key={m.id}>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p className="mt-1 text-2xl sm:text-3xl font-black text-[var(--brand-dark)]">{m.value}</p>
              {m.note && <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{m.note}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-[var(--brand)]" /> 2027 fundraising campaign
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-3xl font-black text-[var(--brand-dark)]">
                {fmt(teamGoal.current)}
                <span className="text-base font-semibold text-muted-foreground"> / {fmt(teamGoal.goal)} goal</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">Sample data — updated nightly in production.</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-[var(--brand-dark)]">{pct}%</p>
              <p className="text-xs text-muted-foreground">of team goal</p>
            </div>
          </div>
          <Progress value={pct} className="mt-3 h-2.5 [&>div]:bg-[var(--brand)]" aria-label={`Team fundraising ${pct}%`} />
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[var(--brand-dark)]" /> Recent team activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {teamActivities.map((a) => (
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
