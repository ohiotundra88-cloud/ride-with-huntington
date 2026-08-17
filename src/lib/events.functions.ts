import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  EVENT_COLUMNS,
  eventInputSchema,
  flierInputSchema,
  idSchema,
  MAX_FLIER_BYTES,
  type FundraisingEvent,
} from "@/lib/events.shared";

/** Public calendar feed — published events only. */
export const listPublicEvents = createServerFn({ method: "GET" }).handler(
  async (): Promise<FundraisingEvent[]> => {
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const client = createClient(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input: any, init: any) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data, error } = await client
      .from("events")
      .select(EVENT_COLUMNS)
      .eq("published", true)
      .order("event_date", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as FundraisingEvent[];
  },
);

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
  .inputValidator((d) => eventInputSchema.parse(d))
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

    const { data: row, error } = await context.supabase
      .from("events")
      .insert({ ...payload, created_by: context.userId })
      .select(EVENT_COLUMNS)
      .single();
    if (error) throw new Error(error.message);
    return row as unknown as FundraisingEvent;
  });

export const deleteEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("events").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Upload (or replace) the flier attachment on an event the caller can edit. */
export const uploadEventFlier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => flierInputSchema.parse(d))
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

    const ext = data.fileName.includes(".") ? data.fileName.split(".").pop()!.toLowerCase() : "bin";
    const path = `${data.id}/flier-${Date.now()}.${ext}`;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: upErr } = await supabaseAdmin.storage
      .from("event-fliers")
      .upload(path, bytes, { contentType: data.contentType, upsert: true });
    if (upErr) throw new Error(upErr.message);

    const { error: updErr } = await context.supabase
      .from("events")
      .update({ flier_path: path, flier_name: data.fileName })
      .eq("id", data.id);
    if (updErr) throw new Error(updErr.message);

    if (row.flier_path) await supabaseAdmin.storage.from("event-fliers").remove([row.flier_path]);
    return { ok: true, flier_path: path };
  });

export const removeEventFlier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("events")
      .select("id, flier_path")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Event not found");
    const { error: updErr } = await context.supabase
      .from("events")
      .update({ flier_path: null, flier_name: null })
      .eq("id", data.id);
    if (updErr) throw new Error(updErr.message);
    if (row.flier_path) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.storage.from("event-fliers").remove([row.flier_path]);
    }
    return { ok: true };
  });
