import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  CalendarPlus, ShieldAlert, Loader2, Users, Send, Trash2, Pencil, Ban, Download,
} from "lucide-react";
import { AudienceBuilder } from "@/components/AudienceBuilder";
import { describeAudience, emptyAudience, type AudienceRules } from "@/lib/messages.shared";
import { previewAudience } from "@/lib/messages.functions";
import { formatEventDate, formatTimeRange } from "@/lib/events.shared";
import { rsvpLabel, type TeamEventSummary } from "@/lib/team-events.shared";
import {
  cancelTeamEvent, deleteTeamEvent, getTeamEventAccess, listManageableTeamEvents,
  listTeamEventInvitees, publishTeamEvent, saveTeamEvent,
} from "@/lib/team-events.functions";

export const Route = createFileRoute("/team-events")({
  head: () => ({
    meta: [
      { title: "Team Events — Team Huntington" },
      {
        name: "description",
        content: "Create company events, assign them to the right colleagues, and track RSVPs.",
      },
      { property: "og:title", content: "Team Events — Team Huntington" },
      {
        property: "og:description",
        content: "Targeted company events with automatic invitations and RSVP tracking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeamEventsPage,
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

function TeamEventsPage() {
  const qc = useQueryClient();
  const access = useQuery({
    queryKey: ["team-event-access"],
    queryFn: () => getTeamEventAccess(),
    retry: false,
  });
  const allowed = !!access.data?.allowed;
  const canTargetLeadership = !!access.data?.canTargetLeadership;
  const canDelete = !!access.data?.canDelete;

  const events = useQuery({
    queryKey: ["team-events"],
    queryFn: () => listManageableTeamEvents(),
    enabled: allowed,
  });

  const [tab, setTab] = useState("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [organizerName, setOrganizerName] = useState("");
  const [organizerEmail, setOrganizerEmail] = useState("");
  const [audience, setAudience] = useState<AudienceRules>({
    ...emptyAudience(),
    allParticipants: true,
  });
  const [inviteesFor, setInviteesFor] = useState<TeamEventSummary | null>(null);

  const preview = useServerFn(previewAudience);
  const previewQuery = useQuery({
    queryKey: ["team-event-audience-preview", audience],
    queryFn: () => preview({ data: { audience } }),
    enabled: allowed,
    retry: false,
  });
  const people = previewQuery.data?.people ?? [];
  const count = previewQuery.data?.count ?? 0;

  const reset = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setEventDate("");
    setStartTime("");
    setEndTime("");
    setLocation("");
    setOrganizerName("");
    setOrganizerEmail("");
    setAudience({ ...emptyAudience(), allParticipants: true });
  };

  const save = useServerFn(saveTeamEvent);
  const publish = useServerFn(publishTeamEvent);

  const payload = () => ({
    id: editingId,
    title,
    description,
    eventDate,
    startTime: startTime || null,
    endTime: endTime || null,
    location: location || null,
    organizerName,
    organizerEmail,
    audience,
  });

  const saveDraft = useMutation({
    mutationFn: () => save({ data: payload() }),
    onSuccess: () => {
      toast.success("Draft saved");
      qc.invalidateQueries({ queryKey: ["team-events"] });
      reset();
      setTab("list");
    },
    onError: (e: Error) => toast.error(e.message || "Couldn't save the event"),
  });

  const publishNow = useMutation({
    mutationFn: async () => {
      const saved = await save({ data: payload() });
      return publish({ data: { id: saved.id } });
    },
    onSuccess: (r) => {
      toast.success(`Invited ${r.invitedCount} ${r.invitedCount === 1 ? "person" : "people"}`);
      qc.invalidateQueries({ queryKey: ["team-events"] });
      reset();
      setTab("list");
    },
    onError: (e: Error) => toast.error(e.message || "Couldn't publish the event"),
  });

  const publishExisting = useMutation({
    mutationFn: (id: string) => publish({ data: { id } }),
    onSuccess: (r) => {
      toast.success(
        r.added > 0
          ? `${r.added} new ${r.added === 1 ? "invitation" : "invitations"} sent`
          : "Audience refreshed — no new invitees",
      );
      qc.invalidateQueries({ queryKey: ["team-events"] });
    },
    onError: (e: Error) => toast.error(e.message || "Couldn't publish the event"),
  });

  const cancelFn = useServerFn(cancelTeamEvent);
  const cancel = useMutation({
    mutationFn: (id: string) => cancelFn({ data: { id } }),
    onSuccess: (r) => {
      toast.success(`Event cancelled — ${r.notified} notified`);
      qc.invalidateQueries({ queryKey: ["team-events"] });
    },
    onError: (e: Error) => toast.error(e.message || "Couldn't cancel the event"),
  });

  const removeFn = useServerFn(deleteTeamEvent);
  const remove = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Event deleted");
      qc.invalidateQueries({ queryKey: ["team-events"] });
    },
    onError: (e: Error) => toast.error(e.message || "Couldn't delete the event"),
  });

  const loadForEdit = (e: TeamEventSummary) => {
    setEditingId(e.id);
    setTitle(e.title);
    setDescription(e.description);
    setEventDate(e.eventDate);
    setStartTime(e.startTime ?? "");
    setEndTime(e.endTime ?? "");
    setLocation(e.location ?? "");
    setOrganizerName(e.organizerName);
    setOrganizerEmail(e.organizerEmail);
    setAudience(e.audience);
    setTab("create");
  };

  const inviteeList = useQuery({
    queryKey: ["team-event-invitees", inviteesFor?.id],
    queryFn: () => listTeamEventInvitees({ data: { id: inviteesFor!.id } }),
    enabled: !!inviteesFor,
  });

  if (access.isLoading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">
        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
      </main>
    );
  }

  if (!allowed) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <ShieldAlert className="h-8 w-8 text-muted-foreground" />
            <h1 className="text-lg font-semibold">Captain access required</h1>
            <p className="text-sm text-muted-foreground">
              Team events can be created by captains, co-chairs, admins and super users.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Team events</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a company event, assign it to exactly the right colleagues, and track who is coming.
        </p>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="create">{editingId ? "Edit event" : "New event"}</TabsTrigger>
          <TabsTrigger value="list">
            All events{events.data ? ` (${events.data.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Event details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="e-title">Title</Label>
                    <Input
                      id="e-title"
                      value={title}
                      onChange={(ev) => setTitle(ev.target.value)}
                      placeholder="Team Huntington kickoff breakfast"
                      maxLength={140}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="e-desc">Details</Label>
                    <Textarea
                      id="e-desc"
                      rows={6}
                      value={description}
                      onChange={(ev) => setDescription(ev.target.value)}
                      placeholder="What to expect, parking, what to bring…"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="e-date">Date</Label>
                      <Input id="e-date" type="date" value={eventDate} onChange={(ev) => setEventDate(ev.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="e-start">Start time</Label>
                      <Input id="e-start" type="time" value={startTime} onChange={(ev) => setStartTime(ev.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="e-end">End time</Label>
                      <Input id="e-end" type="time" value={endTime} onChange={(ev) => setEndTime(ev.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="e-loc">Location or meeting link</Label>
                    <Input
                      id="e-loc"
                      value={location}
                      onChange={(ev) => setLocation(ev.target.value)}
                      placeholder="Huntington Center, 41 S High St — or a Teams link"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="e-org">Organizer name</Label>
                      <Input id="e-org" value={organizerName} onChange={(ev) => setOrganizerName(ev.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="e-orgemail">Organizer email</Label>
                      <Input
                        id="e-orgemail"
                        type="email"
                        value={organizerEmail}
                        onChange={(ev) => setOrganizerEmail(ev.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Who is invited</CardTitle>
                </CardHeader>
                <CardContent>
                  <AudienceBuilder
                    value={audience}
                    onChange={setAudience}
                    canTargetLeadership={canTargetLeadership}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card className="lg:sticky lg:top-20">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-4 w-4" /> Invitees
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-3xl font-black tracking-tight">
                      {previewQuery.isFetching ? <Loader2 className="h-6 w-6 animate-spin" /> : count}
                    </p>
                    <p className="text-xs text-muted-foreground">{describeAudience(audience)}</p>
                    {previewQuery.error && (
                      <p className="mt-1 text-xs text-destructive">
                        {(previewQuery.error as Error).message}
                      </p>
                    )}
                  </div>

                  <div className="max-h-64 divide-y overflow-y-auto rounded-md border">
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
                    <Button onClick={() => publishNow.mutate()} disabled={publishNow.isPending || count === 0}>
                      {publishNow.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      Publish &amp; invite
                    </Button>
                    <Button variant="outline" onClick={() => saveDraft.mutate()} disabled={saveDraft.isPending}>
                      <CalendarPlus className="mr-2 h-4 w-4" /> Save draft
                    </Button>
                    {editingId && (
                      <Button variant="ghost" size="sm" onClick={reset}>
                        Cancel editing
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {events.isLoading ? (
                <p className="p-6 text-sm text-muted-foreground">Loading events…</p>
              ) : (events.data ?? []).length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">No team events yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event</TableHead>
                        <TableHead>When</TableHead>
                        <TableHead>Audience</TableHead>
                        <TableHead className="text-right">Invited</TableHead>
                        <TableHead className="text-right">RSVPs</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(events.data ?? []).map((e) => (
                        <TableRow key={e.id}>
                          <TableCell>
                            <p className="font-medium">{e.title}</p>
                            <Badge
                              variant={e.status === "published" ? "default" : "outline"}
                              className="mt-1 capitalize"
                            >
                              {e.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatEventDate(e.eventDate)}
                            <span className="block text-xs text-muted-foreground">
                              {formatTimeRange(e.startTime, e.endTime)}
                              {e.location ? ` · ${e.location}` : ""}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[16rem] text-xs text-muted-foreground">
                            {e.audienceSummary}
                          </TableCell>
                          <TableCell className="text-right">{e.invitedCount}</TableCell>
                          <TableCell className="text-right text-xs">
                            <span className="font-medium text-emerald-700">{e.yesCount} in</span>
                            {" · "}
                            {e.noCount} out
                            {" · "}
                            {e.noReplyCount} no reply
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-wrap justify-end gap-1">
                              <Button size="sm" variant="ghost" onClick={() => setInviteesFor(e)}>
                                <Users className="h-3.5 w-3.5" />
                              </Button>
                              {e.status !== "cancelled" && (
                                <>
                                  <Button size="sm" variant="ghost" onClick={() => loadForEdit(e)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => publishExisting.mutate(e.id)}
                                    disabled={publishExisting.isPending}
                                  >
                                    <Send className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => cancel.mutate(e.id)}>
                                    <Ban className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                              {canDelete && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive"
                                  onClick={() => remove.mutate(e.id)}
                                >
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

      <Dialog open={!!inviteesFor} onOpenChange={(o) => !o && setInviteesFor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{inviteesFor?.title} — RSVPs</DialogTitle>
          </DialogHeader>
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                download("team-event-rsvps.csv", [
                  ["Name", "Email", "RSVP", "Responded"],
                  ...(inviteeList.data ?? []).map((r) => [
                    r.name,
                    r.email,
                    rsvpLabel(r.rsvp),
                    r.respondedAt ?? "",
                  ]),
                ])
              }
            >
              <Download className="mr-1 h-3.5 w-3.5" /> Export CSV
            </Button>
          </div>
          <div className="max-h-80 divide-y overflow-y-auto rounded-md border">
            {inviteeList.isLoading ? (
              <p className="p-3 text-sm text-muted-foreground">Loading…</p>
            ) : (inviteeList.data ?? []).length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">Nobody has been invited yet.</p>
            ) : (
              (inviteeList.data ?? []).map((r) => (
                <div key={r.userId} className="flex items-center justify-between gap-3 p-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{r.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.email}</p>
                  </div>
                  <Badge variant={r.rsvp === "yes" ? "default" : "outline"}>{rsvpLabel(r.rsvp)}</Badge>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
