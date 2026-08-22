import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, CalendarClock, HandCoins, Loader2, Ticket, Users } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { DemoPaymentBanner } from "@/components/DemoPaymentBanner";
import { getPublicFundraiser, startCheckout } from "@/lib/fundraising-pages.functions";
import {
  KIND_ITEM_NOUN, KIND_LABELS, money, remainingQuantity,
  type FundraiserItem, type PublicFundraiser,
} from "@/lib/fundraising-pages.shared";

export const Route = createFileRoute("/fundraisers/$slug/")({
  component: FundraiserPublicPage,
  head: ({ params }) => ({
    meta: [
      { title: `Support this fundraiser — Team Huntington` },
      { name: "description", content: `Contribute to a Team Huntington Pelotonia fundraiser (${params.slug}).` },
      { property: "og:title", content: "Support a Team Huntington fundraiser" },
      { property: "og:description", content: "Raffles, tickets, sponsorships, and giving for Team Huntington's Pelotonia ride." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function FundraiserPublicPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();

  const { data, isPending, error, refetch } = useQuery<PublicFundraiser>({
    queryKey: ["public-fundraiser", slug],
    queryFn: () => getPublicFundraiser({ data: { slug } }),
  });

  const activeItems = useMemo(() => (data?.items ?? []).filter((i) => i.active), [data]);
  const [itemId, setItemId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);

  const selected: FundraiserItem | null = activeItems.find((i) => i.id === itemId) ?? null;
  const f = data?.fundraiser;
  const open = f?.status === "live";

  const checkout = useMutation({
    mutationFn: () =>
      startCheckout({
        data: {
          slug,
          item_id: selected?.id ?? null,
          quantity: selected ? quantity : 1,
          custom_amount: selected ? null : Number(amount || 0),
          supporter_name: name,
          supporter_email: email,
          message,
          anonymous,
        },
      }),
    onSuccess: (res) => {
      if (res.redirect_url && !res.redirect_url.startsWith("/fundraisers/")) {
        window.location.href = res.redirect_url;
        return;
      }
      navigate({ to: "/fundraisers/$slug/thanks", params: { slug }, search: { order: res.order_id } });
    },
    onError: (e: any) => toast.error(e?.message ?? "We couldn't complete that contribution."),
  });

  if (isPending) return <main className="mx-auto max-w-5xl px-4 py-12 text-sm text-muted-foreground">Loading…</main>;

  if (error || !data || !f) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-[var(--brand-dark)]">This fundraiser isn't available</h1>
        <p className="mt-2 text-sm text-muted-foreground">It may have been closed or the link is incorrect.</p>
        <Button asChild className="mt-5" variant="outline" onClick={() => refetch()}>
          <Link to="/fundraisers"><ArrowLeft className="mr-1.5 h-4 w-4" /> All fundraisers</Link>
        </Button>
      </main>
    );
  }

  const total = selected ? selected.unit_price * quantity : Number(amount || 0);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link to="/fundraisers" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1.5 h-4 w-4" /> All fundraisers
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <Badge variant="secondary">{KIND_LABELS[f.kind]}</Badge>
          <h1 className="mt-2 text-2xl font-bold text-[var(--brand-dark)] sm:text-3xl">{f.title}</h1>
          {f.summary && <p className="mt-2 text-muted-foreground">{f.summary}</p>}
          <p className="mt-2 text-xs text-muted-foreground">
            Organized by {f.organizer_name}
            {f.beneficiary ? ` · benefiting ${f.beneficiary}` : ""}
          </p>

          <DemoPaymentBanner className="mt-4" />

          {f.story && (
            <div className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{f.story}</div>
          )}

          {data.supporters.length > 0 && (
            <Card className="mt-6">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4 text-[var(--brand)]" /> Recent supporters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.supporters.map((s, i) => (
                  <div key={i} className="border-b pb-3 last:border-0 last:pb-0">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="font-medium">{s.name}</span>
                      <span className="text-muted-foreground">{money(s.amount)}</span>
                    </div>
                    {s.message && <p className="mt-1 text-sm text-muted-foreground">{s.message}</p>}
                    <p className="mt-0.5 text-xs text-muted-foreground">{new Date(s.at).toLocaleDateString()}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardContent className="space-y-3 p-5">
              <Progress value={data.totals.goalPercent} className="h-2" />
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-bold text-[var(--brand-dark)]">{money(data.totals.gross)}</span>
                <span className="text-sm text-muted-foreground">of {money(f.goal_amount)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {data.totals.supporters} supporter{data.totals.supporters === 1 ? "" : "s"}
                {f.kind !== "donation" ? ` · ${data.totals.units} ${KIND_ITEM_NOUN[f.kind].toLowerCase()} sold` : ""}
              </p>
              {(f.closes_at || f.draw_at) && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {f.closes_at ? `Closes ${new Date(f.closes_at).toLocaleDateString()}` : ""}
                  {f.draw_at ? ` · Drawing ${new Date(f.draw_at).toLocaleDateString()}` : ""}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <HandCoins className="h-4 w-4 text-[var(--brand)]" />
                {open ? "Contribute" : "Contributions are closed"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!open ? (
                <p className="text-sm text-muted-foreground">
                  This page is no longer accepting contributions. Thank you for supporting Team Huntington.
                </p>
              ) : (
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    checkout.mutate();
                  }}
                >
                  {activeItems.length > 0 && (
                    <div className="space-y-2">
                      <Label>{KIND_ITEM_NOUN[f.kind]}</Label>
                      {activeItems.map((item) => {
                        const left = remainingQuantity(item);
                        const soldOut = left === 0;
                        return (
                          <button
                            type="button"
                            key={item.id}
                            disabled={soldOut}
                            onClick={() => {
                              setItemId(item.id);
                              setQuantity(1);
                            }}
                            className={`w-full rounded-lg border p-3 text-left transition disabled:opacity-50 ${
                              itemId === item.id ? "border-[var(--brand)] bg-[var(--brand)]/5" : "hover:bg-muted/50"
                            }`}
                          >
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="text-sm font-medium">{item.label}</span>
                              <span className="text-sm font-semibold">{money(item.unit_price)}</span>
                            </div>
                            {item.description && (
                              <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                            )}
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {soldOut ? "Sold out" : left !== null ? `${left} left` : "Available"}
                              {f.kind === "raffle" ? ` · ${item.entries_per_unit} entr${item.entries_per_unit === 1 ? "y" : "ies"} each` : ""}
                            </p>
                          </button>
                        );
                      })}
                      {selected && (
                        <div className="space-y-1.5">
                          <Label htmlFor="qty">Quantity</Label>
                          <Input
                            id="qty"
                            type="number"
                            min={1}
                            max={selected.max_per_order}
                            value={quantity}
                            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value || 1)))}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {f.allow_custom_amount && (
                    <div className="space-y-1.5">
                      <Label htmlFor="amount">
                        {activeItems.length > 0 ? "Or give any amount" : "Amount"} (min ${f.min_custom_amount})
                      </Label>
                      <Input
                        id="amount"
                        type="number"
                        min={f.min_custom_amount}
                        step="1"
                        inputMode="decimal"
                        placeholder={String(f.min_custom_amount)}
                        value={amount}
                        onChange={(e) => {
                          setAmount(e.target.value);
                          setItemId(null);
                        }}
                      />
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="name">Your name</Label>
                      <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="msg">Message (optional)</Label>
                    <Textarea id="msg" rows={2} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} />
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={anonymous} onCheckedChange={(v) => setAnonymous(v === true)} />
                    Show my contribution as anonymous
                  </label>

                  <Button
                    type="submit"
                    disabled={checkout.isPending || total <= 0}
                    className="w-full bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90"
                  >
                    {checkout.isPending ? (
                      <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Processing…</>
                    ) : (
                      <><Ticket className="mr-1.5 h-4 w-4" /> Contribute {total > 0 ? money(total) : ""}</>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
