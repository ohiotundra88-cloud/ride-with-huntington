import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Car, Tent, MessageSquare } from "lucide-react";
import { openConcierge } from "@/components/Concierge";
import { useAdmin } from "@/lib/admin-store";
import { AdminIcon } from "@/components/AdminIcon";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";

export const Route = createFileRoute("/family")({
  head: () => ({
    meta: [
      { title: "Family Guide — Team Huntington Hub" },
      { name: "description", content: "Family & spectator guide for Ride Weekend 2027." },
      { property: "og:title", content: "Ride Weekend Family Guide" },
      {
        property: "og:description",
        content: "Everything families and spectators need for Ride Weekend 2027.",
      },
    ],
  }),
  component: FamilyGuide,
});

function FamilyGuide() {
  const { state } = useAdmin();
  if (!state.flags.familyMode) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Family Guide is turned off</h1>
        <p className="mt-2 text-sm text-muted-foreground">A Super User has hidden this section.</p>
        <Button asChild className="mt-6">
          <Link to="/">Go home</Link>
        </Button>
      </div>
    );
  }

  const sections = state.family.sections
    .filter((s) => s.active && s.publish === "published")
    .sort((a, b) => a.order - b.order);
  const schedule = state.family.schedule.filter((s) => s.active);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <AnnouncementBanner audience="families" />

      <div className="rounded-2xl bg-[var(--brand-dark)] p-6 sm:p-8 text-white">
        <p className="text-xs uppercase tracking-wider text-white/60">Ride Weekend</p>
        <h1 className="mt-1 text-3xl sm:text-4xl font-black">Family & Spectator Guide</h1>
        <p className="mt-3 max-w-2xl text-white/80 leading-relaxed">
          Everything the people cheering you on need for Ride Weekend 2027. Content is managed by
          the Team Huntington admin team — details may change ahead of the event.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            asChild
            className="bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90"
          >
            <a href="#schedule">
              <CalendarDays className="mr-1 h-4 w-4" /> View Ride Schedule
            </a>
          </Button>
          <Button
            asChild
            variant="outline"
            className="bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white"
          >
            <a href="#parking">
              <Car className="mr-1 h-4 w-4" /> Open Parking Details
            </a>
          </Button>
          <Button
            asChild
            variant="outline"
            className="bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white"
          >
            <a href="#tent">
              <Tent className="mr-1 h-4 w-4" /> Find the Team Tent
            </a>
          </Button>
          {state.flags.concierge && (
            <Button
              variant="outline"
              onClick={openConcierge}
              className="bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white"
            >
              <MessageSquare className="mr-1 h-4 w-4" /> Ask the Concierge
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <Card key={s.id} id={s.id} className="scroll-mt-20">
            <CardContent className="p-5">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--brand)]/15 text-[var(--brand-dark)]">
                <AdminIcon name={s.icon} className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-bold text-[var(--brand-dark)]">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
              {state.flags.concierge && (
                <div className="mt-3">
                  <Button size="sm" variant="outline" onClick={openConcierge}>
                    <MessageSquare className="mr-1 h-3.5 w-3.5" /> Ask the Concierge
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card id="schedule">
        <CardHeader>
          <CardTitle>Ride Weekend schedule</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {schedule.length === 0 && (
            <p className="text-sm text-muted-foreground sm:col-span-3">
              The Ride Weekend schedule will be posted here once it's announced.
            </p>
          )}
          {schedule.map((s) => (
            <div key={s.id}>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--brand-dark)]/70">
                {s.day}
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {s.items.map((i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand)]" />{" "}
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link to="/resources">More resources</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/dashboard">Back to my journey</Link>
        </Button>
      </div>
    </div>
  );
}
