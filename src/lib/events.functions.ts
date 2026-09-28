import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  EVENT_COLUMNS,
  PUBLIC_EVENT_COLUMNS,
  eventInputSchema,
  flierInputSchema,
  idSchema,
  MAX_FLIER_BYTES,
  type FundraisingEvent,
} from "@/lib/events.shared";

/** Public calendar feed — published events only, organizer email/phone withheld. */
export const listPublicEvents = createServerFn({ method: "GET" }).handler(
  async (): Promise<FundraisingEvent[]> => {
    const { createDbClient } = await import("@/server/backend.server");
    const client = createDbClient("anon");
    const { data, error } = await client
      .from("events")
      .select(PUBLIC_EVENT_COLUMNS)
      .eq("published", true)
      .order("event_date", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((e: any) => ({
      ...e,
      contact_email: null,
      contact_phone: null,
    })) as FundraisingEvent[];
  },
);

/** Published events with organizer contacts — signed-in colleagues only. */
export const listEventsForColleague = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FundraisingEvent[]> => {
    const { data, error } = await context.supabase
      .from("events")
      .select(EVENT_COLUMNS)
      .eq("published", true)
      .order("event_date", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as FundraisingEvent[];
  });

/** Own drafts + published events; admins see everything. */
export const listManageableEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FundraisingEvent[]> => {
    const { data, error } = await context.supabase
      .from("events")
      .select(EVENT_COLUMNS)
      .order("event_date", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as FundraisingEvent[];
  });

export const saveEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => eventInputSchema.parse(d))
  .handler(async ({ data, context }): Promise<FundraisingEvent> => {
    const { data: allowed, error: rErr } = await context.supabase.rpc("can_manage_events", {
      _user_id: context.userId,
    });
    if (rErr) throw new Error(rErr.message);
    if (!allowed) throw new Error("Only captains and admins can post fundraising events.");

    const payload = {
      title: data.title,
      description: data.description ?? "",
      event_date: data.event_date,
      start_time: data.start_time,
      end_time: data.end_time,
      location: data.location,
      contact_name: data.contact_name,
      contact_email: data.contact_email,
      contact_phone: data.contact_phone,
      published: data.published,
    };

    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("events")
        .update(payload)
        .eq("id", data.id)
        .select(EVENT_COLUMNS)
        .single();
      if (error) throw new Error(error.message);
      return row as unknown as FundraisingEvent;
    }

    // New fundraisers reach the calendar only through the approval request
    // (fundraiser-requests.functions.ts publishes them after sign-off).
    throw new Error("New fundraisers are added through the fundraiser approval request.");
  });

export const deleteEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("events").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const FLIER_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

/** Upload (or replace) the flier attachment on an event the caller can edit. */
export const uploadEventFlier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => flierInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error: sErr } = await context.supabase
      .from("events")
      .select("id, flier_path")
      .eq("id", data.id)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!row) throw new Error("Event not found");

    const bytes = Buffer.from(data.base64, "base64");
    if (bytes.byteLength > MAX_FLIER_BYTES) throw new Error("Flier must be 5 MB or smaller.");

    // Extension comes from the validated content type, never the uploaded file name.
    const ext = FLIER_EXTENSIONS[data.contentType];
    const path = `${data.id}/flier-${Date.now()}.${ext}`;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: upErr } = await supabaseAdmin.storage
      .from("event-fliers")
      .upload(path, bytes, { contentType: data.contentType, upsert: true });
    if (upErr) throw new Error(upErr.message);

    // RLS silently matches zero rows when the caller can't edit this event, so
    // check that the update landed before touching the existing file.
    const { data: updated, error: updErr } = await context.supabase
      .from("events")
      .update({ flier_path: path, flier_name: data.fileName })
      .eq("id", data.id)
      .select("id");
    if (updErr || !updated?.length) {
      await supabaseAdmin.storage.from("event-fliers").remove([path]);
      throw new Error(updErr?.message ?? "You can't edit this event.");
    }

    if (row.flier_path) await supabaseAdmin.storage.from("event-fliers").remove([row.flier_path]);
    return { ok: true, flier_path: path };
  });

export const removeEventFlier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("events")
      .select("id, flier_path")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Event not found");
    const { data: updated, error: updErr } = await context.supabase
      .from("events")
      .update({ flier_path: null, flier_name: null })
      .eq("id", data.id)
      .select("id");
    if (updErr) throw new Error(updErr.message);
    if (!updated?.length) throw new Error("You can't edit this event.");
    if (row.flier_path) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.storage.from("event-fliers").remove([row.flier_path]);
    }
    return { ok: true };
  });
