import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  Archive, ArrowLeft, Download, FileText, History, Pencil, Plus, RotateCcw, Trash2, Upload,
} from "lucide-react";
import { VendorGate, useVendorAccess } from "@/components/VendorGate";

import { VendorForm } from "@/components/VendorForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  archiveVendorAttachment, archiveVendorRecord, deleteVendorAttachment, deleteVendorRecord,
  getVendorAttachment, getVendorRecord, listVendorAudit, logVendorActivity, uploadVendorAttachment,
} from "@/lib/vendors.functions";
import {
  ALLOWED_VENDOR_FILE_TYPES, CONTACT_METHODS, MAX_VENDOR_FILE_BYTES, currency, percent, rollup,
  yearLabel, type VendorDetail,
} from "@/lib/vendors.shared";

export const Route = createFileRoute("/vendors/$id")({
  component: () => (
    <VendorGate>
      <VendorDetailPage />
    </VendorGate>
  ),

  head: () => ({
    meta: [
      { title: "Vendor record — Vendor CRM" },
      { name: "description", content: "Vendor relationship detail: spend, donation commitments, contacts, attachments, and activity history." },
      { property: "og:title", content: "Vendor record — Vendor CRM" },
      { property: "og:description", content: "Spend, donations, contacts, and activity for a Team Huntington vendor." },
    ],
  }),
});

function VendorDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const nav = useNavigate();
  const { data: access } = useVendorAccess();
  const [editing, setEditing] = useState(false);

  const { data: vendor, isPending, error } = useQuery<VendorDetail>({
    queryKey: ["vendor", id],
    queryFn: () => getVendorRecord({ data: { id } }),
  });

  const archive = useMutation({
    mutationFn: (archived: boolean) => archiveVendorRecord({ data: { id, archived } }),
    onSuccess: (_r, archived) => {
      toast.success(archived ? "Vendor archived" : "Vendor restored");
      qc.invalidateQueries({ queryKey: ["vendor", id] });
      qc.invalidateQueries({ queryKey: ["vendors"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const purge = useMutation({
    mutationFn: () => deleteVendorRecord({ data: { id } }),
    onSuccess: () => {
      toast.success("Vendor permanently deleted");
      qc.invalidateQueries({ queryKey: ["vendors"] });
      nav({ to: "/vendors" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isPending) return <p className="px-4 py-20 text-center text-sm text-muted-foreground">Loading vendor…</p>;
  if (error || !vendor) return <p className="px-4 py-20 text-center text-sm text-destructive">{(error as Error)?.message ?? "Vendor not found"}</p>;

  const totals = rollup(vendor.spend, vendor.donations);
  const latest = vendor.activity[0];
  const years = Array.from(new Set([...vendor.spend.map((s) => s.year), ...vendor.donations.map((d) => d.year)])).sort((a, b) => a - b);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3">
        <Link to="/vendors"><ArrowLeft className="mr-1 h-4 w-4" /> Vendor CRM</Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--brand-dark)]">{vendor.business_name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {vendor.status} · {vendor.business_segment || "No segment"}
            {vendor.archived && <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase">Archived</span>}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Last modified {new Date(vendor.updated_at).toLocaleString()}
            {vendor.updated_by_name ? ` by ${vendor.updated_by_name}` : ""} ·{" "}
            <AuditDialog vendorId={id} />
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing((v) => !v)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" /> {editing ? "Close editor" : "Edit vendor"}
          </Button>
          {access?.canArchive && !vendor.archived && (
            <ConfirmButton
              label="Archive" icon={<Archive className="mr-1.5 h-3.5 w-3.5" />}
              title="Archive this vendor?"
              body="Archived vendors are hidden from the default list but keep all spend, donation history, and attachments. They can be restored at any time."
              onConfirm={() => archive.mutate(true)}
            />
          )}
          {access?.canArchive && vendor.archived && (
            <Button variant="outline" size="sm" onClick={() => archive.mutate(false)}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Restore
            </Button>
          )}
          {access?.canPurge && vendor.archived && (
            <ConfirmButton
              destructive label="Delete permanently" icon={<Trash2 className="mr-1.5 h-3.5 w-3.5" />}
              title="Permanently delete this vendor?"
              body="This removes the vendor, its spend and donation history, contacts, activity, and every attachment. This cannot be undone."
              onConfirm={() => purge.mutate()}
            />
          )}
        </div>
      </div>

      {editing ? (
        <div className="mt-6">
          <VendorForm vendor={vendor} onDone={() => setEditing(false)} />
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["Total spend", currency(totals.total_spend)],
              ["Committed", currency(totals.total_committed)],
              ["Donated", currency(totals.total_donated)],
              ["Outstanding", currency(totals.outstanding)],
              ["Fulfillment", percent(totals.fulfillment)],
              ["Support rate", percent(totals.support_rate)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border bg-card p-3">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
                <div className="mt-1 text-base font-bold text-[var(--brand-dark)]">{value}</div>
              </div>
            ))}
          </div>

          <Card className="mt-6">
            <CardHeader className="pb-3"><CardTitle className="text-base">Relationship</CardTitle></CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <Field label="Huntington relationship owner" value={vendor.relationship_owner} />
              <Field label="Secondary owner" value={vendor.secondary_relationship_owner} />
              <Field label="Internal business segment" value={vendor.internal_business_segment} />
              <Field label="Point of contact" value={vendor.primary_contact_name} />
              <Field label="Contact phone" value={vendor.primary_contact_phone} />
              <Field label="Created" value={`${new Date(vendor.created_at).toLocaleDateString()}${vendor.created_by_name ? ` by ${vendor.created_by_name}` : ""}`} />
              {vendor.internal_notes && <Field className="sm:col-span-2" label="Internal notes" value={vendor.internal_notes} />}
              {vendor.general_notes && <Field className="sm:col-span-2" label="General notes" value={vendor.general_notes} />}
            </CardContent>
          </Card>

          {vendor.contacts.length > 0 && (
            <Card className="mt-6">
              <CardHeader className="pb-3"><CardTitle className="text-base">Additional contacts</CardTitle></CardHeader>
              <CardContent>
                <ul className="divide-y text-sm">
                  {vendor.contacts.map((c) => (
                    <li key={c.id} className="py-2">
                      <div className="font-medium">{c.name}{c.title ? ` — ${c.title}` : ""}</div>
                      <div className="text-xs text-muted-foreground">{[c.email, c.phone].filter(Boolean).join(" · ") || "No contact details"}</div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card className="mt-6">
            <CardHeader className="pb-3"><CardTitle className="text-base">Spend & donations by year</CardTitle></CardHeader>
            <CardContent>
              {years.length === 0 ? (
                <p className="text-sm text-muted-foreground">No spend or donation activity recorded yet.</p>
              ) : (
                <Tabs defaultValue={String(years[0])}>
                  <TabsList className="flex-wrap">
                    {years.map((y) => <TabsTrigger key={y} value={String(y)}>{yearLabel(y)}</TabsTrigger>)}
                  </TabsList>
                  {years.map((y) => {
                    const s = vendor.spend.find((r) => r.year === y);
                    const d = vendor.donations.find((r) => r.year === y);
                    const out = (d?.committed_amount ?? 0) - (d?.actual_donated_amount ?? 0);
                    return (
                      <TabsContent key={y} value={String(y)} className="grid gap-3 pt-4 text-sm sm:grid-cols-2">
                        <Field label="Huntington spend" value={currency(s?.amount ?? 0)} />
                        <Field label="Spend notes" value={s?.notes} />
                        <Field label="Committed donation" value={currency(d?.committed_amount ?? 0)} />
                        <Field label="Actually donated" value={currency(d?.actual_donated_amount ?? 0)} />
                        <Field label="Outstanding commitment (calculated)" value={currency(out)} />
                        <Field label="Recipient" value={d?.recipient} />
                        <Field className="sm:col-span-2" label="Donation notes" value={d?.notes} />
                      </TabsContent>
                    );
                  })}
                </Tabs>
              )}
            </CardContent>
          </Card>

          <ActivityCard vendorId={id} latest={latest} history={vendor.activity.slice(1)} />
          <AttachmentsCard vendor={vendor} canArchive={!!access?.canArchive} canPurge={!!access?.canPurge} />
        </>
      )}
    </main>
  );
}

function Field({ label, value, className = "" }: { label: string; value?: string | null; className?: string }) {
  return (
    <div className={className}>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 whitespace-pre-wrap">{value || "—"}</div>
    </div>
  );
}

function ConfirmButton({
  label, title, body, onConfirm, icon, destructive,
}: { label: string; title: string; body: string; onConfirm: () => void; icon?: React.ReactNode; destructive?: boolean }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className={destructive ? "text-destructive hover:bg-destructive/10" : ""}>
          {icon} {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90"}
          >
            {label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function AuditDialog({ vendorId }: { vendorId: string }) {
  const [open, setOpen] = useState(false);
  const { data = [] } = useQuery({
    queryKey: ["vendor-audit", vendorId],
    queryFn: () => listVendorAudit({ data: { id: vendorId } }),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button type="button" className="inline-flex items-center gap-1 underline">
          <History className="h-3 w-3" /> View full activity log
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Activity log</DialogTitle></DialogHeader>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No entries yet.</p>
        ) : (
          <ul className="divide-y text-sm">
            {data.map((row) => (
              <li key={row.id} className="py-2">
                <div className="font-medium capitalize">{row.action.replace(/_/g, " ")}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(row.created_at).toLocaleString()} · {row.actor_email ?? "system"}
                  {Array.isArray(row.details?.fields) && (row.details.fields as string[]).length > 0 &&
                    ` · fields: ${(row.details.fields as string[]).join(", ")}`}
                  {typeof row.details?.file === "string" && ` · ${row.details.file}`}
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ActivityCard({
  vendorId, latest, history,
}: { vendorId: string; latest?: VendorDetail["activity"][number]; history: VendorDetail["activity"] }) {
  const qc = useQueryClient();
  const [showHistory, setShowHistory] = useState(false);
  const [form, setForm] = useState({
    contact_date: new Date().toISOString().slice(0, 10),
    contacted_by: "",
    contact_method: "Email",
    interaction_notes: "",
    next_step: "",
  });

  const add = useMutation({
    mutationFn: () => logVendorActivity({ data: { vendor_id: vendorId, ...form } as any }),
    onSuccess: () => {
      toast.success("Touchpoint logged");
      setForm((f) => ({ ...f, interaction_notes: "", next_step: "" }));
      qc.invalidateQueries({ queryKey: ["vendor", vendorId] });
      qc.invalidateQueries({ queryKey: ["vendor-audit", vendorId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3"><CardTitle className="text-base">Relationship activity</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {latest ? (
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="font-semibold text-[var(--brand-dark)]">
              {new Date(latest.contact_date + "T00:00:00").toLocaleDateString()} · {latest.contact_method}
              {latest.contacted_by ? ` · ${latest.contacted_by}` : ""}
            </div>
            {latest.interaction_notes && <p className="mt-1 whitespace-pre-wrap">{latest.interaction_notes}</p>}
            {latest.next_step && <p className="mt-1 text-xs text-muted-foreground">Next step: {latest.next_step}</p>}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No touchpoints logged yet.</p>
        )}

        {history.length > 0 && (
          <>
            <Button variant="ghost" size="sm" onClick={() => setShowHistory((v) => !v)}>
              {showHistory ? "Hide history" : `View full history (${history.length})`}
            </Button>
            {showHistory && (
              <ul className="divide-y text-sm">
                {history.map((a) => (
                  <li key={a.id} className="py-2">
                    <div className="font-medium">
                      {new Date(a.contact_date + "T00:00:00").toLocaleDateString()} · {a.contact_method}
                      {a.contacted_by ? ` · ${a.contacted_by}` : ""}
                    </div>
                    {a.interaction_notes && <p className="whitespace-pre-wrap text-muted-foreground">{a.interaction_notes}</p>}
                    {a.next_step && <p className="text-xs text-muted-foreground">Next step: {a.next_step}</p>}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        <form
          onSubmit={(e) => { e.preventDefault(); add.mutate(); }}
          className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2"
        >
          <div className="space-y-1.5">
            <Label>Last contact date</Label>
            <Input type="date" value={form.contact_date} onChange={(e) => setForm((f) => ({ ...f, contact_date: e.target.value }))} required />
          </div>
          <div className="space-y-1.5">
            <Label>Contacted by</Label>
            <Input value={form.contacted_by} onChange={(e) => setForm((f) => ({ ...f, contacted_by: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Contact method</Label>
            <Select value={form.contact_method} onValueChange={(v) => setForm((f) => ({ ...f, contact_method: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONTACT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Next step</Label>
            <Input value={form.next_step} onChange={(e) => setForm((f) => ({ ...f, next_step: e.target.value }))} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Interaction notes</Label>
            <Textarea rows={3} value={form.interaction_notes} onChange={(e) => setForm((f) => ({ ...f, interaction_notes: e.target.value }))} />
          </div>
          <div>
            <Button type="submit" size="sm" disabled={add.isPending} className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90">
              <Plus className="mr-1.5 h-3.5 w-3.5" /> {add.isPending ? "Saving…" : "Log touchpoint"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function AttachmentsCard({
  vendor, canArchive, canPurge,
}: { vendor: VendorDetail; canArchive: boolean; canPurge: boolean }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["vendor", vendor.id] });
    qc.invalidateQueries({ queryKey: ["vendor-audit", vendor.id] });
  };

  const upload = async (file: File) => {
    if (file.size > MAX_VENDOR_FILE_BYTES) return toast.error("File must be 15 MB or smaller.");
    if (!(ALLOWED_VENDOR_FILE_TYPES as readonly string[]).includes(file.type)) {
      return toast.error("Unsupported file type. Use PDF, Office, image, or text files.");
    }
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i += 8192) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      }
      await uploadVendorAttachment({
        data: { vendor_id: vendor.id, fileName: file.name, contentType: file.type as any, base64: btoa(binary) },
      });
      toast.success("Attachment uploaded");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const download = async (id: string) => {
    try {
      const res = await getVendorAttachment({ data: { id } });
      const bin = atob(res.base64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([arr], { type: res.contentType }));
      const a = document.createElement("a");
      a.href = url;
      a.download = res.fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const setArchived = useMutation({
    mutationFn: (p: { id: string; archived: boolean }) => archiveVendorAttachment({ data: p }),
    onSuccess: () => { toast.success("Attachment updated"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const purge = useMutation({
    mutationFn: (id: string) => deleteVendorAttachment({ data: { id } }),
    onSuccess: () => { toast.success("Attachment permanently deleted"); refresh(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const visible = vendor.attachments.filter((a) => !a.archived || canArchive);

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3"><CardTitle className="text-base">Attachments</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div>
          <input
            ref={fileRef} type="file" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }}
          />
          <Button variant="outline" size="sm" disabled={busy} onClick={() => fileRef.current?.click()}>
            <Upload className="mr-1.5 h-3.5 w-3.5" /> {busy ? "Uploading…" : "Upload file"}
          </Button>
          <p className="mt-1 text-xs text-muted-foreground">Contracts, W9s, sponsorship agreements, logos. 15 MB max.</p>
        </div>

        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">No attachments yet.</p>
        ) : (
          <ul className="divide-y">
            {visible.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 truncate text-sm font-medium">
                    <FileText className="h-3.5 w-3.5 text-[var(--brand)]" /> {a.file_name}
                    {a.archived && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase">Archived</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {a.uploader_name ?? "Unknown"} · {new Date(a.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => void download(a.id)}>
                    <Download className="mr-1 h-3.5 w-3.5" /> Download
                  </Button>
                  {canArchive && !a.archived && (
                    <Button variant="ghost" size="sm" onClick={() => setArchived.mutate({ id: a.id, archived: true })}>
                      <Archive className="mr-1 h-3.5 w-3.5" /> Archive
                    </Button>
                  )}
                  {canArchive && a.archived && (
                    <Button variant="ghost" size="sm" onClick={() => setArchived.mutate({ id: a.id, archived: false })}>
                      <RotateCcw className="mr-1 h-3.5 w-3.5" /> Restore
                    </Button>
                  )}
                  {canPurge && a.archived && (
                    <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => purge.mutate(a.id)}>
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
