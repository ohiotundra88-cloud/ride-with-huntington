import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdmin, readinessScore, type EditableReadinessItem, type Audience } from "@/lib/admin-store";
import { iconOptions } from "@/components/AdminIcon";
import { Plus, Pencil, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/readiness")({
  head: () => ({ meta: [{ title: "Readiness — Super User" }, { name: "description", content: "Configure readiness scoring." }] }),
  component: ReadinessAdmin,
});

const blank = (): EditableReadinessItem => ({
  id: `r-${crypto.randomUUID().slice(0, 8)}`,
  title: "", status: "not_started", detail: "", icon: "check",
  ctaLabel: "Open", href: "", weight: 10, required: false, audience: "all",
  active: true, publish: "draft", updatedAt: new Date().toISOString(), updatedBy: "Demo Admin",
});

const API_KEYS: Record<string, string> = {
  pelotonia: "readiness.pelotonia.status",
  hotel: "readiness.hotel.status",
  fundraising: "readiness.fundraising.current",
};

function ReadinessAdmin() {
  const { state, setState, audit, resetSection, isApiManaged } = useAdmin();
  const [editing, setEditing] = useState<EditableReadinessItem | null>(null);
  const [isNew, setIsNew] = useState(false);

  const score = useMemo(() => readinessScore(state.readiness), [state.readiness]);
  const totalWeight = state.readiness.filter((r) => r.active && r.publish === "published").reduce((n, r) => n + r.weight, 0);

  const save = () => {
    if (!editing) return;
    if (!editing.title.trim()) { toast.error("Title required"); return; }
    const next = { ...editing, updatedAt: new Date().toISOString() };
    setState((s) => {
      const idx = s.readiness.findIndex((r) => r.id === next.id);
      const list = idx >= 0 ? s.readiness.map((r) => r.id === next.id ? next : r) : [...s.readiness, next];
      return { ...s, readiness: list };
    });
    audit({ action: isNew ? "create" : "update", entity: "Readiness", entityId: next.id, detail: next.title });
    toast.success("Saved");
    setEditing(null);
  };
  const remove = (r: EditableReadinessItem) => {
    setState((s) => ({ ...s, readiness: s.readiness.filter((x) => x.id !== r.id) }));
    audit({ action: "delete", entity: "Readiness", entityId: r.id, detail: r.title });
    toast.success("Deleted");
  };
  const toggle = (r: EditableReadinessItem, patch: Partial<EditableReadinessItem>) => {
    const next = { ...r, ...patch, updatedAt: new Date().toISOString() };
    setState((s) => ({ ...s, readiness: s.readiness.map((x) => x.id === r.id ? next : x) }));
    audit({ action: "toggle", entity: "Readiness", entityId: r.id, detail: JSON.stringify(patch) });
  };

  return (
    <AdminShell title="Readiness scoring" description="Weighted items drive the dashboard readiness ring. Weights must sum to a value > 0 for scoring to work."
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { resetSection("readiness"); audit({ action: "reset", entity: "Readiness" }); toast.success("Reset to defaults"); }}>
            <RotateCcw className="mr-1 h-4 w-4" /> Reset
          </Button>
          <Button onClick={() => { setEditing(blank()); setIsNew(true); }} className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90">
            <Plus className="mr-1 h-4 w-4" /> New item
          </Button>
        </div>
      }
    >
      <Card className="mb-4"><CardContent className="p-4 flex flex-wrap items-center gap-6">
        <div><p className="text-xs uppercase text-muted-foreground">Sample score</p><p className="text-3xl font-black text-[var(--brand-dark)]">{score}%</p></div>
        <div><p className="text-xs uppercase text-muted-foreground">Total weight (active)</p><p className="text-2xl font-bold">{totalWeight}</p></div>
        <div><p className="text-xs uppercase text-muted-foreground">Items</p><p className="text-2xl font-bold">{state.readiness.length}</p></div>
      </CardContent></Card>

      <div className="grid gap-3">
        {state.readiness.map((r) => {
          const apiKey = API_KEYS[r.id];
          const managed = apiKey ? isApiManaged(apiKey) : undefined;
          return (
            <Card key={r.id}>
              <CardContent className="p-4 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="font-bold text-[var(--brand-dark)]">{r.title}</p>
                    <Badge variant="outline" className="text-[10px] uppercase">{r.status.replace("_", " ")}</Badge>
                    <Badge className="bg-[var(--brand)] text-[var(--brand-foreground)] text-[10px]">Weight {r.weight}</Badge>
                    {r.required && <Badge variant="outline" className="text-[10px]">Required</Badge>}
                    <Badge variant="outline" className="text-[10px]">{r.audience}</Badge>
                    <Badge variant={r.publish === "published" ? "default" : "outline"} className={r.publish === "published" ? "bg-[var(--brand-dark)] text-white text-[10px]" : "text-[10px]"}>{r.publish}</Badge>
                    {managed && <Badge variant="outline" className="text-[10px]">API-synced</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{r.detail}</p>
                </div>
                <div className="flex flex-wrap gap-1 items-center">
                  <div className="flex items-center gap-1 text-xs"><Switch checked={r.active} onCheckedChange={(v) => toggle(r, { active: v })} /> Active</div>
                  <Button size="sm" variant="outline" onClick={() => { setEditing({ ...r }); setIsNew(false); }}><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button size="sm" variant="ghost" className="text-red-600"><Trash2 className="mr-1 h-3.5 w-3.5" /> Delete</Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Delete readiness item?</AlertDialogTitle><AlertDialogDescription>Score weighting rebalances immediately.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => remove(r)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{isNew ? "New readiness item" : "Edit readiness item"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-1"><Label>Title</Label><Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
              <div className="sm:col-span-2 space-y-1"><Label>Detail / helper</Label><Textarea rows={2} value={editing.detail} onChange={(e) => setEditing({ ...editing, detail: e.target.value })} /></div>
              <div className="space-y-1"><Label>Icon</Label>
                <Select value={editing.icon} onValueChange={(v) => setEditing({ ...editing, icon: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{iconOptions.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Status</Label>
                <Select value={editing.status} onValueChange={(v) => setEditing({ ...editing, status: v as EditableReadinessItem["status"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["not_started", "in_progress", "complete", "reserved", "ordered", "shipped"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Weight</Label><Input type="number" min={0} max={100} value={editing.weight} onChange={(e) => setEditing({ ...editing, weight: Number(e.target.value) })} /></div>
              <div className="space-y-1"><Label>Audience</Label>
                <Select value={editing.audience} onValueChange={(v) => setEditing({ ...editing, audience: v as Audience })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(["all", "riders", "volunteers", "families", "admins"] as Audience[]).map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>CTA label</Label><Input value={editing.ctaLabel} onChange={(e) => setEditing({ ...editing, ctaLabel: e.target.value })} /></div>
              <div className="space-y-1"><Label>CTA link</Label><Input value={editing.href ?? ""} onChange={(e) => setEditing({ ...editing, href: e.target.value })} /></div>
              <div className="space-y-1"><Label>Deadline</Label><Input type="date" value={editing.deadline ?? ""} onChange={(e) => setEditing({ ...editing, deadline: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={editing.required} onCheckedChange={(v) => setEditing({ ...editing, required: v })} id="req" /><Label htmlFor="req">Required</Label></div>
              <div className="flex items-center gap-2"><Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} id="act" /><Label htmlFor="act">Active</Label></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="outline" onClick={() => { if (editing) { setEditing({ ...editing, publish: "draft" }); save(); } }}>Save draft</Button>
            <Button className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90" onClick={() => { if (editing) { setEditing({ ...editing, publish: "published" }); save(); } }}>Publish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
