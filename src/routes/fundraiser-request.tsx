import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ClipboardList, Paperclip, Upload, CheckCircle2, Clock, XCircle, AlertCircle, CalendarDays, MessageSquareWarning } from "lucide-react";
import {
  listMyRequests, saveMyRequest, uploadRequestFlier, getRequestFlier, listRequestApprovals,
} from "@/lib/fundraiser-requests.functions";
import {
  ALLOWED_FLIER_TYPES, MAX_FLIER_BYTES, statusLabel, needsSubmitterAttention, STAGES,
  type ApprovalEntry, type FundraiserRequest, type RequestInput,
} from "@/lib/fundraiser-requests.shared";
import { ApprovalTracker } from "@/components/ApprovalTracker";
import { formatEventDate } from "@/lib/events.shared";

export const Route = createFileRoute("/fundraiser-request")({
  component: FundraiserRequestPage,
  head: () => ({
    meta: [
      { title: "Fundraiser Approval Request — Team Huntington Hub" },
      { name: "description", content: "Submit a Team Huntington fundraiser for captain, legal, risk, compliance, marketing and co-chair approval — all in one place." },
      { property: "og:title", content: "Fundraiser Approval Request — Team Huntington" },
      { property: "og:description", content: "Submit your fundraising event for approval and track every sign-off in real time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const emptyForm: RequestInput = {
  title: "",
  description: "",
  event_type: "in_person",
  event_date: "",
  start_time: "",
  end_time: "",
  location: "",
  expected_attendance: undefined,
  fundraising_method: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
};

function FundraiserRequestPage() {
  const { user } = useStore();
  const qc = useQueryClient();
  const [form, setForm] = useState<RequestInput>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: requests = [], isLoading } = useQuery<FundraiserRequest[]>({
    queryKey: ["my-fundraiser-requests"],
    queryFn: () => listMyRequests(),
    enabled: user.signedIn,
  });

  const save = useMutation({
    mutationFn: async (input: RequestInput) => {
      const row = await saveMyRequest({ data: input });
      const file = fileRef.current?.files?.[0];
      if (file) {
        if (file.size > MAX_FLIER_BYTES) throw new Error("Flier must be 5 MB or smaller.");
        if (!ALLOWED_FLIER_TYPES.includes(file.type as (typeof ALLOWED_FLIER_TYPES)[number])) {
          throw new Error("Flier must be a PNG, JPG, WEBP or PDF.");
        }
        const base64 = await fileToBase64(file);
        await uploadRequestFlier({
          data: { id: row.id, fileName: file.name, contentType: file.type as never, base64 },
        });
      }
      return row;
    },
    onSuccess: () => {
      toast.success("Request submitted", { description: "Your peloton captain reviews it first." });
      setForm(emptyForm);
      setEditingId(null);
      if (fileRef.current) fileRef.current.value = "";
      qc.invalidateQueries({ queryKey: ["my-fundraiser-requests"] });
    },
    onError: (e: Error) => toast.error("Couldn't submit", { description: e.message }),
  });

  if (!user.signedIn) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-[var(--brand-dark)]">Fundraiser approval requests</h1>
        <p className="mt-3 text-muted-foreground">Sign in with your Huntington email to submit a fundraiser for approval.</p>
        <Button asChild className="mt-6 bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90">
          <Link to="/signin">Sign in</Link>
        </Button>
      </div>
    );
  }

  const set = <K extends keyof RequestInput>(k: K, v: RequestInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:py-12">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--brand-dark)] md:text-3xl">Fundraiser approval request</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Replaces the SharePoint form. Your captain reviews first, then Legal, Risk, Compliance and Marketing in any order, and the
          co-chairs sign off last. In-person events appear on the calendar after final sign-off; virtual fundraisers go up once your
          captain approves.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-3">
          <Link to="/events"><CalendarDays className="mr-1.5 h-3.5 w-3.5" /> View fundraising calendar</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><ClipboardList className="h-4 w-4 text-[var(--brand)]" /> Event details</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate({ ...form, id: editingId ?? undefined });
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="fr-title">Event name</Label>
                <Input id="fr-title" value={form.title} onChange={(e) => set("title", e.target.value)} required minLength={3} placeholder="Cornhole tournament for Team Huntington" />
              </div>
              <div className="space-y-1.5">
                <Label>Event type</Label>
                <Select value={form.event_type} onValueChange={(v) => set("event_type", v as RequestInput["event_type"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_person">In-person event</SelectItem>
                    <SelectItem value="virtual">Virtual / non-physical (raffle, online auction)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fr-date">Date</Label>
                <Input id="fr-date" type="date" value={form.event_date} onChange={(e) => set("event_date", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fr-start">Start time</Label>
                <Input id="fr-start" type="time" value={form.start_time ?? ""} onChange={(e) => set("start_time", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fr-end">End time</Label>
                <Input id="fr-end" type="time" value={form.end_time ?? ""} onChange={(e) => set("end_time", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fr-loc">Location / platform</Label>
                <Input id="fr-loc" value={form.location ?? ""} onChange={(e) => set("location", e.target.value)} placeholder="Easton Office, Columbus" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fr-att">Expected attendance</Label>
                <Input id="fr-att" type="number" min={0} value={form.expected_attendance ?? ""} onChange={(e) => set("expected_attendance", e.target.value === "" ? undefined : Number(e.target.value))} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="fr-method">How will funds be collected?</Label>
                <Input id="fr-method" value={form.fundraising_method ?? ""} onChange={(e) => set("fundraising_method", e.target.value)} placeholder="Pelotonia personal page, raffle tickets, ticket sales" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="fr-desc">Description</Label>
                <Textarea id="fr-desc" rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} required minLength={10} placeholder="What happens at the event, who is invited, how proceeds reach Pelotonia." />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fr-cname">Contact name</Label>
                <Input id="fr-cname" value={form.contact_name ?? ""} onChange={(e) => set("contact_name", e.target.value)} placeholder={user.name} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fr-cemail">Contact email</Label>
                <Input id="fr-cemail" type="email" value={form.contact_email ?? ""} onChange={(e) => set("contact_email", e.target.value)} placeholder={user.email} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fr-cphone">Contact phone</Label>
                <Input id="fr-cphone" value={form.contact_phone ?? ""} onChange={(e) => set("contact_phone", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fr-flier">Flier attachment (PNG, JPG, WEBP or PDF)</Label>
                <Input id="fr-flier" type="file" ref={fileRef} accept=".png,.jpg,.jpeg,.webp,.pdf" />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={save.isPending} className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90">
                <Upload className="mr-1.5 h-4 w-4" />
                {save.isPending ? "Submitting…" : editingId ? "Resubmit for approval" : "Submit for approval"}
              </Button>
              {editingId && (
                <Button type="button" variant="ghost" onClick={() => { setEditingId(null); setForm(emptyForm); }}>
                  Cancel edit
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <h2 className="mt-10 text-lg font-semibold text-[var(--brand-dark)]">My requests</h2>
      {isLoading ? (
        <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
      ) : requests.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No requests yet — submit your first fundraiser above.</p>
      ) : (
        <div className="mt-3 space-y-4">
          {requests.map((r) => (
            <RequestCard
              key={r.id}
              request={r}
              onEdit={() => {
                setEditingId(r.id);
                setForm({
                  title: r.title,
                  description: r.description,
                  event_type: r.event_type,
                  event_date: r.event_date,
                  start_time: r.start_time ?? "",
                  end_time: r.end_time ?? "",
                  location: r.location ?? "",
                  expected_attendance: r.expected_attendance ?? undefined,
                  fundraising_method: r.fundraising_method ?? "",
                  contact_name: r.contact_name ?? "",
                  contact_email: r.contact_email ?? "",
                  contact_phone: r.contact_phone ?? "",
                });
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewerFeedback({ request }: { request: FundraiserRequest }) {
  const { data: trail = [] } = useQuery<ApprovalEntry[]>({
    queryKey: ["approval-trail", request.id],
    queryFn: () => listRequestApprovals({ data: { id: request.id } }),
    enabled: needsSubmitterAttention(request),
  });
  const notes = trail.filter(
    (t) => (t.decision === "declined" || t.decision === "changes_requested") && t.note,
  );
  if (notes.length === 0) return null;
  const latest = notes.slice(-3).reverse();
  return (
    <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-900">
        <MessageSquareWarning className="h-3.5 w-3.5" /> What the reviewer asked for
      </div>
      <ul className="mt-2 space-y-2 text-sm text-amber-900">
        {latest.map((t) => (
          <li key={t.id}>
            <span className="font-medium">
              {STAGES.find((s) => s.key === t.stage)?.label ?? t.stage}
            </span>{" "}
            · {t.decision === "declined" ? "denied" : "changes requested"}
            {t.actor_email ? ` by ${t.actor_email}` : ""}
            <div className="text-amber-800">“{t.note}”</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RequestCard({ request, onEdit }: { request: FundraiserRequest; onEdit: () => void }) {
  const [flier, setFlier] = useState<string | null>(null);
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-semibold text-[var(--brand-dark)]">{request.title}</div>
            <div className="text-xs text-muted-foreground">
              {formatEventDate(request.event_date)} · {request.event_type === "virtual" ? "Virtual" : "In person"}
              {request.location ? ` · ${request.location}` : ""}
            </div>
          </div>
          <StatusBadge status={request.status} />
        </div>

        <div className="mt-4">
          <ApprovalTracker request={request} />
        </div>

        <ReviewerFeedback request={request} />

        <div className="mt-4 flex flex-wrap gap-2">
          {(needsSubmitterAttention(request) || request.status === "submitted") && (
            <Button size="sm" variant={request.status === "declined" ? "default" : "outline"} onClick={onEdit}>
              Edit &amp; resubmit
            </Button>
          )}
          {request.flier_name && (
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                const res = await getRequestFlier({ data: { id: request.id } });
                if (res) { setFlier(res.dataUrl); window.open(res.dataUrl, "_blank"); }
              }}
            >
              <Paperclip className="mr-1.5 h-3.5 w-3.5" /> {request.flier_name}
            </Button>
          )}
          {flier && <span className="sr-only">Flier opened</span>}
          {request.event_id && (
            <Badge variant="secondary" className="self-center">
              {request.status === "approved" ? "On the calendar" : "On the calendar · pending final approval"}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function StatusBadge({ status }: { status: FundraiserRequest["status"] }) {
  const tone =
    status === "approved" ? "bg-[var(--brand)]/20 text-[var(--brand-dark)]"
      : status === "declined" ? "bg-destructive/10 text-destructive"
      : status === "changes_requested" ? "bg-amber-100 text-amber-800"
      : "bg-muted text-muted-foreground";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{statusLabel(status)}</span>;
}

export function StageIcon({ status }: { status: string }) {
  if (status === "approved") return <CheckCircle2 className="h-4 w-4 text-[var(--brand)]" />;
  if (status === "declined") return <XCircle className="h-4 w-4 text-destructive" />;
  if (status === "changes_requested") return <AlertCircle className="h-4 w-4 text-amber-600" />;
  return <Clock className="h-4 w-4 text-muted-foreground" />;
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.readAsDataURL(file);
  });
}
