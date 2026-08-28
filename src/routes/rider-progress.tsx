import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppNav } from "@/components/AppNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Search, ShieldAlert, Check, X, Loader2 } from "lucide-react";
import {
  getRiderProgressAccess,
  listRiderProgress,
  type RiderProgressRow,
} from "@/lib/rider-progress.functions";

export const Route = createFileRoute("/rider-progress")({
  head: () => ({
    meta: [
      { title: "Rider Progress — Team Huntington" },
      { name: "description", content: "Search riders and track registration, hotel, bike and fundraising progress." },
      { property: "og:title", content: "Rider Progress — Team Huntington" },
      { property: "og:description", content: "Captain view of rider readiness and fundraising progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RiderProgressPage,
});

const money = (v: number | null) =>
  v === null ? "—" : v.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const label = (s: string) =>
  s === "complete" ? "Complete" : s === "pending" ? "In progress" : "Not started";

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "complete"
      ? "bg-emerald-100 text-emerald-800"
      : status === "pending"
        ? "bg-amber-100 text-amber-900"
        : "bg-muted text-muted-foreground";
  return <Badge className={`${tone} border-0 font-medium`}>{label(status)}</Badge>;
}

function YesNo({ value }: { value: boolean }) {
  return value ? (
    <Check className="h-4 w-4 text-emerald-600" aria-label="Yes" />
  ) : (
    <X className="h-4 w-4 text-muted-foreground" aria-label="No" />
  );
}

type SortKey = "name" | "completion" | "raised";

function RiderProgressPage() {
  const access = useQuery({ queryKey: ["rider-progress-access"], queryFn: () => getRiderProgressAccess(), retry: false });
  const allowed = !!access.data?.allowed;

  const { data: rows = [], isLoading, error } = useQuery<RiderProgressRow[]>({
    queryKey: ["rider-progress"],
    queryFn: () => listRiderProgress(),
    enabled: allowed,
    staleTime: 5 * 60_000,
  });

  const [q, setQ] = useState("");
  const [participation, setParticipation] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<SortKey>("name");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (needle && ![r.name, r.email, r.riderId ?? ""].some((v) => v.toLowerCase().includes(needle))) return false;
      if (participation !== "all" && r.participation !== participation) return false;
      if (status === "registered" && !r.registeredWithPelotonia) return false;
      if (status === "not_registered" && r.registeredWithPelotonia) return false;
      if (status === "no_hotel" && r.hotelBooked) return false;
      if (status === "no_bike" && r.bikeConfirmed) return false;
      if (status === "no_fundraising" && (r.raised ?? 0) > 0) return false;
      return true;
    });
    return out.sort((a, b) => {
      if (sort === "completion") return b.completion - a.completion;
      if (sort === "raised") return (b.raised ?? -1) - (a.raised ?? -1);
      return a.name.localeCompare(b.name);
    });
  }, [rows, q, participation, status, sort]);

  const totals = useMemo(
    () => ({
      people: filtered.length,
      registered: filtered.filter((r) => r.registeredWithPelotonia).length,
      hotel: filtered.filter((r) => r.hotelBooked).length,
      bike: filtered.filter((r) => r.bikeConfirmed).length,
      raised: filtered.reduce((s, r) => s + (r.raised ?? 0), 0),
    }),
    [filtered],
  );

  const exportCsv = () => {
    const headers = [
      "Name", "Email", "Participation", "Rider ID", "Registered with Pelotonia", "Registration step",
      "Travel step", "Travel needs", "Hotel booked", "Hotel", "Hotel check-in", "Hotel check-out",
      "Bike step", "Bike plan", "Bike confirmed", "Apparel step", "Completion %",
      "Raised", "Fundraising goal", "Committed", "All-time raised", "Submitted", "Last updated",
    ];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = filtered.map((r) =>
      [
        r.name, r.email, r.participation ?? "", r.riderId ?? "", r.registeredWithPelotonia ? "Yes" : "No",
        label(r.pelotoniaStatus), label(r.travelStatus), r.travelNeeds ?? "", r.hotelBooked ? "Yes" : "No",
        r.hotelName ?? "", r.hotelCheckIn ?? "", r.hotelCheckOut ?? "", label(r.bikeStatus), r.bikePlan ?? "",
        r.bikeConfirmed ? "Yes" : "No", label(r.apparelStatus), r.completion,
        r.raised ?? "", r.goal ?? "", r.committed ?? "", r.allTimeRaised ?? "",
        r.submittedAt ?? "", r.updatedAt,
      ].map(esc).join(","),
    );
    const blob = new Blob([[headers.map(esc).join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rider-progress-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (access.isPending) {
    return (
      <>
        <AppNav />
        <p className="mx-auto max-w-md px-4 py-24 text-center text-sm text-muted-foreground">Checking access…</p>
      </>
    );
  }

  if (!allowed) {
    return (
      <>
        <AppNav />
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-[var(--brand-dark)]" />
          <h1 className="mt-4 text-xl font-bold text-[var(--brand-dark)]">Rider progress is restricted</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This report is limited to captains, co-chairs and super users.
          </p>
          <Button asChild className="mt-6 bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90">
            <Link to="/">Back to the hub</Link>
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-bold text-[var(--brand-dark)]">Rider progress</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Search the roster and see registration, hotel, bike and live fundraising progress.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "People", value: String(totals.people) },
            { label: "Registered", value: `${totals.registered}/${totals.people}` },
            { label: "Hotel booked", value: `${totals.hotel}/${totals.people}` },
            { label: "Bike settled", value: `${totals.bike}/${totals.people}` },
            { label: "Raised (matched)", value: money(totals.raised) },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-lg font-bold text-[var(--brand-dark)]">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-6">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Roster</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search name, email or rider ID"
                  className="w-56 pl-8"
                  aria-label="Search riders"
                />
              </div>
              <Select value={participation} onValueChange={setParticipation}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="rider">Riders</SelectItem>
                  <SelectItem value="volunteer">Volunteers</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                  <SelectItem value="unsure">Unsure</SelectItem>
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any progress</SelectItem>
                  <SelectItem value="registered">Registered</SelectItem>
                  <SelectItem value="not_registered">Not registered</SelectItem>
                  <SelectItem value="no_hotel">No hotel booked</SelectItem>
                  <SelectItem value="no_bike">Bike unresolved</SelectItem>
                  <SelectItem value="no_fundraising">No funds raised</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Sort: Name</SelectItem>
                  <SelectItem value="completion">Sort: Completion</SelectItem>
                  <SelectItem value="raised">Sort: Raised</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
                <Download className="mr-2 h-4 w-4" /> Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading roster…
              </p>
            ) : error ? (
              <p className="py-8 text-sm text-destructive">{(error as Error).message}</p>
            ) : filtered.length === 0 ? (
              <p className="py-8 text-sm text-muted-foreground">No riders match those filters.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead>Hotel</TableHead>
                      <TableHead>Bike</TableHead>
                      <TableHead>Apparel</TableHead>
                      <TableHead className="text-right">Raised</TableHead>
                      <TableHead className="text-right">Goal</TableHead>
                      <TableHead className="text-right">Complete</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r) => (
                      <TableRow key={r.userId}>
                        <TableCell>
                          <div className="font-medium text-[var(--brand-dark)]">{r.name}</div>
                          <div className="text-xs text-muted-foreground">{r.email}</div>
                          {r.riderId && <div className="text-xs text-muted-foreground">ID {r.riderId}</div>}
                        </TableCell>
                        <TableCell className="capitalize">{r.participation ?? "—"}</TableCell>
                        <TableCell><YesNo value={r.registeredWithPelotonia} /></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <YesNo value={r.hotelBooked} />
                            <span className="text-xs text-muted-foreground">{r.hotelName ?? r.travelNeeds ?? ""}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <YesNo value={r.bikeConfirmed} />
                            <span className="text-xs text-muted-foreground">{r.bikePlan ?? ""}</span>
                          </div>
                        </TableCell>
                        <TableCell><StatusBadge status={r.apparelStatus} /></TableCell>
                        <TableCell className="text-right">{money(r.raised)}</TableCell>
                        <TableCell className="text-right">{money(r.goal)}</TableCell>
                        <TableCell className="text-right">{r.completion}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
