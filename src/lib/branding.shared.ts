import { z } from "zod";

export const MAX_BRANDING_BYTES = 8 * 1024 * 1024; // 8 MB

export const BRANDING_COLUMNS =
  "id, hero_path, hero_name, hero_content_type, hero_overlay, hero_position, logo_path, logo_name, logo_content_type, updated_at";

export interface SiteBranding {
  id: number;
  hero_path: string | null;
  hero_name: string | null;
  hero_content_type: string | null;
  hero_overlay: number;
  hero_position: string;
  logo_path: string | null;
  logo_name: string | null;
  logo_content_type: string | null;
  updated_at: string;
}

export const HERO_POSITIONS = ["center", "top", "bottom", "left", "right"] as const;

export const brandingSettingsSchema = z.object({
  hero_overlay: z.number().int().min(0).max(95),
  hero_position: z.enum(HERO_POSITIONS),
});

export const brandingKindSchema = z.enum(["hero", "logo"]);

export const brandingUploadSchema = z.object({
  kind: brandingKindSchema,
  fileName: z.string().min(1).max(200),
  contentType: z.string().min(1).max(120),
  base64: z.string().min(1),
});

export const brandingRemoveSchema = z.object({ kind: brandingKindSchema });

export const defaultBranding: SiteBranding = {
  id: 1,
  hero_path: null,
  hero_name: null,
  hero_content_type: null,
  hero_overlay: 65,
  hero_position: "center",
  logo_path: null,
  logo_name: null,
  logo_content_type: null,
  updated_at: new Date(0).toISOString(),
};

/** Same-origin URL (VPN friendly) for a branding image, cache-busted by updated_at. */
export function brandingImageUrl(b: SiteBranding | null | undefined, kind: "hero" | "logo") {
  if (!b) return null;
  const path = kind === "hero" ? b.hero_path : b.logo_path;
  if (!path) return null;
  return `/api/public/branding/${kind}?v=${encodeURIComponent(b.updated_at)}`;
}
