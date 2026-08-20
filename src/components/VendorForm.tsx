import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { saveVendorRecord } from "@/lib/vendors.functions";
import {
  BUSINESS_SEGMENTS, DEFAULT_YEARS, MAX_ADDITIONAL_CONTACTS, VENDOR_STATUSES,
  vendorInputSchema, yearLabel, type VendorDetail,
} from "@/lib/vendors.shared";

type ContactDraft = { name: string; email: string; title: string; phone: string };
type SpendDraft = { year: number; amount: string; notes: string };
type DonationDraft = { year: number; committed_amount: string; actual_donated_amount: string; recipient: string; notes: string };

function buildYearDrafts(vendor?: VendorDetail) {
  const years = Array.from(
    new Set([...DEFAULT_YEARS, ...(vendor?.spend ?? []).map((s) => s.year), ...(vendor?.donations ?? []).map((d) => d.year)]),
  ).sort((a, b) => a - b);
  const spend: SpendDraft[] = years.map((y) => {
    const row = vendor?.spend.find((s) => s.year === y);
    return { year: y, amount: row ? String(row.amount) : "", notes: row?.notes ?? "" };
  });
  const donations: DonationDraft[] = years.map((y) => {
    const row = vendor?.donations.find((d) => d.year === y);
    return {
      year: y,
      committed_amount: row ? String(row.committed_amount) : "",
      actual_donated_amount: row ? String(row.actual_donated_amount) : "",
      recipient: row?.recipient ?? "",
      notes: row?.notes ?? "",
    };
  });
  return { years, spend, donations };
}

export function VendorForm({ vendor, onDone }: { vendor?: VendorDetail; onDone?: () => void }) {
  const qc = useQueryClient();
  const nav = useNavigate();
  const initial = buildYearDrafts(vendor);

  const [core, setCore] = useState({
    business_name: vendor?.business_name ?? "",
    status: vendor?.status ?? "Prospect",
    business_segment: vendor?.business_segment ?? "",
    internal_business_segment: vendor?.internal_business_segment ?? "",
    relationship_owner: vendor?.relationship_owner ?? "",
    secondary_relationship_owner: vendor?.secondary_relationship_owner ?? "",
    internal_notes: vendor?.internal_notes ?? "",
    primary_contact_name: vendor?.primary_contact_name ?? "",
    primary_contact_phone: vendor?.primary_contact_phone ?? "",
    general_notes: vendor?.general_notes ?? "",
  });
  const [contacts, setContacts] = useState<ContactDraft[]>(
    (vendor?.contacts ?? []).map((c) => ({ name: c.name, email: c.email ?? "", title: c.title ?? "", phone: c.phone ?? "" })),
  );
  const [spend, setSpend] = useState<SpendDraft[]>(initial.spend);
  const [donations, setDonations] = useState<DonationDraft[]>(initial.donations);
  const [newYear, setNewYear] = useState("");
  const [dupes, setDupes] = useState<string[] | null>(null);

  const set = (k: keyof typeof core, v: string) => setCore((c) => ({ ...c, [k]: v }));
  const num = (v: string) => (v.trim() === "" ? 0 : Number(v));

  const payload = (confirmDuplicate: boolean) => ({
    ...(vendor?.id ? { id: vendor.id } : {}),
    ...core,
    contacts: contacts.filter((c) => c.name.trim()),
    spend: spend.map((s) => ({ year: s.year, amount: num(s.amount), notes: s.notes })),
    donations: donations.map((d) => ({
      year: d.year,
      committed_amount: num(d.committed_amount),
      actual_donated_amount: num(d.actual_donated_amount),
      recipient: d.recipient,
      notes: d.notes,
    })),
    confirmDuplicate,
  });

  const save = useMutation({
    mutationFn: (confirmDuplicate: boolean) => saveVendorRecord({ data: payload(confirmDuplicate) as any }),
    onSuccess: (res) => {
      if (res.duplicates?.length) {
        setDupes(res.duplicates);
        return;
      }
      toast.success(vendor ? "Vendor updated" : "Vendor created");
      qc.invalidateQueries({ queryKey: ["vendors"] });
      qc.invalidateQueries({ queryKey: ["vendor", res.id] });
      if (onDone) onDone();
      else nav({ to: "/vendors/$id", params: { id: res.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const parsed = vendorInputSchema.safeParse(payload(false));
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    save.mutate(false);
  };

  const addYear = () => {
    const y = Number(newYear);
    if (!Number.isInteger(y) || y < 2000 || y > 2100) return toast.error("Enter a four-digit year");
    if (spend.some((s) => s.year === y)) return toast.error("That year is already listed");
    setSpend((rows) => [...rows, { year: y, amount: "", notes: "" }].sort((a, b) => a.year - b.year));
    setDonations((rows) =>
      [...rows, { year: y, committed_amount: "", actual_donated_amount: "", recipient: "", notes: "" }].sort(
        (a, b) => a.year - b.year,
      ),
    );
    setNewYear("");
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Core information</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="business_name">Business name *</Label>
            <Input id="business_name" value={core.business_name} onChange={(e) => set("business_name", e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Status *</Label>
            <Select value={core.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {VENDOR_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Business segment (vendor serves)</Label>
            <Select value={core.business_segment || "none"} onValueChange={(v) => set("business_segment", v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not specified</SelectItem>
                {BUSINESS_SEGMENTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Internal relationship ownership</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="owner">Huntington relationship owner</Label>
            <Input id="owner" value={core.relationship_owner} onChange={(e) => set("relationship_owner", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="owner2">Secondary relationship owner</Label>
            <Input id="owner2" value={core.secondary_relationship_owner} onChange={(e) => set("secondary_relationship_owner", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Internal business segment (owns relationship)</Label>
            <Select
              value={core.internal_business_segment || "none"}
              onValueChange={(v) => set("internal_business_segment", v === "none" ? "" : v)}
            >
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not specified</SelectItem>
                {BUSINESS_SEGMENTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="internal_notes">Internal notes / how to reach the owner</Label>
            <Textarea id="internal_notes" rows={3} value={core.internal_notes} onChange={(e) => set("internal_notes", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Contacts</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="poc">Point of contact name *</Label>
              <Input id="poc" value={core.primary_contact_name} onChange={(e) => set("primary_contact_name", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pocphone">Point of contact phone</Label>
              <Input id="pocphone" type="tel" placeholder="(614) 555-0123" value={core.primary_contact_phone} onChange={(e) => set("primary_contact_phone", e.target.value)} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Additional contacts ({contacts.length}/{MAX_ADDITIONAL_CONTACTS})</p>
              <Button
                type="button" variant="outline" size="sm"
                disabled={contacts.length >= MAX_ADDITIONAL_CONTACTS}
                onClick={() => setContacts((c) => [...c, { name: "", email: "", title: "", phone: "" }])}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add contact
              </Button>
            </div>
            {contacts.map((c, i) => (
              <div key={i} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-4">
                <Input placeholder="Name" value={c.name} onChange={(e) => setContacts((rows) => rows.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)))} />
                <Input type="email" placeholder="Email" value={c.email} onChange={(e) => setContacts((rows) => rows.map((r, j) => (j === i ? { ...r, email: e.target.value } : r)))} />
                <Input placeholder="Title" value={c.title} onChange={(e) => setContacts((rows) => rows.map((r, j) => (j === i ? { ...r, title: e.target.value } : r)))} />
                <div className="flex gap-2">
                  <Input type="tel" placeholder="Phone" value={c.phone} onChange={(e) => setContacts((rows) => rows.map((r, j) => (j === i ? { ...r, phone: e.target.value } : r)))} />
                  <Button type="button" variant="ghost" size="icon" aria-label="Remove contact" onClick={() => setContacts((rows) => rows.filter((_, j) => j !== i))}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Spend & donations by year</CardTitle></CardHeader>
        <CardContent>
          <Tabs defaultValue={String(spend[0]?.year ?? 2024)}>
            <TabsList className="flex-wrap">
              {spend.map((s) => <TabsTrigger key={s.year} value={String(s.year)}>{yearLabel(s.year)}</TabsTrigger>)}
            </TabsList>
            {spend.map((s, i) => {
              const d = donations[i]!;
              const outstanding = num(d.committed_amount) - num(d.actual_donated_amount);
              return (
                <TabsContent key={s.year} value={String(s.year)} className="space-y-4 pt-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Huntington spend ($)</Label>
                      <Input type="number" min={0} step="0.01" value={s.amount} onChange={(e) => setSpend((rows) => rows.map((r, j) => (j === i ? { ...r, amount: e.target.value } : r)))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Spend notes</Label>
                      <Input value={s.notes} onChange={(e) => setSpend((rows) => rows.map((r, j) => (j === i ? { ...r, notes: e.target.value } : r)))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Committed donation ($)</Label>
                      <Input type="number" min={0} step="0.01" value={d.committed_amount} onChange={(e) => setDonations((rows) => rows.map((r, j) => (j === i ? { ...r, committed_amount: e.target.value } : r)))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Actually donated ($)</Label>
                      <Input type="number" min={0} step="0.01" value={d.actual_donated_amount} onChange={(e) => setDonations((rows) => rows.map((r, j) => (j === i ? { ...r, actual_donated_amount: e.target.value } : r)))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Recipient</Label>
                      <Input value={d.recipient} onChange={(e) => setDonations((rows) => rows.map((r, j) => (j === i ? { ...r, recipient: e.target.value } : r)))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Donation notes</Label>
                      <Input value={d.notes} onChange={(e) => setDonations((rows) => rows.map((r, j) => (j === i ? { ...r, notes: e.target.value } : r)))} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Outstanding commitment for {yearLabel(s.year)}:{" "}
                    <span className="font-semibold text-[var(--brand-dark)]">${outstanding.toLocaleString()}</span> (calculated)
                  </p>
                </TabsContent>
              );
            })}
          </Tabs>
          <div className="mt-4 flex items-end gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="newyear">Add another year</Label>
              <Input id="newyear" inputMode="numeric" placeholder="2028" value={newYear} onChange={(e) => setNewYear(e.target.value)} className="w-28" />
            </div>
            <Button type="button" variant="outline" onClick={addYear}>Add year</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">General notes</CardTitle></CardHeader>
        <CardContent>
          <Textarea rows={5} value={core.general_notes} onChange={(e) => set("general_notes", e.target.value)} placeholder="Relationship history, sponsorship context, anything vendor-level." />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={save.isPending} className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90">
          {save.isPending ? "Saving…" : vendor ? "Save changes" : "Create vendor"}
        </Button>
        {onDone && <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>}
      </div>

      <AlertDialog open={dupes !== null} onOpenChange={(o) => !o && setDupes(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Possible duplicate vendor</AlertDialogTitle>
            <AlertDialogDescription>
              A vendor named “{dupes?.[0]}” already exists — are you sure you want to create a new record?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDupes(null)}>Go back</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setDupes(null); save.mutate(true); }}
              className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90"
            >
              Create anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
