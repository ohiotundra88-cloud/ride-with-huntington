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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAdmin, type ConciergeIntent } from "@/lib/admin-store";
import { Plus, Pencil, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/concierge")({
  head: () => ({ meta: [{ title: "Concierge — Super User" }, { name: "description", content: "Edit concierge intents and fallback." }] }),
  component: ConciergeAdmin,
});

const blank = (): ConciergeIntent => ({
  id: `i-${crypto.randomUUID().slice(0, 8)}`,
  title: "", keywords: [], body: "", links: [],
  order: 999, active: true, updatedAt: new Date().toISOString(), updatedBy: "Demo Admin",
});

function ConciergeAdmin() {
  const { state, setState, audit, resetSection } = useAdmin();
  const [editing, setEditing] = useState<ConciergeIntent | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [kwInput, setKwInput] = useState("");
  const [linksInput, setLinksInput] = useState("");

  const openEdit = (i: ConciergeIntent) => {
    setEditing({ ...i });
    setKwInput(i.keywords.join(", "));
    setLinksInput(i.links.map((l) => `${l.label}|${l.href}`).join("\n"));
    setIsNew(false);
  };
  const openNew = () => {
    const b = blank();
    setEditing(b); setKwInput(""); setLinksInput(""); setIsNew(true);
  };

  const save = () => {
    if (!editing) return;
    if (!editing.title.trim() || !editing.body.trim()) { toast.error("Title and body required"); return; }
    const links = linksInput.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
      const [label, href] = l.split("|").map((s) => s.trim());
      return { label: label ?? "", href: href ?? "" };
    }).filter((l) => l.label && l.href);
    const next: ConciergeIntent = {
      ...editing,
      keywords: kwInput.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean),
      links,
      updatedAt: new Date().toISOString(),
    };
    setState((s) => {
      const idx = s.concierge.intents.findIndex((i) => i.id === next.id);
      const list = idx >= 0 ? s.concierge.intents.map((i) => i.id === next.id ? next : i) : [...s.concierge.intents, next];
      return { ...s, concierge: { ...s.concierge, intents: list } };
    });
    audit({ action: isNew ? "create" : "update", entity: "ConciergeIntent", entityId: next.id, detail: next.title });
    toast.success("Saved");
    setEditing(null);
  };
  const remove = (i: ConciergeIntent) => {
    setState((s) => ({ ...s, concierge: { ...s.concierge, intents: s.concierge.intents.filter((x) => x.id !== i.id) } }));
    audit({ action: "delete", entity: "ConciergeIntent", entityId: i.id, detail: i.title });
    toast.success("Deleted");
  };

  return (
    <AdminShell title="Concierge" description="Keyword-matched intents shown in the floating concierge drawer."
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { resetSection("concierge"); audit({ action: "reset", entity: "Concierge" }); toast.success("Reset"); }}><RotateCcw className="mr-1 h-4 w-4" /> Reset</Button>
          <Button onClick={openNew} className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90"><Plus className="mr-1 h-4 w-4" /> New intent</Button>
        </div>
      }
    >
      <Tabs defaultValue="intents">
        <TabsList>
          <TabsTrigger value="intents">Intents</TabsTrigger>
          <TabsTrigger value="starters">Starters</TabsTrigger>
          <TabsTrigger value="fallback">Fallback</TabsTrigger>
        </TabsList>

        <TabsContent value="intents" className="mt-4 space-y-2">
          {[...state.concierge.intents].sort((a, b) => a.order - b.order).map((i) => (
            <Card key={i.id}>
              <CardContent className="p-4 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="font-bold text-[var(--brand-dark)]">{i.title}</p>
                    {!i.active && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{i.body}</p>
                  <p className="mt-1 text-[10px] uppercase text-muted-foreground">keywords: {i.keywords.join(", ") || "—"}</p>
                </div>
                <div className="flex gap-1">
                  <div className="flex items-center gap-1 text-xs mr-2"><Switch checked={i.active} onCheckedChange={(v) => { setState((s) => ({ ...s, concierge: { ...s.concierge, intents: s.concierge.intents.map((x) => x.id === i.id ? { ...x, active: v } : x) } })); audit({ action: "toggle", entity: "ConciergeIntent", entityId: i.id, detail: `active=${v}` }); }} /></div>
                  <Button size="sm" variant="outline" onClick={() => openEdit(i)}><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button size="sm" variant="ghost" className="text-red-600"><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Delete intent?</AlertDialogTitle></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => remove(i)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="starters" className="mt-4">
          <Card><CardContent className="p-4 space-y-2">
            <Label>Suggested starter questions (one per line)</Label>
            <Textarea rows={8} value={state.concierge.starters.join("\n")} onChange={(e) => setState((s) => ({ ...s, concierge: { ...s.concierge, starters: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) } }))} />
            <Button size="sm" onClick={() => { audit({ action: "update", entity: "ConciergeStarters" }); toast.success("Saved"); }}>Save starters</Button>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="fallback" className="mt-4">
          <Card><CardContent className="p-4 grid gap-3">
            <div className="space-y-1"><Label>Fallback title</Label><Input value={state.concierge.fallbackTitle} onChange={(e) => setState((s) => ({ ...s, concierge: { ...s.concierge, fallbackTitle: e.target.value } }))} /></div>
            <div className="space-y-1"><Label>Fallback body</Label><Textarea rows={4} value={state.concierge.fallbackBody} onChange={(e) => setState((s) => ({ ...s, concierge: { ...s.concierge, fallbackBody: e.target.value } }))} /></div>
            <Button size="sm" onClick={() => { audit({ action: "update", entity: "ConciergeFallback" }); toast.success("Saved"); }}>Save fallback</Button>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{isNew ? "New intent" : "Edit intent"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="space-y-1"><Label>Title</Label><Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
              <div className="space-y-1"><Label>Keywords (comma-separated)</Label><Input value={kwInput} onChange={(e) => setKwInput(e.target.value)} placeholder="hotel, room, book" /></div>
              <div className="space-y-1"><Label>Response body</Label><Textarea rows={5} value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} /></div>
              <div className="space-y-1"><Label>Related links (one per line: <code>Label|/path</code>)</Label><Textarea rows={3} value={linksInput} onChange={(e) => setLinksInput(e.target.value)} /></div>
              <div className="flex items-center gap-2"><Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} id="ca" /><Label htmlFor="ca">Active</Label></div>
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
