import { z } from "zod";

export interface FundraisingEvent {
  id: string;
  title: string;
  description: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  flier_path: string | null;
  flier_name: string | null;
  published: boolean;
  created_by: string;
  created_at: string;
}

export const EVENT_COLUMNS =
  "id, title, description, event_date, start_time, end_time, location, contact_name, contact_email, contact_phone, flier_path, flier_name, published, created_by, created_at";

/**
 * Columns safe to expose to visitors who are not signed in. Organizer email and
 * phone are omitted so public/anon traffic can't harvest colleague contacts.
 */
export const PUBLIC_EVENT_COLUMNS =
  "id, title, description, event_date, start_time, end_time, location, contact_name, flier_path, flier_name, published, created_by, created_at";

const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const eventInputSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(4000).default(""),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date"),
  start_time: nullableText(20),
  end_time: nullableText(20),
  location: nullableText(200),
  contact_name: nullableText(120),
  contact_email: nullableText(255).refine((v) => !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), {
    message: "Enter a valid contact email",
  }),
  contact_phone: nullableText(40),
  published: z.boolean().default(true),
});

export type EventInput = z.input<typeof eventInputSchema>;

export const ALLOWED_FLIER_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
] as const;

export const MAX_FLIER_BYTES = 5 * 1024 * 1024;

export const flierInputSchema = z.object({
  id: z.string().uuid(),
  fileName: z.string().trim().min(1).max(160),
  contentType: z.enum(ALLOWED_FLIER_TYPES),
  base64: z.string().min(1),
});

export const idSchema = z.object({ id: z.string().uuid() });

/** Same-origin URL that streams an event's flier attachment. */
export function flierUrl(eventId: string) {
  return `/api/public/event-flier/${eventId}`;
}

export function formatEventDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTimeRange(start: string | null, end: string | null) {
  const fmt = (t: string) => {
    const [h, min] = t.split(":").map(Number);
    if (Number.isNaN(h)) return t;
    const ampm = h! >= 12 ? "PM" : "AM";
    const hr = h! % 12 === 0 ? 12 : h! % 12;
    return `${hr}:${String(min ?? 0).padStart(2, "0")} ${ampm}`;
  };
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return fmt(start);
  return "";
}
