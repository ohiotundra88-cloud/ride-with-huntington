import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAdmin, type EditableNotification, type Audience } from "@/lib/admin-store";
import { Plus, Pencil, Trash2, Send, FileText, Eye } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Super User" }, { name: "description", content: "Compose participant notifications." }] }),
  component: NotificationsAdmin,
});

const blank = (): EditableNotification => ({
  id: `n-${crypto.randomUUID().slice(0, 8)}`,
  title: "", body: "", kind: "reminder", audience: "all", priority: "info",
  href: "", ctaLabel: "", publishAt: new Date().toISOString(), expireAt: "",
  read: false, publish: "draft", updatedAt: new Date().toISOString(), updatedBy: "Demo Admin",
});

function NotificationsAdmin() {
  const { state, setState, audit } = useAdmin();
  const [editing, setEditing] = useState<EditableNotification | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [preview, setPreview] = useState<EditableNotification | null>(null);

  const save = () => {
    if (!editing) return;
    if (!editing.title.trim() || !editing.body.trim()) { toast.error("Title and body required"); return; }
    const next = { ...editing, updatedAt: new Date().toISOString() };
    setState((s) => {
      const idx = s.notifications.findIndex((a) => a.id === next.id);
      const list = idx >= 0 ? s.notifications.map((a) => a.id === next.id ? next : a) : [...s.notifications, next];
      return { ...s, notifications: list };
    });
    audit({ action: isNew ? "create" : "update", entity: "Notification", entityId: next.id, detail: next.title });
    toast.success(isNew ? "Notification created" : "Notification saved");
    setEditing(null);
  };
  const publish = (n: EditableNotification) => {
    setState((s) => ({ ...s, notifications: s.notifications.map((x) => x.id === n.id ? { ...x, publish: "published" } : x) }));
    audit({ action: "publish", entity: "Notification", entityId: n.id, detail: n.title });
    toast.success("Published");
  };
  const unpublish = (n: EditableNotification) => {
    setState((s) => ({ ...s, notifications: s.notifications.map((x) => x.id === n.id ? { ...x, publish: "draft" } : x) }));
    audit({ action: "unpublish", entity: "Notification", entityId: n.id, detail: n.title });
    toast.success("Unpublished");
  };
  const remove = (n: EditableNotification) => {
    setState((s) => ({ ...s, notifications: s.notifications.filter((x) => x.id !== n.id) }));
    audit({ action: "delete", entity: "Notification", entityId: n.id, detail: n.title });
    toast.success("Deleted");
  };

  return (
    <AdminShell title="Notification composer" description="Notifications appear in the bell menu. Drafts stay hidden."
      actions={<Button onClick={() => { setEditing(blank()); setIsNew(true); }} className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90"><Plus className="mr-1 h-4 w-4" /> New notification</Button>}
    >
      <div className="grid gap-3">
        {state.notifications.map((n) => (
          <Card key={n.id}>
            <CardContent className="p-4 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="font-bold text-[var(--brand-dark)] truncate">{n.title || "(untitled)"}</p>
                  <Badge variant={n.publish === "published" ? "default" : "outline"} className={n.publish === "published" ? "bg-[var(--brand)] text-[var(--brand-foreground)]" : ""}>{n.publish}</Badge>
                  <Badge variant="outline" className="text-[10px]">{n.kind}</Badge>
                  <Badge variant="outline" className="text-[10px]">{n.priority}</Badge>
                  <Badge variant="outline" className="text-[10px]">audience: {n.audience}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{n.body}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                <Button size="sm" variant="outline" onClick={() => setPreview(n)}><Eye className="mr-1 h-3.5 w-3.5" /> Preview</Button>
                <Button size="sm" variant="outline" onClick={() => { setEditing({ ...n }); setIsNew(false); }}><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Button>
                {n.publish === "published"
                  ? <Button size="sm" variant="outline" onClick={() => unpublish(n)}><FileText className="mr-1 h-3.5 w-3.5" /> Unpublish</Button>
                  : <Button size="sm" onClick={() => publish(n)} className="bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90"><Send className="mr-1 h-3.5 w-3.5" /> Publish</Button>}
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button size="sm" variant="ghost" className="text-red-600"><Trash2 className="mr-1 h-3.5 w-3.5" /> Delete</Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Delete notification?</AlertDialogTitle><AlertDialogDescription>Removed for all participants.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => remove(n)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{isNew ? "New notification" : "Edit notification"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-1"><Label>Title</Label><Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
              <div className="sm:col-span-2 space-y-1"><Label>Message</Label><Textarea rows={3} value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} /></div>
              <div className="space-y-1">
                <Label>Kind</Label>
                <Select value={editing.kind} onValueChange={(v) => setEditing({ ...editing, kind: v as EditableNotification["kind"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["deadline", "reminder", "milestone", "event"].map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Priority</Label>
                <Select value={editing.priority} onValueChange={(v) => setEditing({ ...editing, priority: v as EditableNotification["priority"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["info", "important", "urgent"].map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Audience</Label>
                <Select value={editing.audience} onValueChange={(v) => setEditing({ ...editing, audience: v as Audience })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(["all", "riders", "volunteers", "families", "admins"] as Audience[]).map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>CTA link</Label><Input value={editing.href ?? ""} onChange={(e) => setEditing({ ...editing, href: e.target.value })} placeholder="/register" /></div>
              <div className="space-y-1"><Label>CTA label</Label><Input value={editing.ctaLabel ?? ""} onChange={(e) => setEditing({ ...editing, ctaLabel: e.target.value })} /></div>
              <div className="space-y-1"><Label>Publish at</Label><Input type="datetime-local" value={editing.publishAt.slice(0, 16)} onChange={(e) => setEditing({ ...editing, publishAt: new Date(e.target.value).toISOString() })} /></div>
              <div className="space-y-1"><Label>Expires at</Label><Input type="datetime-local" value={editing.expireAt?.slice(0, 16) ?? ""} onChange={(e) => setEditing({ ...editing, expireAt: e.target.value ? new Date(e.target.value).toISOString() : "" })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="outline" onClick={() => { if (editing) { setEditing({ ...editing, publish: "draft" }); save(); } }}>Save draft</Button>
            <Button className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90"
              onClick={() => { if (editing) { setEditing({ ...editing, publish: "published" }); save(); } }}>Publish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Preview</DialogTitle></DialogHeader>
          {preview && (
            <div className="rounded-lg border p-3">
              <p className="text-sm font-semibold flex items-center gap-1">
                {preview.priority === "urgent" && <span className="rounded bg-red-600 text-white text-[9px] font-bold uppercase px-1 py-0.5">Urgent</span>}
                {preview.priority === "important" && <span className="rounded bg-amber-500 text-black text-[9px] font-bold uppercase px-1 py-0.5">Important</span>}
                {preview.title}
              </p>
              <p className="text-xs text-muted-foreground">{preview.body}</p>
              <p className="mt-2 text-[10px] uppercase text-muted-foreground">{preview.kind}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
