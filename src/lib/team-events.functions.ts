import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { emptyAudience, type MessagingAccess } from "@/lib/messages.shared";
import {
  accessFromRoles,
  assertAudienceAllowed,
  buildAudienceRoster,
  loadRoles,
  resolveAudience,
} from "@/lib/messages.server";
import {
  RSVP_VALUES,
  teamEventInputSchema,
  type MyTeamEvent,
  type TeamEventInviteeRow,
  type TeamEventSummary,
} from "@/lib/team-events.shared";

const idInput = z.object({ id: z.string().uuid() });

/** Whether the signed-in user may create and assign team events. */
export const getTeamEventAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MessagingAccess> =>
    accessFromRoles(await loadRoles(context.supabase, context.userId)),
  );

async function requireOrganizer(supabase: any, userId: string): Promise<MessagingAccess> {
  const access = accessFromRoles(await loadRoles(supabase, userId));
  if (!access.allowed) {
    throw new Error("Forbidden — captain, co-chair, admin or super user access required.");
  }
  return access;
}

/** Every team event the organizer can manage, with RSVP tallies. */
export const listManageableTeamEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TeamEventSummary[]> => {
    await requireOrganizer(context.supabase, context.userId);
    const { mapTeamEventRow } = await import("@/lib/team-events.server");

    const { data, error } = await context.supabase
      .from("team_events")
      .select("*")
      .order("event_date", { ascending: false });
    if (error) throw new Error(error.message);

    const { data: invitees } = await context.supabase
      .from("team_event_invitees")
      .select("event_id, rsvp");

    const tallies = new Map<string, { yes: number; no: number; total: number }>();
    for (const row of (invitees ?? []) as { event_id: string; rsvp: string | null }[]) {
      const t = tallies.get(row.event_id) ?? { yes: 0, no: 0, total: 0 };
      t.total += 1;
      if (row.rsvp === "yes") t.yes += 1;
      if (row.rsvp === "no") t.no += 1;
      tallies.set(row.event_id, t);
    }

    return (data ?? []).map((row: any) => mapTeamEventRow(row, tallies.get(String(row.id))));
  });

/** Creates or updates a team event. Audience changes take effect on publish. */
export const saveTeamEvent = createServerFn({ method: "POST" })
  .inputValidator((d) => teamEventInputSchema.parse(d))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const access = await requireOrganizer(context.supabase, context.userId);
    assertAudienceAllowed(access, data.audience.roles);

    const email = String((context.claims as { email?: string } | null)?.email ?? "");
    const payload = {
      title: data.title,
      description: data.description ?? "",
      event_date: data.eventDate,
      start_time: data.startTime,
      end_time: data.endTime,
      location: data.location,
      organizer_name: data.organizerName ?? "",
      organizer_email: data.organizerEmail ?? "",
      audience: data.audience as never,
    };

    if (data.id) {
      const { error } = await context.supabase
        .from("team_events")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      await context.supabase
        .from("team_event_audit")
        .insert({ event_id: data.id, action: "updated", actor_id: context.userId, actor_email: email });
      return { id: data.id };
    }

    const { data: created, error } = await context.supabase
      .from("team_events")
      .insert({ ...payload, created_by: context.userId, created_by_email: email })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await context.supabase
      .from("team_event_audit")
      .insert({ event_id: created.id, action: "created", actor_id: context.userId, actor_email: email });
    return { id: String(created.id) };
  });

/**
 * Resolves the audience, writes immutable invitee rows and (on the first
 * publish) sends every invitee an inbox invitation with an RSVP link.
 */
export const publishTeamEvent = createServerFn({ method: "POST" })
  .inputValidator((d) => idInput.parse(d))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ invitedCount: number; added: number }> => {
    const access = await requireOrganizer(context.supabase, context.userId);
    const { notifyPeople, eventWhenWhere } = await import("@/lib/team-events.server");

    const { data: row, error } = await context.supabase
      .from("team_events")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Event not found.");
    if (row.status === "cancelled") throw new Error("This event was cancelled.");

    assertAudienceAllowed(access, ((row.audience as any)?.roles ?? []) as string[]);

    const people = resolveAudience(await buildAudienceRoster(), row.audience as never);
    if (!people.length) throw new Error("That audience has no one in it right now.");

    const { data: existing } = await context.supabase
      .from("team_event_invitees")
      .select("user_id")
      .eq("event_id", data.id);
    const already = new Set(((existing ?? []) as { user_id: string }[]).map((r) => r.user_id));
    const fresh = people.filter((p) => !already.has(p.userId));

    if (fresh.length) {
      const { error: insErr } = await context.supabase.from("team_event_invitees").insert(
        fresh.map((p) => ({
          event_id: data.id,
          user_id: p.userId,
          email: p.email,
          name: p.name,
          notified_at: new Date().toISOString(),
        })),
      );
      if (insErr) throw new Error(insErr.message);
    }

    const total = already.size + fresh.length;
    const { error: updErr } = await context.supabase
      .from("team_events")
      .update({
        status: "published",
        published_at: row.published_at ?? new Date().toISOString(),
        invited_count: total,
      })
      .eq("id", data.id);
    if (updErr) throw new Error(updErr.message);

    if (fresh.length) {
      const email = String((context.claims as { email?: string } | null)?.email ?? "");
      const invitees = fresh.map((p) => ({ userId: p.userId, email: p.email, name: p.name }));
      await notifyPeople(context.supabase, {
        people: invitees,
        title: `You're invited: ${row.title}`,
        body: `${eventWhenWhere(row)}\n\n${row.description ?? ""}\n\nPlease let us know if you can make it.`,
        ctaLabel: "RSVP now",
        ctaHref: "/my-events",
        priority: "important",
        actorId: context.userId,
        actorEmail: email,
        audience: row.audience as never,
      });
      const { emailPeople } = await import("@/lib/team-events.server");
      await emailPeople(context.supabase, {
        people: invitees,
        template: "event-invitation",
        keyPrefix: `event-invite-${data.id}`,
        templateData: {
          eventTitle: row.title,
          whenWhere: eventWhenWhere(row),
          description: row.description ?? "",
          organizerName: row.organizer_name ?? email,
          ctaHref: "/my-events",
        },
      });
    }

    await context.supabase.from("team_event_audit").insert({
      event_id: data.id,
      action: "published",
      actor_id: context.userId,
      actor_email: String((context.claims as { email?: string } | null)?.email ?? ""),
      details: { invitedCount: total, added: fresh.length },
    });

    return { invitedCount: total, added: fresh.length };
  });

/** Marks an event cancelled and tells everyone who was invited. */
export const cancelTeamEvent = createServerFn({ method: "POST" })
  .inputValidator((d) => idInput.parse(d))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ notified: number }> => {
    await requireOrganizer(context.supabase, context.userId);
    const { notifyPeople, eventWhenWhere } = await import("@/lib/team-events.server");

    const { data: row, error } = await context.supabase
      .from("team_events")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Event not found.");

    const { data: invitees } = await context.supabase
      .from("team_event_invitees")
      .select("user_id, email, name")
      .eq("event_id", data.id);

    const { error: updErr } = await context.supabase
      .from("team_events")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", data.id);
    if (updErr) throw new Error(updErr.message);

    const people = ((invitees ?? []) as { user_id: string; email: string; name: string }[]).map(
      (r) => ({ userId: r.user_id, email: r.email, name: r.name }),
    );
    const email = String((context.claims as { email?: string } | null)?.email ?? "");
    if (people.length && row.status === "published") {
      await notifyPeople(context.supabase, {
        people,
        title: `Cancelled: ${row.title}`,
        body: `This event has been cancelled.\n\nWas scheduled for ${eventWhenWhere(row)}.`,
        ctaLabel: "",
        ctaHref: "",
        priority: "important",
        actorId: context.userId,
        actorEmail: email,
        audience: { ...emptyAudience(), includeUserIds: people.map((p) => p.userId) },
      });
      const { emailPeople } = await import("@/lib/team-events.server");
      await emailPeople(context.supabase, {
        people,
        template: "event-cancelled",
        keyPrefix: `event-cancel-${data.id}`,
        templateData: {
          eventTitle: row.title,
          whenWhere: eventWhenWhere(row),
          organizerName: row.organizer_name ?? email,
        },
      });
    }

    await context.supabase.from("team_event_audit").insert({
      event_id: data.id,
      action: "cancelled",
      actor_id: context.userId,
      actor_email: email,
      details: { notified: people.length },
    });

    return { notified: people.length };
  });

/** Super-user-only removal of an event and its invitee rows. */
export const deleteTeamEvent = createServerFn({ method: "POST" })
  .inputValidator((d) => idInput.parse(d))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const access = await requireOrganizer(context.supabase, context.userId);
    if (!access.canDelete) throw new Error("Only super users can delete a team event.");
    const { error } = await context.supabase.from("team_events").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Who was invited to an event and how they replied. */
export const listTeamEventInvitees = createServerFn({ method: "POST" })
  .inputValidator((d) => idInput.parse(d))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<TeamEventInviteeRow[]> => {
    await requireOrganizer(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase
      .from("team_event_invitees")
      .select("user_id, name, email, rsvp, responded_at")
      .eq("event_id", data.id)
      .order("name");
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r: any) => ({
      userId: String(r.user_id),
      name: String(r.name ?? ""),
      email: String(r.email ?? ""),
      rsvp: (r.rsvp ?? null) as TeamEventInviteeRow["rsvp"],
      respondedAt: r.responded_at ?? null,
    }));
  });

/** The signed-in user's own assigned events, soonest first. */
export const listMyTeamEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyTeamEvent[]> => {
    const { data, error } = await context.supabase
      .from("team_event_invitees")
      .select(
        "rsvp, responded_at, team_events!inner(id, title, description, event_date, start_time, end_time, location, organizer_name, organizer_email, status, flier_name)",
      )
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);

    return (data ?? [])
      .map((row: any) => {
        const e = row.team_events;
        return {
          id: String(e.id),
          title: String(e.title ?? ""),
          description: String(e.description ?? ""),
          eventDate: String(e.event_date ?? ""),
          startTime: e.start_time ?? null,
          endTime: e.end_time ?? null,
          location: e.location ?? null,
          organizerName: String(e.organizer_name ?? ""),
          organizerEmail: String(e.organizer_email ?? ""),
          status: String(e.status ?? "published") as MyTeamEvent["status"],
          flierName: e.flier_name ?? null,
          rsvp: (row.rsvp ?? null) as MyTeamEvent["rsvp"],
          respondedAt: row.responded_at ?? null,
        };
      })
      .filter((e: MyTeamEvent) => e.status !== "draft")
      .sort((a: MyTeamEvent, b: MyTeamEvent) => a.eventDate.localeCompare(b.eventDate));
  });

/** Sets the caller's own RSVP on an event they were invited to. */
export const setMyRsvp = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), rsvp: z.enum(RSVP_VALUES) }).parse(d),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase
      .from("team_event_invitees")
      .update({ rsvp: data.rsvp, responded_at: new Date().toISOString() })
      .eq("event_id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
