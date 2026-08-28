import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppNav } from "@/components/AppNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Search, ShieldAlert, Check, X, Loader2, Pencil } from "lucide-react";
import {
  getRiderProgressAccess,
  listRiderProgress,
  updateRiderId,
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

function RiderIdCell({ row, canEdit }: { row: RiderProgressRow; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(row.riderId ?? "");
  const queryClient = useQueryClient();
  const save = useServerFn(updateRiderId);

  const mutation = useMutation({
    mutationFn: (riderId: string) => save({ data: { userId: row.userId, riderId } }),
    onSuccess: () => {
      toast.success("Rider ID updated");
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["rider-progress"] });
    },
    onError: (e: unknown) => toast.error((e as Error).message || "Could not update rider ID"),
  });

  if (!canEdit) {
    return row.riderId ? <div className="text-xs text-muted-foreground">ID {row.riderId}</div> : null;
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(row.riderId ?? "");
          setEditing(true);
        }}
        className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-[var(--brand-dark)]"
      >
        <Pencil className="h-3 w-3" />
        {row.riderId ? `ID ${row.riderId}` : "Add rider ID"}
      </button>
    );
  }

  return (
    <div className="mt-1 flex items-center gap-1">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Rider ID"
        className="h-7 w-28 text-xs"
        aria-label={`Rider ID for ${row.name}`}
        autoFocus
      />
      <Button
        size="sm"
        className="h-7 px-2"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate(value.trim())}
      >
        {mutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
      </Button>
      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditing(false)}>
        Cancel
      </Button>
    </div>
  );
}

type SortKey = "name" | "completion" | "raised" | "subPeloton";

function RiderProgressPage() {
  const access = useQuery({ queryKey: ["rider-progress-access"], queryFn: () => getRiderProgressAccess(), retry: false });
  const allowed = !!access.data?.allowed;
  const canEditRiderId = (access.data?.roles ?? []).includes("superuser");

  const { data: rawRows = [], isLoading, error } = useQuery<RiderProgressRow[]>({
    queryKey: ["rider-progress"],
    queryFn: () => listRiderProgress(),
    enabled: allowed,
    staleTime: 5 * 60_000,
  });

  // Older cached payloads can miss the list fields; normalize so spreads/joins are always safe.
  const rows = useMemo<RiderProgressRow[]>(
    () =>
      (rawRows ?? []).map((r) => ({
        ...r,
        tags: Array.isArray(r.tags) ? r.tags : [],
        registrationTypes: Array.isArray(r.registrationTypes) ? r.registrationTypes : [],
      })),
    [rawRows],
  );

  const [q, setQ] = useState("");
  const [participation, setParticipation] = useState("all");
  const [status, setStatus] = useState("all");
  const [peloton, setPeloton] = useState("all");
  const [route, setRoute] = useState("all");
  const [sort, setSort] = useState<SortKey>("name");

  const pelotonOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.subPeloton).filter((v): v is string => !!v))).sort(),
    [rows],
  );
  const routeOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.rideRoute).filter((v): v is string => !!v))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const out = rows.filter((r) => {
      const haystack = [r.name, r.email, r.riderId ?? "", r.subPeloton ?? "", r.rideRoute ?? "", ...(r.tags ?? [])];
      if (needle && !haystack.some((v) => v.toLowerCase().includes(needle))) return false;
      if (participation !== "all" && r.participation !== participation) return false;
      if (peloton !== "all" && r.subPeloton !== peloton) return false;
      if (route !== "all" && r.rideRoute !== route) return false;
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
      if (sort === "subPeloton") return (a.subPeloton ?? "zzz").localeCompare(b.subPeloton ?? "zzz");
      return a.name.localeCompare(b.name);
    });
  }, [rows, q, participation, status, peloton, route, sort]);

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
      "Name", "Email", "Participation", "Rider ID", "Pelotonia name", "Sub-peloton / team",
      "Route", "Ride type", "Registration types", "Tags", "Captain", "Challenger",
      "Rider (Pelotonia)", "Volunteer (Pelotonia)", "Survivor", "High roller",
      "Registered with Pelotonia", "Registration step",
      "Travel step", "Travel needs", "Hotel booked", "Hotel", "Hotel check-in", "Hotel check-out",
      "Bike step", "Bike plan", "Bike type", "Bike size", "Pedals", "Bike confirmed",
      "Apparel step", "Jersey style", "Jersey size", "Completion %",
      "Raised", "Fundraising goal", "Personal goal", "Committed", "All-time raised", "Submitted", "Last updated",
    ];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const yn = (v: boolean) => (v ? "Yes" : "No");
    const lines = filtered.map((r) =>
      [
        r.name, r.email, r.participation ?? "", r.riderId ?? "", r.pelotoniaName ?? "", r.subPeloton ?? "",
        r.rideRoute ?? "", r.rideType ?? "", (r.registrationTypes ?? []).join("; "), (r.tags ?? []).join("; "),
        yn(r.isCaptain), yn(r.isChallenger), yn(r.isRiderOnPelotonia), yn(r.isVolunteerOnPelotonia),
        yn(r.isSurvivor), yn(r.highRoller),
        yn(r.registeredWithPelotonia),
        label(r.pelotoniaStatus), label(r.travelStatus), r.travelNeeds ?? "", yn(r.hotelBooked),
        r.hotelName ?? "", r.hotelCheckIn ?? "", r.hotelCheckOut ?? "", label(r.bikeStatus), r.bikePlan ?? "",
        r.bikeType ?? "", r.bikeSize ?? "", r.pedals ?? "", yn(r.bikeConfirmed),
        label(r.apparelStatus), r.jerseyStyle ?? "", r.jerseySize ?? "", r.completion,
        r.raised ?? "", r.goal ?? "", r.personalGoal ?? "", r.committed ?? "", r.allTimeRaised ?? "",
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
              {pelotonOptions.length > 0 && (
                <Select value={peloton} onValueChange={setPeloton}>
                  <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sub-pelotons</SelectItem>
                    {pelotonOptions.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {routeOptions.length > 0 && (
                <Select value={route} onValueChange={setRoute}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All routes</SelectItem>
                    {routeOptions.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Sort: Name</SelectItem>
                  <SelectItem value="subPeloton">Sort: Sub-peloton</SelectItem>
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
                      <TableHead>Sub-peloton</TableHead>
                      <TableHead>Ride</TableHead>
                      <TableHead>Tags</TableHead>
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
                          <RiderIdCell row={r} canEdit={canEditRiderId} />
                        </TableCell>
                        <TableCell className="capitalize">{r.participation ?? "—"}</TableCell>
                        <TableCell className="max-w-[14rem]">
                          <span className="text-xs text-muted-foreground">{r.subPeloton ?? "—"}</span>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-muted-foreground">
                            {r.rideRoute || r.rideType || (r.registrationTypes ?? []).join(", ") || "—"}
                          </div>
                          {r.rideRoute && r.rideType && (
                            <div className="text-[11px] text-muted-foreground/80">{r.rideType}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex max-w-[16rem] flex-wrap gap-1">
                            {[
                              ...(r.isCaptain ? ["Captain"] : []),
                              ...(r.isChallenger ? ["Challenger"] : []),
                              ...(r.isSurvivor ? ["Survivor"] : []),
                              ...(r.highRoller ? ["High roller"] : []),
                              ...(r.tags ?? []),
                            ].map((t) => (
                              <Badge key={t} variant="outline" className="text-[10px] font-normal">
                                {t}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
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
                            <span className="text-xs text-muted-foreground">
                              {[r.bikePlan, r.bikeType, r.bikeSize && `Size ${r.bikeSize}`].filter(Boolean).join(" · ")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={r.apparelStatus} />
                          {(r.jerseyStyle || r.jerseySize) && (
                            <div className="mt-1 text-[11px] text-muted-foreground">
                              {[r.jerseyStyle?.replace("-", " "), r.jerseySize].filter(Boolean).join(" · ")}
                            </div>
                          )}
                        </TableCell>
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
