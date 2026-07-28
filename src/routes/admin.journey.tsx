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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAdmin, type EditableTimelineItem, type Audience, type FamilyScheduleDay } from "@/lib/admin-store";
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/journey")({
  head: () => ({ meta: [{ title: "Journey & Schedule — Super User" }, { name: "description", content: "Edit timeline and ride weekend schedule." }] }),
  component: JourneyAdmin,
});

const phases: EditableTimelineItem["phase"][] = ["today", "next_week", "two_weeks", "ride_week", "friday", "saturday", "sunday"];

const blankItem = (): EditableTimelineItem => ({
  id: `t-${crypto.randomUUID().slice(0, 8)}`,
  phase: "today", title: "", state: "upcoming", audience: "all",
  required: false, order: 999, publish: "draft",
  updatedAt: new Date().toISOString(), updatedBy: "Demo Admin",
});

function JourneyAdmin() {
  const { state, setState, audit, resetSection } = useAdmin();
  const [editing, setEditing] = useState<EditableTimelineItem | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [dayEdit, setDayEdit] = useState<FamilyScheduleDay | null>(null);

  const sorted = [...state.timeline].sort((a, b) => a.order - b.order);
  const grouped = phases.map((p) => ({ phase: p, items: sorted.filter((t) => t.phase === p) }));

  const save = () => {
    if (!editing) return;
    if (!editing.title.trim()) { toast.error("Title required"); return; }
    const next = { ...editing, updatedAt: new Date().toISOString() };
    setState((s) => {
      const idx = s.timeline.findIndex((t) => t.id === next.id);
      const list = idx >= 0 ? s.timeline.map((t) => t.id === next.id ? next : t) : [...s.timeline, next];
      return { ...s, timeline: list };
    });
    audit({ action: isNew ? "create" : "update", entity: "Timeline", entityId: next.id, detail: next.title });
    toast.success("Saved");
    setEditing(null);
  };
  const remove = (t: EditableTimelineItem) => {
    setState((s) => ({ ...s, timeline: s.timeline.filter((x) => x.id !== t.id) }));
    audit({ action: "delete", entity: "Timeline", entityId: t.id, detail: t.title });
    toast.success("Deleted");
  };
  const move = (t: EditableTimelineItem, dir: -1 | 1) => {
    setState((s) => {
      const list = [...s.timeline].sort((a, b) => a.order - b.order);
      const idx = list.findIndex((x) => x.id === t.id);
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= list.length) return s;
      const other = list[swapIdx];
      const nextList = list.map((x, i) => x.id === t.id ? { ...x, order: swapIdx } : x.id === other.id ? { ...x, order: idx } : { ...x, order: i });
      return { ...s, timeline: nextList };
    });
    audit({ action: "reorder", entity: "Timeline", entityId: t.id });
  };

  const saveDay = () => {
    if (!dayEdit) return;
    setState((s) => ({ ...s, family: { ...s.family, schedule: s.family.schedule.some((d) => d.id === dayEdit.id) ? s.family.schedule.map((d) => d.id === dayEdit.id ? dayEdit : d) : [...s.family.schedule, dayEdit] } }));
    audit({ action: "update", entity: "Schedule", entityId: dayEdit.id, detail: dayEdit.day });
    setDayEdit(null);
    toast.success("Schedule saved");
  };

  return (
    <AdminShell title="Journey & Schedule" description="Timeline drives the dashboard journey. Schedule drives the family day-by-day view."
      actions={<Button variant="outline" onClick={() => { resetSection("timeline"); audit({ action: "reset", entity: "Timeline" }); toast.success("Reset"); }}><RotateCcw className="mr-1 h-4 w-4" /> Reset timeline</Button>}
    >
      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">Journey timeline</TabsTrigger>
          <TabsTrigger value="schedule">Weekend schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-4 space-y-6">
          <div className="flex justify-end">
            <Button onClick={() => { setEditing(blankItem()); setIsNew(true); }} className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90"><Plus className="mr-1 h-4 w-4" /> New item</Button>
          </div>
          {grouped.map(({ phase, items }) => (
            <div key={phase}>
              <p className="text-xs uppercase font-bold tracking-wide text-muted-foreground mb-2">{phase}</p>
              <div className="grid gap-2">
                {items.length === 0 && <p className="text-sm text-muted-foreground italic">No items</p>}
                {items.map((t) => (
                  <Card key={t.id}>
                    <CardContent className="p-3 flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="font-semibold text-[var(--brand-dark)]">{t.title}</p>
                          <Badge variant="outline" className="text-[10px]">{t.state}</Badge>
                          {t.time && <Badge variant="outline" className="text-[10px]">{t.time}</Badge>}
                          <Badge variant="outline" className="text-[10px]">{t.audience}</Badge>
                          {t.publish === "draft" && <Badge variant="outline" className="text-[10px]">draft</Badge>}
                        </div>
                        {t.instructions && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{t.instructions}</p>}
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => move(t, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => move(t, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="outline" onClick={() => { setEditing({ ...t }); setIsNew(false); }}><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button size="sm" variant="ghost" className="text-red-600"><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Delete timeline item?</AlertDialogTitle></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => remove(t)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="schedule" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => setDayEdit({ id: `d-${crypto.randomUUID().slice(0, 6)}`, day: "", items: [], active: true })} className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90"><Plus className="mr-1 h-4 w-4" /> New day</Button>
          </div>
          {state.family.schedule.map((d) => (
            <Card key={d.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-[var(--brand-dark)]">{d.day} {!d.active && <Badge variant="outline" className="ml-1 text-[10px]">hidden</Badge>}</p>
                    <ul className="mt-2 list-disc pl-5 text-sm">{d.items.map((i, idx) => <li key={idx}>{i}</li>)}</ul>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => setDayEdit({ ...d })}><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Button>
                    <Button size="sm" variant="ghost" className="text-red-600" onClick={() => { setState((s) => ({ ...s, family: { ...s.family, schedule: s.family.schedule.filter((x) => x.id !== d.id) } })); audit({ action: "delete", entity: "Schedule", entityId: d.id, detail: d.day }); toast.success("Removed"); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{isNew ? "New timeline item" : "Edit timeline item"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-1"><Label>Title</Label><Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
              <div className="space-y-1"><Label>Phase</Label>
                <Select value={editing.phase} onValueChange={(v) => setEditing({ ...editing, phase: v as EditableTimelineItem["phase"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{phases.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>State</Label>
                <Select value={editing.state} onValueChange={(v) => setEditing({ ...editing, state: v as EditableTimelineItem["state"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["completed", "current", "upcoming"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Time</Label><Input value={editing.time ?? ""} onChange={(e) => setEditing({ ...editing, time: e.target.value })} placeholder="7:00 AM" /></div>
              <div className="space-y-1"><Label>Location</Label><Input value={editing.location ?? ""} onChange={(e) => setEditing({ ...editing, location: e.target.value })} /></div>
              <div className="sm:col-span-2 space-y-1"><Label>Instructions</Label><Textarea rows={2} value={editing.instructions ?? ""} onChange={(e) => setEditing({ ...editing, instructions: e.target.value })} /></div>
              <div className="sm:col-span-2 space-y-1"><Label>Note</Label><Input value={editing.note ?? ""} onChange={(e) => setEditing({ ...editing, note: e.target.value })} /></div>
              <div className="space-y-1"><Label>CTA label</Label><Input value={editing.ctaLabel ?? ""} onChange={(e) => setEditing({ ...editing, ctaLabel: e.target.value })} /></div>
              <div className="space-y-1"><Label>CTA link</Label><Input value={editing.href ?? ""} onChange={(e) => setEditing({ ...editing, href: e.target.value })} /></div>
              <div className="space-y-1"><Label>Contact</Label><Input value={editing.contact ?? ""} onChange={(e) => setEditing({ ...editing, contact: e.target.value })} /></div>
              <div className="space-y-1"><Label>Audience</Label>
                <Select value={editing.audience} onValueChange={(v) => setEditing({ ...editing, audience: v as Audience })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(["all", "riders", "volunteers", "families", "admins"] as Audience[]).map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2"><Switch checked={editing.required} onCheckedChange={(v) => setEditing({ ...editing, required: v })} id="req" /><Label htmlFor="req">Required</Label></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="outline" onClick={() => { if (editing) { setEditing({ ...editing, publish: "draft" }); save(); } }}>Save draft</Button>
            <Button className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90" onClick={() => { if (editing) { setEditing({ ...editing, publish: "published" }); save(); } }}>Publish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!dayEdit} onOpenChange={(o) => !o && setDayEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Weekend day</DialogTitle></DialogHeader>
          {dayEdit && (
            <div className="grid gap-3">
              <div className="space-y-1"><Label>Day label</Label><Input value={dayEdit.day} onChange={(e) => setDayEdit({ ...dayEdit, day: e.target.value })} placeholder="Saturday · Aug 7 (Ride Day)" /></div>
              <div className="space-y-1"><Label>Items (one per line)</Label><Textarea rows={6} value={dayEdit.items.join("\n")} onChange={(e) => setDayEdit({ ...dayEdit, items: e.target.value.split("\n").filter(Boolean) })} /></div>
              <div className="flex items-center gap-2"><Switch checked={dayEdit.active} onCheckedChange={(v) => setDayEdit({ ...dayEdit, active: v })} id="da" /><Label htmlFor="da">Visible</Label></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDayEdit(null)}>Cancel</Button>
            <Button onClick={saveDay} className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
