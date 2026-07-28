import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [
    { title: "Profile — Team Huntington Hub" },
    { name: "description", content: "Review and update your Team Huntington colleague profile." },
  ] }),
  component: ProfilePage,
});

const segments = [
  "Consumer & Business Banking", "Commercial Banking", "Wealth Management",
  "Technology", "Risk", "Marketing", "Human Resources", "Operations",
];
const markets = [
  "Columbus, OH", "Cleveland, OH", "Cincinnati, OH", "Detroit, MI",
  "Pittsburgh, PA", "Indianapolis, IN", "Chicago, IL", "Minneapolis, MN",
];

function ProfilePage() {
  const { user, setUser } = useStore();
  const nav = useNavigate();
  const [form, setForm] = useState(user);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = () => {
    const e: Record<string, string> = {};
    if (!form.name) e.name = "Required";
    if (!/.+@.+\..+/.test(form.email)) e.email = "Valid email required";
    if (!form.consent) e.consent = "Please confirm the privacy notice";
    setErrors(e);
    if (Object.keys(e).length) return;
    setUser({ ...form, signedIn: true });
    toast.success("Profile saved");
    nav({ to: "/register" });
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-black text-[var(--brand-dark)]">Your profile</h1>
      <p className="mt-1 text-muted-foreground">Prefilled from your Huntington record. Update anything that has changed.</p>

      <Card className="mt-6">
        <CardHeader><CardTitle>Colleague details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Full name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label>Work email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>
          <div className="space-y-2">
            <Label>Mobile number</Label>
            <Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Business segment</Label>
            <Select value={form.segment} onValueChange={(v) => setForm({ ...form, segment: v })}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>{segments.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Market / location</Label>
            <Select value={form.market} onValueChange={(v) => setForm({ ...form, market: v })}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>{markets.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Manager</Label>
            <Input value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })} />
          </div>

          <div className="sm:col-span-2 rounded-lg bg-muted/50 p-4">
            <label className="flex gap-3 items-start cursor-pointer">
              <Checkbox
                checked={form.consent}
                onCheckedChange={(v) => setForm({ ...form, consent: !!v })}
                className="mt-0.5"
              />
              <span className="text-sm text-muted-foreground">
                <b className="text-foreground">Privacy notice.</b> I understand that Team Huntington will use this information to coordinate my Pelotonia participation, travel, apparel and reimbursements. Data is handled per Huntington's colleague privacy policy.
              </span>
            </label>
            {errors.consent && <p className="mt-2 text-xs text-destructive">{errors.consent}</p>}
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={() => nav({ to: "/" })}>Cancel</Button>
        <Button onClick={save} className="bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90 font-semibold">
          Save & continue
        </Button>
      </div>
    </div>
  );
}
