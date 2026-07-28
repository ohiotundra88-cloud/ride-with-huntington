import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdmin, type FamilySection, type PublishState } from "@/lib/admin-store";
import { AdminIcon, iconOptions } from "@/components/AdminIcon";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/family")({
  head: () => ({ meta: [
    { title: "Family Guide — Super User" },
    { name: "description", content: "Edit spectator sections shown to families." },
  ] }),
  component: FamilyAdmin,
});

const blank = (): FamilySection => ({
  id: `f-${crypto.randomUUID().slice(0, 8)}`,
  icon: "map", title: "", body: "", order: 999,
  active: true, publish: "draft",
  updatedAt: new Date().toISOString(), updatedBy: "Demo Admin",
});

function FamilyAdmin() {
  const { state, setState, audit, resetSection } = useAdmin();
  const [editing, setEditing] = useState<FamilySection | null>(null);
  const [isNew, setIsNew] = useState(false);

  const sorted = [...state.family.sections].sort((a, b) => a.order - b.order);

  const save = (pub?: PublishState) => {
    if (!editing) return;
    if (!editing.title.trim() || !editing.body.trim()) { toast.error("Title and body required"); return; }
    const next: FamilySection = { ...editing, publish: pub ?? editing.publish, updatedAt: new Date().toISOString() };
    setState((s) => {
      const idx = s.family.sections.findIndex((x) => x.id === next.id);
      const list = idx >= 0 ? s.family.sections.map((x) => x.id === next.id ? next : x) : [...s.family.sections, next];
      return { ...s, family: { ...s.family, sections: list } };
    });
    audit({ action: isNew ? "create" : "update", entity: "FamilySection", entityId: next.id, detail: next.title });
    toast.success(pub === "published" ? "Published" : "Saved");
    setEditing(null);
  };
  const remove = (f: FamilySection) => {
    setState((s) => ({ ...s, family: { ...s.family, sections: s.family.sections.filter((x) => x.id !== f.id) } }));
    audit({ action: "delete", entity: "FamilySection", entityId: f.id, detail: f.title });
    toast.success("Deleted");
  };
  const move = (f: FamilySection, dir: -1 | 1) => {
    setState((s) => {
      const list = [...s.family.sections].sort((a, b) => a.order - b.order);
      const idx = list.findIndex((x) => x.id === f.id);
      const swap = idx + dir;
      if (swap < 0 || swap >= list.length) return s;
      const other = list[swap];
      const next = list.map((x) => x.id === f.id ? { ...x, order: swap } : x.id === other.id ? { ...x, order: idx } : x);
      return { ...s, family: { ...s.family, sections: next } };
    });
    audit({ action: "reorder", entity: "FamilySection", entityId: f.id });
  };
  const toggleActive = (f: FamilySection, v: boolean) => {
    setState((s) => ({ ...s, family: { ...s.family, sections: s.family.sections.map((x) => x.id === f.id ? { ...x, active: v, updatedAt: new Date().toISOString() } : x) } }));
    audit({ action: "toggle", entity: "FamilySection", entityId: f.id, detail: `active=${v}` });
  };

  return (
    <AdminShell
      title="Family Guide"
      description="Sections shown on the participant Family & Spectator Guide. Drafts and hidden sections are not visible to families."
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { resetSection("family"); audit({ action: "reset", entity: "Family" }); toast.success("Reset"); }}>
            <RotateCcw className="mr-1 h-4 w-4" /> Reset
          </Button>
          <Button onClick={() => { setEditing(blank()); setIsNew(true); }} className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90">
            <Plus className="mr-1 h-4 w-4" /> New section
          </Button>
        </div>
      }
    >
      <p className="mb-4 text-xs text-muted-foreground">Manage the day-by-day weekend schedule under <b>Journey &amp; Schedule → Weekend schedule</b>.</p>

      <div className="grid gap-3">
        {sorted.map((f) => (
          <Card key={f.id}>
            <CardContent className="p-4 flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[var(--brand)]/15 text-[var(--brand-dark)]">
                  <AdminIcon name={f.icon} className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="font-bold text-[var(--brand-dark)]">{f.title || "(untitled)"}</p>
                    <Badge variant={f.publish === "published" ? "default" : "outline"} className={f.publish === "published" ? "bg-[var(--brand)] text-[var(--brand-foreground)]" : ""}>
                      {f.publish}
                    </Badge>
                    {!f.active && <Badge variant="outline" className="text-[10px]">Hidden</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{f.body}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1 shrink-0">
                <div className="flex items-center gap-1 text-xs mr-1">
                  <Switch checked={f.active} onCheckedChange={(v) => toggleActive(f, v)} aria-label="Active" /> Active
                </div>
                <Button size="sm" variant="ghost" aria-label="Move up" onClick={() => move(f, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="ghost" aria-label="Move down" onClick={() => move(f, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="outline" onClick={() => { setEditing({ ...f }); setIsNew(false); }}><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button size="sm" variant="ghost" className="text-red-600" aria-label={`Delete ${f.title}`}><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Delete section?</AlertDialogTitle></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => remove(f)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{isNew ? "New family section" : "Edit family section"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-1"><Label>Title</Label><Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
              <div className="sm:col-span-2 space-y-1"><Label>Body</Label><Textarea rows={4} value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} /></div>
              <div className="space-y-1"><Label>Icon</Label>
                <Select value={editing.icon} onValueChange={(v) => setEditing({ ...editing, icon: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{iconOptions.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-6"><Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} id="fa" /><Label htmlFor="fa">Visible to families</Label></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="outline" onClick={() => save("draft")}>Save draft</Button>
            <Button onClick={() => save("published")} className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90">Publish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
