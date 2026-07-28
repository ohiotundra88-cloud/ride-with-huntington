import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdmin, formatGoalValue, type Goal, type GoalUnit } from "@/lib/admin-store";
import { ApiManagedField } from "@/components/ApiManagedField";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/goals")({
  head: () => ({ meta: [{ title: "Goals — Super User" }, { name: "description", content: "Edit fundraising, registration, and readiness goals." }] }),
  component: GoalsAdmin,
});

const blank = (): Goal => ({
  id: `g-${crypto.randomUUID().slice(0, 8)}`,
  name: "", current: 0, target: 0, unit: "dollars",
  startDate: "", endDate: "", status: "on_track", location: "Dashboard",
  visibleToParticipants: true, publish: "draft",
  updatedAt: new Date().toISOString(), updatedBy: "Demo Admin",
});

const API_MANAGED_GOALS = new Set(["g-1"]); // team fundraising synced from Pelotonia CRM

function GoalsAdmin() {
  const { state, setState, audit, isApiManaged } = useAdmin();
  const [editing, setEditing] = useState<Goal | null>(null);
  const [isNew, setIsNew] = useState(false);

  const save = (pub?: Goal["publish"]) => {
    if (!editing) return;
    if (!editing.name.trim()) { toast.error("Name required"); return; }
    if (editing.target < 0 || editing.current < 0) { toast.error("Values must be non-negative"); return; }
    const next = { ...editing, publish: pub ?? editing.publish, updatedAt: new Date().toISOString() };
    setState((s) => {
      const idx = s.goals.findIndex((g) => g.id === next.id);
      const list = idx >= 0 ? s.goals.map((g) => g.id === next.id ? next : g) : [...s.goals, next];
      if (next.id === "g-1") return { ...s, goals: list, team: { ...s.team, goalTarget: next.target } };
      return { ...s, goals: list };
    });
    audit({ action: isNew ? "create" : "update", entity: "Goal", entityId: next.id, detail: next.name });
    toast.success(pub === "published" ? "Published" : "Saved");
    setEditing(null);
  };

  const remove = (g: Goal) => {
    setState((s) => ({ ...s, goals: s.goals.filter((x) => x.id !== g.id) }));
    audit({ action: "delete", entity: "Goal", entityId: g.id, detail: g.name });
    toast.success("Deleted");
  };

  return (
    <AdminShell title="Goals"
      description="Team, participant, and readiness targets. Some totals are synced from the source API and cannot be edited."
      actions={<Button onClick={() => { setEditing(blank()); setIsNew(true); }} className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90"><Plus className="mr-1 h-4 w-4" /> New goal</Button>}
    >
      <div className="grid gap-3">
        {state.goals.map((g) => {
          const pct = g.target > 0 ? Math.round((g.current / g.target) * 100) : 0;
          const f = formatGoalValue(g);
          const managed = isApiManaged("team.goal.current") && g.id === "g-1";
          return (
            <Card key={g.id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="font-bold text-[var(--brand-dark)]">{g.name}</p>
                      <Badge variant={g.publish === "published" ? "default" : "outline"} className={g.publish === "published" ? "bg-[var(--brand)] text-[var(--brand-foreground)]" : ""}>{g.publish}</Badge>
                      <Badge variant="outline" className="text-[10px] uppercase">{g.status.replace("_", " ")}</Badge>
                      <Badge variant="outline" className="text-[10px]">{g.unit}</Badge>
                      {g.visibleToParticipants && <Badge variant="outline" className="text-[10px]">visible</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{f.current} of {f.target} · {g.location}</p>
                    <Progress value={pct} className="mt-2 h-2 [&>div]:bg-[var(--brand)]" />
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => { setEditing({ ...g }); setIsNew(false); }}><Pencil className="mr-1 h-3.5 w-3.5" /> Edit</Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button size="sm" variant="ghost" className="text-red-600"><Trash2 className="mr-1 h-3.5 w-3.5" /> Delete</Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Delete goal?</AlertDialogTitle><AlertDialogDescription>Progress readouts on dashboards may go blank.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => remove(g)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                {managed && (
                  <div className="mt-3">
                    <ApiManagedField fieldKey="team.goal.current" label="Current raised" value={f.current} />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{isNew ? "New goal" : "Edit goal"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-1"><Label>Name</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div className="space-y-1"><Label>Unit</Label>
                <Select value={editing.unit} onValueChange={(v) => setEditing({ ...editing, unit: v as GoalUnit })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(["dollars", "participants", "percentage", "events", "hours"] as GoalUnit[]).map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Status</Label>
                <Select value={editing.status} onValueChange={(v) => setEditing({ ...editing, status: v as Goal["status"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["on_track", "at_risk", "behind", "achieved"].map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Current</Label>
                {API_MANAGED_GOALS.has(editing.id) ? (
                  <Input value={editing.current} disabled />
                ) : (
                  <Input type="number" min={0} value={editing.current} onChange={(e) => setEditing({ ...editing, current: Math.max(0, Number(e.target.value)) })} />
                )}
                {API_MANAGED_GOALS.has(editing.id) && <p className="text-[10px] text-muted-foreground">Managed by Pelotonia CRM — sync in production.</p>}
              </div>
              <div className="space-y-1"><Label>Target</Label><Input type="number" min={0} value={editing.target} onChange={(e) => setEditing({ ...editing, target: Math.max(0, Number(e.target.value)) })} /></div>
              <div className="space-y-1"><Label>Start date</Label><Input type="date" value={editing.startDate} onChange={(e) => setEditing({ ...editing, startDate: e.target.value })} /></div>
              <div className="space-y-1"><Label>End date</Label><Input type="date" value={editing.endDate} onChange={(e) => setEditing({ ...editing, endDate: e.target.value })} /></div>
              <div className="space-y-1 sm:col-span-2"><Label>Display location</Label><Input value={editing.location} onChange={(e) => setEditing({ ...editing, location: e.target.value })} /></div>
              <div className="flex items-center gap-3">
                <Switch checked={editing.visibleToParticipants} onCheckedChange={(v) => setEditing({ ...editing, visibleToParticipants: v })} id="vis" />
                <Label htmlFor="vis">Visible to participants</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="outline" onClick={() => save("draft")}>Save draft</Button>
            <Button className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90" onClick={() => save("published")}>Publish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
