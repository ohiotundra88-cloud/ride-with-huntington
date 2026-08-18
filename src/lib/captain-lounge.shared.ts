import { z } from "zod";

export interface CaptainPost {
  id: string;
  title: string;
  body: string;
  category: string;
  pinned: boolean;
  published: boolean;
  file_path: string | null;
  file_name: string | null;
  content_type: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  author_name?: string | null;
  author_email?: string | null;
  author_avatar_version?: string | null;

}

export const POST_COLUMNS =
  "id, title, body, category, pinned, published, file_path, file_name, content_type, created_by, created_at, updated_at";

export const postCategories = [
  "Update",
  "Playbook",
  "Document",
  "Meeting notes",
  "Deadline",
  "Recognition",
] as const;

/** Roles that unlock the Captains Lounge. */
export const LOUNGE_ROLES = [
  "captain",
  "admin",
  "superuser",
  "legal",
  "risk",
  "compliance",
  "marketing",
  "cochair",
] as const;

export function hasLoungeAccess(roles: string[]) {
  return roles.some((r) => (LOUNGE_ROLES as readonly string[]).includes(r));
}

export const postInputSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(160),
  body: z.string().trim().max(8000).default(""),
  category: z.string().trim().min(2).max(60).default("Update"),
  pinned: z.boolean().default(false),
  published: z.boolean().default(true),
});

export type PostInput = z.input<typeof postInputSchema>;

export const postIdSchema = z.object({ id: z.string().uuid() });

export const ALLOWED_DOC_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
] as const;

export const MAX_DOC_BYTES = 15 * 1024 * 1024;

export const postFileSchema = z.object({
  id: z.string().uuid(),
  fileName: z.string().trim().min(1).max(200),
  contentType: z.enum(ALLOWED_DOC_TYPES),
  base64: z.string().min(1),
});

export function formatPostDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
