import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/AdminShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Search, UserPlus, Pencil, Trash2, Lock as LockIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  listColleagues, saveColleague, createColleague, deleteColleague,
  type ColleagueRecord, type JsonLike,
} from "@/lib/participants-admin.functions";

export const Route = createFileRoute("/admin/participants")({
  head: () => ({ meta: [
    { title: "Participants — Super User" },
    { name: "description", content: "Add, edit and remove Team Huntington colleague registrations." },
  ] }),
  component: ParticipantsAdmin,
});

type Section = "pelotonia" | "travel" | "bike" | "apparel" | "address";
type FieldDef = { key: string; label: string; type?: "text" | "date" | "bool" | "number" | "select"; options?: string[] };

const STATUS_OPTIONS = ["not_started", "pending", "complete"];

/** Sentinel for "no value" — Radix Select items cannot use an empty string value. */
const NONE = "__none";

const FIELDS: Record<Section, FieldDef[]> = {
  pelotonia: [
    { key: "discountCode", label: "Discount code" },
    { key: "confirmation", label: "Pelotonia Public/Rider ID" },
    { key: "hbNumber", label: "HB number" },
    { key: "employmentType", label: "Salary or hourly", type: "select", options: ["", "salary", "hourly"] },
    { key: "payGrade74Below", label: "Pay grade 74 or below", type: "select", options: ["", "yes", "no"] },
    { key: "highRoller", label: "High Roller", type: "bool" },
    { key: "survivor", label: "Survivor", type: "bool" },
    { key: "completed", label: "Registered with Pelotonia", type: "bool" },
    { key: "status", label: "Step status", type: "select", options: STATUS_OPTIONS },
  ],
  travel: [
    { key: "needs", label: "Travel needs" },
    { key: "departureCity", label: "Departure city" },
    { key: "arrivalDate", label: "Arrival date", type: "date" },
    { key: "arrivalTime", label: "Arrival time" },
    { key: "departureDate", label: "Departure date", type: "date" },
    { key: "departureTime", label: "Departure time" },
    { key: "hotelName", label: "Hotel" },
    { key: "hotelCheckIn", label: "Hotel check-in", type: "date" },
    { key: "hotelCheckOut", label: "Hotel check-out", type: "date" },
    { key: "travelConfirmation", label: "Travel confirmation #" },
    { key: "hotelConfirmation", label: "Hotel confirmation #" },
    { key: "bookLater", label: "Booking later", type: "bool" },
    { key: "notes", label: "Notes" },
    { key: "status", label: "Step status", type: "select", options: STATUS_OPTIONS },
  ],
  bike: [
    { key: "needs", label: "Rental needed" },
    { key: "height", label: "Height" },
    { key: "bikeSize", label: "Bike size" },
    { key: "bikeType", label: "Bike type" },
    { key: "pedals", label: "Pedals" },
    { key: "helmet", label: "Helmet needed", type: "bool" },
    { key: "pickupDate", label: "Pickup date", type: "date" },
    { key: "returnDate", label: "Return date", type: "date" },
    { key: "confirmation", label: "Rental confirmation #" },
    { key: "status", label: "Step status", type: "select", options: STATUS_OPTIONS },
  ],
  apparel: [
    { key: "jerseySize", label: "Jersey size" },
    { key: "jerseyStyle", label: "Jersey style", type: "select", options: ["", "short-sleeve", "sleeveless"] },
    { key: "cut", label: "Jersey cut" },
    { key: "shirtSize", label: "Shirt size" },
    { key: "volunteerShirtSize", label: "Volunteer shirt size" },
    { key: "volunteerCut", label: "Volunteer cut" },
    { key: "status", label: "Step status", type: "select", options: STATUS_OPTIONS },
  ],
  address: [
    { key: "name", label: "Recipient name" },
    { key: "street", label: "Street" },
    { key: "unit", label: "Unit/Apt" },
    { key: "city", label: "City" },
    { key: "state", label: "State" },
    { key: "zip", label: "ZIP" },
    { key: "country", label: "Country" },
    { key: "type", label: "Address type" },
    { key: "confirmed", label: "Confirmed", type: "bool" },
  ],
};

const PARTICIPATION = ["rider", "volunteer", "both", "unsure"] as const;

function completionOf(r: ColleagueRecord) {
  const statuses = [r.pelotonia.status, r.travel.status, r.bike.status, r.apparel.status];
  return Math.round((statuses.filter((s) => s === "complete").length / 4) * 100);
}

function ParticipantsAdmin() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [participationFilter, setParticipationFilter] = useState("all");
  const [editing, setEditing] = useState<ColleagueRecord | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ColleagueRecord | null>(null);

  const { data: rows = [], isLoading, error } = useQuery<ColleagueRecord[]>({
    queryKey: ["admin-colleagues"],
    queryFn: () => listColleagues(),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-colleagues"] });

  const remove = useMutation({
    mutationFn: (v: { user_id: string; mode: "registration" | "account" }) => deleteColleague({ data: v }),
    onSuccess: (r) => {
      toast.success(r.mode === "account" ? "Colleague account deleted" : "Registration deleted");
      setConfirmDelete(null);
      invalidate();
    },
    onError: (e: Error) => toast.error("Couldn't delete", { description: e.message }),
  });

  const filtered = useMemo(() => rows.filter((r) => {
    if (participationFilter !== "all" && (r.participation ?? "unsure") !== participationFilter) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return (r.full_name ?? "").toLowerCase().includes(s)
      || r.email.toLowerCase().includes(s)
      || String(r.pelotonia.confirmation ?? "").toLowerCase().includes(s)
      || String(r.pelotonia.hbNumber ?? "").toLowerCase().includes(s);
  }), [rows, q, participationFilter]);

  const exportCsv = () => {
    const headers = [
      "email", "name", "participation", "completion", "riderId", "hbNumber", "employmentType",
      "payGrade74Below", "highRoller", "survivor", "arrivalDate", "hotelName", "bikeType",
      "jerseySize", "jerseyStyle", "shirtSize", "city", "state", "zip", "seasonLocked",
    ];
    const body = filtered.map((r) => [
      r.email, r.full_name ?? "", r.participation ?? "", `${completionOf(r)}%`,
      r.pelotonia.confirmation ?? "", r.pelotonia.hbNumber ?? "", r.pelotonia.employmentType ?? "",
      r.pelotonia.payGrade74Below ?? "", r.pelotonia.highRoller ?? "", r.pelotonia.survivor ?? "",
      r.travel.arrivalDate ?? "", r.travel.hotelName ?? "", r.bike.bikeType ?? "",
      r.apparel.jerseySize ?? "", r.apparel.jerseyStyle ?? "", r.apparel.shirtSize ?? "",
      r.address.city ?? "", r.address.state ?? "", r.address.zip ?? "", r.season_locked,
    ]);
    const csv = [headers, ...body].map((line) => line.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `team-huntington-participants-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  return (
    <AdminShell
      title="Participants"
      description="Add colleagues, edit every field of their registration, and remove records. Changes are written straight to the live roster."
      actions={
        <div className="flex items-center gap-2">
          <Button onClick={() => setAdding(true)} className="bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90">
            <UserPlus className="mr-1 h-4 w-4" /> Add participant
          </Button>
          <Button variant="outline" onClick={exportCsv}>
            <Download className="mr-1 h-4 w-4" /> Export CSV
          </Button>
        </div>
      }
    >
      {error && <p className="mb-4 text-sm text-destructive">{(error as Error).message}</p>}

      <Card className="mb-4">
        <CardContent className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative min-w-0">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, Rider ID or HB number" className="pl-8" />
          </div>
          <Select value={participationFilter} onValueChange={setParticipationFilter}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All participation</SelectItem>
              {PARTICIPATION.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colleague</TableHead>
                <TableHead>Participation</TableHead>
                <TableHead>Rider ID / HB</TableHead>
                <TableHead className="text-right">Completion</TableHead>
                <TableHead className="text-right">Manage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                </TableCell></TableRow>
              )}
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No colleagues match those filters.</TableCell></TableRow>
              )}
              {filtered.map((r) => (
                <TableRow key={r.user_id}>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[var(--brand-dark)]">{r.full_name ?? "(no name)"}</p>
                      <p className="truncate text-xs text-muted-foreground">{r.email}</p>
                      {r.season_locked && (
                        <Badge variant="outline" className="mt-1 text-[9px]"><LockIcon className="mr-1 h-2.5 w-2.5" /> Season-locked</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{r.participation ?? "unsure"}</Badge></TableCell>
                  <TableCell className="text-xs">
                    <span className="block">{String(r.pelotonia.confirmation ?? "—")}</span>
                    <span className="block text-muted-foreground">{String(r.pelotonia.hbNumber ?? "—")}</span>
                  </TableCell>
                  <TableCell className="text-right font-bold">{completionOf(r)}%</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" aria-label={`Edit ${r.email}`} onClick={() => setEditing(r)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" aria-label={`Delete ${r.email}`} onClick={() => setConfirmDelete(r)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editing && (
        <EditDialog record={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); invalidate(); }} />
      )}
      {adding && <AddDialog onClose={() => setAdding(false)} onSaved={() => { setAdding(false); invalidate(); }} />}

      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {confirmDelete?.full_name ?? confirmDelete?.email}?</DialogTitle>
            <DialogDescription>
              Delete just their registration record, or remove their account from the hub entirely. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={remove.isPending}
                onClick={() => confirmDelete && remove.mutate({ user_id: confirmDelete.user_id, mode: "registration" })}
              >
                Registration only
              </Button>
              <Button
                variant="destructive"
                disabled={remove.isPending}
                onClick={() => confirmDelete && remove.mutate({ user_id: confirmDelete.user_id, mode: "account" })}
              >
                Delete account
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}

function EditDialog({ record, onClose, onSaved }: { record: ColleagueRecord; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(record.full_name ?? "");
  const [participation, setParticipation] = useState(record.participation ?? "unsure");
  const [regId, setRegId] = useState(record.reg_id ?? "");
  const [locked, setLocked] = useState(record.season_locked);
  const [sections, setSections] = useState<Record<Section, JsonLike>>({
    pelotonia: { ...record.pelotonia },
    travel: { ...record.travel },
    bike: { ...record.bike },
    apparel: { ...record.apparel },
    address: { ...record.address },
  });

  const setField = (section: Section, key: string, value: string | boolean) =>
    setSections((s) => ({ ...s, [section]: { ...s[section], [key]: value } }));

  const save = useMutation({
    mutationFn: () =>
      saveColleague({
        data: {
          user_id: record.user_id,
          full_name: name.trim() || undefined,
          participation: participation as "rider" | "volunteer" | "both" | "unsure",
          reg_id: regId.trim() || null,
          season_locked: locked,
          ...sections,
        },
      }),
    onSuccess: () => { toast.success("Participant updated"); onSaved(); },
    onError: (e: Error) => toast.error("Couldn't save", { description: e.message }),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {record.email}</DialogTitle>
          <DialogDescription>Every registration field is editable here. Saving stamps the colleague's audit trail.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="e-name">Full name</Label>
            <Input id="e-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Participation</Label>
            <Select value={participation} onValueChange={setParticipation}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PARTICIPATION.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-reg">Registration ID</Label>
            <Input id="e-reg" value={regId} onChange={(e) => setRegId(e.target.value)} placeholder="HUNT-…" />
          </div>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <Checkbox checked={locked} onCheckedChange={(v) => setLocked(v === true)} />
            Season-locked (survives the end-of-season reset)
          </label>
        </div>

        <Tabs defaultValue="pelotonia" className="mt-2">
          <TabsList className="flex w-full flex-wrap">
            <TabsTrigger value="pelotonia">Pelotonia</TabsTrigger>
            <TabsTrigger value="travel">Travel</TabsTrigger>
            <TabsTrigger value="bike">Bike</TabsTrigger>
            <TabsTrigger value="apparel">Apparel</TabsTrigger>
            <TabsTrigger value="address">Mailing</TabsTrigger>
          </TabsList>
          {(Object.keys(FIELDS) as Section[]).map((section) => (
            <TabsContent key={section} value={section} className="mt-4 grid gap-4 sm:grid-cols-2">
              {FIELDS[section].map((f) => {
                const raw = sections[section][f.key];
                const id = `${section}-${f.key}`;
                if (f.type === "bool") {
                  return (
                    <label key={f.key} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={raw === true} onCheckedChange={(v) => setField(section, f.key, v === true)} />
                      {f.label}
                    </label>
                  );
                }
                if (f.type === "select") {
                  const current = String(raw ?? "");
                  return (
                    <div key={f.key} className="space-y-1.5">
                      <Label htmlFor={id}>{f.label}</Label>
                      <Select
                        value={current === "" ? NONE : current}
                        onValueChange={(v) => setField(section, f.key, v === NONE ? "" : v)}
                      >
                        <SelectTrigger id={id}><SelectValue placeholder="Not set" /></SelectTrigger>
                        <SelectContent>
                          {(f.options ?? []).map((o) => (
                            <SelectItem key={o || NONE} value={o === "" ? NONE : o}>
                              {o === "" ? "Not set" : o.replace(/_/g, " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                }
                return (
                  <div key={f.key} className="space-y-1.5">
                    <Label htmlFor={id}>{f.label}</Label>
                    <Input
                      id={id}
                      type={f.type === "date" ? "date" : "text"}
                      value={String(raw ?? "")}
                      onChange={(e) => setField(section, f.key, e.target.value)}
                    />
                  </div>
                );
              })}
            </TabsContent>
          ))}
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90"
          >
            {save.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [participation, setParticipation] = useState<(typeof PARTICIPATION)[number]>("rider");
  const [locked, setLocked] = useState(false);

  const create = useMutation({
    mutationFn: () => createColleague({ data: { email, full_name: fullName, participation, season_locked: locked } }),
    onSuccess: (r) => { toast.success("Participant added", { description: r.email }); onSaved(); },
    onError: (e: Error) => toast.error("Couldn't add participant", { description: e.message }),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a participant</DialogTitle>
          <DialogDescription>Creates their hub account and an empty registration you can edit right away.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
          <div className="space-y-1.5">
            <Label htmlFor="a-email">Huntington email</Label>
            <Input id="a-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="first.last@huntington.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="a-name">Full name</Label>
            <Input id="a-name" required minLength={2} value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Participation</Label>
            <Select value={participation} onValueChange={(v) => setParticipation(v as typeof participation)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PARTICIPATION.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={locked} onCheckedChange={(v) => setLocked(v === true)} />
            Season-locked (never cleared by the season reset)
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={create.isPending} className="bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90">
              {create.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Add participant
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
