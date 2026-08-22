import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Ticket } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DemoPaymentBanner } from "@/components/DemoPaymentBanner";
import { getOrderReceipt } from "@/lib/fundraising-pages.functions";
import { money } from "@/lib/fundraising-pages.shared";

export const Route = createFileRoute("/fundraisers/$slug/thanks")({
  validateSearch: z.object({ order: z.string().uuid().optional() }),
  component: ThanksPage,
  head: () => ({
    meta: [
      { title: "Thank you — Team Huntington fundraiser" },
      { name: "description", content: "Your contribution to a Team Huntington Pelotonia fundraiser is confirmed." },
      { property: "og:title", content: "Thank you for supporting Team Huntington" },
      { property: "og:description", content: "Contribution confirmation for a Team Huntington fundraiser." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ThanksPage() {
  const { slug } = Route.useParams();
  const { order } = Route.useSearch();

  const { data, isPending } = useQuery({
    queryKey: ["fundraiser-receipt", order],
    queryFn: () => getOrderReceipt({ data: { order_id: order! } }),
    enabled: Boolean(order),
  });

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <Card>
        <CardContent className="p-6 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-[var(--brand)]" />
          <h1 className="mt-3 text-xl font-bold text-[var(--brand-dark)]">Thank you!</h1>

          {!order ? (
            <p className="mt-2 text-sm text-muted-foreground">Your contribution to Team Huntington is confirmed.</p>
          ) : isPending ? (
            <p className="mt-2 text-sm text-muted-foreground">Loading your confirmation…</p>
          ) : !data ? (
            <p className="mt-2 text-sm text-muted-foreground">We couldn't find that confirmation.</p>
          ) : (
            <div className="mt-3 space-y-3 text-sm">
              <p className="text-muted-foreground">
                {data.order.supporter_name}, your support of <span className="font-medium">{data.fundraiser?.title}</span>{" "}
                is recorded.
              </p>
              <div className="rounded-lg border bg-muted/40 p-4 text-left">
                <Row label="Amount" value={money(data.order.amount)} />
                {data.item_label && <Row label="Item" value={`${data.order.quantity} × ${data.item_label}`} />}
                <Row label="Status" value={data.order.status === "paid" ? "Paid" : data.order.status} />
                <Row label="Confirmation" value={data.order.id.slice(0, 8).toUpperCase()} />
                <Row label="Date" value={new Date(data.order.created_at).toLocaleString()} />
              </div>
              {data.entry_numbers.length > 0 && (
                <div className="rounded-lg border border-[var(--brand)]/40 bg-[var(--brand)]/5 p-4 text-left">
                  <p className="flex items-center gap-1.5 font-medium">
                    <Ticket className="h-4 w-4 text-[var(--brand)]" /> Your raffle entries
                  </p>
                  <p className="mt-1 font-mono text-sm">{data.entry_numbers.join(", ")}</p>
                </div>
              )}
            </div>
          )}

          <DemoPaymentBanner className="mt-4 text-left" />

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button asChild variant="outline">
              <Link to="/fundraisers/$slug" params={{ slug }}>Back to the fundraiser</Link>
            </Button>
            <Button asChild className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90">
              <Link to="/fundraisers">See all fundraisers</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
