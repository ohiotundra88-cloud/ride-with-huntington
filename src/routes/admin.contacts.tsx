import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/AdminShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Mail, Phone, ShieldAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { deleteContact, listContacts, saveContact } from "@/lib/contacts.functions";
import {
  blankContactInput, CONTACT_CATEGORIES, CONTACT_REGIONS, contactInputSchema,
  type ContactInput, type DirectoryContact,
  contactsQueryKey,
} from "@/lib/contacts.shared";

export const Route = createFileRoute("/admin/contacts")({
  head: () => ({ meta: [{ title: "Contacts — Super User" }, { name: "description", content: "Support contact directory." }] }),
  component: ContactsAdmin,
});



function ContactsAdmin() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ContactInput | null>(null);
  const [q, setQ] = useState("");

  const { data: contacts = [], isPending, error } = useQuery<DirectoryContact[]>({
    queryKey: contactsQueryKey,
    queryFn: () => listContacts(),
  });

  const filtered = contacts.filter(
    (c) => !q || [c.name, c.role, c.email, c.department, c.category].join(" ").toLowerCase().includes(q.toLowerCase()),
  );

  const invalidate = () => qc.invalidateQueries({ queryKey: contactsQueryKey });

  const save = useMutation({
    mutationFn: () => saveContact({ data: { id: editingId, values: form! } }),
    onSuccess: () => { toast.success("Saved"); setForm(null); setEditingId(null); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Couldn't save that contact."),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteContact({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Couldn't delete that contact."),
  });

  const startEdit = (c: DirectoryContact) => {
    setEditingId(c.id);
    setForm({
      name: c.name, role: c.role, email: c.email, phone: c.phone, department: c.department,
      region: c.region, category: c.category, hours: c.hours, emergency: c.emergency, active: c.active,
    });
  };

  const submit = () => {
    if (!form) return;
    const parsed = contactInputSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form.");
      return;
    }
    save.mutate();
  };

  return (
    <AdminShell title="Contact directory" description="Shared support contacts referenced from the Ride Weekend Command Center. Everyone signed in sees the same list."
      actions={<Button onClick={() => { setForm(blankContactInput()); setEditingId(null); }} className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90"><Plus className="mr-1 h-4 w-4" /> New contact</Button>}
    >
      <div className="mb-4"><Input placeholder="Search contacts…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" /></div>

      {isPending && <p className="text-sm text-muted-foreground">Loading contacts…</p>}
      {error && <p className="text-sm text-destructive">We couldn't load the contact directory.</p>}
      {!isPending && !error && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">No contacts match that search.</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((c) => (
          <Card key={c.id}>
            <CardContent className="p-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="font-bold text-[var(--brand-dark)]">{c.name}</p>
                    {c.emergency && <Badge className="bg-red-600 text-white text-[10px]"><ShieldAlert className="mr-1 h-3 w-3" /> Emergency</Badge>}
                    <Badge variant="outline" className="text-[10px]">{c.category}</Badge>
                    {!c.active && <Badge variant="outline" className="text-[10px]">Hidden</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{[c.role, c.department].filter(Boolean).join(" · ")}</p>
                  {c.email && <p className="mt-2 flex items-center gap-1 text-xs break-all"><Mail className="h-3 w-3 shrink-0" /> {c.email}</p>}
                  {c.phone && <p className="flex items-center gap-1 text-xs"><Phone className="h-3 w-3 shrink-0" /> {c.phone}</p>}
                  <p className="mt-1 text-[10px] uppercase text-muted-foreground">{[c.region, c.hours].filter(Boolean).join(" · ")}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Updated {new Date(c.updated_at).toLocaleString()}{c.updated_by_email ? ` by ${c.updated_by_email}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="ghost" aria-label={`Edit ${c.name}`} onClick={() => startEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button size="sm" variant="ghost" aria-label={`Delete ${c.name}`} className="text-red-600"><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Delete {c.name}?</AlertDialogTitle></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => remove.mutate(c.id)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!form} onOpenChange={(o) => !o && (setForm(null), setEditingId(null))}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editingId ? "Edit contact" : "New contact"}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1"><Label htmlFor="c-name">Name</Label><Input id="c-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="space-y-1"><Label htmlFor="c-role">Role</Label><Input id="c-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} /></div>
              <div className="space-y-1"><Label htmlFor="c-email">Email</Label><Input id="c-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-1"><Label htmlFor="c-phone">Phone</Label><Input id="c-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="space-y-1"><Label htmlFor="c-dept">Department</Label><Input id="c-dept" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
              <div className="space-y-1"><Label>Region</Label>
                <Select value={form.region} onValueChange={(v) => setForm({ ...form, region: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CONTACT_REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CONTACT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label htmlFor="c-hours">Hours</Label><Input id="c-hours" value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={form.emergency} onCheckedChange={(v) => setForm({ ...form, emergency: v })} id="em" /><Label htmlFor="em">Emergency contact</Label></div>
              <div className="flex items-center gap-2"><Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} id="ac" /><Label htmlFor="ac">Active</Label></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setForm(null); setEditingId(null); }}>Cancel</Button>
            <Button onClick={submit} disabled={save.isPending} className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90">
              {save.isPending ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Saving…</> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
