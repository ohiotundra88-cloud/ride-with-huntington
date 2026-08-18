import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/AdminShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Paperclip, ShieldCheck, History } from "lucide-react";
import {
  listReviewRequests, decideOnRequest, getMyReviewRoles, listRequestApprovals, getRequestFlier,
} from "@/lib/fundraiser-requests.functions";
import {
  STAGES, actionableStages, canActOnStage, stageStatus, statusLabel,
  type ApprovalEntry, type FundraiserRequest, type StageKey,
} from "@/lib/fundraiser-requests.shared";
import { formatEventDate } from "@/lib/events.shared";
import { StageIcon, StatusBadge } from "@/routes/fundraiser-request";

export const Route = createFileRoute("/admin/approvals")({
  component: ApprovalsPage,
  head: () => ({
    meta: [
      { title: "Fundraiser Approval Queue — Team Huntington Hub" },
      { name: "description", content: "Review, approve, or return Team Huntington fundraiser requests across captain, legal, risk, compliance, marketing and co-chair stages." },
    ],
  }),
});

function ApprovalsPage() {
  const { data: roleData } = useQuery({ queryKey: ["my-review-roles"], queryFn: () => getMyReviewRoles() });
  const roles = roleData?.roles ?? [];
  const { data: requests = [], isLoading, error } = useQuery<FundraiserRequest[]>({
    queryKey: ["review-requests"],
    queryFn: () => listReviewRequests(),
  });

  const waitingOnMe = useMemo(
    () => requests.filter((r) => actionableStages(r).some((s) => canActOnStage(roles, s))),
    [requests, roles],
  );
  const open = requests.filter((r) => r.status !== "approved" && r.status !== "declined");
  const closed = requests.filter((r) => r.status === "approved" || r.status === "declined");

  return (
    <AdminShell
      title="Fundraiser approval queue"
      description="Captain review first, then Legal, Risk, Compliance and Marketing in any order, with co-chair sign-off last."
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : error ? (
        <p className="text-sm text-destructive">{(error as Error).message}</p>
      ) : (
        <Tabs defaultValue="mine">
          <TabsList>
            <TabsTrigger value="mine">Waiting on me <Badge variant="secondary" className="ml-2">{waitingOnMe.length}</Badge></TabsTrigger>
            <TabsTrigger value="open">All open <Badge variant="secondary" className="ml-2">{open.length}</Badge></TabsTrigger>
            <TabsTrigger value="closed">Decided <Badge variant="secondary" className="ml-2">{closed.length}</Badge></TabsTrigger>
          </TabsList>
          {([["mine", waitingOnMe], ["open", open], ["closed", closed]] as const).map(([key, list]) => (
            <TabsContent key={key} value={key} className="space-y-4">
              {list.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nothing here right now.</p>
              ) : (
                list.map((r) => <ReviewCard key={r.id} request={r} roles={roles} />)
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </AdminShell>
  );
}

function ReviewCard({ request, roles }: { request: FundraiserRequest; roles: string[] }) {
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [showTrail, setShowTrail] = useState(false);
  const openStages = actionableStages(request).filter((s) => canActOnStage(roles, s));

  const decide = useMutation({
    mutationFn: (input: { stage: StageKey; decision: "approved" | "changes_requested" | "declined" }) =>
      decideOnRequest({ data: { id: request.id, stage: input.stage, decision: input.decision, note } }),
    onSuccess: () => {
      toast.success("Decision recorded");
      setNote("");
      qc.invalidateQueries({ queryKey: ["review-requests"] });
      qc.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: trail = [] } = useQuery<ApprovalEntry[]>({
    queryKey: ["approval-trail", request.id],
    queryFn: () => listRequestApprovals({ data: { id: request.id } }),
    enabled: showTrail,
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base">{request.title}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatEventDate(request.event_date)} · {request.event_type === "virtual" ? "Virtual" : "In person"}
              {request.location ? ` · ${request.location}` : ""} · Submitted by {request.submitter_name || request.submitter_email || "colleague"}
            </p>
          </div>
          <StatusBadge status={request.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="whitespace-pre-line text-sm text-muted-foreground">{request.description}</p>

        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          {request.fundraising_method && (<div><dt className="text-xs uppercase text-muted-foreground">How funds are collected</dt><dd>{request.fundraising_method}</dd></div>)}
          {request.expected_attendance != null && (<div><dt className="text-xs uppercase text-muted-foreground">Expected attendance</dt><dd>{request.expected_attendance}</dd></div>)}
          {(request.contact_name || request.contact_email) && (
            <div>
              <dt className="text-xs uppercase text-muted-foreground">Contact</dt>
              <dd>{request.contact_name}{request.contact_email ? ` · ${request.contact_email}` : ""}{request.contact_phone ? ` · ${request.contact_phone}` : ""}</dd>
            </div>
          )}
        </dl>

        <div className="grid gap-2 rounded-lg border p-3 sm:grid-cols-3">
          {STAGES.map((s) => (
            <div key={s.key} className="flex items-center gap-2 text-sm">
              <StageIcon status={stageStatus(request, s.key)} />
              <span className="text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {request.flier_name && (
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                const res = await getRequestFlier({ data: { id: request.id } });
                if (res) window.open(res.dataUrl, "_blank");
              }}
            >
              <Paperclip className="mr-1.5 h-3.5 w-3.5" /> {request.flier_name}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setShowTrail((v) => !v)}>
            <History className="mr-1.5 h-3.5 w-3.5" /> {showTrail ? "Hide" : "Show"} approval trail
          </Button>
        </div>

        {showTrail && (
          <ul className="space-y-2 rounded-lg bg-muted/50 p-3 text-xs">
            {trail.length === 0 ? (
              <li className="text-muted-foreground">No activity recorded yet.</li>
            ) : (
              trail.map((t) => (
                <li key={t.id}>
                  <span className="font-medium">{t.stage}</span> — {t.decision.replace("_", " ")}
                  {t.actor_email ? ` by ${t.actor_email}` : ""} · {new Date(t.created_at).toLocaleString()}
                  {t.note ? <div className="text-muted-foreground">“{t.note}”</div> : null}
                </li>
              ))
            )}
          </ul>
        )}

        {openStages.length > 0 ? (
          <div className="space-y-3 rounded-lg border border-[var(--brand)]/40 bg-[var(--brand)]/5 p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--brand-dark)]">
              <ShieldCheck className="h-4 w-4" /> Your decision
              {openStages.map((s) => (
                <Badge key={s} variant="secondary">{STAGES.find((x) => x.key === s)!.label}</Badge>
              ))}
            </div>
            <Textarea rows={2} placeholder="Optional note for the submitter" value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              {openStages.map((stage) => (
                <div key={stage} className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={decide.isPending}
                    className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90"
                    onClick={() => decide.mutate({ stage, decision: "approved" })}
                  >
                    Approve as {STAGES.find((x) => x.key === stage)!.label}
                  </Button>
                  <Button size="sm" variant="outline" disabled={decide.isPending} onClick={() => decide.mutate({ stage, decision: "changes_requested" })}>
                    Request changes
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" disabled={decide.isPending} onClick={() => decide.mutate({ stage, decision: "declined" })}>
                    Decline
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {request.status === "approved" || request.status === "declined"
              ? `Closed — ${statusLabel(request.status)}.`
              : "Waiting on another reviewer."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
