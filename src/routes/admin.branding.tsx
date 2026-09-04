import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/AdminShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageIcon, Upload, Trash2, Save, RotateCcw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useBranding, brandingQueryKey } from "@/lib/useBranding";
import { DEFAULT_HERO_COLORS, HERO_POSITIONS, MAX_BRANDING_BYTES, brandingImageUrl, type SiteBranding } from "@/lib/branding.shared";
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

type ColorKey = keyof typeof DEFAULT_HERO_COLORS;

const colorChoices: { key: ColorKey; label: string }[] = [
  { key: "hero_text_color", label: "Main text" },
  { key: "hero_accent_color", label: "Highlighted text" },
  { key: "hero_supporting_color", label: "Supporting text" },
  { key: "hero_primary_button_color", label: "Primary button" },
  { key: "hero_secondary_button_color", label: "Secondary button" },
];

function rgb(hex: string) {
  return [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255);
}

function luminance(hex: string) {
  return rgb(hex).map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
}

function contrast(a: string, b: string) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

function readableText(hex: string) {
  return contrast(hex, "#ffffff") >= contrast(hex, "#153a35") ? "#ffffff" : "#153a35";
}

function BrandingAdmin() {
  const { branding, heroUrl, logoUrl } = useBranding();
  const qc = useQueryClient();
  const [overlay, setOverlay] = useState(branding.hero_overlay);
  const [position, setPosition] = useState(branding.hero_position);
  const [colors, setColors] = useState<Record<ColorKey, string>>(() => ({
    hero_text_color: branding.hero_text_color,
    hero_accent_color: branding.hero_accent_color,
    hero_supporting_color: branding.hero_supporting_color,
    hero_primary_button_color: branding.hero_primary_button_color,
    hero_secondary_button_color: branding.hero_secondary_button_color,
  }));
  const heroInput = useRef<HTMLInputElement>(null);
  const logoInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setOverlay(branding.hero_overlay);
    setPosition(branding.hero_position);
    setColors({
      hero_text_color: branding.hero_text_color,
      hero_accent_color: branding.hero_accent_color,
      hero_supporting_color: branding.hero_supporting_color,
      hero_primary_button_color: branding.hero_primary_button_color,
      hero_secondary_button_color: branding.hero_secondary_button_color,
    });
  }, [branding]);

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
    mutationFn: () => saveBrandingSettings({ data: { hero_overlay: overlay, hero_position: position as typeof HERO_POSITIONS[number], ...colors } }),
    onSuccess: (row) => { applyResult(row); toast.success("Hero settings saved"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const previewHero = brandingImageUrl({ ...branding }, "hero");
  const previewBackground = "#153a35";
  const lowContrast = colorChoices.filter(({ key }) =>
    key !== "hero_primary_button_color" && contrast(colors[key], previewBackground) < 3,
  );

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
            <div className="relative h-56 overflow-hidden rounded-lg border bg-brand-dark" style={{ color: colors.hero_text_color }}>
              {previewHero && (
                <>
                  <img src={previewHero} alt="Hero preview" className="h-full w-full object-cover" style={{ objectPosition: position }} />
                  <div className="absolute inset-0 bg-[var(--brand-dark)]" style={{ opacity: overlay / 100 }} />
                </>
              )}
              <div className="absolute inset-0 flex flex-col items-start justify-center px-5 text-left">
                <span className="text-xl font-black">Hi, Chris. <span style={{ color: colors.hero_accent_color }}>Let's ride.</span></span>
                <span className="mt-2 text-sm" style={{ color: colors.hero_supporting_color }}>You're all set for Ride Weekend.</span>
                <div className="mt-4 flex gap-2">
                  <span className="rounded-md px-3 py-2 text-xs font-semibold" style={{ backgroundColor: colors.hero_primary_button_color, color: readableText(colors.hero_primary_button_color) }}>Review confirmation</span>
                  <span className="rounded-md border px-3 py-2 text-xs font-semibold" style={{ borderColor: colors.hero_secondary_button_color, color: colors.hero_secondary_button_color }}>See progress</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Darkening overlay — {overlay}%</Label>
              <Slider value={[overlay]} min={0} max={95} step={5} onValueChange={(v) => setOverlay(v[0] ?? 0)} />
              <p className="text-xs text-muted-foreground">Keeps headline text readable over a photo.</p>
            </div>

            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between gap-3">
                <Label>Banner colors</Label>
                <Button type="button" size="sm" variant="ghost" onClick={() => setColors({ ...DEFAULT_HERO_COLORS })}>
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Restore defaults
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {colorChoices.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-3 rounded-md border p-2.5">
                    <Input type="color" value={colors[key]} aria-label={`${label} color`}
                      onChange={(event) => setColors((current) => ({ ...current, [key]: event.target.value }))}
                      className="h-9 w-12 cursor-pointer p-1" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{label}</span>
                      <span className="block text-xs uppercase text-muted-foreground">{colors[key]}</span>
                    </span>
                  </label>
                ))}
              </div>
              {lowContrast.length > 0 && (
                <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-foreground">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <span>Some selected colors may be difficult to read on the dark banner. Check the preview before saving.</span>
                </div>
              )}
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
