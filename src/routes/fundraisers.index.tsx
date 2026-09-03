import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { HandCoins, Plus, Ticket, Gavel, Award, HeartHandshake } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DemoPaymentBanner } from "@/components/DemoPaymentBanner";
import { listPublicFundraisers } from "@/lib/fundraising-pages.functions";
import { KIND_LABELS, money, STATUS_LABELS, type FundraiserKind, type FundraiserListRow } from "@/lib/fundraising-pages.shared";
import { FundraiserPagesPaused } from "@/components/FundraiserPagesPaused";
import { useSiteSettings } from "@/lib/useSiteSettings";

export const Route = createFileRoute("/fundraisers/")({
  component: FundraiserDirectory,
  head: () => ({
    meta: [
      { title: "Fundraisers — Team Huntington Hub" },
      {
        name: "description",
        content: "Support Team Huntington: raffles, event tickets, sponsorships, auctions, and direct giving for Pelotonia.",
      },
      { property: "og:title", content: "Fundraisers — Team Huntington Hub" },
      { property: "og:description", content: "Raffles, tickets, sponsorships, auctions, and giving pages for Team Huntington." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const KIND_ICON: Record<FundraiserKind, typeof Ticket> = {
  donation: HeartHandshake,
  raffle: Ticket,
  tickets: Ticket,
  sponsorship: Award,
  auction: Gavel,
};

function FundraiserDirectory() {
  const { fundraiserPagesPaused } = useSiteSettings();
  const { data = [], isPending } = useQuery<FundraiserListRow[]>({
    queryKey: ["public-fundraisers"],
    queryFn: () => listPublicFundraisers(),
  });

  const live = data.filter((f) => f.status === "live");
  const past = data.filter((f) => f.status !== "live");

  if (fundraiserPagesPaused) return <FundraiserPagesPaused />;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--brand-dark)]">Team Huntington fundraisers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Raffles, tickets, sponsorships, auctions, and direct giving — every dollar supports our Pelotonia commitment.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/my-fundraisers"><Plus className="mr-1.5 h-4 w-4" /> Start a fundraiser</Link>
        </Button>
      </div>

      <DemoPaymentBanner className="mt-4" />

      {isPending ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading fundraisers…</p>
      ) : data.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="py-10 text-center">
            <HandCoins className="mx-auto h-8 w-8 text-[var(--brand)]" />
            <p className="mt-3 font-medium">No fundraisers are live yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Riders can create a page and send it through approval from the fundraiser workspace.
            </p>
            <Button asChild className="mt-4 bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90">
              <Link to="/my-fundraisers">Start a fundraiser</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Section rows={live} title="Live now" />
          {past.length > 0 && <Section rows={past} title="Wrapped up" />}
        </>
      )}
    </main>
  );
}

function Section({ rows, title }: { rows: FundraiserListRow[]; title: string }) {
  if (rows.length === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((f) => {
          const Icon = KIND_ICON[f.kind];
          return (
            <Card key={f.id} className="flex flex-col overflow-hidden transition hover:shadow-md">
              <CardContent className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <Icon className="h-3.5 w-3.5" /> {KIND_LABELS[f.kind]}
                  </Badge>
                  {f.status !== "live" && <span className="text-xs text-muted-foreground">{STATUS_LABELS[f.status]}</span>}
                </div>
                <div>
                  <h3 className="font-semibold leading-snug text-[var(--brand-dark)]">{f.title}</h3>
                  {f.summary && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{f.summary}</p>}
                </div>
                <div className="mt-auto space-y-2">
                  <Progress value={f.totals.goalPercent} className="h-2" />
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-semibold">{money(f.totals.gross)}</span>
                    <span className="text-muted-foreground">of {money(f.goal_amount)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {f.totals.supporters} supporter{f.totals.supporters === 1 ? "" : "s"}
                    {f.closes_at ? ` · closes ${new Date(f.closes_at).toLocaleDateString()}` : ""}
                  </p>
                  <Button asChild className="w-full bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90">
                    <Link to="/fundraisers/$slug" params={{ slug: f.slug }}>
                      {f.status === "live" ? "Support this" : "View page"}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
