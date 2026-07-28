import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useStore, type AdminParticipant, type StepStatus } from "@/lib/store";
import { useAdmin } from "@/lib/admin-store";
import { Download, Search, StickyNote, Lock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/participants")({
  head: () => ({ meta: [
    { title: "Participants — Super User" },
    { name: "description", content: "Team Huntington colleague registrations." },
  ] }),
  component: ParticipantsAdmin,
});

const statusColor: Record<StepStatus, string> = {
  complete: "bg-[var(--brand)] text-[var(--brand-foreground)]",
  pending: "bg-amber-500 text-black",
  not_started: "bg-muted text-muted-foreground",
};

function ParticipantsAdmin() {
  const { participants, addNote } = useStore();
  const { audit } = useAdmin();
  const [q, setQ] = useState("");
  const [role, setRole] = useState<string>("all");
  const [market, setMarket] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [note, setNote] = useState<{ p: AdminParticipant; value: string } | null>(null);

  const markets = useMemo(() => Array.from(new Set(participants.map((p) => p.market))).sort(), [participants]);

  const filtered = useMemo(() => participants.filter((p) => {
    if (role !== "all" && p.role !== role) return false;
    if (market !== "all" && p.market !== market) return false;
    if (status !== "all") {
      if (status === "complete" && p.completion < 100) return false;
      if (status === "in_progress" && (p.completion === 0 || p.completion === 100)) return false;
      if (status === "not_started" && p.completion !== 0) return false;
    }
    if (!q) return true;
    const s = q.toLowerCase();
    return p.name.toLowerCase().includes(s) || p.email.toLowerCase().includes(s) || p.id.toLowerCase().includes(s);
  }), [participants, role, market, status, q]);

  const exportCsv = () => {
    const headers = ["id", "name", "email", "role", "market", "segment", "completion", "pelotonia", "travel", "bike", "apparel", "hotelNights", "arrivalDate", "bikeRental", "jerseySize", "shirtSize"];
    const rows = filtered.map((p) => [p.id, p.name, p.email, p.role, p.market, p.segment, p.completion, p.pelotoniaStatus, p.travelStatus, p.bikeStatus, p.apparelStatus, p.hotelNights, p.arrivalDate, p.bikeRental, p.jerseySize ?? "", p.shirtSize ?? ""]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `team-huntington-participants-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    audit({ action: "update", entity: "ParticipantsExport", detail: `${filtered.length} rows` });
    toast.success("CSV exported");
  };

  const saveNote = () => {
    if (!note) return;
    const v = note.value.trim();
    if (!v) return setNote(null);
    addNote(note.p.id, v);
    audit({ action: "update", entity: "Participant", entityId: note.p.id, detail: `note: ${v.slice(0, 60)}` });
    toast.success("Note added");
    setNote(null);
  };

  const total = participants.length;
  const complete = participants.filter((p) => p.completion === 100).length;
  const avg = total ? Math.round(participants.reduce((n, p) => n + p.completion, 0) / total) : 0;

  return (
    <AdminShell
      title="Participants"
      description="Colleague registrations synced from the Pelotonia CRM. Fields shown here are read-only in production."
      actions={
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]"><Lock className="mr-1 h-3 w-3" /> API-synced</Badge>
          <Button onClick={exportCsv} className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90">
            <Download className="mr-1 h-4 w-4" /> Export CSV
          </Button>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-4 mb-4">
        <StatCard label="Total colleagues" value={total} />
        <StatCard label="Complete" value={complete} />
        <StatCard label="Average completion" value={`${avg}%`} />
        <StatCard label="Filtered rows" value={filtered.length} />
      </div>

      <Card className="mb-4">
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, email, or ID" className="pl-8" />
          </div>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="Rider">Rider</SelectItem>
              <SelectItem value="Volunteer">Volunteer</SelectItem>
              <SelectItem value="Both">Both</SelectItem>
            </SelectContent>
          </Select>
          <Select value={market} onValueChange={setMarket}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All markets</SelectItem>
              {markets.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any status</SelectItem>
              <SelectItem value="complete">Complete</SelectItem>
              <SelectItem value="in_progress">In progress</SelectItem>
              <SelectItem value="not_started">Not started</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colleague</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Market</TableHead>
                <TableHead>Pelotonia</TableHead>
                <TableHead>Travel</TableHead>
                <TableHead>Bike</TableHead>
                <TableHead>Apparel</TableHead>
                <TableHead className="text-right">Completion</TableHead>
                <TableHead className="text-right">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No colleagues match those filters.</TableCell></TableRow>}
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--brand-dark)] truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{p.id}</p>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{p.role}</Badge></TableCell>
                  <TableCell className="text-xs">{p.market}</TableCell>
                  <TableCell><StatusPill s={p.pelotoniaStatus} /></TableCell>
                  <TableCell><StatusPill s={p.travelStatus} /></TableCell>
                  <TableCell><StatusPill s={p.bikeStatus} /></TableCell>
                  <TableCell><StatusPill s={p.apparelStatus} /></TableCell>
                  <TableCell className="text-right font-bold">{p.completion}%</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" aria-label={`Add note for ${p.name}`} onClick={() => setNote({ p, value: "" })}>
                      <StickyNote className="h-3.5 w-3.5" />
                      {p.notes.length > 0 && <span className="ml-1 text-[10px]">{p.notes.length}</span>}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!note} onOpenChange={(o) => !o && setNote(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Notes · {note?.p.name}</DialogTitle></DialogHeader>
          {note && (
            <div className="space-y-3">
              {note.p.notes.length > 0 && (
                <ul className="space-y-1 text-sm">
                  {note.p.notes.map((n, i) => <li key={i} className="rounded border p-2 text-xs">{n}</li>)}
                </ul>
              )}
              <Textarea rows={3} value={note.value} onChange={(e) => setNote({ ...note, value: e.target.value })} placeholder="Add a note visible only to admins…" />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setNote(null)}>Cancel</Button>
                <Button onClick={saveNote} className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90">Add note</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}

function StatusPill({ s }: { s: StepStatus }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusColor[s]}`}>{s.replace("_", " ")}</span>;
}

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card><CardContent className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-black text-[var(--brand-dark)]">{value}</p>
    </CardContent></Card>
  );
}
