import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
import { useAdmin, type Contact } from "@/lib/admin-store";
import { Plus, Pencil, Trash2, Mail, Phone, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/contacts")({
  head: () => ({ meta: [{ title: "Contacts — Super User" }, { name: "description", content: "Support contact directory." }] }),
  component: ContactsAdmin,
});

const blank = (): Contact => ({
  id: `c-${crypto.randomUUID().slice(0, 8)}`,
  name: "", role: "", email: "", phone: "", department: "", region: "All",
  category: "General", hours: "Mon–Fri 9–5 ET", emergency: false, active: true,
  updatedAt: new Date().toISOString(), updatedBy: "Demo Admin",
});

const categories = ["General", "Travel", "Volunteers", "Fundraising", "Apparel", "Emergency"];
const regions = ["All", "Columbus, OH", "Northeast", "Midwest", "Southeast", "West"];

function ContactsAdmin() {
  const { state, setState, audit } = useAdmin();
  const [editing, setEditing] = useState<Contact | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [q, setQ] = useState("");

  const filtered = state.contacts.filter((c) => !q || [c.name, c.role, c.email, c.department, c.category].join(" ").toLowerCase().includes(q.toLowerCase()));

  const save = () => {
    if (!editing) return;
    if (!editing.name.trim()) { toast.error("Name required"); return; }
    const next = { ...editing, updatedAt: new Date().toISOString() };
    setState((s) => {
      const idx = s.contacts.findIndex((c) => c.id === next.id);
      const list = idx >= 0 ? s.contacts.map((c) => c.id === next.id ? next : c) : [...s.contacts, next];
      return { ...s, contacts: list };
    });
    audit({ action: isNew ? "create" : "update", entity: "Contact", entityId: next.id, detail: next.name });
    toast.success("Saved");
    setEditing(null);
  };
  const remove = (c: Contact) => {
    setState((s) => ({ ...s, contacts: s.contacts.filter((x) => x.id !== c.id) }));
    audit({ action: "delete", entity: "Contact", entityId: c.id, detail: c.name });
    toast.success("Deleted");
  };

  return (
    <AdminShell title="Contact directory" description="Support contacts referenced from the Ride Weekend Command Center."
      actions={<Button onClick={() => { setEditing(blank()); setIsNew(true); }} className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90"><Plus className="mr-1 h-4 w-4" /> New contact</Button>}
    >
      <div className="mb-4"><Input placeholder="Search contacts…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" /></div>
      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((c) => (
          <Card key={c.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="font-bold text-[var(--brand-dark)]">{c.name}</p>
                    {c.emergency && <Badge className="bg-red-600 text-white text-[10px]"><ShieldAlert className="mr-1 h-3 w-3" /> Emergency</Badge>}
                    <Badge variant="outline" className="text-[10px]">{c.category}</Badge>
                    {!c.active && <Badge variant="outline" className="text-[10px]">Hidden</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{c.role} · {c.department}</p>
                  <p className="mt-2 text-xs flex items-center gap-1"><Mail className="h-3 w-3" /> {c.email}</p>
                  <p className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" /> {c.phone}</p>
                  <p className="mt-1 text-[10px] uppercase text-muted-foreground">{c.region} · {c.hours}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => { setEditing({ ...c }); setIsNew(false); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button size="sm" variant="ghost" className="text-red-600"><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Delete contact?</AlertDialogTitle></AlertDialogHeader>
                      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => remove(c)} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{isNew ? "New contact" : "Edit contact"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1"><Label>Name</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
              <div className="space-y-1"><Label>Role</Label><Input value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })} /></div>
              <div className="space-y-1"><Label>Email</Label><Input type="email" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></div>
              <div className="space-y-1"><Label>Phone</Label><Input value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></div>
              <div className="space-y-1"><Label>Department</Label><Input value={editing.department} onChange={(e) => setEditing({ ...editing, department: e.target.value })} /></div>
              <div className="space-y-1"><Label>Region</Label>
                <Select value={editing.region} onValueChange={(v) => setEditing({ ...editing, region: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{regions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Category</Label>
                <Select value={editing.category} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Hours</Label><Input value={editing.hours} onChange={(e) => setEditing({ ...editing, hours: e.target.value })} /></div>
              <div className="flex items-center gap-2"><Switch checked={editing.emergency} onCheckedChange={(v) => setEditing({ ...editing, emergency: v })} id="em" /><Label htmlFor="em">Emergency contact</Label></div>
              <div className="flex items-center gap-2"><Switch checked={editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} id="ac" /><Label htmlFor="ac">Active</Label></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
