import { z } from "zod";
import { normalizeAudience, type AudienceRules } from "@/lib/messages.shared";

export const TEAM_EVENT_STATUSES = ["draft", "published", "cancelled"] as const;
export type TeamEventStatus = (typeof TEAM_EVENT_STATUSES)[number];

export const RSVP_VALUES = ["yes", "no"] as const;
export type Rsvp = (typeof RSVP_VALUES)[number];

export interface TeamEventSummary {
  id: string;
  title: string;
  description: string;
  eventDate: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  organizerName: string;
  organizerEmail: string;
  audience: AudienceRules;
  audienceSummary: string;
  status: TeamEventStatus;
  invitedCount: number;
  yesCount: number;
  noCount: number;
  noReplyCount: number;
  flierName: string | null;
  publishedAt: string | null;
  cancelledAt: string | null;
  createdBy: string;
  createdByEmail: string;
  createdAt: string;
}

export interface MyTeamEvent {
  id: string;
  title: string;
  description: string;
  eventDate: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  organizerName: string;
  organizerEmail: string;
  status: TeamEventStatus;
  flierName: string | null;
  rsvp: Rsvp | null;
  respondedAt: string | null;
}

export interface TeamEventInviteeRow {
  userId: string;
  name: string;
  email: string;
  rsvp: Rsvp | null;
  respondedAt: string | null;
}

const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const teamEventInputSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(2, "Give the event a title").max(140),
  description: z.string().trim().max(5000).default(""),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date"),
  startTime: nullableText(20),
  endTime: nullableText(20),
  location: nullableText(300),
  organizerName: z.string().trim().max(120).default(""),
  organizerEmail: z.string().trim().max(255).default(""),
  audience: z.unknown().transform((v) => normalizeAudience(v)),
});

export type TeamEventInput = z.input<typeof teamEventInputSchema>;

export function rsvpLabel(rsvp: Rsvp | null) {
  if (rsvp === "yes") return "Going";
  if (rsvp === "no") return "Can't make it";
  return "No reply yet";
}

/** True when the event is today or later, in the viewer's local timezone. */
export function isUpcoming(eventDate: string) {
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate(),
  ).padStart(2, "0")}`;
  return eventDate >= iso;
}
