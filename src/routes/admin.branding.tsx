import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/AdminShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageIcon, Upload, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { useBranding, brandingQueryKey } from "@/lib/useBranding";
import { HERO_POSITIONS, MAX_BRANDING_BYTES, brandingImageUrl, type SiteBranding } from "@/lib/branding.shared";
import { removeBrandingImage, saveBrandingSettings, uploadBrandingImage } from "@/lib/branding.functions";

export const Route = createFileRoute("/admin/branding")({
  head: () => ({
    meta: [
      { title: "Branding — Super User" },
      { name: "description", content: "Upload the landing page hero background image and the header logo." },
    ],
  }),
  component: BrandingAdmin,
});

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

function BrandingAdmin() {
  const { branding, heroUrl, logoUrl } = useBranding();
  const qc = useQueryClient();
  const [overlay, setOverlay] = useState(branding.hero_overlay);
  const [position, setPosition] = useState(branding.hero_position);
  const heroInput = useRef<HTMLInputElement>(null);
  const logoInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setOverlay(branding.hero_overlay);
    setPosition(branding.hero_position);
  }, [branding.hero_overlay, branding.hero_position]);

  const applyResult = (row: SiteBranding) => qc.setQueryData(brandingQueryKey, row);

  const upload = useMutation({
    mutationFn: async ({ kind, file }: { kind: "hero" | "logo"; file: File }) => {
      if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
      if (file.size > MAX_BRANDING_BYTES) throw new Error("Image must be 8 MB or smaller.");
      return uploadBrandingImage({
        data: { kind, fileName: file.name, contentType: file.type, base64: await fileToBase64(file) },
      });
    },
    onSuccess: (row) => { applyResult(row); toast.success("Image updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (kind: "hero" | "logo") => removeBrandingImage({ data: { kind } }),
    onSuccess: (row) => { applyResult(row); toast.success("Image removed"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveSettings = useMutation({
    mutationFn: () => saveBrandingSettings({ data: { hero_overlay: overlay, hero_position: position as any } }),
    onSuccess: (row) => { applyResult(row); toast.success("Hero settings saved"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const previewHero = brandingImageUrl({ ...branding }, "hero");

  return (
    <AdminShell
      title="Site branding"
      description="Replace the green hero bar background on the landing page and the icon next to “Team Huntington Hub.”"
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {/* HERO */}
        <Card>
          <CardHeader><CardTitle className="text-base">Landing page hero background</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="relative overflow-hidden rounded-lg border bg-[var(--brand-dark)] text-white h-40">
              {previewHero && (
                <>
                  <img src={previewHero} alt="Hero preview" className="h-full w-full object-cover" style={{ objectPosition: position }} />
                  <div className="absolute inset-0 bg-[var(--brand-dark)]" style={{ opacity: overlay / 100 }} />
                </>
              )}
              <div className="absolute inset-0 grid place-items-center px-4 text-center">
                <span className="text-lg font-black">Your Team Huntington Pelotonia Journey</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Darkening overlay — {overlay}%</Label>
              <Slider value={[overlay]} min={0} max={95} step={5} onValueChange={(v) => setOverlay(v[0] ?? 0)} />
              <p className="text-xs text-muted-foreground">Keeps headline text readable over a photo.</p>
            </div>

            <div className="space-y-2">
              <Label>Image focus</Label>
              <Select value={position} onValueChange={setPosition}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HERO_POSITIONS.map((p) => (
                    <SelectItem key={p} value={p}>{p[0]!.toUpperCase() + p.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap gap-2">
              <input ref={heroInput} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate({ kind: "hero", file: f }); e.target.value = ""; }} />
              <Button onClick={() => heroInput.current?.click()} disabled={upload.isPending}>
                <Upload className="mr-2 h-4 w-4" /> {heroUrl ? "Replace image" : "Upload image"}
              </Button>
              <Button variant="outline" onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending}>
                <Save className="mr-2 h-4 w-4" /> Save hero settings
              </Button>
              {heroUrl && (
                <Button variant="ghost" className="text-destructive" onClick={() => remove.mutate("hero")} disabled={remove.isPending}>
                  <Trash2 className="mr-2 h-4 w-4" /> Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {branding.hero_name ? `Current file: ${branding.hero_name}` : "No image — the solid green bar is shown."} · JPG or PNG up to 8 MB. Wide images (2000×900) look best.
            </p>
          </CardContent>
        </Card>

        {/* LOGO */}
        <Card>
          <CardHeader><CardTitle className="text-base">Header icon</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg bg-[var(--brand-dark)] p-4 text-white">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo preview" className="h-8 w-8 rounded-md object-cover bg-white/10" />
              ) : (
                <div className="grid h-8 w-8 place-items-center rounded-md bg-[var(--brand)] text-[var(--brand-foreground)]">
                  <ImageIcon className="h-4 w-4" />
                </div>
              )}
              <span className="text-sm font-black">Team Huntington Hub</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <input ref={logoInput} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate({ kind: "logo", file: f }); e.target.value = ""; }} />
              <Button onClick={() => logoInput.current?.click()} disabled={upload.isPending}>
                <Upload className="mr-2 h-4 w-4" /> {logoUrl ? "Replace icon" : "Upload icon"}
              </Button>
              {logoUrl && (
                <Button variant="ghost" className="text-destructive" onClick={() => remove.mutate("logo")} disabled={remove.isPending}>
                  <Trash2 className="mr-2 h-4 w-4" /> Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {branding.logo_name ? `Current file: ${branding.logo_name}` : "No icon — the default arrow mark is shown."} · Square PNG (256×256) with a transparent background works best.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
