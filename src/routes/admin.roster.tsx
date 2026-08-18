import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/AdminShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Lock, UserPlus, RotateCcw, Trash2 } from "lucide-react";
import {
  listManualParticipants, createManualParticipant, removeManualParticipant, resetSeason,
  type ManualParticipantRow,
} from "@/lib/season.functions";

export const Route = createFileRoute("/admin/roster")({
  component: RosterPage,
  head: () => ({
    meta: [
      { title: "Permanent Roster & Season Reset — Team Huntington Hub" },
      { name: "description", content: "Super users add permanent colleagues that survive the end-of-season reset, and clear last season's rider registrations." },
    ],
  }),
});

const EXTRA_ROLES = [
  { value: "captain", label: "Peloton captain" },
  { value: "legal", label: "Legal" },
  { value: "risk", label: "Risk" },
  { value: "compliance", label: "Compliance" },
  { value: "marketing", label: "Marketing" },
  { value: "cochair", label: "Co-chair" },
  { value: "admin", label: "Admin" },
] as const;

type ExtraRole = (typeof EXTRA_ROLES)[number]["value"];

function RosterPage() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [participation, setParticipation] = useState<"rider" | "volunteer" | "both" | "unsure">("rider");
  const [roles, setRoles] = useState<ExtraRole[]>([]);
  const [confirm, setConfirm] = useState("");

  const { data: rows = [], isLoading, error } = useQuery<ManualParticipantRow[]>({
    queryKey: ["manual-participants"],
    queryFn: () => listManualParticipants(),
  });

  const create = useMutation({
    mutationFn: () => createManualParticipant({ data: { email, full_name: fullName, participation, roles } }),
    onSuccess: (r) => {
      toast.success("Permanent colleague added", { description: `${r.email} will survive the season reset.` });
      setEmail(""); setFullName(""); setRoles([]);
      qc.invalidateQueries({ queryKey: ["manual-participants"] });
    },
    onError: (e: Error) => toast.error("Couldn't add colleague", { description: e.message }),
  });

  const remove = useMutation({
    mutationFn: (user_id: string) => removeManualParticipant({ data: { user_id } }),
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["manual-participants"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const reset = useMutation({
    mutationFn: () => resetSeason({ data: { confirm: "RESET SEASON" } }),
    onSuccess: (r) => {
      toast.success("Season reset complete", { description: `${r.cleared} registrations cleared, ${r.kept} permanent records kept.` });
      setConfirm("");
      qc.invalidateQueries({ queryKey: ["manual-participants"] });
    },
    onError: (e: Error) => toast.error("Reset failed", { description: e.message }),
  });

  return (
    <AdminShell
      title="Permanent roster & season reset"
      description="Super-user-only. Manually added colleagues are season-locked: the end-of-season cleanup never removes them — only a super user can."
    >
      {error ? (
        <p className="text-sm text-destructive">{(error as Error).message}</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><UserPlus className="h-4 w-4 text-[var(--brand)]" /> Add a permanent colleague</CardTitle>
              <CardDescription>Creates their account, marks the record season-locked, and optionally grants review roles.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
                <div className="space-y-1.5">
                  <Label htmlFor="r-email">Huntington email</Label>
                  <Input id="r-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="first.last@huntington.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="r-name">Full name</Label>
                  <Input id="r-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={2} />
                </div>
                <div className="space-y-1.5">
                  <Label>Participation</Label>
                  <Select value={participation} onValueChange={(v) => setParticipation(v as typeof participation)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rider">Rider</SelectItem>
                      <SelectItem value="volunteer">Volunteer</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                      <SelectItem value="unsure">Undecided</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Grant roles (optional)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {EXTRA_ROLES.map((r) => (
                      <label key={r.value} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={roles.includes(r.value)}
                          onCheckedChange={(c) =>
                            setRoles((prev) => (c ? [...prev, r.value] : prev.filter((x) => x !== r.value)))
                          }
                        />
                        {r.label}
                      </label>
                    ))}
                  </div>
                </div>
                <Button type="submit" disabled={create.isPending} className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90">
                  {create.isPending ? "Adding…" : "Add permanent colleague"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4 text-[var(--brand)]" /> Season-locked colleagues</CardTitle>
                <CardDescription>{rows.length} record{rows.length === 1 ? "" : "s"} protected from the season reset.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No manual records yet.</p>
                ) : (
                  <ul className="divide-y">
                    {rows.map((r) => (
                      <li key={r.user_id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{r.full_name ?? r.email}</div>
                          <div className="truncate text-xs text-muted-foreground">{r.email} · season {r.season}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="capitalize">{r.participation ?? "—"}</Badge>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => remove.mutate(r.user_id)} aria-label={`Remove ${r.email}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card className="border-destructive/40">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-destructive"><RotateCcw className="h-4 w-4" /> End-of-season reset</CardTitle>
                <CardDescription>
                  Deletes rider and volunteer registrations from the finished season. Keeps every season-locked record, all roles, FAQs,
                  events and fundraising resources.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="r-confirm">Type <span className="font-mono">RESET SEASON</span> to confirm</Label>
                  <Input id="r-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="RESET SEASON" />
                </div>
                <Button
                  variant="destructive"
                  disabled={confirm !== "RESET SEASON" || reset.isPending}
                  onClick={() => reset.mutate()}
                >
                  {reset.isPending ? "Resetting…" : "Reset season registrations"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
