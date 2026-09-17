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

/** Adds submitter + assigned captain names/emails for display. */
async function hydratePeople(rows: FundraiserRequest[]): Promise<FundraiserRequest[]> {
  if (rows.length === 0) return rows;
  const ids = Array.from(
    new Set([
      ...rows.map((r) => r.submitted_by),
      ...rows.map((r) => r.captain_id).filter((v): v is string => !!v),
    ]),
  );
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name")
    .in("id", ids);
  const map = new Map((profiles ?? []).map((p) => [p.id, p]));
  return rows.map((r) => ({
    ...r,
    submitter_email: map.get(r.submitted_by)?.email ?? null,
    submitter_name: map.get(r.submitted_by)?.full_name ?? null,
    captain_email: r.captain_id ? map.get(r.captain_id)?.email ?? null : null,
    captain_name: r.captain_id ? map.get(r.captain_id)?.full_name ?? null : null,
  }));
}

export interface CaptainOption {
  user_id: string;
  full_name: string | null;
  email: string;
}

/** Captains a submitter can route their request to. Any signed-in colleague may read this. */
export const listCaptainOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<CaptainOption[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles, error } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "captain");
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((roles ?? []).map((r) => r.user_id)));
    if (ids.length === 0) return [];
    const { data: profiles, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name")
      .in("id", ids);
    if (pErr) throw new Error(pErr.message);
    return (profiles ?? [])
      .map((p) => ({ user_id: p.id, full_name: p.full_name, email: p.email ?? "" }))
      .sort((a, b) => (a.full_name || a.email).localeCompare(b.full_name || b.email));
  });

export const listMyRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FundraiserRequest[]> => {
    const { data, error } = await context.supabase
      .from("fundraiser_requests")
      .select(REQUEST_COLUMNS)
      .eq("submitted_by", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return hydratePeople((data ?? []) as unknown as FundraiserRequest[]);
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
    let rows = (data ?? []) as unknown as FundraiserRequest[];

    // A plain captain only sees the requests routed to them (plus their own).
    const roles = await myRoles(context);
    const seesEverything = roles.some((r) =>
      ["admin", "superuser", "legal", "risk", "compliance", "marketing", "cochair"].includes(r),
    );
    if (!seesEverything && roles.includes("captain")) {
      rows = rows.filter(
        (r) => r.captain_id === context.userId || !r.captain_id || r.submitted_by === context.userId,
      );
    }
    return hydratePeople(rows);
  });

export const saveMyRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => requestInputSchema.parse(d))
  .handler(async ({ data, context }): Promise<FundraiserRequest> => {
    const { id, ...fields } = data;
    if (id) {
      const { data: row, error } = await context.supabase
        .from("fundraiser_requests")
        .update({
          ...fields,
          status: "submitted",
          captain_status: "pending",
          legal_status: "pending",
          risk_status: "pending",
          compliance_status: "pending",
          marketing_status: "pending",
          cochair_status: "pending",
        })
        .eq("id", id)
        .eq("submitted_by", context.userId)
        .select(REQUEST_COLUMNS)
        .single();
      if (error) throw new Error(error.message);
      await logDecision(id, "submitted", "submitted", "Resubmitted after updates", context.userId);
      await notifyAssignedCaptain(row as unknown as FundraiserRequest, false);
      return row as unknown as FundraiserRequest;
    }
    const { data: row, error } = await context.supabase
      .from("fundraiser_requests")
      .insert({ ...fields, submitted_by: context.userId })
      .select(REQUEST_COLUMNS)
      .single();
    if (error) throw new Error(error.message);
    await logDecision(row.id as string, "submitted", "submitted", null, context.userId);
    await notifyAssignedCaptain(row as unknown as FundraiserRequest, false);
    return row as unknown as FundraiserRequest;
  });

/**
 * Tell the assigned captain a request is waiting on them. Mail failures are
 * logged and swallowed — the request itself is already saved.
 */
async function notifyAssignedCaptain(request: FundraiserRequest, reassigned: boolean) {
  try {
    if (!request.captain_id) return;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: captain }, { data: submitter }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("email, full_name, email_opt_out")
        .eq("id", request.captain_id)
        .maybeSingle(),
      supabaseAdmin
        .from("profiles")
        .select("email, full_name")
        .eq("id", request.submitted_by)
        .maybeSingle(),
    ]);
    const to = captain?.email ?? "";
    if (!to.includes("@") || captain?.email_opt_out === true) return;
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    await sendTemplateEmail("fundraiser-request-assigned", to, {
      templateData: {
        requestTitle: request.title,
        submitterName: submitter?.full_name ?? "",
        submitterEmail: submitter?.email ?? "",
        eventDate: request.event_date,
        recipientName: (captain?.full_name ?? "").split(" ")[0] ?? "",
        reassigned,
      },
      idempotencyKey: `fr-assigned-${request.id}-${request.captain_id}-${request.updated_at}`,
    });
  } catch (error) {
    console.error("Fundraiser captain assignment email failed", error);
  }
}

/** Admins and super users can move a request to a different captain. */
export const reassignRequestCaptain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ id: z.string().uuid(), captain_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { assertAdminOrSuperUser } = await import("@/lib/roles-admin.server");
    await assertAdminOrSuperUser(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: isCaptain, error: rErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("user_id", data.captain_id)
      .eq("role", "captain")
      .maybeSingle();
    if (rErr) throw new Error(rErr.message);
    if (!isCaptain) throw new Error("That colleague doesn't hold the Captain designation.");

    const { data: current, error: cErr } = await supabaseAdmin
      .from("fundraiser_requests")
      .select(REQUEST_COLUMNS)
      .eq("id", data.id)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!current) throw new Error("Request not found");
    const request = current as unknown as FundraiserRequest;
    if (request.captain_id === data.captain_id) return { ok: true };

    const patch: Record<string, unknown> = { captain_id: data.captain_id };
    if (request.captain_status === "pending") patch.status = request.status;

    const { data: updated, error: uErr } = await supabaseAdmin
      .from("fundraiser_requests")
      .update(patch as never)
      .eq("id", data.id)
      .select(REQUEST_COLUMNS)
      .single();
    if (uErr) throw new Error(uErr.message);

    const { data: people } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name")
      .in("id", [data.captain_id, request.captain_id].filter((v): v is string => !!v));
    const label = (id: string | null) => {
      const p = (people ?? []).find((x) => x.id === id);
      return p?.full_name || p?.email || "unassigned";
    };
    await logDecision(
      data.id,
      "captain",
      "reassigned",
      `Reassigned from ${label(request.captain_id)} to ${label(data.captain_id)}`,
      context.userId,
    );
    await notifyAssignedCaptain(updated as unknown as FundraiserRequest, true);
    return { ok: true };
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: current, error: cErr } = await supabaseAdmin
      .from("fundraiser_requests")
      .select(REQUEST_COLUMNS)
      .eq("id", data.id)
      .maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!current) throw new Error("Request not found");
    const request = current as unknown as FundraiserRequest;

    if (!canActOnStage(roles, data.stage, { request, userId: context.userId })) {
      throw new Error(
        data.stage === "captain"
          ? "This request was routed to a different captain. Ask an admin to reassign it."
          : "You don't hold the designation required for this approval stage.",
      );
    }

    if (!actionableStages(request).includes(data.stage)) {
      throw new Error("This stage isn't open yet — an earlier approval is still outstanding.");
    }

    const patch: Record<string, string> = { [`${data.stage}_status`]: data.decision };
    const next = { ...request, [`${data.stage}_status`]: data.decision } as FundraiserRequest;

    if (data.decision === "declined") patch.status = "declined";
    else if (data.decision === "changes_requested") patch.status = "changes_requested";
    else if (isFullyApproved(next)) patch.status = "approved";
    else patch.status = "in_review";

    const { data: updated, error: uErr } = await supabaseAdmin
      .from("fundraiser_requests")
      .update(patch as never)
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

    // A fundraising page linked to this request goes live as soon as every
    // stage has signed off — otherwise it stays invisible after approval.
    if (fresh.status === "approved") {
      const { data: page } = await supabaseAdmin
        .from("fundraisers")
        .select("id, status")
        .eq("request_id", data.id)
        .maybeSingle();
      if (page && page.status === "pending_approval") {
        await supabaseAdmin
          .from("fundraisers")
          .update({ status: "live", published_at: new Date().toISOString() })
          .eq("id", page.id);
      }
    }

    if (fresh.status === "declined" && fresh.event_id) {
      await supabaseAdmin.from("events").delete().eq("id", fresh.event_id);
      await supabaseAdmin.from("fundraiser_requests").update({ event_id: null }).eq("id", data.id);
    }

    // Email the submitter about the decision. Never let a mail failure undo
    // the decision that was already recorded.
    try {
      const { data: submitter } = await supabaseAdmin
        .from("profiles")
        .select("email, full_name, email_opt_out")
        .eq("id", fresh.submitted_by)
        .maybeSingle();
      const to = (submitter as { email?: string } | null)?.email ?? "";
      const optOut = (submitter as { email_opt_out?: boolean } | null)?.email_opt_out === true;
      if (to.includes("@") && !optOut) {
        const stageLabel = STAGES.find((s) => s.key === data.stage)?.label ?? "A reviewer";
        const kind = fresh.status === "approved" ? "fully_approved" : data.decision;
        const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
        await sendTemplateEmail("fundraiser-decision", to, {
          templateData: {
            requestTitle: fresh.title,
            decision: kind,
            stageLabel,
            comment: data.note ?? "",
            recipientName:
              ((submitter as { full_name?: string } | null)?.full_name ?? "").split(" ")[0] ?? "",
            reviewerEmail: String((context.claims as { email?: string } | null)?.email ?? ""),
          },
          idempotencyKey: `fr-decision-${data.id}-${data.stage}-${kind}`,
        });
      }
    } catch (error) {
      console.error("Fundraiser decision email failed", error);
    }

    // Email whoever the request now waits on, so each stage hears about it
    // rather than having to watch the queue.
    const opened = actionableStages(fresh).filter((s) => !actionableStages(request).includes(s));
    await notifyStageReviewers(fresh, opened);

    return { ok: true };

  });

/**
 * Email everyone holding the role for each stage that just opened. Mail
 * failures are logged only — approvals already recorded must stand.
 */
async function notifyStageReviewers(request: FundraiserRequest, stages: string[]) {
  if (stages.length === 0) return;
  try {
    const { STAGES } = await import("@/lib/fundraiser-requests.shared");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");

    const { data: submitter } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name")
      .eq("id", request.submitted_by)
      .maybeSingle();

    for (const key of stages) {
      const meta = STAGES.find((s) => s.key === key);
      if (!meta) continue;
      // The captain stage is a single named person, handled on submit/reassign.
      if (meta.key === "captain") continue;

      const { data: holders } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", meta.role as never);
      const ids = (holders ?? []).map((h) => h.user_id as string);
      if (ids.length === 0) continue;

      const { data: people } = await supabaseAdmin
        .from("profiles")
        .select("id, email, full_name, email_opt_out")
        .in("id", ids);

      for (const person of people ?? []) {
        const to = person.email ?? "";
        if (!to.includes("@") || person.email_opt_out === true) continue;
        try {
          await sendTemplateEmail("fundraiser-review-needed", to, {
            templateData: {
              requestTitle: request.title,
              stageLabel: meta.label,
              submitterName: submitter?.full_name ?? "",
              submitterEmail: submitter?.email ?? "",
              eventDate: request.event_date,
              recipientName: (person.full_name ?? "").split(" ")[0] ?? "",
              finalStage: meta.key === "cochair",
            },
            idempotencyKey: `fr-review-${request.id}-${meta.key}-${person.id}`,
          });
        } catch (error) {
          console.error("Fundraiser review email failed", meta.key, error);
        }
      }
    }
  } catch (error) {
    console.error("Fundraiser stage reviewer notification failed", error);
  }
}

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
