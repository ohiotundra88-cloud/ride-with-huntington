import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, BadgeCheck, Banknote, Dice5, ExternalLink, History, Loader2,
  Paperclip, Plus, Save, Send, Sparkles, Trash2, Upload, Users,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DemoPaymentBanner } from "@/components/DemoPaymentBanner";
import {
  drawFundraiserWinner, getFundraiserAccess, getFundraiserApproval, getFundraiserDetail,
  recordFundraiserPayout, refundFundraiserOrder, removeFundraiserFlier, saveFundraiserPage,
  seedFundraiserDemoSupporters, setFundraiserStatus, submitFundraiserForApproval, uploadFundraiserFlier,
} from "@/lib/fundraising-pages.functions";
import {
  ALLOWED_FUNDRAISER_FLIER_TYPES, fundraiserFlierUrl, KIND_ITEM_NOUN, KIND_LABELS,
  MAX_FUNDRAISER_FLIER_BYTES, money, moneyExact, STATUS_LABELS, validationIssues,
  type FundraiserDetail, type FundraiserInput, type ItemInput,
} from "@/lib/fundraising-pages.shared";

export const Route = createFileRoute("/my-fundraisers/$id")({
  component: ManageFundraiser,
  head: () => ({
    meta: [
      { title: "Manage fundraiser — Team Huntington Hub" },
      { name: "description", content: "Edit your fundraising page, track orders and entries, and reconcile payouts." },
      { property: "og:title", content: "Manage fundraiser — Team Huntington Hub" },
      { property: "og:description", content: "Fundraising page editing, reporting, and payout reconciliation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const dateInput = (v: string | null) => (v ? v.slice(0, 10) : "");

function ManageFundraiser() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: access } = useQuery({ queryKey: ["fundraiser-access"], queryFn: () => getFundraiserAccess() });
  const { data, isPending, error } = useQuery<FundraiserDetail>({
    queryKey: ["fundraiser-detail", id],
    queryFn: () => getFundraiserDetail({ data: { id } }),
  });

  const requestId = data?.fundraiser.request_id ?? null;
  const { data: approval } = useQuery({
    queryKey: ["fundraiser-approval", requestId],
    queryFn: () => getFundraiserApproval({ data: { request_id: requestId } }),
    enabled: Boolean(requestId),
  });

  const [form, setForm] = useState<FundraiserInput | null>(null);
  useEffect(() => {
    if (!data) return;
    const f = data.fundraiser;
    setForm({
      id: f.id,
      kind: f.kind,
      title: f.title,
      summary: f.summary,
      story: f.story,
      goal_amount: f.goal_amount,
      opens_at: dateInput(f.opens_at),
      closes_at: dateInput(f.closes_at),
      draw_at: dateInput(f.draw_at),
      beneficiary: f.beneficiary,
      contact_email: f.contact_email ?? undefined,
      allow_custom_amount: f.allow_custom_amount,
      min_custom_amount: f.min_custom_amount,
      items: data.items.map((i) => ({
        id: i.id,
        label: i.label,
        description: i.description,
        unit_price: i.unit_price,
        quantity_available: i.quantity_available,
        max_per_order: i.max_per_order,
        entries_per_unit: i.entries_per_unit,
        sort_order: i.sort_order,
        active: i.active,
      })),
    });
  }, [data]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["fundraiser-detail", id] });
    qc.invalidateQueries({ queryKey: ["my-fundraisers"] });
    qc.invalidateQueries({ queryKey: ["public-fundraisers"] });
  };

  const save = useMutation({
    mutationFn: () => saveFundraiserPage({ data: form as FundraiserInput }),
    onSuccess: () => {
      toast.success("Saved");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Couldn't save."),
  });

  const submit = useMutation({
    mutationFn: () => submitFundraiserForApproval({ data: { id } }),
    onSuccess: () => {
      toast.success("Sent for approval");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Couldn't submit."),
  });

  const status = useMutation({
    mutationFn: (next: any) => setFundraiserStatus({ data: { id, status: next } }),
    onSuccess: () => {
      toast.success("Status updated");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Couldn't change the status."),
  });

  const refund = useMutation({
    mutationFn: (order_id: string) => refundFundraiserOrder({ data: { order_id } }),
    onSuccess: () => {
      toast.success("Order refunded");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Couldn't refund that order."),
  });

  const draw = useMutation({
    mutationFn: () => drawFundraiserWinner({ data: { id } }),
    onSuccess: (r) => {
      toast.success(`Winner: ${r.supporter_name} (entry ${r.entry_number})`);
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Couldn't run the drawing."),
  });

  const seed = useMutation({
    mutationFn: () => seedFundraiserDemoSupporters({ data: { id, count: 8 } }),
    onSuccess: () => {
      toast.success("Demo supporters added");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Couldn't add demo supporters."),
  });

  if (isPending || !form) {
    return <main className="mx-auto max-w-5xl px-4 py-12 text-sm text-muted-foreground">Loading…</main>;
  }
  if (error || !data) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-[var(--brand-dark)]">We couldn't open that fundraiser</h1>
        <p className="mt-2 text-sm text-muted-foreground">It may have been removed, or you may not have access.</p>
        <Button asChild className="mt-5" variant="outline"><Link to="/my-fundraisers">Back to workspace</Link></Button>
      </main>
    );
  }

  const f = data.fundraiser;
  const issues = validationIssues(form);
  const canPublish = Boolean(access?.canManageAll);
  const paidOrders = data.orders.filter((o) => o.status === "paid");
  const payoutTotal = data.payouts.reduce((s, p) => s + p.net_amount, 0);

  const set = <K extends keyof FundraiserInput>(key: K, value: FundraiserInput[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  const setItem = (i: number, patch: Partial<ItemInput>) =>
    setForm((prev) =>
      prev ? { ...prev, items: prev.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) } : prev,
    );

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link to="/my-fundraisers" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Fundraiser workspace
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{KIND_LABELS[f.kind]}</Badge>
            <Badge variant={f.status === "live" ? "default" : "outline"}>{STATUS_LABELS[f.status]}</Badge>
            {f.is_demo && <Badge variant="outline">Demo</Badge>}
          </div>
          <h1 className="mt-2 text-2xl font-bold text-[var(--brand-dark)]">{f.title}</h1>
          <p className="text-xs text-muted-foreground">
            Organizer {f.organizer_name} · updated {new Date(f.updated_at).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {f.status !== "draft" && (
            <Button asChild variant="outline" size="sm">
              <Link to="/fundraisers/$slug" params={{ slug: f.slug }}>
                <ExternalLink className="mr-1.5 h-4 w-4" /> View public page
              </Link>
            </Button>
          )}
          {f.status === "draft" && (
            <Button size="sm" onClick={() => submit.mutate()} disabled={submit.isPending || issues.length > 0}>
              <Send className="mr-1.5 h-4 w-4" /> Submit for approval
            </Button>
          )}
          {canPublish && f.status === "pending_approval" && (
            <Button size="sm" onClick={() => status.mutate("live")} disabled={status.isPending}>
              <BadgeCheck className="mr-1.5 h-4 w-4" /> Publish live
            </Button>
          )}
          {canPublish && f.status === "live" && (
            <Button size="sm" variant="outline" onClick={() => status.mutate("closed")} disabled={status.isPending}>
              Close fundraiser
            </Button>
          )}
        </div>
      </div>

      <DemoPaymentBanner className="mt-4" />

      {issues.length > 0 && f.status === "draft" && (
        <Card className="mt-4 border-amber-300 bg-amber-50/60">
          <CardContent className="p-4 text-sm text-amber-900">
            <p className="font-medium">Before this can go through approval:</p>
            <ul className="mt-1 list-disc pl-5">{issues.map((i) => <li key={i}>{i}</li>)}</ul>
          </CardContent>
        </Card>
      )}

      {approval && (
        <Card className="mt-4">
          <CardHeader className="pb-2"><CardTitle className="text-base">Approval progress</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-xs">
            {(["captain_status", "legal_status", "risk_status", "compliance_status", "marketing_status", "cochair_status"] as const).map(
              (k) => (
                <Badge key={k} variant={(approval as any)[k] === "approved" ? "default" : "outline"}>
                  {k.replace("_status", "").replace(/^\w/, (c) => c.toUpperCase())}: {(approval as any)[k]}
                </Badge>
              ),
            )}
          </CardContent>
        </Card>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <Stat label="Raised (gross)" value={money(data.totals.gross)} />
        <Stat label="Processing fees" value={money(data.totals.fees)} />
        <Stat label="Net to team" value={money(data.totals.net)} />
        <Stat label="Paid out" value={money(payoutTotal)} />
      </div>
      <Progress value={data.totals.goalPercent} className="mt-3 h-2" />
      <p className="mt-1 text-xs text-muted-foreground">
        {money(data.totals.gross)} of {money(f.goal_amount)} goal · {data.totals.supporters} supporters ·{" "}
        {data.totals.units} {KIND_ITEM_NOUN[f.kind].toLowerCase()} sold
        {data.totals.refunded > 0 ? ` · ${money(data.totals.refunded)} refunded` : ""}
      </p>

      <Tabs defaultValue="page" className="mt-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="page">Page</TabsTrigger>
          <TabsTrigger value="orders">Supporters</TabsTrigger>
          {f.kind === "raffle" && <TabsTrigger value="entries">Entries &amp; drawing</TabsTrigger>}
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
          <TabsTrigger value="audit">Activity</TabsTrigger>
        </TabsList>

        {/* ---------------------------------------------------------- page */}
        <TabsContent value="page" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Page details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={form.title} onChange={(e) => set("title", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="summary">Short summary</Label>
                <Textarea id="summary" rows={2} maxLength={240} value={form.summary} onChange={(e) => set("summary", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="story">Story</Label>
                <Textarea id="story" rows={6} maxLength={6000} value={form.story} onChange={(e) => set("story", e.target.value)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="goal">Goal ($)</Label>
                  <Input id="goal" type="number" min={0} value={form.goal_amount}
                    onChange={(e) => set("goal_amount", Number(e.target.value || 0))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ben">Beneficiary</Label>
                  <Input id="ben" value={form.beneficiary} onChange={(e) => set("beneficiary", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="opens">Opens</Label>
                  <Input id="opens" type="date" value={form.opens_at ?? ""} onChange={(e) => set("opens_at", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="closes">Closes</Label>
                  <Input id="closes" type="date" value={form.closes_at ?? ""} onChange={(e) => set("closes_at", e.target.value)} />
                </div>
                {f.kind === "raffle" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="draw">Drawing date</Label>
                    <Input id="draw" type="date" value={form.draw_at ?? ""} onChange={(e) => set("draw_at", e.target.value)} />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="contact">Contact email</Label>
                  <Input id="contact" type="email" value={form.contact_email ?? ""}
                    onChange={(e) => set("contact_email", e.target.value as any)} />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.allow_custom_amount}
                    onCheckedChange={(v) => set("allow_custom_amount", v === true)} />
                  Allow supporters to give any amount
                </label>
                {form.allow_custom_amount && (
                  <div className="flex items-center gap-2 text-sm">
                    <Label htmlFor="min" className="whitespace-nowrap">Minimum $</Label>
                    <Input id="min" className="w-24" type="number" min={1} value={form.min_custom_amount}
                      onChange={(e) => set("min_custom_amount", Number(e.target.value || 1))} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <FlierCard fundraiser={f} />



          <Card>
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">{KIND_ITEM_NOUN[f.kind]}</CardTitle>
              <Button size="sm" variant="outline"
                onClick={() =>
                  set("items", [
                    ...form.items,
                    {
                      label: "", description: "", unit_price: 25, quantity_available: null,
                      max_per_order: 10, entries_per_unit: 1, sort_order: form.items.length, active: true,
                    } as ItemInput,
                  ])
                }>
                <Plus className="mr-1.5 h-4 w-4" /> Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.items.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No options yet. {f.kind === "donation" ? "Donation pages can run on custom amounts alone." : "Add at least one to go live."}
                </p>
              )}
              {form.items.map((item, i) => (
                <div key={i} className="space-y-3 rounded-lg border p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Label</Label>
                      <Input aria-label="Item label" value={item.label} onChange={(e) => setItem(i, { label: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Price ($)</Label>
                      <Input aria-label="Item price" type="number" min={0} value={item.unit_price}
                        onChange={(e) => setItem(i, { unit_price: Number(e.target.value || 0) })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Quantity available (blank = unlimited)</Label>
                      <Input aria-label="Item quantity available" type="number" min={0} value={item.quantity_available ?? ""}
                        onChange={(e) => setItem(i, { quantity_available: e.target.value === "" ? null : Number(e.target.value) })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Max per order</Label>
                      <Input aria-label="Item max per order" type="number" min={1} value={item.max_per_order}
                        onChange={(e) => setItem(i, { max_per_order: Number(e.target.value || 1) })} />
                    </div>
                    {f.kind === "raffle" && (
                      <div className="space-y-1.5">
                        <Label>Entries per unit</Label>
                        <Input aria-label="Item entries per unit" type="number" min={1} value={item.entries_per_unit}
                          onChange={(e) => setItem(i, { entries_per_unit: Number(e.target.value || 1) })} />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Description</Label>
                    <Textarea aria-label="Item description" rows={2} value={item.description} onChange={(e) => setItem(i, { description: e.target.value })} />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={item.active} onCheckedChange={(v) => setItem(i, { active: v === true })} />
                      Available for purchase
                    </label>
                    <Button size="sm" variant="ghost" className="text-destructive"
                      onClick={() => set("items", form.items.filter((_, idx) => idx !== i))}>
                      <Trash2 className="mr-1.5 h-4 w-4" /> Remove
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => save.mutate()} disabled={save.isPending}
              className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90">
              {save.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              Save changes
            </Button>
            {f.status === "live" && (
              <Button variant="outline" onClick={() => seed.mutate()} disabled={seed.isPending}>
                <Sparkles className="mr-1.5 h-4 w-4" /> Add demo supporters
              </Button>
            )}
          </div>
        </TabsContent>

        {/* -------------------------------------------------------- orders */}
        <TabsContent value="orders" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-[var(--brand)]" /> Supporters ({paidOrders.length} paid)
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {data.orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">No contributions yet.</p>
              ) : (
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2">Supporter</th><th>Qty</th><th>Amount</th><th>Fee</th>
                      <th>Status</th><th>Date</th><th />
                    </tr>
                  </thead>
                  <tbody>
                    {data.orders.map((o) => (
                      <tr key={o.id} className="border-t">
                        <td className="py-2">
                          <div className="font-medium">{o.supporter_name}{o.anonymous ? " (anonymous)" : ""}</div>
                          <div className="text-xs text-muted-foreground">{o.supporter_email}</div>
                        </td>
                        <td>{o.quantity}</td>
                        <td>{moneyExact(o.amount)}</td>
                        <td className="text-muted-foreground">{moneyExact(o.fee_amount)}</td>
                        <td><Badge variant={o.status === "paid" ? "default" : "outline"}>{o.status}</Badge></td>
                        <td className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                        <td className="text-right">
                          {o.status === "paid" && access?.canManageAll && (
                            <Button size="sm" variant="ghost" onClick={() => refund.mutate(o.id)} disabled={refund.isPending}>
                              Refund
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------- entries */}
        {f.kind === "raffle" && (
          <TabsContent value="entries" className="mt-4">
            <Card>
              <CardHeader className="flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">Raffle entries ({data.entries.length})</CardTitle>
                {access?.canManageAll && (
                  <Button size="sm" onClick={() => draw.mutate()} disabled={draw.isPending || data.entries.length === 0}>
                    <Dice5 className="mr-1.5 h-4 w-4" /> Draw winner
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {data.entries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No entries yet.</p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {data.entries.map((e) => (
                      <div key={e.id}
                        className={`rounded-md border px-3 py-2 text-sm ${e.is_winner ? "border-[var(--brand)] bg-[var(--brand)]/10" : ""}`}>
                        <span className="font-mono">#{e.entry_number}</span> · {e.supporter_name}
                        {e.is_winner && <Badge className="ml-2">Winner</Badge>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ------------------------------------------------------- payouts */}
        <TabsContent value="payouts" className="mt-4">
          <PayoutPanel data={data} canPayout={Boolean(access?.canPayout)} onDone={invalidate} />
        </TabsContent>

        {/* --------------------------------------------------------- audit */}
        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4 text-[var(--brand)]" /> Activity log
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {data.audit.length === 0 && <p className="text-muted-foreground">Nothing recorded yet.</p>}
              {data.audit.map((a) => (
                <div key={a.id} className="border-b pb-2 last:border-0">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="font-medium">{a.action.replace(/_/g, " ")}</span>
                    <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {a.actor_email ?? "system"}
                    {Object.keys(a.details ?? {}).length > 0 ? ` · ${JSON.stringify(a.details)}` : ""}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-lg font-bold text-[var(--brand-dark)]">{value}</p>
      </CardContent>
    </Card>
  );
}

function PayoutPanel({ data, canPayout, onDone }: { data: FundraiserDetail; canPayout: boolean; onDone: () => void }) {
  const paidOut = useMemo(() => data.payouts.reduce((s, p) => s + p.net_amount, 0), [data.payouts]);
  const remaining = Math.max(0, Number((data.totals.net - paidOut).toFixed(2)));

  const [recipient, setRecipient] = useState("Team Huntington Pelotonia account");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [gross, setGross] = useState(String(data.totals.gross));
  const [fee, setFee] = useState(String(data.totals.fees));
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const record = useMutation({
    mutationFn: () =>
      recordFundraiserPayout({
        data: {
          fundraiser_id: data.fundraiser.id,
          recipient,
          transfer_date: date,
          gross_amount: Number(gross || 0),
          fee_amount: Number(fee || 0),
          net_amount: Number((Number(gross || 0) - Number(fee || 0)).toFixed(2)),
          reference,
          notes,
        },
      }),
    onSuccess: () => {
      toast.success("Payout recorded");
      setReference("");
      setNotes("");
      onDone();
    },
    onError: (e: any) => toast.error(e?.message ?? "Couldn't record that payout."),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Banknote className="h-4 w-4 text-[var(--brand)]" /> Payout reconciliation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Contributions land in the central team account. Once the fundraiser closes, the co-chair transfers the net
            proceeds to the designated bank account and records the transfer here.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Net collected" value={money(data.totals.net)} />
            <Stat label="Recorded payouts" value={money(paidOut)} />
            <Stat label="Awaiting transfer" value={money(remaining)} />
          </div>
          {data.payouts.length > 0 && (
            <div className="space-y-2">
              {data.payouts.map((p) => (
                <div key={p.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="font-medium">{p.recipient}</span>
                    <span className="font-semibold">{moneyExact(p.net_amount)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.transfer_date).toLocaleDateString()} · gross {moneyExact(p.gross_amount)} · fees{" "}
                    {moneyExact(p.fee_amount)}
                    {p.reference ? ` · ref ${p.reference}` : ""}
                    {p.recorded_by_email ? ` · by ${p.recorded_by_email}` : ""}
                  </p>
                  {p.notes && <p className="mt-1 text-xs text-muted-foreground">{p.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {canPayout && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Record a transfer</CardTitle></CardHeader>
          <CardContent>
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                record.mutate();
              }}
            >
              <div className="space-y-1.5">
                <Label>Recipient / bank account</Label>
                <Input required value={recipient} onChange={(e) => setRecipient(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Transfer date</Label>
                <Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Gross amount ($)</Label>
                <Input type="number" min={0} step="0.01" value={gross} onChange={(e) => setGross(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Fees ($)</Label>
                <Input type="number" min={0} step="0.01" value={fee} onChange={(e) => setFee(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Reference</Label>
                <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Wire / check number" />
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={record.isPending}
                  className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90">
                  {record.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Banknote className="mr-1.5 h-4 w-4" />}
                  Record payout of {money(Number(gross || 0) - Number(fee || 0))}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FlierCard({ fundraiser }: { fundraiser: FundraiserDetail["fundraiser"] }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const publiclyVisible = ["live", "closed", "paid_out"].includes(fundraiser.status);

  const refresh = () => qc.invalidateQueries({ queryKey: ["fundraiser-detail", fundraiser.id] });

  const drop = useMutation({
    mutationFn: () => removeFundraiserFlier({ data: { id: fundraiser.id } }),
    onSuccess: () => { toast.success("Attachment removed"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const pick = async (file: File | null) => {
    if (!file) return;
    if (!(ALLOWED_FUNDRAISER_FLIER_TYPES as readonly string[]).includes(file.type)) {
      toast.error("Attach a PNG, JPG, WEBP or PDF"); return;
    }
    if (file.size > MAX_FUNDRAISER_FLIER_BYTES) { toast.error("File must be 8 MB or smaller"); return; }
    setBusy(true);
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (let i = 0; i < buf.length; i += 8192) binary += String.fromCharCode(...buf.subarray(i, i + 8192));
      await uploadFundraiserFlier({
        data: {
          id: fundraiser.id,
          fileName: file.name,
          contentType: file.type as (typeof ALLOWED_FUNDRAISER_FLIER_TYPES)[number],
          base64: btoa(binary),
        },
      });
      toast.success("Attachment saved");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Paperclip className="h-4 w-4 text-[var(--brand)]" /> Flier or document
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Attach one flier, menu, rules sheet or sponsorship packet (PNG, JPG, WEBP or PDF, up to 8 MB). Supporters can
          download it right from your public page.
        </p>

        {fundraiser.flier_path ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
            {publiclyVisible ? (
              <a href={fundraiserFlierUrl(fundraiser.id)} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-[var(--brand-dark)] underline">
                <Paperclip className="h-3.5 w-3.5" /> {fundraiser.flier_name || "Current attachment"}
              </a>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <Paperclip className="h-3.5 w-3.5" /> {fundraiser.flier_name || "Current attachment"} — downloadable once the page is live
              </span>
            )}
            <Button type="button" size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10"
              onClick={() => drop.mutate()} disabled={drop.isPending || busy}>
              Remove
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No document attached yet.</p>
        )}

        <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg,.webp,.pdf" className="hidden"
          onChange={(e) => pick(e.target.files?.[0] ?? null)} />
        <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1 h-3.5 w-3.5" />}
          {fundraiser.flier_path ? "Replace document" : "Attach document"}
        </Button>
      </CardContent>
    </Card>
  );
}
