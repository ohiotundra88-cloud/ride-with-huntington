import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/StatusBadge";
import { useStore } from "@/lib/store";
import { CheckCircle2, Plane, Bike, Shirt, ClipboardCheck, ArrowRight, Edit2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [
    { title: "My Journey — Team Huntington Hub" },
    { name: "description", content: "Your Team Huntington participant dashboard: progress, deadlines and outstanding actions." },
  ] }),
  component: Dashboard,
});

function Dashboard() {
  const { user, registration, completion, incompleteStep } = useStore();
  const nav = useNavigate();
  const cards = [
    { icon: CheckCircle2, title: "Pelotonia", status: registration.pelotonia.status, deadline: "Jul 15", extra: registration.pelotonia.confirmation && `Conf: ${registration.pelotonia.confirmation}` },
    { icon: Plane, title: "Travel & Hotel", status: registration.travel.status, deadline: "Jul 22", extra: registration.travel.hotelName },
    { icon: Bike, title: "Bike Rental", status: registration.bike.status, deadline: "Jul 22", extra: registration.bike.confirmation },
    { icon: Shirt, title: "Apparel & Mailing", status: registration.apparel.status, deadline: "Jul 10", extra: registration.address.city && `${registration.address.city}, ${registration.address.state}` },
  ];

  const nextStepBtn = () => {
    nav({ to: "/register" });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Welcome */}
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-[var(--brand-dark)] to-[var(--brand-dark)]/85 text-white">
        <CardContent className="p-6 sm:p-8 relative">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-white/60">Welcome back</p>
              <h1 className="mt-1 text-3xl sm:text-4xl font-black">{user.name.split(" ")[0]} — you're {completion}% there.</h1>
              <p className="mt-2 text-white/80 max-w-xl">Team Huntington Pelotonia 2027 · {registration.participation ? registration.participation.toUpperCase() : "Not registered"}</p>
              <Progress value={completion} className="mt-4 h-2 bg-white/10 [&>div]:bg-[var(--brand)]" />
            </div>
            <div className="shrink-0 flex flex-col gap-2">
              <Button
                onClick={nextStepBtn}
                className="bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90 font-semibold"
              >
                {incompleteStep === 5 ? "Registration complete" : "Resume next step"} <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
              <Button asChild variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white">
                <Link to="/register"><Edit2 className="mr-1 h-4 w-4" /> Edit registration</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.title} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--brand)]/15 text-[var(--brand-dark)]">
                  <c.icon className="h-5 w-5" />
                </div>
                <StatusBadge status={c.status} />
              </div>
              <h3 className="mt-4 font-bold text-[var(--brand-dark)]">{c.title}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Deadline: {c.deadline}</p>
              {c.extra && <p className="mt-2 text-xs">{c.extra}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Confirmation summary */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Confirmation summary</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {registration.id ? (
              <>
                <div className="flex justify-between border-b py-2"><span className="text-muted-foreground">Registration ID</span><span className="font-mono font-bold">{registration.id}</span></div>
                <div className="flex justify-between border-b py-2"><span className="text-muted-foreground">Submitted</span><span>{registration.submittedAt ? new Date(registration.submittedAt).toLocaleString() : "—"}</span></div>
                <div className="flex justify-between border-b py-2"><span className="text-muted-foreground">Type</span><span className="capitalize">{registration.participation}</span></div>
                <div className="flex justify-between py-2"><span className="text-muted-foreground">Completion</span><span>{completion}%</span></div>
                <Button asChild variant="outline" size="sm" className="mt-2"><Link to="/confirmation">View confirmation email</Link></Button>
              </>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <ClipboardCheck className="mx-auto h-10 w-10 opacity-40" />
                <p className="mt-3">No submission yet.</p>
                <Button asChild className="mt-3 bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90"><Link to="/register">Start registration</Link></Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity */}
        <Card>
          <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {registration.audit.length === 0 && <p className="text-sm text-muted-foreground">Activity will show here as you make progress.</p>}
            {registration.audit.slice(0, 8).map((a) => (
              <div key={a.id} className="flex gap-3 text-sm">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--brand)]" />
                <div>
                  <p className="text-foreground">{a.message}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{formatDistanceToNow(new Date(a.at), { addSuffix: true })}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
