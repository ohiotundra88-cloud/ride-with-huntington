import { z } from "zod";

export interface FundraisingAsset {
  id: string;
  title: string;
  description: string;
  category: string;
  suggested_caption: string | null;
  link_url: string | null;
  file_path: string | null;
  file_name: string | null;
  content_type: string | null;
  published: boolean;
  sort_order: number;
  created_by: string;
  created_at: string;
}

export const ASSET_COLUMNS =
  "id, title, description, category, suggested_caption, link_url, file_path, file_name, content_type, published, sort_order, created_by, created_at";

export const assetCategories = [
  "Social graphics",
  "Flyers & print",
  "Email templates",
  "Photos",
  "Talking points",
] as const;

const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const assetInputSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(140),
  description: z.string().trim().max(2000).default(""),
  category: z.string().trim().min(2).max(60).default("Social graphics"),
  suggested_caption: nullableText(1000),
  link_url: nullableText(500).refine((v) => !v || /^https?:\/\//i.test(v), {
    message: "Links must start with http:// or https://",
  }),
  published: z.boolean().default(true),
  sort_order: z.number().int().min(0).max(999).default(0),
});

export type AssetInput = z.input<typeof assetInputSchema>;

export const ALLOWED_ASSET_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "video/mp4",
] as const;

export const MAX_ASSET_BYTES = 15 * 1024 * 1024;

export const assetFileSchema = z.object({
  id: z.string().uuid(),
  fileName: z.string().trim().min(1).max(200),
  contentType: z.enum(ALLOWED_ASSET_TYPES),
  base64: z.string().min(1),
});

export const assetIdSchema = z.object({ id: z.string().uuid() });

/** Same-origin URL that streams a fundraising asset's file. */
export function assetFileUrl(id: string) {
  return `/api/public/fundraising-asset/${id}`;
}

export function isImageAsset(a: FundraisingAsset) {
  return !!a.content_type?.startsWith("image/");
}
