import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, Mail, Loader2 } from "lucide-react";
import { RsvpButtons } from "@/components/MyEventsCard";
import { formatEventDate, formatTimeRange } from "@/lib/events.shared";
import { isUpcoming, type MyTeamEvent } from "@/lib/team-events.shared";
import { listMyTeamEvents } from "@/lib/team-events.functions";

export const Route = createFileRoute("/my-events")({
  head: () => ({
    meta: [
      { title: "My Team Events — Team Huntington" },
      {
        name: "description",
        content: "Every Team Huntington event you've been invited to, with a one-tap RSVP.",
      },
      { property: "og:title", content: "My Team Events — Team Huntington" },
      {
        property: "og:description",
        content: "See the company events assigned to you and let your captain know if you can make it.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyEventsPage,
});

function EventRow({ event, past }: { event: MyTeamEvent; past?: boolean }) {
  return (
    <Card className={past ? "opacity-70" : undefined}>
      <CardContent className="space-y-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-lg font-bold">{event.title}</h2>
            <p className="text-sm text-muted-foreground">
              {formatEventDate(event.eventDate)}
              {formatTimeRange(event.startTime, event.endTime)
                ? ` · ${formatTimeRange(event.startTime, event.endTime)}`
                : ""}
            </p>
          </div>
          <div className="flex gap-2">
            {event.status === "cancelled" && <Badge variant="destructive">Cancelled</Badge>}
            {event.rsvp && (
              <Badge variant={event.rsvp === "yes" ? "default" : "outline"}>
                {event.rsvp === "yes" ? "Going" : "Not going"}
              </Badge>
            )}
          </div>
        </div>

        {event.location && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" /> {event.location}
          </p>
        )}
        {event.description && (
          <p className="whitespace-pre-line text-sm text-foreground/90">{event.description}</p>
        )}
        {(event.organizerName || event.organizerEmail) && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Mail className="h-3.5 w-3.5" /> {event.organizerName}
            {event.organizerEmail ? ` · ${event.organizerEmail}` : ""}
          </p>
        )}

        {!past && event.status !== "cancelled" && (
          <div className="flex flex-wrap items-center gap-2">
            <RsvpButtons event={event} />
            <AddToCalendar event={event} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MyEventsPage() {
  const events = useQuery({ queryKey: ["my-team-events"], queryFn: () => listMyTeamEvents() });
  const all = events.data ?? [];
  const upcoming = all.filter((e) => isUpcoming(e.eventDate));
  const past = all.filter((e) => !isUpcoming(e.eventDate)).reverse();

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight sm:text-3xl">
          <CalendarDays className="h-6 w-6" /> My team events
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Events you've been invited to. Let your organizer know if you can make it.
        </p>
      </header>

      {events.isLoading ? (
        <p className="py-12 text-center text-muted-foreground">
          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
        </p>
      ) : all.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No team events assigned to you right now.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Upcoming
            </h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing coming up.</p>
            ) : (
              upcoming.map((e) => <EventRow key={e.id} event={e} />)
            )}
          </section>

          {past.length > 0 && (
            <details className="space-y-3">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Past events ({past.length})
              </summary>
              <div className="mt-3 space-y-3">
                {past.map((e) => (
                  <EventRow key={e.id} event={e} past />
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </main>
  );
}
