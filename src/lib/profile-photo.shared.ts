import { z } from "zod";

export const AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export const avatarUploadSchema = z.object({
  fileName: z.string().trim().min(1).max(200),
  contentType: z.enum(AVATAR_TYPES),
  base64: z.string().min(1),
});

/** Same-origin avatar URL (VPN friendly — never hits the storage host directly). */
export function avatarUrl(userId: string, version?: string | null) {
  const v = version ? `?v=${encodeURIComponent(version)}` : "";
  return `/api/public/avatar/${userId}${v}`;
}

export function initialsFrom(nameOrEmail?: string | null) {
  const src = (nameOrEmail ?? "").trim();
  if (!src) return "TH";
  const parts = src.replace(/@.*$/, "").split(/[\s._-]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "T").concat(parts[1]?.[0] ?? "").toUpperCase();
}
