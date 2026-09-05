import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Trash2 } from "lucide-react";
import { getMyProfilePhoto, uploadProfilePhoto, removeProfilePhoto } from "@/lib/profile-photo.functions";
import { AVATAR_TYPES, MAX_AVATAR_BYTES, avatarUrl, initialsFrom } from "@/lib/profile-photo.shared";

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
  const { user, saveProfile } = useStore();
  const nav = useNavigate();
  const [form, setForm] = useState(user);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Profile loads asynchronously after sign-in — refresh the form until edited
  useEffect(() => {
    if (!dirty) setForm(user);
  }, [user, dirty]);

  const update = (patch: Partial<typeof form>) => {
    setDirty(true);
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const save = async () => {
    const e: Record<string, string> = {};
    if (!form.name) e.name = "Required";
    if (!/.+@.+\..+/.test(form.email)) e.email = "Valid email required";
    if (!form.consent) e.consent = "Please confirm the privacy notice";
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      await saveProfile({ ...form, signedIn: true });
      setDirty(false);
      toast.success("Profile saved");
      nav({ to: "/register" });
    } catch (err) {
      console.error("Profile save failed", err);
      toast.error("Couldn't save your details — please try again");
    } finally {
      setSaving(false);
    }
  };


  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-black text-[var(--brand-dark)]">Your profile</h1>
      <p className="mt-1 text-muted-foreground">Prefilled from your Huntington record. Update anything that has changed.</p>

      <ProfilePhotoCard name={form.name} email={form.email} />

      <Card className="mt-6">

        <CardHeader><CardTitle>Colleague details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Full name</Label>
            <Input value={form.name} onChange={(e) => update({ name: e.target.value })} />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label>Work email</Label>
            <Input type="email" value={form.email} onChange={(e) => update({ email: e.target.value })} />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>
          <div className="space-y-2">
            <Label>Mobile number</Label>
            <Input value={form.mobile} onChange={(e) => update({ mobile: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Business segment</Label>
            <Select value={form.segment} onValueChange={(v) => update({ segment: v })}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>{segments.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Market / location</Label>
            <Select value={form.market} onValueChange={(v) => update({ market: v })}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>{markets.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Manager</Label>
            <Input value={form.manager} onChange={(e) => update({ manager: e.target.value })} />
          </div>

          <div className="sm:col-span-2 rounded-lg bg-muted/50 p-4">
            <label className="flex gap-3 items-start cursor-pointer">
              <Checkbox
                checked={form.consent}
                onCheckedChange={(v) => update({ consent: !!v })}
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
        <Button onClick={save} disabled={saving} className="bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90 font-semibold">
          {saving ? "Saving…" : "Save & continue"}
        </Button>
      </div>
    </div>
  );
}

function ProfilePhotoCard({ name, email }: { name: string; email: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const photo = useQuery({
    queryKey: ["my-profile-photo"],
    queryFn: () => getMyProfilePhoto(),
    retry: false,
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > MAX_AVATAR_BYTES) throw new Error("Photo must be 5 MB or smaller.");
      if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) {
        throw new Error("Use a PNG, JPG or WEBP image.");
      }
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
        reader.onerror = () => reject(new Error("Could not read that file."));
        reader.readAsDataURL(file);
      });
      return uploadProfilePhoto({
        data: { fileName: file.name, contentType: file.type as (typeof AVATAR_TYPES)[number], base64 },
      });
    },
    onSuccess: () => {
      toast.success("Profile photo updated");
      qc.invalidateQueries({ queryKey: ["my-profile-photo"] });
      qc.invalidateQueries({ queryKey: ["lounge-posts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: () => removeProfilePhoto(),
    onSuccess: () => {
      toast.success("Profile photo removed");
      qc.invalidateQueries({ queryKey: ["my-profile-photo"] });
      qc.invalidateQueries({ queryKey: ["lounge-posts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const signedIn = !photo.isError && !!photo.data?.userId;

  return (
    <Card className="mt-6">
      <CardHeader><CardTitle>Profile photo</CardTitle></CardHeader>
      <CardContent className="flex flex-wrap items-center gap-4">
        {signedIn && photo.data?.hasPhoto ? (
          <img
            src={avatarUrl(photo.data.userId, photo.data.version)}
            alt="Your profile photo"
            className="h-20 w-20 rounded-full object-cover ring-1 ring-border"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-lg font-bold text-muted-foreground">
            {initialsFrom(name || email)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">
            {signedIn
              ? "Add a photo so colleagues recognize you on your Captains Lounge posts. PNG, JPG or WEBP up to 5 MB."
              : "Sign in with your Huntington email to add a profile photo."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              ref={inputRef}
              type="file"
              accept={AVATAR_TYPES.join(",")}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) upload.mutate(file);
              }}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={!signedIn || upload.isPending}
              onClick={() => inputRef.current?.click()}
            >
              <Camera className="mr-1.5 h-4 w-4" />
              {upload.isPending ? "Uploading…" : photo.data?.hasPhoto ? "Replace photo" : "Upload photo"}
            </Button>
            {signedIn && photo.data?.hasPhoto && (
              <Button size="sm" variant="ghost" disabled={remove.isPending} onClick={() => remove.mutate()}>
                <Trash2 className="mr-1.5 h-4 w-4 text-destructive" /> Remove
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
