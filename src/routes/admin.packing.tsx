import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAdmin, type PackingDefault } from "@/lib/admin-store";
import { Plus, Pencil, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/packing")({
  head: () => ({ meta: [{ title: "Packing list — Super User" }, { name: "description", content: "Edit default packing items." }] }),
  component: PackingAdmin,
});

const blank = (preset: "rider" | "volunteer"): PackingDefault => ({
  id: `p-${crypto.randomUUID().slice(0, 8)}`,
  label: "", category: "", preset, required: false, description: "",
  order: 999, active: true, updatedAt: new Date().toISOString(), updatedBy: "Demo Admin",
});

function PackingAdmin() {
  const { state, setState, audit, resetSection } = useAdmin();
  const [tab, setTab] = useState<"rider" | "volunteer">("rider");
  const [editing, setEditing] = useState<PackingDefault | null>(null);
  const [isNew, setIsNew] = useState(false);

  const items = useMemo(() => state.packing.items.filter((i) => i.preset === tab).sort((a, b) => a.order - b.order), [state.packing.items, tab]);
  const categories = state.packing.categories[tab];

  const save = () => {
    if (!editing) return;
    if (!editing.label.trim() || !editing.category.trim()) { toast.error("Label and category required"); return; }
    const next = { ...editing, updatedAt: new Date().toISOString() };
    setState((s) => {
      const idx = s.packing.items.findIndex((p) => p.id === next.id);
      const list = idx >= 0 ? s.packing.items.map((p) => p.id === next.id ? next : p) : [...s.packing.items, next];
      return { ...s, packing: { ...s.packing, items: list } };
    });
    audit({ action: isNew ? "create" : "update", entity: "PackingItem", entityId: next.id, detail: next.label });
    toast.success("Saved");
    setEditing(null);
  };
  const remove = (p: PackingDefault) => {
    setState((s) => ({ ...s, packing: { ...s.packing, items: s.packing.items.filter((x) => x.id !== p.id) } }));
    audit({ action: "delete", entity: "PackingItem", entityId: p.id, detail: p.label });
    toast.success("Deleted");

  const move = (p: PackingDefault, dir: -1 | 1) => {
    const group = items;
    const idx = group.findIndex((x) => x.id === p.id);
    const swap = group[idx + dir];
    if (!swap) return;
    setState((s) => ({
      ...s,
      packing: {
        ...s.packing,
        items: s.packing.items.map((x) =>
          x.id === p.id ? { ...x, order: swap.order } : x.id === swap.id ? { ...x, order: p.order } : x,
        ),
      },
    }));
    audit({ action: "update", entity: "PackingItem", entityId: p.id, detail: `reorder ${p.label}` });
  };

  const addCategory = () => {
    const name = newCategory.trim();
    if (!name) return;
    if (categories.some((c) => c.toLowerCase() === name.toLowerCase())) { toast.error("Category already exists"); return; }
    setState((s) => ({ ...s, packing: { ...s.packing, categories: { ...s.packing.categories, [tab]: [...s.packing.categories[tab], name] } } }));
    audit({ action: "create", entity: "PackingCategory", detail: `${tab}: ${name}` });
    setNewCategory("");
    toast.success("Category added");
  };

  const removeCategory = (cat: string) => {
    if (state.packing.items.some((i) => i.preset === tab && i.category === cat)) {
      toast.error("Move or delete its items first");
      return;
    }
    setState((s) => ({ ...s, packing: { ...s.packing, categories: { ...s.packing.categories, [tab]: s.packing.categories[tab].filter((c) => c !== cat) } } }));
    audit({ action: "delete", entity: "PackingCategory", detail: `${tab}: ${cat}` });
    toast.success("Category removed");
  };


  return (
    <AdminShell title="Default packing lists" description="Rider and volunteer starter items. Participants can add their own on top."
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { resetSection("packing"); audit({ action: "reset", entity: "Packing" }); toast.success("Reset"); }}><RotateCcw className="mr-1 h-4 w-4" /> Reset</Button>
          <Button onClick={() => { setEditing(blank(tab)); setIsNew(true); }} className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90"><Plus className="mr-1 h-4 w-4" /> New item</Button>
        </div>
      }
    >
      <Tabs value={tab} onValueChange={(v) => setTab(v as "rider" | "volunteer")}>
        <TabsList>
          <TabsTrigger value="rider">Rider preset</TabsTrigger>
          <TabsTrigger value="volunteer">Volunteer preset</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4 space-y-6">
          {categories.map((cat) => {
            const catItems = items.filter((i) => i.category === cat);
            return (
              <div key={cat}>
                <p className="text-xs uppercase font-bold tracking-wide text-muted-foreground mb-2">{cat}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {catItems.map((p) => (
                    <Card key={p.id}>
                      <CardContent className="p-3 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="font-medium truncate">{p.label}</p>
                            {p.required && <Badge className="bg-[var(--brand-dark)] text-white text-[10px]">Required</Badge>}
                            {!p.active && <Badge variant="outline" className="text-[10px]">Hidden</Badge>}
                          </div>
                          {p.description && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{p.description}</p>}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="sm" variant="ghost" onClick={() => { setEditing({ ...p }); setIsNew(false); }}><Pencil className="h-3.5 w-3.5" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button size="sm" variant="ghost" className="text-red-600"><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Delete item?</AlertDialogTitle></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => remove(p)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {catItems.length === 0 && <p className="text-xs text-muted-foreground italic">Empty</p>}
                </div>
              </div>
            );
          })}
        </TabsContent>
      </Tabs>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isNew ? "New packing item" : "Edit packing item"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="space-y-1"><Label>Label</Label><Input value={editing.label} onChange={(e) => setEditing({ ...editing, label: e.target.value })} /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1"><Label>Preset</Label>
                  <Select value={editing.preset} onValueChange={(v) => setEditing({ ...editing, preset: v as "rider" | "volunteer" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="rider">Rider</SelectItem><SelectItem value="volunteer">Volunteer</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Category</Label>
                  <Select value={editing.category} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                    <SelectTrigger><SelectValue placeholder="Pick or type below" /></SelectTrigger>
                    <SelectContent>{state.packing.categories[editing.preset].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1"><Label>Description</Label><Textarea rows={2} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2"><Switch checked={editing.required} onCheckedChange={(v) => setEditing({ ...editing, required: v })} id="req" /><Label htmlFor="req">Required</Label></div>
                <div className="flex items-center gap-2"><Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} id="act" /><Label htmlFor="act">Active</Label></div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
