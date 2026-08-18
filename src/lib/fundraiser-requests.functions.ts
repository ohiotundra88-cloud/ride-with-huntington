import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  REQUEST_COLUMNS,
  requestInputSchema,
  decisionSchema,
  requestFlierSchema,
  MAX_FLIER_BYTES,
  type ApprovalEntry,
  type FundraiserRequest,
} from "@/lib/fundraiser-requests.shared";

const idSchema = z.object({ id: z.string().uuid() });

async function myRoles(context: { supabase: any; userId: string }): Promise<string[]> {
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: { role: string }) => String(r.role));
}

/** Roles of the signed-in colleague (used to build the reviewer queue UI). */
export const getMyReviewRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => ({ roles: await myRoles(context) }));

export const listMyRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FundraiserRequest[]> => {
    const { data, error } = await context.supabase
      .from("fundraiser_requests")
      .select(REQUEST_COLUMNS)
      .eq("submitted_by", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as FundraiserRequest[];
  });

/** Every request, for anyone holding a reviewer/admin designation. */
export const listReviewRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FundraiserRequest[]> => {
    const { data, error } = await context.supabase
      .from("fundraiser_requests")
      .select(REQUEST_COLUMNS)
      .order("event_date", { ascending: true });
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as unknown as FundraiserRequest[];
    if (rows.length === 0) return rows;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name")
      .in("id", Array.from(new Set(rows.map((r) => r.submitted_by))));
    const map = new Map((profiles ?? []).map((p) => [p.id, p]));
    return rows.map((r) => ({
      ...r,
      submitter_email: map.get(r.submitted_by)?.email ?? null,
      submitter_name: map.get(r.submitted_by)?.full_name ?? null,
    }));
  });

export const saveMyRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => requestInputSchema.parse(d))
  .handler(async ({ data, context }): Promise<FundraiserRequest> => {
    const { id, ...fields } = data;
    if (id) {
      const { data: row, error } = await context.supabase
        .from("fundraiser_requests")
        .update({ ...fields, status: "submitted", captain_status: "pending" })
        .eq("id", id)
        .eq("submitted_by", context.userId)
        .select(REQUEST_COLUMNS)
        .single();
      if (error) throw new Error(error.message);
      await logDecision(id, "submitted", "submitted", "Resubmitted after updates", context.userId);
      return row as unknown as FundraiserRequest;
    }
    const { data: row, error } = await context.supabase
      .from("fundraiser_requests")
      .insert({ ...fields, submitted_by: context.userId })
      .select(REQUEST_COLUMNS)
      .single();
    if (error) throw new Error(error.message);
    await logDecision(row.id as string, "submitted", "submitted", null, context.userId);
    return row as unknown as FundraiserRequest;
  });

export const deleteMyRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("fundraiser_requests").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listRequestApprovals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => idSchema.parse(d))
  .handler(async ({ data, context }): Promise<ApprovalEntry[]> => {
    const { data: rows, error } = await context.supabase
      .from("fundraiser_approvals")
      .select("id, request_id, stage, decision, note, actor_email, created_at")
      .eq("request_id", data.id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as unknown as ApprovalEntry[];
  });

async function logDecision(
  requestId: string,
  stage: string,
  decision: string,
  note: string | null,
  actorId: string,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("email")
    .eq("id", actorId)
    .maybeSingle();
  await supabaseAdmin.from("fundraiser_approvals").insert({
    request_id: requestId,
    stage,
    decision,
    note,
    actor_id: actorId,
    actor_email: profile?.email ?? null,
  });
}

/** Record a stage decision. Stage gating and role checks are enforced here. */
export const decideOnRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => decisionSchema.parse(d))
  .handler(async ({ data, context }) => {
    const roles = await myRoles(context);
    const { STAGES, actionableStages, canActOnStage, isFullyApproved } = await import(
      "@/lib/fundraiser-requests.shared"
    );
    if (!canActOnStage(roles, data.stage)) {
      throw new Error("You don't hold the designation required for this approval stage.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: current, error: cErr } = await supabaseAdmin
      .from("fundraiser_requests")
      .select(REQUEST_COLUMNS)
      .eq("id", data.id)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!current) throw new Error("Request not found");
    const request = current as unknown as FundraiserRequest;

    if (!actionableStages(request).includes(data.stage)) {
      throw new Error("This stage isn't open yet — an earlier approval is still outstanding.");
    }

    const patch: Record<string, unknown> = { [`${data.stage}_status`]: data.decision };
    const next = { ...request, [`${data.stage}_status`]: data.decision } as FundraiserRequest;

    if (data.decision === "declined") patch.status = "declined";
    else if (data.decision === "changes_requested") patch.status = "changes_requested";
    else if (isFullyApproved(next)) patch.status = "approved";
    else patch.status = "in_review";

    const { data: updated, error: uErr } = await supabaseAdmin
      .from("fundraiser_requests")
      .update(patch)
      .eq("id", data.id)
      .select(REQUEST_COLUMNS)
      .single();
    if (uErr) throw new Error(uErr.message);
    await logDecision(data.id, data.stage, data.decision, data.note, context.userId);

    const fresh = updated as unknown as FundraiserRequest;
    // Virtual/non-physical events go live once the captain approves; in-person
    // events only appear on the calendar after final co-chair sign-off.
    const shouldPublish =
      fresh.status !== "declined" &&
      (fresh.event_type === "virtual"
        ? fresh.captain_status === "approved"
        : STAGES.every((s) => fresh[`${s.key}_status` as const] === "approved"));

    if (shouldPublish && !fresh.event_id) {
      const { data: ev, error: eErr } = await supabaseAdmin
        .from("events")
        .insert({
          title: fresh.title,
          description: fresh.description,
          event_date: fresh.event_date,
          start_time: fresh.start_time,
          end_time: fresh.end_time,
          location: fresh.location,
          contact_name: fresh.contact_name,
          contact_email: fresh.contact_email,
          contact_phone: fresh.contact_phone,
          flier_path: fresh.flier_path,
          flier_name: fresh.flier_name,
          published: true,
          created_by: fresh.submitted_by,
        })
        .select("id")
        .single();
      if (eErr) throw new Error(eErr.message);
      await supabaseAdmin.from("fundraiser_requests").update({ event_id: ev.id }).eq("id", data.id);
      await logDecision(data.id, "published", "published", "Added to the fundraising calendar", context.userId);
    }

    if (fresh.status === "declined" && fresh.event_id) {
      await supabaseAdmin.from("events").delete().eq("id", fresh.event_id);
      await supabaseAdmin.from("fundraiser_requests").update({ event_id: null }).eq("id", data.id);
    }

    return { ok: true };
  });

export const uploadRequestFlier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => requestFlierSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("fundraiser_requests")
      .select("id, flier_path")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Request not found");

    const bytes = Buffer.from(data.base64, "base64");
    if (bytes.byteLength > MAX_FLIER_BYTES) throw new Error("Flier must be 5 MB or smaller.");

    const ext = data.fileName.includes(".") ? data.fileName.split(".").pop()!.toLowerCase() : "bin";
    const path = `requests/${data.id}/flier-${Date.now()}.${ext}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: upErr } = await supabaseAdmin.storage
      .from("event-fliers")
      .upload(path, bytes, { contentType: data.contentType, upsert: true });
    if (upErr) throw new Error(upErr.message);

    const { error: updErr } = await context.supabase
      .from("fundraiser_requests")
      .update({ flier_path: path, flier_name: data.fileName })
      .eq("id", data.id);
    if (updErr) throw new Error(updErr.message);
    if (row.flier_path) await supabaseAdmin.storage.from("event-fliers").remove([row.flier_path]);
    return { ok: true };
  });

/** Returns the flier as a data URL for anyone allowed to read the request. */
export const getRequestFlier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("fundraiser_requests")
      .select("flier_path, flier_name")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row?.flier_path) return null;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: file, error: dErr } = await supabaseAdmin.storage
      .from("event-fliers")
      .download(row.flier_path);
    if (dErr || !file) throw new Error("Flier could not be loaded");
    const ext = row.flier_path.split(".").pop()?.toLowerCase();
    const type =
      ext === "pdf" ? "application/pdf" : ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    return { name: row.flier_name ?? "flier", dataUrl: `data:${type};base64,${base64}` };
  });

/** Public: event ids that came from a request still awaiting final sign-off. */
export const listPendingApprovalEventIds = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("fundraiser_requests")
    .select("event_id, status")
    .not("event_id", "is", null)
    .neq("status", "approved");
  if (error) return [] as string[];
  return (data ?? []).map((r) => r.event_id as string);
});
