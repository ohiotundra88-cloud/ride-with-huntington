import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Send, ShieldAlert, Loader2, Users, Copy, Download, Trash2, Pencil, Clock, Search, X, Mail, MailX,
} from "lucide-react";
import {
  MESSAGE_CATEGORIES, MESSAGE_PRIORITIES, PARTICIPATION_OPTIONS, PELOTONIA_FLAGS,
  READINESS_GAPS, ROLE_LABELS, TARGETABLE_ROLES, LEADERSHIP_ONLY_ROLES,
  describeAudience, emptyAudience,
  type AudienceRules, type MessageSummary,
} from "@/lib/messages.shared";
import {
  deleteMessage, getAudienceOptions, getMessagingAccess, listEmailOptOuts,
  listMessageRecipients, listMessages, listRosterPeople, previewAudience,
  processDueMessages, saveMessage, sendMessageNow, setEmailOptOut,
} from "@/lib/messages.functions";

export const Route = createFileRoute("/messages")({
  head: () => ({
    meta: [
      { title: "Team Messages — Team Huntington" },
      { name: "description", content: "Compose and send targeted messages to riders by role, tag and readiness." },
      { property: "og:title", content: "Team Messages — Team Huntington" },
      { property: "og:description", content: "Targeted bulk communications for Team Huntington captains and co-chairs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MessagesPage,
});

const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const download = (name: string, rows: (string | number)[][]) => {
  const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};

/** Multi-select chip group used across every audience facet. */
function ChipGroup({
  options, selected, onToggle, disabledOptions = [],
}: {
  options: { key: string; label: string }[];
  selected: string[];
  onToggle: (key: string) => void;
  disabledOptions?: string[];
}) {
  if (!options.length) return <p className="text-xs text-muted-foreground">No options available.</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = selected.includes(o.key);
        const disabled = disabledOptions.includes(o.key);
        return (
          <button
            key={o.key}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(o.key)}
            className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
              on
                ? "border-[var(--brand)] bg-[var(--brand)] text-[var(--brand-foreground)]"
                : disabled
                  ? "cursor-not-allowed border-dashed text-muted-foreground/50"
                  : "hover:border-[var(--brand)] hover:text-[var(--brand-dark)]"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function MessagesPage() {
  const qc = useQueryClient();
  const access = useQuery({ queryKey: ["messaging-access"], queryFn: () => getMessagingAccess(), retry: false });
  const allowed = !!access.data?.allowed;
  const canTargetLeadership = !!access.data?.canTargetLeadership;
  const canDelete = !!access.data?.canDelete;

  const runDue = useServerFn(processDueMessages);
  useEffect(() => {
    if (!allowed) return;
    runDue().then((r) => {
      if (r.sent > 0) {
        toast.success(`${r.sent} scheduled message${r.sent === 1 ? "" : "s"} sent`);
        qc.invalidateQueries({ queryKey: ["messages"] });
      }
    }).catch(() => undefined);
  }, [allowed, runDue, qc]);

  const options = useQuery({
    queryKey: ["audience-options"],
    queryFn: () => getAudienceOptions(),
    enabled: allowed,
    staleTime: 5 * 60_000,
  });
  const roster = useQuery({
    queryKey: ["roster-people"],
    queryFn: () => listRosterPeople(),
    enabled: allowed,
    staleTime: 5 * 60_000,
  });
  const messages = useQuery({
    queryKey: ["messages"],
    queryFn: () => listMessages(),
    enabled: allowed,
  });

  // ---- compose state ----
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaHref, setCtaHref] = useState("");
  const [priority, setPriority] = useState<string>("info");
  const [category, setCategory] = useState<string>("general");
  const [scheduledAt, setScheduledAt] = useState("");
  const [audience, setAudience] = useState<AudienceRules>(emptyAudience());
  const [emailNotify, setEmailNotify] = useState(true);
  const [emailExclude, setEmailExclude] = useState<string[]>([]);
  const [emailQuery, setEmailQuery] = useState("");
  const [optOutQuery, setOptOutQuery] = useState("");
  const [personQuery, setPersonQuery] = useState("");
  const [tab, setTab] = useState("compose");
  const [recipientsFor, setRecipientsFor] = useState<MessageSummary | null>(null);

  const toggle = (facet: keyof AudienceRules, key: string) =>
    setAudience((a) => {
      const list = a[facet] as string[];
      return { ...a, [facet]: list.includes(key) ? list.filter((x) => x !== key) : [...list, key] };
    });

  const preview = useServerFn(previewAudience);
  const previewQuery = useQuery({
    queryKey: ["audience-preview", audience],
    queryFn: () => preview({ data: { audience } }),
    enabled: allowed,
    retry: false,
  });

  const resetCompose = () => {
    setEditingId(null);
    setTitle(""); setBody(""); setCtaLabel(""); setCtaHref("");
    setPriority("info"); setCategory("general"); setScheduledAt("");
    setAudience(emptyAudience());
    setEmailNotify(true); setEmailExclude([]); setEmailQuery("");
  };

  const save = useServerFn(saveMessage);
  const send = useServerFn(sendMessageNow);

  const saveDraft = useMutation({
    mutationFn: () =>
      save({
        data: {
          id: editingId, title, body, ctaLabel, ctaHref, priority, category,
          scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
          audience, emailNotify, emailExcludeUserIds: emailExclude,
        },
      }),
    onSuccess: () => {
      toast.success(scheduledAt ? "Message scheduled" : "Draft saved");
      qc.invalidateQueries({ queryKey: ["messages"] });
      resetCompose();
      setTab("history");
    },
    onError: (e: Error) => toast.error(e.message || "Couldn't save the message"),
  });

  const sendNow = useMutation({
    mutationFn: async () => {
      const saved = await save({
        data: {
          id: editingId, title, body, ctaLabel, ctaHref, priority, category,
          scheduledAt: null, audience, emailNotify, emailExcludeUserIds: emailExclude,
        },
      });
      return send({ data: { id: saved.id } });
    },
    onSuccess: (r) => {
      toast.success(
        `Sent to ${r.recipientCount} ${r.recipientCount === 1 ? "person" : "people"}` +
          (r.emailsSent ? ` · ${r.emailsSent} emailed` : "") +
          (r.emailsSkipped ? ` · ${r.emailsSkipped} skipped` : ""),
      );
      qc.invalidateQueries({ queryKey: ["messages"] });
      resetCompose();
      setTab("history");
    },
    onError: (e: Error) => toast.error(e.message || "Couldn't send the message"),
  });

  const sendExisting = useMutation({
    mutationFn: (id: string) => send({ data: { id } }),
    onSuccess: (r) => {
      toast.success(
        `Sent to ${r.recipientCount} recipients` + (r.emailsSent ? ` · ${r.emailsSent} emailed` : ""),
      );
      qc.invalidateQueries({ queryKey: ["messages"] });
    },
    onError: (e: Error) => toast.error(e.message || "Couldn't send the message"),
  });

  const removeFn = useServerFn(deleteMessage);
  const remove = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Message deleted");
      qc.invalidateQueries({ queryKey: ["messages"] });
    },
    onError: (e: Error) => toast.error(e.message || "Couldn't delete the message"),
  });

  const optOuts = useQuery({
    queryKey: ["email-opt-outs"],
    queryFn: () => listEmailOptOuts(),
    enabled: allowed,
  });
  const setOptOutFn = useServerFn(setEmailOptOut);
  const changeOptOut = useMutation({
    mutationFn: (v: { userId: string; optOut: boolean }) => setOptOutFn({ data: v }),
    onSuccess: (_r, v) => {
      toast.success(v.optOut ? "Added to the no-email list" : "Removed from the no-email list");
      qc.invalidateQueries({ queryKey: ["email-opt-outs"] });
      qc.invalidateQueries({ queryKey: ["roster-people"] });
    },
    onError: (e: Error) => toast.error(e.message || "Couldn't update the no-email list"),
  });

  const people = previewQuery.data?.people ?? [];
  const count = previewQuery.data?.count ?? 0;

  const copyEmails = async () => {
    const list = people.map((p) => p.email).filter(Boolean).join("; ");
    if (!list) { toast.error("No email addresses in this audience"); return; }
    await navigator.clipboard.writeText(list);
    toast.success(`${people.length} addresses copied`);
  };

  const exportAudience = () =>
    download("message-audience.csv", [
      ["Name", "Email", "Roles", "Participation", "Rider ID", "Sub-peloton", "Route", "Tags", "Raised"],
      ...people.map((p) => [
        p.name, p.email, p.roles.join(", "), p.participation ?? "", p.riderId ?? "",
        p.subPeloton ?? "", p.route ?? "", (p.tags ?? []).join(", "), p.raised ?? "",
      ]),
    ]);

  const loadForEdit = (m: MessageSummary) => {
    setEditingId(m.id);
    setTitle(m.title); setBody(m.body);
    setCtaLabel(m.ctaLabel); setCtaHref(m.ctaHref);
    setPriority(m.priority); setCategory(m.category);
    setScheduledAt(m.scheduledAt ? m.scheduledAt.slice(0, 16) : "");
    setAudience(m.audience);
    setEmailNotify(m.emailNotify);
    setEmailExclude(m.emailExcludeUserIds ?? []);
    setTab("compose");
  };

  const duplicate = (m: MessageSummary) => {
    loadForEdit(m);
    setEditingId(null);
    setScheduledAt("");
    toast.success("Copied into the composer");
  };

  const matchingPeople = useMemo(() => {
    const needle = personQuery.trim().toLowerCase();
    if (!needle) return [];
    return (roster.data ?? [])
      .filter((p) => p.name.toLowerCase().includes(needle) || p.email.toLowerCase().includes(needle))
      .slice(0, 8);
  }, [roster.data, personQuery]);

  const searchRoster = (q: string) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return (roster.data ?? [])
      .filter((p) => p.name.toLowerCase().includes(needle) || p.email.toLowerCase().includes(needle))
      .slice(0, 8);
  };
  const emailMatches = useMemo(() => searchRoster(emailQuery), [roster.data, emailQuery]);
  const optOutMatches = useMemo(() => searchRoster(optOutQuery), [roster.data, optOutQuery]);
  const permanentOptOuts = optOuts.data ?? [];

  const nameFor = (userId: string) =>
    (roster.data ?? []).find((p) => p.userId === userId)?.name ?? userId.slice(0, 8);

  if (access.isLoading) {
    return (
      <>
        <main className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">
          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
        </main>
      </>
    );
  }

  if (!allowed) {
    return (
      <>
        <main className="mx-auto max-w-2xl px-4 py-16">
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <ShieldAlert className="h-8 w-8 text-muted-foreground" />
              <h1 className="text-lg font-semibold">Captain access required</h1>
              <p className="text-sm text-muted-foreground">
                Team messaging is limited to captains, co-chairs and super users.
              </p>
            </CardContent>
          </Card>
        </main>
      </>
    );
  }

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Team messages</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Compose once, target by role, Pelotonia tag or readiness gap, and send straight to the right riders.
          </p>
        </header>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="compose">Compose</TabsTrigger>
            <TabsTrigger value="history">History{messages.data ? ` (${messages.data.length})` : ""}</TabsTrigger>
          </TabsList>

          {/* ---------------- COMPOSE ---------------- */}
          <TabsContent value="compose" className="mt-4">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <Card>
                  <CardHeader><CardTitle className="text-base">Message</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="m-title">Title</Label>
                      <Input id="m-title" value={title} onChange={(e) => setTitle(e.target.value)}
                        placeholder="Hotel block closes Friday" maxLength={140} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="m-body">Message</Label>
                      <Textarea id="m-body" value={body} onChange={(e) => setBody(e.target.value)} rows={7}
                        placeholder="Write your update. Line breaks are preserved." />
                      <p className="text-xs text-muted-foreground">{body.length}/5000 characters</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="m-cta">Button label (optional)</Label>
                        <Input id="m-cta" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="Book your hotel" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="m-href">Button link</Label>
                        <Input id="m-href" value={ctaHref} onChange={(e) => setCtaHref(e.target.value)} placeholder="/dashboard" />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label>Priority</Label>
                        <Select value={priority} onValueChange={setPriority}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {MESSAGE_PRIORITIES.map((p) => (
                              <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Category</Label>
                        <Select value={category} onValueChange={setCategory}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {MESSAGE_CATEGORIES.map((c) => (
                              <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="m-when">Schedule (optional)</Label>
                        <Input id="m-when" type="datetime-local" value={scheduledAt}
                          onChange={(e) => setScheduledAt(e.target.value)} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-base">Audience</CardTitle></CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">App roles</Label>
                      <ChipGroup
                        options={TARGETABLE_ROLES.map((r) => ({ key: r, label: ROLE_LABELS[r] ?? r }))}
                        selected={audience.roles}
                        onToggle={(k) => toggle("roles", k)}
                        disabledOptions={canTargetLeadership ? [] : LEADERSHIP_ONLY_ROLES}
                      />
                      {!canTargetLeadership && (
                        <p className="text-xs text-muted-foreground">
                          Leadership roles can only be targeted by co-chairs and super users.
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Participation</Label>
                      <ChipGroup
                        options={PARTICIPATION_OPTIONS.map((p) => ({ key: p, label: p }))}
                        selected={audience.participation}
                        onToggle={(k) => toggle("participation", k)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Pelotonia status</Label>
                      <ChipGroup
                        options={PELOTONIA_FLAGS.map((f) => ({ key: f.key, label: f.label }))}
                        selected={audience.flags}
                        onToggle={(k) => toggle("flags", k)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Rider tags</Label>
                      <ChipGroup
                        options={(options.data?.tags ?? []).map((t) => ({ key: t, label: t }))}
                        selected={audience.tags}
                        onToggle={(k) => toggle("tags", k)}
                      />
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Sub-peloton</Label>
                        <ChipGroup
                          options={(options.data?.subPelotons ?? []).map((t) => ({ key: t, label: t }))}
                          selected={audience.subPelotons}
                          onToggle={(k) => toggle("subPelotons", k)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Ride route</Label>
                        <ChipGroup
                          options={(options.data?.routes ?? []).map((t) => ({ key: t, label: t }))}
                          selected={audience.routes}
                          onToggle={(k) => toggle("routes", k)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Readiness gaps</Label>
                      <ChipGroup
                        options={READINESS_GAPS.map((g) => ({ key: g.key, label: g.label }))}
                        selected={audience.gaps}
                        onToggle={(k) => toggle("gaps", k)}
                      />
                      {audience.gaps.includes("below_goal") && (
                        <div className="flex items-center gap-2 pt-1">
                          <Label htmlFor="m-below" className="text-xs">Raised less than</Label>
                          <Input id="m-below" type="number" min={0} className="h-8 w-32"
                            value={audience.raisedBelow ?? ""}
                            onChange={(e) =>
                              setAudience((a) => ({
                                ...a,
                                raisedBelow: e.target.value === "" ? null : Math.max(0, Number(e.target.value)),
                              }))
                            } />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 border-t pt-4">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Individuals</Label>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-8" placeholder="Search a name or email to add or exclude"
                          value={personQuery} onChange={(e) => setPersonQuery(e.target.value)} />
                      </div>
                      {matchingPeople.length > 0 && (
                        <div className="rounded-md border divide-y">
                          {matchingPeople.map((p) => (
                            <div key={p.userId} className="flex items-center justify-between gap-2 p-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">{p.name}</p>
                                <p className="truncate text-xs text-muted-foreground">{p.email}</p>
                              </div>
                              <div className="flex shrink-0 gap-1">
                                <Button size="sm" variant="outline" className="h-7 text-xs"
                                  onClick={() => { toggle("includeUserIds", p.userId); setPersonQuery(""); }}>
                                  Always include
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs"
                                  onClick={() => { toggle("excludeUserIds", p.userId); setPersonQuery(""); }}>
                                  Exclude
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {(audience.includeUserIds.length > 0 || audience.excludeUserIds.length > 0) && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {audience.includeUserIds.map((id) => (
                            <Badge key={`i-${id}`} className="gap-1 bg-emerald-100 text-emerald-900">
                              +{nameFor(id)}
                              <button type="button" onClick={() => toggle("includeUserIds", id)} aria-label="Remove">
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                          {audience.excludeUserIds.map((id) => (
                            <Badge key={`e-${id}`} variant="outline" className="gap-1">
                              −{nameFor(id)}
                              <button type="button" onClick={() => toggle("excludeUserIds", id)} aria-label="Remove">
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Mail className="h-4 w-4" /> Email notification
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <label className="flex items-start gap-2.5">
                      <Checkbox
                        checked={emailNotify}
                        onCheckedChange={(v) => setEmailNotify(v === true)}
                        className="mt-0.5"
                      />
                      <span className="text-sm">
                        Also email this announcement to everyone in the audience
                        <span className="block text-xs text-muted-foreground">
                          Recipients always see it in the Hub. Emails go out from the team address
                          when you send.
                        </span>
                      </span>
                    </label>

                    {emailNotify && (
                      <div className="space-y-3 border-t pt-4">
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                            Don't email these people (this send only)
                          </Label>
                          <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input className="pl-8" placeholder="Search a name or email"
                              value={emailQuery} onChange={(e) => setEmailQuery(e.target.value)} />
                          </div>
                          {emailMatches.length > 0 && (
                            <div className="rounded-md border divide-y">
                              {emailMatches.map((p) => (
                                <div key={p.userId} className="flex items-center justify-between gap-2 p-2">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">{p.name}</p>
                                    <p className="truncate text-xs text-muted-foreground">{p.email}</p>
                                  </div>
                                  <Button size="sm" variant="outline" className="h-7 shrink-0 text-xs"
                                    onClick={() => {
                                      setEmailExclude((list) =>
                                        list.includes(p.userId) ? list : [...list, p.userId],
                                      );
                                      setEmailQuery("");
                                    }}>
                                    Skip email
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                          {emailExclude.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {emailExclude.map((id) => (
                                <Badge key={`x-${id}`} variant="outline" className="gap-1">
                                  <MailX className="h-3 w-3" /> {nameFor(id)}
                                  <button type="button" aria-label="Remove"
                                    onClick={() => setEmailExclude((l) => l.filter((x) => x !== id))}>
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="space-y-2 border-t pt-4">
                          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                            Permanent no-email list
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            These colleagues never receive announcement emails — they still see every
                            announcement in the Hub.
                          </p>
                          {canTargetLeadership ? (
                            <>
                              <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input className="pl-8" placeholder="Add someone to the no-email list"
                                  value={optOutQuery} onChange={(e) => setOptOutQuery(e.target.value)} />
                              </div>
                              {optOutMatches.length > 0 && (
                                <div className="rounded-md border divide-y">
                                  {optOutMatches.map((p) => (
                                    <div key={p.userId} className="flex items-center justify-between gap-2 p-2">
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">{p.name}</p>
                                        <p className="truncate text-xs text-muted-foreground">{p.email}</p>
                                      </div>
                                      <Button size="sm" variant="outline" className="h-7 shrink-0 text-xs"
                                        disabled={changeOptOut.isPending}
                                        onClick={() => {
                                          changeOptOut.mutate({ userId: p.userId, optOut: true });
                                          setOptOutQuery("");
                                        }}>
                                        Never email
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              Only co-chairs and super users can change this list.
                            </p>
                          )}
                          {permanentOptOuts.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No one is on the list yet.</p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {permanentOptOuts.map((p) => (
                                <Badge key={`o-${p.userId}`} variant="secondary" className="gap-1">
                                  <MailX className="h-3 w-3" /> {p.name}
                                  {canTargetLeadership && (
                                    <button type="button" aria-label={`Remove ${p.name}`}
                                      disabled={changeOptOut.isPending}
                                      onClick={() => changeOptOut.mutate({ userId: p.userId, optOut: false })}>
                                      <X className="h-3 w-3" />
                                    </button>
                                  )}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>


              {/* ---- live preview rail ---- */}
              <div className="space-y-4">
                <Card className="lg:sticky lg:top-20">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Users className="h-4 w-4" /> Recipients
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-3xl font-black tracking-tight">
                        {previewQuery.isFetching ? <Loader2 className="h-6 w-6 animate-spin" /> : count}
                      </p>
                      <p className="text-xs text-muted-foreground">{describeAudience(audience)}</p>
                      {previewQuery.error && (
                        <p className="mt-1 text-xs text-destructive">{(previewQuery.error as Error).message}</p>
                      )}
                    </div>

                    <div className="max-h-64 overflow-y-auto rounded-md border divide-y">
                      {people.length === 0 ? (
                        <p className="p-3 text-xs text-muted-foreground">No one matches these rules yet.</p>
                      ) : (
                        people.slice(0, 200).map((p) => (
                          <div key={p.userId} className="p-2">
                            <p className="truncate text-sm">{p.name}</p>
                            <p className="truncate text-[11px] text-muted-foreground">{p.email}</p>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="grid gap-2">
                      <Button onClick={() => sendNow.mutate()} disabled={sendNow.isPending || count === 0}>
                        {sendNow.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Send now
                      </Button>
                      <Button variant="outline" onClick={() => saveDraft.mutate()} disabled={saveDraft.isPending}>
                        {scheduledAt ? <Clock className="mr-2 h-4 w-4" /> : null}
                        {scheduledAt ? "Schedule" : "Save draft"}
                      </Button>
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="ghost" size="sm" onClick={copyEmails}>
                          <Copy className="mr-1 h-3.5 w-3.5" /> Copy emails
                        </Button>
                        <Button variant="ghost" size="sm" onClick={exportAudience}>
                          <Download className="mr-1 h-3.5 w-3.5" /> CSV
                        </Button>
                      </div>
                      {editingId && (
                        <Button variant="ghost" size="sm" onClick={resetCompose}>Start a new message</Button>
                      )}
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      Messages are delivered in the app. Use “Copy emails” to send the same audience from Outlook.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ---------------- HISTORY ---------------- */}
          <TabsContent value="history" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {messages.isLoading ? (
                  <div className="p-8 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>
                ) : (messages.data ?? []).length === 0 ? (
                  <p className="p-8 text-center text-sm text-muted-foreground">No messages yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Message</TableHead>
                          <TableHead>Audience</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Recipients</TableHead>
                          <TableHead className="text-right">Read</TableHead>
                          <TableHead>When</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(messages.data ?? []).map((m) => (
                          <TableRow key={m.id}>
                            <TableCell className="max-w-[16rem]">
                              <p className="truncate font-medium">{m.title}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {m.category} · {m.priority} · {m.createdByEmail}
                              </p>
                            </TableCell>
                            <TableCell className="max-w-[14rem]">
                              <p className="truncate text-xs text-muted-foreground">{m.audienceSummary}</p>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  m.status === "sent"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : m.status === "scheduled"
                                      ? "bg-amber-100 text-amber-900"
                                      : "bg-muted text-muted-foreground"
                                }
                              >
                                {m.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{m.recipientCount || "—"}</TableCell>
                            <TableCell className="text-right">
                              {m.status === "sent" ? (
                                <button className="underline decoration-dotted" onClick={() => setRecipientsFor(m)}>
                                  {m.readCount}/{m.recipientCount}
                                </button>
                              ) : "—"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {m.sentAt
                                ? new Date(m.sentAt).toLocaleString()
                                : m.scheduledAt
                                  ? `Scheduled ${new Date(m.scheduledAt).toLocaleString()}`
                                  : new Date(m.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-1">
                                {m.status !== "sent" && (
                                  <>
                                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => loadForEdit(m)}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs"
                                      disabled={sendExisting.isPending}
                                      onClick={() => sendExisting.mutate(m.id)}>
                                      Send
                                    </Button>
                                  </>
                                )}
                                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => duplicate(m)}>
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                                {canDelete && (
                                  <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive"
                                    onClick={() => remove.mutate(m.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <RecipientsDialog message={recipientsFor} onClose={() => setRecipientsFor(null)} />
      </main>
    </>
  );
}

function RecipientsDialog({ message, onClose }: { message: MessageSummary | null; onClose: () => void }) {
  const fetchRecipients = useServerFn(listMessageRecipients);
  const { data = [], isLoading } = useQuery({
    queryKey: ["message-recipients", message?.id],
    queryFn: () => fetchRecipients({ data: { id: message!.id } }),
    enabled: !!message,
  });

  const exportCsv = () =>
    download(`message-${message?.id.slice(0, 8)}-recipients.csv`, [
      ["Name", "Email", "Read at"],
      ...data.map((r) => [r.name, r.email, r.readAt ?? "Not read"]),
    ]);

  return (
    <Dialog open={!!message} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{message?.title}</DialogTitle></DialogHeader>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {data.filter((r) => r.readAt).length} of {data.length} have read this
          </p>
          <Button size="sm" variant="outline" onClick={exportCsv}>
            <Download className="mr-1 h-3.5 w-3.5" /> Export
          </Button>
        </div>
        <div className="max-h-80 overflow-y-auto rounded-md border divide-y">
          {isLoading ? (
            <div className="p-6 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>
          ) : (
            data.map((r) => (
              <div key={r.userId} className="flex items-center justify-between gap-2 p-2">
                <div className="min-w-0">
                  <p className="truncate text-sm">{r.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{r.email}</p>
                </div>
                <Badge variant={r.readAt ? "default" : "outline"} className="shrink-0 text-[10px]">
                  {r.readAt ? "Read" : "Unread"}
                </Badge>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
