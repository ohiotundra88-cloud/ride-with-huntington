import {
  effectiveStatuses,
  isRiderParticipation,
  needsTravelAndApparel,
} from "@/lib/registration-progress";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { CheckCircle2, ClipboardList, ArrowRight } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";

export const Route = createFileRoute("/confirmation")({
  head: () => ({
    meta: [
      { title: "Confirmation — Team Huntington Hub" },
      {
        name: "description",
        content: "Your Team Huntington registration confirmation and summary.",
      },
    ],
  }),
  component: Confirmation,
});

function Confirmation() {
  const { registration, completion } = useStore();
  // Statuses derived from the answers on file, so a stale stored status can't
  // mark a step done.
  const status = effectiveStatuses(registration);
  const isRider = isRiderParticipation(registration.participation);
  const travelAndApparel = needsTravelAndApparel(registration.participation);
  const outstanding: string[] = [];
  if (status.pelotonia !== "complete") outstanding.push("Confirm Pelotonia registration");
  if (travelAndApparel && status.travel !== "complete") outstanding.push("Complete travel & hotel");
  if (isRider && status.bike !== "complete") outstanding.push("Finalize bike rental");
  if (travelAndApparel && status.apparel !== "complete")
    outstanding.push("Confirm apparel & mailing address");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* Success card */}
      <Card className="border-0 bg-gradient-to-br from-[var(--brand)] to-[var(--brand)]/70 text-[var(--brand-foreground)]">
        <CardContent className="p-8 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14" />
          <h1 className="mt-3 text-3xl font-black">You're on Team Huntington!</h1>
          <p className="mt-2 opacity-80">
            Registration {registration.id ? "submitted" : "in progress"} · {completion}% complete
          </p>
          {registration.id && <p className="mt-4 font-mono text-lg font-bold">{registration.id}</p>}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button
              asChild
              className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90"
            >
              <Link to="/dashboard">
                Go to my dashboard <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="bg-transparent border-[var(--brand-foreground)]/30"
            >
              <Link to="/register">Edit my registration</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <h2 className="mt-10 text-lg font-bold text-[var(--brand-dark)] flex items-center gap-2">
        <ClipboardList className="h-4 w-4" /> Registration summary
      </h2>
      <Card className="mt-3">
        <CardContent className="p-6 text-sm">
          <div className="rounded-lg bg-muted/50 p-4 space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Registration ID</span>
              <span className="font-mono font-bold">{registration.id ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Participation</span>
              <span className="capitalize">
                {registration.participation ?? "—"}
                {[
                  registration.pelotonia.highRoller && "High Roller",
                  registration.pelotonia.survivor && "Survivor",
                ].filter(Boolean).length > 0 && (
                  <span className="ml-2 text-xs font-semibold text-[var(--brand-dark)]">
                    ·{" "}
                    {[
                      registration.pelotonia.highRoller && "High Roller",
                      registration.pelotonia.survivor && "Survivor",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Pelotonia</span>
              <StatusBadge status={status.pelotonia} />
            </div>
            {travelAndApparel && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Travel</span>
                <StatusBadge status={status.travel} />
              </div>
            )}
            {isRider && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Bike</span>
                <StatusBadge status={status.bike} />
              </div>
            )}
            {travelAndApparel && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Apparel</span>
                <StatusBadge status={status.apparel} />
              </div>
            )}
          </div>

          {outstanding.length > 0 && (
            <>
              <p className="mt-4 font-semibold">Outstanding actions:</p>
              <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                {outstanding.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
