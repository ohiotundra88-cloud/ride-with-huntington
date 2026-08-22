import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { HandCoins, Loader2, Plus, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { DemoPaymentBanner } from "@/components/DemoPaymentBanner";
import { getFundraiserAccess, listMyFundraisers, saveFundraiserPage } from "@/lib/fundraising-pages.functions";
import {
  FUNDRAISER_KINDS, KIND_BLURBS, KIND_LABELS, money, STATUS_LABELS,
  type FundraiserKind, type FundraiserListRow,
} from "@/lib/fundraising-pages.shared";

export const Route = createFileRoute("/my-fundraisers/")({
  component: MyFundraisers,
  head: () => ({
    meta: [
      { title: "Fundraiser workspace — Team Huntington Hub" },
      { name: "description", content: "Create, submit for approval, and manage Team Huntington fundraising pages." },
      { property: "og:title", content: "Fundraiser workspace — Team Huntington Hub" },
      { property: "og:description", content: "Build raffle, ticket, sponsorship, and giving pages for Team Huntington." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function MyFundraisers() {
  const { data: access, isPending: accessPending } = useQuery({
    queryKey: ["fundraiser-access"],
    queryFn: () => getFundraiserAccess(),
  });
  const [showAll, setShowAll] = useState(false);

  const canSeeAll = Boolean(access?.canManageAll);

  const { data: rows = [], isPending } = useQuery<FundraiserListRow[]>({
    queryKey: ["my-fundraisers", showAll && canSeeAll],
    queryFn: () => listMyFundraisers({ data: { all: showAll && canSeeAll } }),
    enabled: Boolean(access?.canCreate),
  });

  if (accessPending) return <main className="mx-auto max-w-5xl px-4 py-12 text-sm text-muted-foreground">Loading…</main>;

  if (!access?.canCreate) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <ShieldAlert className="mx-auto h-9 w-9 text-[var(--brand)]" />
        <h1 className="mt-3 text-xl font-semibold text-[var(--brand-dark)]">Sign in to build a fundraiser</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Fundraising pages are created by registered Team Huntington riders and captains.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button asChild className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90">
            <Link to="/signin">Sign in</Link>
          </Button>
          <Button asChild variant="outline"><Link to="/fundraisers">Browse fundraisers</Link></Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--brand-dark)]">Fundraiser workspace</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Build a page, send it through approval, then track orders, entries, and payouts.
          </p>
        </div>
        <NewFundraiserDialog />
      </div>

      <DemoPaymentBanner className="mt-4" />

      {canSeeAll && (
        <label className="mt-4 flex items-center gap-2 text-sm">
          <Switch checked={showAll} onCheckedChange={setShowAll} />
          Show every team fundraiser (captain / co-chair view)
        </label>
      )}

      {isPending ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading your pages…</p>
      ) : rows.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="py-10 text-center">
            <HandCoins className="mx-auto h-8 w-8 text-[var(--brand)]" />
            <p className="mt-3 font-medium">No fundraising pages yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Start with a raffle, ticketed event, sponsorship, or a simple giving page.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 space-y-3">
          {rows.map((f) => (
            <Card key={f.id}>
              <CardContent className="flex flex-wrap items-center gap-4 p-5">
                <div className="min-w-[220px] flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{KIND_LABELS[f.kind]}</Badge>
                    <Badge variant={f.status === "live" ? "default" : "outline"}>{STATUS_LABELS[f.status]}</Badge>
                    {f.is_demo && <Badge variant="outline">Demo</Badge>}
                  </div>
                  <p className="mt-2 font-semibold text-[var(--brand-dark)]">{f.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {f.organizer_name} · updated {new Date(f.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="w-full max-w-[220px]">
                  <Progress value={f.totals.goalPercent} className="h-2" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {money(f.totals.gross)} raised of {money(f.goal_amount)} · {f.totals.supporters} supporters
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/my-fundraisers/$id" params={{ id: f.id }}>Manage</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}

function NewFundraiserDialog() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<FundraiserKind>("raffle");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [goal, setGoal] = useState("1000");
  const navigate = useNavigate();
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: () =>
      saveFundraiserPage({
        data: {
          kind,
          title,
          summary,
          story: "",
          goal_amount: Number(goal || 0),
          beneficiary: "Team Huntington / Pelotonia",
          allow_custom_amount: true,
          min_custom_amount: 5,
          items: [],
        },
      }),
    onSuccess: (res: any) => {
      toast.success("Draft created");
      qc.invalidateQueries({ queryKey: ["my-fundraisers"] });
      setOpen(false);
      navigate({ to: "/my-fundraisers/$id", params: { id: res.id } });
    },
    onError: (e: any) => toast.error(e?.message ?? "Couldn't create that page."),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90">
          <Plus className="mr-1.5 h-4 w-4" /> New fundraiser
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Start a fundraising page</DialogTitle></DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as FundraiserKind)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FUNDRAISER_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>{KIND_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{KIND_BLURBS[kind]}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t">Title</Label>
            <Input id="t" required minLength={3} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s">Short summary</Label>
            <Textarea id="s" rows={2} maxLength={240} value={summary} onChange={(e) => setSummary(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="g">Goal ($)</Label>
            <Input id="g" type="number" min={0} value={goal} onChange={(e) => setGoal(e.target.value)} />
          </div>
          <Button type="submit" disabled={create.isPending} className="w-full bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90">
            {create.isPending ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Creating…</> : "Create draft"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
