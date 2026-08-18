import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  CalendarDays, ChevronLeft, ChevronRight, MapPin, Clock, Mail, Phone, User as UserIcon,
  Paperclip, Plus, Pencil, Trash2, EyeOff, Upload, X,
} from "lucide-react";
import {
  listPublicEvents, listEventsForColleague, listManageableEvents, saveEvent, deleteEvent,
  uploadEventFlier, removeEventFlier,
} from "@/lib/events.functions";
import {
  ALLOWED_FLIER_TYPES, MAX_FLIER_BYTES, flierUrl, formatEventDate, formatTimeRange,
  type FundraisingEvent,
} from "@/lib/events.shared";

export const Route = createFileRoute("/events")({
  component: EventsPage,
  head: () => ({
    meta: [
      { title: "Fundraising Events Calendar — Team Huntington Hub" },
      { name: "description", content: "Browse Team Huntington Pelotonia fundraising events: dates, locations, fliers and who to contact for details." },
      { property: "og:title", content: "Fundraising Events Calendar — Team Huntington" },
      { property: "og:description", content: "Team captains post fundraising events here — see dates, details, fliers and contacts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW = ["S","M","T","W","T","F","S"];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function EventsPage() {
  const { user } = useStore();
  const qc = useQueryClient();
  const canManage = user.signedIn && user.isCaptain;

  const { data: events = [], isLoading } = useQuery<FundraisingEvent[]>({
    queryKey: ["events", canManage ? "manage" : user.signedIn ? "colleague" : "public"],
    queryFn: () =>
      canManage ? listManageableEvents() : user.signedIn ? listEventsForColleague() : listPublicEvents(),
  });

  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<FundraisingEvent | null>(null);
  const [creating, setCreating] = useState(false);

  const byDate = useMemo(() => {
    const map = new Map<string, FundraisingEvent[]>();
    for (const e of events) {
      const list = map.get(e.event_date) ?? [];
      list.push(e);
      map.set(e.event_date, list);
    }
    return map;
  }, [events]);

  const monthLabel = `${MONTHS[cursor.m]} ${cursor.y}`;
  const firstDow = new Date(cursor.y, cursor.m, 1).getDay();
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      `${cursor.y}-${String(cursor.m + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`),
  ];

  const shown = useMemo(() => {
    if (selected) return byDate.get(selected) ?? [];
    return events
      .filter((e) => e.event_date >= todayISO())
      .slice(0, 50);
  }, [selected, byDate, events]);

  const del = useMutation({
    mutationFn: (id: string) => deleteEvent({ data: { id } }),
    onSuccess: () => { toast.success("Event removed"); qc.invalidateQueries({ queryKey: ["events"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const move = (delta: number) => {
    setSelected(null);
    setCursor((c) => {
      const m = c.m + delta;
      if (m < 0) return { y: c.y - 1, m: 11 };
      if (m > 11) return { y: c.y + 1, m: 0 };
      return { y: c.y, m };
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Team Huntington</p>
          <h1 className="mt-1 text-3xl sm:text-4xl font-black leading-tight text-[var(--brand-dark)]">
            Fundraising events
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Team captains post rides, socials, bake sales and community nights here. Tap a date to see what's happening,
            download the flier, and reach the captain hosting it.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/fundraiser-request">Request approval for a fundraiser</Link>
          </Button>
          {canManage && (
            <Button onClick={() => setCreating(true)} className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90">
              <Plus className="mr-1 h-4 w-4" /> Post an event
            </Button>
          )}
        </div>
      </div>

      {user.signedIn && (
        <p className="mt-4 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Hosting a fundraiser? Submit it through <Link to="/fundraiser-request" className="font-semibold underline">the approval request form</Link> — your
          peloton captain reviews it first, then Legal, Risk, Compliance and Marketing, with co-chair sign-off last. Approved in-person events publish
          here automatically.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[var(--brand)]" /> {monthLabel}
              </CardTitle>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7" aria-label="Previous month" onClick={() => move(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-7 w-7" aria-label="Next month" onClick={() => move(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-muted-foreground">
              {DOW.map((d, i) => <div key={i} className="py-1">{d}</div>)}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {cells.map((iso, i) => {
                if (!iso) return <div key={`b${i}`} />;
                const count = byDate.get(iso)?.length ?? 0;
                const isToday = iso === todayISO();
                const isSel = iso === selected;
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => setSelected(isSel ? null : iso)}
                    aria-label={`${iso}${count ? `, ${count} event${count > 1 ? "s" : ""}` : ""}`}
                    className={`relative aspect-square rounded-md text-xs transition-colors ${
                      isSel ? "bg-[var(--brand-dark)] text-white"
                        : count ? "bg-[var(--brand)]/20 font-semibold text-[var(--brand-dark)] hover:bg-[var(--brand)]/35"
                        : "hover:bg-muted"
                    } ${isToday && !isSel ? "ring-1 ring-[var(--brand-dark)]" : ""}`}
                  >
                    {Number(iso.slice(-2))}
                    {count > 0 && (
                      <span className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${isSel ? "bg-white" : "bg-[var(--brand-dark)]"}`} />
                    )}
                  </button>
                );
              })}
            </div>
            {selected && (
              <Button variant="ghost" size="sm" className="mt-3 w-full text-xs" onClick={() => setSelected(null)}>
                <X className="mr-1 h-3 w-3" /> Clear date filter
              </Button>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {selected ? formatEventDate(selected) : "Upcoming events"}
          </h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading events…</p>
          ) : shown.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
              No events {selected ? "on this date" : "posted yet"}. Check back soon.
            </CardContent></Card>
          ) : (
            shown.map((e) => (
              <EventCard
                key={e.id}
                event={e}
                canEdit={canManage && (user.isAdmin || e.created_by === user.userId)}
                onEdit={() => setEditing(e)}
                onDelete={() => del.mutate(e.id)}
              />
            ))
          )}
        </div>
      </div>

      {(creating || editing) && (
        <EventDialog
          key={editing?.id ?? "new"}
          event={editing}
          open
          onClose={() => { setCreating(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

function EventCard({ event, canEdit, onEdit, onDelete }: {
  event: FundraisingEvent; canEdit: boolean; onEdit: () => void; onDelete: () => void;
}) {
  const time = formatTimeRange(event.start_time, event.end_time);
  return (
    <Card className={event.published ? "" : "border-dashed border-amber-500/60"}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-lg text-[var(--brand-dark)]">{event.title}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">{formatEventDate(event.event_date)}</p>
          </div>
          <div className="flex items-center gap-1">
            {!event.published && (
              <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                <EyeOff className="h-3 w-3" /> DRAFT
              </span>
            )}
            {canEdit && (
              <>
                <Button variant="ghost" size="sm" onClick={onEdit} aria-label={`Edit ${event.title}`}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" aria-label={`Delete ${event.title}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove this event?</AlertDialogTitle>
                      <AlertDialogDescription>“{event.title}” will disappear from the fundraising calendar.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-muted-foreground">
          {time && <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {time}</span>}
          {event.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {event.location}</span>}
        </div>
        {event.description && <p className="whitespace-pre-line leading-relaxed">{event.description}</p>}

        {(event.contact_name || event.contact_email || event.contact_phone) && (
          <div className="rounded-md border bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact for information</p>
            <div className="mt-1.5 space-y-1">
              {event.contact_name && <div className="inline-flex items-center gap-1.5"><UserIcon className="h-3.5 w-3.5 text-[var(--brand-dark)]" /> {event.contact_name}</div>}
              {event.contact_email && (
                <div><a href={`mailto:${event.contact_email}`} className="inline-flex items-center gap-1.5 text-[var(--brand-dark)] underline">
                  <Mail className="h-3.5 w-3.5" /> {event.contact_email}</a></div>
              )}
              {event.contact_phone && (
                <div><a href={`tel:${event.contact_phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 text-[var(--brand-dark)] underline">
                  <Phone className="h-3.5 w-3.5" /> {event.contact_phone}</a></div>
              )}
            </div>
          </div>
        )}

        {event.flier_path && (
          <a href={flierUrl(event.id)} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold text-[var(--brand-dark)] hover:bg-muted">
            <Paperclip className="h-3.5 w-3.5" /> {event.flier_name || "View flier"}
          </a>
        )}
      </CardContent>
    </Card>
  );
}

function EventDialog({ event, open, onClose }: { event: FundraisingEvent | null; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: event?.title ?? "",
    description: event?.description ?? "",
    event_date: event?.event_date ?? todayISO(),
    start_time: event?.start_time ?? "",
    end_time: event?.end_time ?? "",
    location: event?.location ?? "",
    contact_name: event?.contact_name ?? "",
    contact_email: event?.contact_email ?? "",
    contact_phone: event?.contact_phone ?? "",
    published: event?.published ?? true,
  });
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const dropFlier = useMutation({
    mutationFn: () => removeEventFlier({ data: { id: event!.id } }),
    onSuccess: () => { toast.success("Flier removed"); qc.invalidateQueries({ queryKey: ["events"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (form.title.trim().length < 2) { toast.error("Give the event a title"); return; }
    setBusy(true);
    try {
      const saved = await saveEvent({
        data: {
          ...(event ? { id: event.id } : {}),
          title: form.title,
          description: form.description,
          event_date: form.event_date,
          start_time: form.start_time || null,
          end_time: form.end_time || null,
          location: form.location || null,
          contact_name: form.contact_name || null,
          contact_email: form.contact_email || null,
          contact_phone: form.contact_phone || null,
          published: form.published,
        },
      });

      if (pendingFile) {
        const buf = await pendingFile.arrayBuffer();
        let binary = "";
        const arr = new Uint8Array(buf);
        for (let i = 0; i < arr.length; i += 8192) {
          binary += String.fromCharCode(...arr.subarray(i, i + 8192));
        }
        await uploadEventFlier({
          data: {
            id: saved.id,
            fileName: pendingFile.name,
            contentType: pendingFile.type as (typeof ALLOWED_FLIER_TYPES)[number],
            base64: btoa(binary),
          },
        });
      }

      toast.success(event ? "Event updated" : "Event posted");
      qc.invalidateQueries({ queryKey: ["events"] });
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const pickFile = (f: File | null) => {
    if (!f) { setPendingFile(null); return; }
    if (!(ALLOWED_FLIER_TYPES as readonly string[]).includes(f.type)) {
      toast.error("Flier must be a PNG, JPG, WEBP or PDF"); return;
    }
    if (f.size > MAX_FLIER_BYTES) { toast.error("Flier must be 5 MB or smaller"); return; }
    setPendingFile(f);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{event ? "Edit event" : "Post a fundraising event"}</DialogTitle>
          <DialogDescription>Captains: add the details colleagues need, plus who to contact.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ev-title">Event title</Label>
            <Input id="ev-title" value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={120} required />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="ev-date">Date</Label>
              <Input id="ev-date" type="date" value={form.event_date} onChange={(e) => set("event_date", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-start">Start</Label>
              <Input id="ev-start" type="time" value={form.start_time} onChange={(e) => set("start_time", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-end">End</Label>
              <Input id="ev-end" type="time" value={form.end_time} onChange={(e) => set("end_time", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ev-loc">Location</Label>
            <Input id="ev-loc" value={form.location} onChange={(e) => set("location", e.target.value)} maxLength={200} placeholder="Huntington Center, Columbus" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ev-desc">Event information</Label>
            <Textarea id="ev-desc" rows={4} maxLength={4000} value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="What's happening, who it benefits, ticket or donation details…" />
          </div>

          <div className="rounded-md border p-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact for information</p>
            <div className="space-y-1.5">
              <Label htmlFor="ev-cname">Name</Label>
              <Input id="ev-cname" value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} maxLength={120} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ev-cemail">Email</Label>
                <Input id="ev-cemail" type="email" value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)} maxLength={255} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ev-cphone">Phone</Label>
                <Input id="ev-cphone" value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} maxLength={40} />
              </div>
            </div>
          </div>

          <div className="rounded-md border p-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Flier attachment</p>
            {event?.flier_path && !pendingFile && (
              <div className="flex items-center justify-between gap-2 text-sm">
                <a href={flierUrl(event.id)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[var(--brand-dark)] underline">
                  <Paperclip className="h-3.5 w-3.5" /> {event.flier_name || "Current flier"}
                </a>
                <Button type="button" variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10"
                  onClick={() => dropFlier.mutate()} disabled={dropFlier.isPending}>
                  Remove
                </Button>
              </div>
            )}
            <input ref={fileRef} type="file" accept=".png,.jpg,.jpeg,.webp,.pdf" className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="mr-1 h-3.5 w-3.5" /> {event?.flier_path ? "Replace flier" : "Attach flier"}
              </Button>
              {pendingFile && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  {pendingFile.name}
                  <button type="button" aria-label="Clear selected flier" onClick={() => setPendingFile(null)}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">PNG, JPG, WEBP or PDF up to 5 MB.</p>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="ev-pub" className="text-sm">Publish to the calendar</Label>
              <p className="text-xs text-muted-foreground">Off keeps it as a draft only you and admins can see.</p>
            </div>
            <Switch id="ev-pub" checked={form.published} onCheckedChange={(v) => set("published", v)} />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={busy} className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90">
              {busy ? "Saving…" : event ? "Save changes" : "Post event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
