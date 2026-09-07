import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, ArrowRight, Check, X } from "lucide-react";
import { formatEventDate, formatTimeRange } from "@/lib/events.shared";
import { isUpcoming, type MyTeamEvent, type Rsvp } from "@/lib/team-events.shared";
import { listMyTeamEvents, setMyRsvp } from "@/lib/team-events.functions";

/** Compact RSVP control shared by the journey card and the full events page. */
export function RsvpButtons({ event, size = "sm" }: { event: MyTeamEvent; size?: "sm" | "default" }) {
  const qc = useQueryClient();
  const rsvpFn = useServerFn(setMyRsvp);
  const mutate = useMutation({
    mutationFn: (rsvp: Rsvp) => rsvpFn({ data: { id: event.id, rsvp } }),
    onSuccess: (_r, rsvp) => {
      toast.success(rsvp === "yes" ? "You're in — thanks!" : "Thanks for letting us know");
      qc.invalidateQueries({ queryKey: ["my-team-events"] });
    },
    onError: (e: Error) => toast.error(e.message || "Couldn't save your RSVP"),
  });

  const disabled = mutate.isPending || event.status === "cancelled";

  return (
    <div className="flex gap-2">
      <Button
        size={size}
        variant={event.rsvp === "yes" ? "default" : "outline"}
        disabled={disabled}
        onClick={() => mutate.mutate("yes")}
      >
        <Check className="mr-1 h-3.5 w-3.5" /> I'm in
      </Button>
      <Button
        size={size}
        variant={event.rsvp === "no" ? "secondary" : "ghost"}
        disabled={disabled}
        onClick={() => mutate.mutate("no")}
      >
        <X className="mr-1 h-3.5 w-3.5" /> Can't make it
      </Button>
    </div>
  );
}

/** Next few team events assigned to the signed-in colleague, with RSVP. */
export function MyEventsCard() {
  const events = useQuery({ queryKey: ["my-team-events"], queryFn: () => listMyTeamEvents() });
  const upcoming = (events.data ?? []).filter((e) => isUpcoming(e.eventDate) && e.status === "published");

  if (events.isLoading) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="h-4 w-4" /> My team events
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">No team events assigned to you right now.</p>
        ) : (
          upcoming.slice(0, 3).map((e) => (
            <div key={e.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">{e.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatEventDate(e.eventDate)}
                    {formatTimeRange(e.startTime, e.endTime) ? ` · ${formatTimeRange(e.startTime, e.endTime)}` : ""}
                  </p>
                  {e.location && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {e.location}
                    </p>
                  )}
                </div>
                {e.rsvp && (
                  <Badge variant={e.rsvp === "yes" ? "default" : "outline"}>
                    {e.rsvp === "yes" ? "Going" : "Not going"}
                  </Badge>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <RsvpButtons event={e} />
                <AddToCalendar event={e} />
              </div>
            </div>
          ))
        )}
        <Button asChild variant="ghost" size="sm" className="px-0">
          <Link to="/my-events">
            View all events <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
