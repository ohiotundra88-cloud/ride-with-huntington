/** Server-only helpers for team events: invitee resolution and notifications. */
import { describeAudience, type AudienceRules } from "@/lib/messages.shared";
import { formatEventDate, formatTimeRange } from "@/lib/events.shared";
import type { TeamEventSummary } from "@/lib/team-events.shared";

type AnySupabase = { from: (table: string) => any };

export interface InviteePerson {
  userId: string;
  email: string;
  name: string;
}

/**
 * Creates a sent message addressed to an explicit list of people and writes
 * their recipient rows, so the existing inbox, unread badge and read tracking
 * pick it up with no extra delivery code.
 */
export async function notifyPeople(
  supabase: AnySupabase,
  {
    people,
    title,
    body,
    ctaLabel,
    ctaHref,
    priority,
    actorId,
    actorEmail,
    audience,
  }: {
    people: InviteePerson[];
    title: string;
    body: string;
    ctaLabel: string;
    ctaHref: string;
    priority: "info" | "important" | "urgent";
    actorId: string;
    actorEmail: string;
    audience: AudienceRules;
  },
): Promise<void> {
  if (!people.length) return;

  const { data: created, error } = await supabase
    .from("messages")
    .insert({
      title,
      body,
      cta_label: ctaLabel,
      cta_href: ctaHref,
      priority,
      category: "event",
      status: "sent",
      sent_at: new Date().toISOString(),
      recipient_count: people.length,
      audience: audience as never,
      created_by: actorId,
      created_by_email: actorEmail,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { error: rErr } = await supabase.from("message_recipients").insert(
    people.map((p) => ({
      message_id: created.id,
      user_id: p.userId,
      email: p.email,
      name: p.name,
    })),
  );
  if (rErr) throw new Error(rErr.message);

  await supabase.from("message_audit").insert({
    message_id: created.id,
    action: "sent",
    actor_email: actorEmail,
    details: { recipientCount: people.length, source: "team-event" },
  });
}

/** Human-readable when/where line used in invitation and cancellation notices. */
export function eventWhenWhere(row: {
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
}) {
  const time = formatTimeRange(row.start_time, row.end_time);
  const parts = [formatEventDate(row.event_date)];
  if (time) parts.push(time);
  if (row.location) parts.push(row.location);
  return parts.join(" · ");
}

export function mapTeamEventRow(
  row: Record<string, any>,
  tally: { yes: number; no: number; total: number } = { yes: 0, no: 0, total: 0 },
): TeamEventSummary {
  const audience = row["audience"] as AudienceRules;
  const invited = Number(row["invited_count"] ?? 0) || tally.total;
  return {
    id: String(row["id"]),
    title: String(row["title"] ?? ""),
    description: String(row["description"] ?? ""),
    eventDate: String(row["event_date"] ?? ""),
    startTime: row["start_time"] ?? null,
    endTime: row["end_time"] ?? null,
    location: row["location"] ?? null,
    organizerName: String(row["organizer_name"] ?? ""),
    organizerEmail: String(row["organizer_email"] ?? ""),
    audience,
    audienceSummary: describeAudience(audience),
    status: String(row["status"] ?? "draft") as TeamEventSummary["status"],
    invitedCount: invited,
    yesCount: tally.yes,
    noCount: tally.no,
    noReplyCount: Math.max(0, invited - tally.yes - tally.no),
    flierName: row["flier_name"] ?? null,
    publishedAt: row["published_at"] ?? null,
    cancelledAt: row["cancelled_at"] ?? null,
    createdBy: String(row["created_by"] ?? ""),
    createdByEmail: String(row["created_by_email"] ?? ""),
    createdAt: String(row["created_at"] ?? ""),
  };
}
