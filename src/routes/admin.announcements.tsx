import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAdmin, type Announcement, type Audience } from "@/lib/admin-store";
import { AdminIcon, iconOptions } from "@/components/AdminIcon";
import { Plus, Pencil, Trash2, Eye, Send, FileText, Pin, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/announcements")({
  head: () => ({ meta: [{ title: "Announcements — Super User" }, { name: "description", content: "Manage homepage announcements." }] }),
  component: AnnouncementsAdmin,
});

const blank = (): Announcement => ({
  id: `a-${crypto.randomUUID().slice(0, 8)}`,
  headline: "",
  body: "",
  icon: "megaphone",
  audience: "all",
  ctaLabel: "",
  ctaHref: "",
  publishAt: new Date().toISOString(),
  expireAt: "",
  pinned: false,
  dismissible: true,
  publish: "draft",
  updatedAt: new Date().toISOString(),
  updatedBy: "Demo Admin",
});

function AnnouncementsAdmin() {
  const { state, setState, audit } = useAdmin();
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [preview, setPreview] = useState<Announcement | null>(null);

  const save = (pub?: Announcement["publish"]) => {
    if (!editing) return;
    if (!editing.headline.trim() || !editing.body.trim()) {
      toast.error("Headline and body are required");
      return;
    }
    const next = { ...editing, publish: pub ?? editing.publish, updatedAt: new Date().toISOString() };
    setState((s) => {
      const idx = s.announcements.findIndex((a) => a.id === next.id);
      const list = idx >= 0 ? s.announcements.map((a) => (a.id === next.id ? next : a)) : [...s.announcements, next];
      return { ...s, announcements: list };
    });
    audit({ action: isNew ? "create" : "update", entity: "Announcement", entityId: next.id, detail: next.headline });
    toast.success(pub === "published" ? "Published" : isNew ? "Announcement created" : "Announcement saved");
    setEditing(null);
  };

  const publish = (a: Announcement) => {
    setState((s) => ({ ...s, announcements: s.announcements.map((x) => x.id === a.id ? { ...x, publish: "published", updatedAt: new Date().toISOString() } : x) }));
    audit({ action: "publish", entity: "Announcement", entityId: a.id, detail: a.headline });
    toast.success("Published");
  };
  const unpublish = (a: Announcement) => {
    setState((s) => ({ ...s, announcements: s.announcements.map((x) => x.id === a.id ? { ...x, publish: "draft", updatedAt: new Date().toISOString() } : x) }));
    audit({ action: "unpublish", entity: "Announcement", entityId: a.id, detail: a.headline });
    toast.success("Unpublished");
  };
  const remove = (a: Announcement) => {
    setState((s) => ({ ...s, announcements: s.announcements.filter((x) => x.id !== a.id) }));
    audit({ action: "delete", entity: "Announcement", entityId: a.id, detail: a.headline });
    toast.success("Deleted");
  };
  const duplicate = (a: Announcement) => {
    const copy = { ...a, id: `a-${crypto.randomUUID().slice(0, 8)}`, headline: a.headline + " (copy)", publish: "draft" as const, updatedAt: new Date().toISOString() };
    setState((s) => ({ ...s, announcements: [...s.announcements, copy] }));
    audit({ action: "create", entity: "Announcement", entityId: copy.id, detail: `duplicated from ${a.id}` });
    toast.success("Duplicated as draft");
  };

  return (
    <AdminShell
      title="Announcements"
      description="Homepage and dashboard announcements. Draft content is hidden from participants."
      actions={
        <Button onClick={() => { setEditing(blank()); setIsNew(true); }} className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90">
          <Plus className="mr-1 h-4 w-4" /> Add announcement
        </Button>
      }
    >
      <div className="grid gap-3">
        {state.announcements.length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No announcements yet.</CardContent></Card>
        )}
        {state.announcements.map((a) => (
          <Card key={a.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[var(--brand)]/15 text-[var(--brand-dark)]">
                    <AdminIcon name={a.icon || "megaphone"} className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="font-bold text-[var(--brand-dark)] truncate">{a.headline || "(untitled)"}</p>
                      <Badge variant={a.publish === "published" ? "default" : "outline"} className={a.publish === "published" ? "bg-[var(--brand)] text-[var(--brand-foreground)]" : ""}>
                        {a.publish}
                      </Badge>
                      {a.pinned && <Badge className="bg-[var(--brand-dark)] text-white"><Pin className="mr-1 h-3 w-3" /> Pinned</Badge>}
                      <Badge variant="outline" className="text-[10px]">audience: {a.audience}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{a.body}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      Updated {new Date(a.updatedAt).toLocaleString()} by {a.updatedBy}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => setPreview(a)}><Eye className="mr-1 h-3.5 w-3.5" /> Preview</Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditing({ ...a }); setIsNew(false); }}><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => duplicate(a)}><Copy className="mr-1 h-3.5 w-3.5" /> Duplicate</Button>
                  {a.publish === "published"
                    ? <Button size="sm" variant="outline" onClick={() => unpublish(a)}><FileText className="mr-1 h-3.5 w-3.5" /> Unpublish</Button>
                    : <Button size="sm" onClick={() => publish(a)} className="bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90"><Send className="mr-1 h-3.5 w-3.5" /> Publish</Button>}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-red-600"><Trash2 className="mr-1 h-3.5 w-3.5" /> Delete</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this announcement?</AlertDialogTitle>
                        <AlertDialogDescription>This removes it from all participant views. This cannot be undone in the demo.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove(a)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{isNew ? "New announcement" : "Edit announcement"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-1">
                <Label>Headline</Label>
                <Input value={editing.headline} onChange={(e) => setEditing({ ...editing, headline: e.target.value })} />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Label>Body</Label>
                <Textarea value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} rows={3} />
              </div>
              <div className="space-y-1">
                <Label>Icon</Label>
                <Select value={editing.icon} onValueChange={(v) => setEditing({ ...editing, icon: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{iconOptions.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Audience</Label>
                <Select value={editing.audience} onValueChange={(v) => setEditing({ ...editing, audience: v as Audience })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["all", "riders", "volunteers", "families", "admins"] as Audience[]).map((a) => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>CTA label</Label>
                <Input value={editing.ctaLabel ?? ""} onChange={(e) => setEditing({ ...editing, ctaLabel: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>CTA link</Label>
                <Select value={editing.ctaHref || "none"} onValueChange={(v) => setEditing({ ...editing, ctaHref: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="No link" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No link</SelectItem>
                    <SelectItem value="/register">Register</SelectItem>
                    <SelectItem value="/dashboard">My Dashboard</SelectItem>
                    <SelectItem value="/profile">My Profile</SelectItem>
                    <SelectItem value="/team">Team Progress</SelectItem>
                    <SelectItem value="/events">Events Calendar</SelectItem>
                    <SelectItem value="/resources">Resource Center</SelectItem>
                    <SelectItem value="/fundraiser-request">Submit Fundraiser</SelectItem>
                    <SelectItem value="/captains-lounge">Captains Lounge</SelectItem>
                    <SelectItem value="/packing">Packing List</SelectItem>
                    <SelectItem value="/family">Family View</SelectItem>
                    <SelectItem value="/expenses">Expense Guide</SelectItem>
                    <SelectItem value="/admin/participants">Participant Management</SelectItem>
                    <SelectItem value="/admin/events">Event Management</SelectItem>
                    <SelectItem value="/admin/approvals">Fundraiser Approvals</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Publish at</Label>
                <Input type="datetime-local" value={editing.publishAt ? editing.publishAt.slice(0, 16) : ""} onChange={(e) => setEditing({ ...editing, publishAt: e.target.value ? new Date(e.target.value).toISOString() : "" })} />
              </div>
              <div className="space-y-1">
                <Label>Expires at</Label>
                <Input type="datetime-local" value={editing.expireAt?.slice(0, 16) ?? ""} onChange={(e) => setEditing({ ...editing, expireAt: e.target.value ? new Date(e.target.value).toISOString() : "" })} />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={editing.pinned} onCheckedChange={(v) => setEditing({ ...editing, pinned: v })} id="pinned" />
                <Label htmlFor="pinned">Pin to top</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={editing.dismissible} onCheckedChange={(v) => setEditing({ ...editing, dismissible: v })} id="dismiss" />
                <Label htmlFor="dismiss">Dismissible</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="outline" onClick={() => save("draft")}>Save draft</Button>
            <Button onClick={() => save("published")} className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90">
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Participant preview</DialogTitle></DialogHeader>
          {preview && (
            <div className="rounded-lg border border-[var(--brand)]/40 bg-[var(--brand)]/10 p-3">
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[var(--brand-dark)] text-white">
                  <AdminIcon name={preview.icon || "megaphone"} className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--brand-dark)]">{preview.headline}</p>
                  <p className="mt-0.5 text-sm">{preview.body}</p>
                  {preview.ctaLabel && <p className="mt-1 text-xs text-[var(--brand-dark)] font-semibold">{preview.ctaLabel} →</p>}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
