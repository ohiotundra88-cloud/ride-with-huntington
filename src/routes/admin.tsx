import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StatusBadge } from "@/components/StatusBadge";
import { useStore, type AdminParticipant } from "@/lib/store";
import { Download, Search, Mail, Bell, Unlock, StickyNote } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [
    { title: "Admin — Team Huntington Hub" },
    { name: "description", content: "Team Huntington admin dashboard: registrations, travel and apparel summaries." },
  ] }),
  component: Admin,
});

function Admin() {
  const { participants, addNote, user } = useStore();
  const [q, setQ] = useState("");
  const [role, setRole] = useState<string>("all");
  const [selected, setSelected] = useState<AdminParticipant | null>(null);
  const [note, setNote] = useState("");

  const filtered = useMemo(() => participants.filter((p) => {
    const match = !q || [p.name, p.email, p.market, p.segment].some((f) => f.toLowerCase().includes(q.toLowerCase()));
    const r = role === "all" || p.role.toLowerCase() === role;
    return match && r;
  }), [participants, q, role]);

  const kpis = useMemo(() => {
    const complete = participants.filter((p) => p.completion === 100).length;
    return {
      total: participants.length,
      riders: participants.filter((p) => p.role !== "Volunteer").length,
      volunteers: participants.filter((p) => p.role !== "Rider").length,
      complete,
      incomplete: participants.length - complete,
      travel: participants.filter((p) => p.travelStatus !== "not_started").length,
      hotel: participants.reduce((n, p) => n + p.hotelNights, 0),
      bike: participants.filter((p) => p.bikeRental).length,
    };
  }, [participants]);

  const apparelSummary = useMemo(() => {
    const j: Record<string, number> = {}, s: Record<string, number> = {};
    participants.forEach((p) => {
      if (p.jerseySize) j[p.jerseySize] = (j[p.jerseySize] || 0) + 1;
      if (p.shirtSize) s[p.shirtSize] = (s[p.shirtSize] || 0) + 1;
    });
    return { j, s };
  }, [participants]);

  const exportCSV = () => {
    const rows = [
      ["ID", "Name", "Email", "Role", "Market", "Completion"],
      ...filtered.map((p) => [p.id, p.name, p.email, p.role, p.market, p.completion + "%"]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "team-huntington.csv"; a.click();
    toast.success("CSV exported (demo)");
  };

  if (!user.isAdmin) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Admin access required</h1>
        <p className="mt-2 text-muted-foreground">Toggle "Admin mode" from the top-right menu to view this demo dashboard.</p>
      </div>
    );
  }

  const kpiCards = [
    { label: "Total Registrations", value: kpis.total },
    { label: "Riders", value: kpis.riders },
    { label: "Volunteers", value: kpis.volunteers },
    { label: "Complete", value: kpis.complete },
    { label: "Incomplete", value: kpis.incomplete },
    { label: "Travel Needed", value: kpis.travel },
    { label: "Hotel Nights", value: kpis.hotel },
    { label: "Bike Rentals", value: kpis.bike },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--brand-dark)]">Admin dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Live demo data — 20 seeded colleagues.</p>
        </div>
        <Button onClick={exportCSV} variant="outline"><Download className="mr-1 h-4 w-4" /> Export CSV</Button>
      </div>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpiCards.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="mt-1 text-3xl font-black text-[var(--brand-dark)]">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Apparel — Jersey sizes</CardTitle></CardHeader>
          <CardContent className="text-sm">
            {Object.entries(apparelSummary.j).map(([k, v]) => (
              <div key={k} className="flex justify-between border-b py-1"><span>{k}</span><span className="font-semibold">{v}</span></div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Apparel — Shirt sizes</CardTitle></CardHeader>
          <CardContent className="text-sm">
            {Object.entries(apparelSummary.s).map(([k, v]) => (
              <div key={k} className="flex justify-between border-b py-1"><span>{k}</span><span className="font-semibold">{v}</span></div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Travel summary</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="flex justify-between border-b py-1"><span>Travel needed</span><span className="font-semibold">{kpis.travel}</span></div>
            <div className="flex justify-between border-b py-1"><span>Total hotel nights</span><span className="font-semibold">{kpis.hotel}</span></div>
            <div className="flex justify-between border-b py-1"><span>Bike rentals</span><span className="font-semibold">{kpis.bike}</span></div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader className="flex flex-row items-center gap-3">
          <CardTitle className="mr-auto">Registrations</CardTitle>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search name, email…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8 w-64" />
          </div>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="rider">Rider</SelectItem>
              <SelectItem value="volunteer">Volunteer</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Market</TableHead>
                <TableHead>Pelotonia</TableHead>
                <TableHead>Travel</TableHead>
                <TableHead>Bike</TableHead>
                <TableHead>Apparel</TableHead>
                <TableHead>Overall</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id} onClick={() => setSelected(p)} className="cursor-pointer">
                  <TableCell>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.email}</p>
                  </TableCell>
                  <TableCell>{p.role}</TableCell>
                  <TableCell className="text-xs">{p.market}</TableCell>
                  <TableCell><StatusBadge status={p.pelotoniaStatus} /></TableCell>
                  <TableCell><StatusBadge status={p.travelStatus} /></TableCell>
                  <TableCell><StatusBadge status={p.bikeStatus} /></TableCell>
                  <TableCell><StatusBadge status={p.apparelStatus} /></TableCell>
                  <TableCell><span className="font-mono font-bold">{p.completion}%</span></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader><SheetTitle>{selected.name}</SheetTitle></SheetHeader>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between border-b py-1"><span className="text-muted-foreground">ID</span><span className="font-mono">{selected.id}</span></div>
                <div className="flex justify-between border-b py-1"><span className="text-muted-foreground">Email</span><span>{selected.email}</span></div>
                <div className="flex justify-between border-b py-1"><span className="text-muted-foreground">Role</span><span>{selected.role}</span></div>
                <div className="flex justify-between border-b py-1"><span className="text-muted-foreground">Segment</span><span>{selected.segment}</span></div>
                <div className="flex justify-between border-b py-1"><span className="text-muted-foreground">Market</span><span>{selected.market}</span></div>
                <div className="flex justify-between border-b py-1"><span className="text-muted-foreground">Completion</span><span className="font-bold">{selected.completion}%</span></div>
                <div className="flex justify-between border-b py-1"><span className="text-muted-foreground">Hotel nights</span><span>{selected.hotelNights}</span></div>
                <div className="flex justify-between border-b py-1"><span className="text-muted-foreground">Bike rental</span><span>{selected.bikeRental ? "Yes" : "No"}</span></div>
                {selected.jerseySize && <div className="flex justify-between border-b py-1"><span className="text-muted-foreground">Jersey</span><span>{selected.jerseySize}</span></div>}
              </div>

              <div className="mt-6 grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => toast.success("Confirmation resent (demo)")}><Mail className="mr-1 h-4 w-4" />Resend</Button>
                <Button variant="outline" size="sm" onClick={() => toast.success("Reminder sent (demo)")}><Bell className="mr-1 h-4 w-4" />Remind</Button>
                <Button variant="outline" size="sm" onClick={() => toast.success("Step reopened (demo)")}><Unlock className="mr-1 h-4 w-4" />Reopen step</Button>
              </div>

              <div className="mt-6">
                <p className="text-sm font-semibold flex items-center gap-1"><StickyNote className="h-4 w-4" /> Internal notes</p>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add note…" className="mt-2" />
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={() => { if (note.trim()) { addNote(selected.id, note.trim()); setNote(""); toast.success("Note saved"); } }}
                >Save note</Button>
                <ul className="mt-3 space-y-1 text-sm">
                  {selected.notes.map((n, i) => <li key={i} className="rounded bg-muted p-2">{n}</li>)}
                </ul>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
