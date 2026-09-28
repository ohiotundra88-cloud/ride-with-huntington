import {
  isSimilarName,
  rollup,
  tierFor,
  yearTotals,
  type VendorAccess,
  type VendorAuditRow,
  type VendorDetail,
  type VendorListRow,
  type VendorRiderSlotRow,
} from "@/lib/vendors.shared";
import type { z } from "zod";
import type {
  vendorActivitySchema,
  vendorFileSchema,
  vendorInputSchema,
  vendorRiderSlotSchema,
} from "@/lib/vendors.shared";
import type { AuthContext } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

type VendorRiderSlotInput = z.input<typeof vendorRiderSlotSchema>;
type VendorSaveInput = z.output<typeof vendorInputSchema>;
type VendorActivityInput = z.output<typeof vendorActivitySchema>;
type VendorFileInput = z.output<typeof vendorFileSchema>;

export type Ctx = AuthContext;

const actorEmail = (ctx: Ctx) => ctx.claims?.email ?? null;

// ------------------------------------------------------------------ guards

export async function getAccess(ctx: Ctx): Promise<VendorAccess> {
  const { data, error } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId);
  if (error) throw new Error(error.message);
  const roles = (data ?? []).map((r: { role: string }) => String(r.role));

  let flag = false;
  if (roles.includes("vendor_captain")) {
    const { data: prof } = await ctx.supabase
      .from("profiles")
      .select("has_vendor_dashboard_access")
      .eq("id", ctx.userId)
      .maybeSingle();
    flag = Boolean(prof?.has_vendor_dashboard_access);
  }

  const isSuper = roles.includes("superuser");
  const isCochair = roles.includes("cochair");
  const hasRole = isSuper || isCochair || (roles.includes("vendor_captain") && flag);

  // Site switch: when the Vendor CRM is off, only Super Users get through.
  const { vendorCrmPaused } = await import("@/lib/site-settings.server");
  const paused = await vendorCrmPaused();
  const allowed = hasRole && (!paused || isSuper);

  return {
    allowed,
    roles,
    canArchive: allowed && (isSuper || isCochair),
    canPurge: allowed && isSuper,
    paused,
  };
}

export async function assertVendorAccess(ctx: Ctx) {
  const access = await getAccess(ctx);
  if (!access.allowed) {
    if (access.paused) throw new Error("The Vendor CRM is switched off right now.");
    throw new Error(
      "The Vendor CRM is limited to vendor captains with dashboard access, co-chairs, and super users.",
    );
  }
  return access;
}

export async function assertCanArchive(ctx: Ctx) {
  const access = await assertVendorAccess(ctx);
  if (!access.canArchive)
    throw new Error("Only co-chairs and super users can archive vendor records.");
  return access;
}

export async function assertCanPurge(ctx: Ctx) {
  const access = await assertVendorAccess(ctx);
  if (!access.canPurge) throw new Error("Only super users can permanently delete vendor data.");
  return access;
}

async function nameMap(ids: string[]) {
  const clean = Array.from(new Set(ids.filter(Boolean)));
  if (!clean.length) return new Map<string, string>();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, email")
    .in("id", clean);
  return new Map<string, string>(
    (data ?? []).map((p) => [p.id, p.full_name || p.email || "Unknown"]),
  );
}

async function logAudit(
  ctx: Ctx,
  vendorId: string,
  action: string,
  details: { [key: string]: Json | undefined } = {},
) {
  await ctx.supabase.from("vendor_audit").insert({
    vendor_id: vendorId,
    action,
    actor_id: ctx.userId,
    actor_email: actorEmail(ctx),
    details,
  });
}

// ------------------------------------------------------------------ reads

export async function listVendors(ctx: Ctx, includeArchived: boolean): Promise<VendorListRow[]> {
  await assertVendorAccess(ctx);

  const [{ data: vendors, error }, { data: spend }, { data: donations }] = await Promise.all([
    ctx.supabase
      .from("vendors")
      .select(
        "id, business_name, status, business_segment, internal_business_segment, relationship_owner, archived, updated_at, updated_by, created_by",
      )
      .eq("archived", includeArchived)
      .order("business_name", { ascending: true }),
    ctx.supabase.from("vendor_spend").select("vendor_id, year, amount"),
    ctx.supabase
      .from("vendor_donations")
      .select("vendor_id, year, committed_amount, actual_donated_amount, kids_amount"),
  ]);
  if (error) throw new Error(error.message);

  const rows = vendors ?? [];
  const names = await nameMap(rows.flatMap((v) => [v.updated_by ?? "", v.created_by ?? ""]));

  return rows.map((v) => {
    const s = (spend ?? []).filter((r) => r.vendor_id === v.id);
    const d = (donations ?? []).filter((r) => r.vendor_id === v.id);
    const years = Array.from(new Set([...s.map((r) => r.year), ...d.map((r) => r.year)])).sort();
    return {
      id: v.id,
      business_name: v.business_name,
      status: v.status,
      business_segment: v.business_segment,
      internal_business_segment: v.internal_business_segment,
      relationship_owner: v.relationship_owner,
      archived: v.archived,
      updated_at: v.updated_at,
      updated_by_name: names.get(v.updated_by ?? v.created_by) ?? null,
      years,
      rollup: rollup(s, d),
      year_totals: yearTotals(d),
    } satisfies VendorListRow;
  });
}

export async function getVendor(ctx: Ctx, id: string): Promise<VendorDetail> {
  await assertVendorAccess(ctx);

  const { data: v, error } = await ctx.supabase
    .from("vendors")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!v) throw new Error("Vendor not found");

  const [
    { data: contacts },
    { data: spend },
    { data: donations },
    { data: activity },
    { data: attachments },
    { data: slots },
  ] = await Promise.all([
    ctx.supabase.from("vendor_contacts").select("*").eq("vendor_id", id).order("sort_order"),
    ctx.supabase.from("vendor_spend").select("*").eq("vendor_id", id).order("year"),
    ctx.supabase.from("vendor_donations").select("*").eq("vendor_id", id).order("year"),
    ctx.supabase
      .from("vendor_activity")
      .select("*")
      .eq("vendor_id", id)
      .order("contact_date", { ascending: false }),
    ctx.supabase
      .from("vendor_attachments")
      .select("*")
      .eq("vendor_id", id)
      .order("created_at", { ascending: false }),
    ctx.supabase
      .from("vendor_rider_slots")
      .select("*")
      .eq("vendor_id", id)
      .order("year")
      .order("slot_number"),
  ]);

  const names = await nameMap([
    v.created_by ?? "",
    v.updated_by ?? "",
    ...(attachments ?? []).map((a) => a.uploaded_by),
  ]);

  return {
    ...v,
    created_by_name: names.get(v.created_by ?? "") ?? null,
    updated_by_name: names.get(v.updated_by ?? v.created_by ?? "") ?? null,
    contacts: contacts ?? [],
    spend: (spend ?? []).map((r) => ({ ...r, amount: Number(r.amount) })),
    donations: (donations ?? []).map((r) => ({
      ...r,
      committed_amount: Number(r.committed_amount),
      actual_donated_amount: Number(r.actual_donated_amount),
      kids_amount: Number(r.kids_amount ?? 0),
    })),
    rider_slots: await withPelotonia((slots ?? []) as VendorRiderSlotRow[]),
    activity: activity ?? [],
    attachments: (attachments ?? []).map((a) => ({
      ...a,
      uploader_name: names.get(a.uploaded_by) ?? null,
    })),
  };
}

export async function listAudit(ctx: Ctx, vendorId: string): Promise<VendorAuditRow[]> {
  await assertVendorAccess(ctx);
  const { data, error } = await ctx.supabase
    .from("vendor_audit")
    .select("id, vendor_id, action, actor_email, details, created_at")
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as VendorAuditRow[];
}

// ------------------------------------------------------------------ writes

const CORE_FIELDS = [
  "business_name",
  "status",
  "business_segment",
  "internal_business_segment",
  "relationship_owner",
  "secondary_relationship_owner",
  "internal_notes",
  "primary_contact_name",
  "primary_contact_phone",
  "general_notes",
] as const;

export async function saveVendor(
  ctx: Ctx,
  data: VendorSaveInput,
): Promise<{ id: string; duplicates?: string[] }> {
  await assertVendorAccess(ctx);

  // Duplicate-name guard on create.
  if (!data.id && !data.confirmDuplicate) {
    const { data: existing } = await ctx.supabase.from("vendors").select("business_name");
    const dupes = (existing ?? [])
      .map((r) => r.business_name)
      .filter((n) => isSimilarName(n, data.business_name));
    if (dupes.length) return { id: "", duplicates: dupes };
  }

  const payload = {
    business_name: data.business_name,
    status: data.status,
    business_segment: data.business_segment ?? "",
    internal_business_segment: data.internal_business_segment ?? "",
    relationship_owner: data.relationship_owner ?? "",
    secondary_relationship_owner: data.secondary_relationship_owner ?? "",
    internal_notes: data.internal_notes ?? "",
    primary_contact_name: data.primary_contact_name,
    primary_contact_phone: data.primary_contact_phone ?? "",
    general_notes: data.general_notes ?? "",
    updated_by: ctx.userId,
  } satisfies Record<(typeof CORE_FIELDS)[number] | "updated_by", string>;

  let vendorId = data.id;
  let changed: string[] = [];

  if (vendorId) {
    const { data: before } = await ctx.supabase
      .from("vendors")
      .select("*")
      .eq("id", vendorId)
      .maybeSingle();
    changed = CORE_FIELDS.filter((f) => String(before?.[f] ?? "") !== String(payload[f] ?? ""));
    const { error } = await ctx.supabase.from("vendors").update(payload).eq("id", vendorId);
    if (error) throw new Error(error.message);
  } else {
    const { data: row, error } = await ctx.supabase
      .from("vendors")
      .insert({ ...payload, created_by: ctx.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    vendorId = row.id;
  }

  // Additional contacts — replace the set.
  if (Array.isArray(data.contacts)) {
    await ctx.supabase.from("vendor_contacts").delete().eq("vendor_id", vendorId);
    const rows = data.contacts
      .filter((c) => c.name?.trim())
      .map((c, i) => ({
        vendor_id: vendorId,
        name: c.name.trim(),
        email: c.email || null,
        title: c.title || null,
        phone: c.phone || null,
        sort_order: i,
      }));
    if (rows.length) {
      const { error } = await ctx.supabase.from("vendor_contacts").insert(rows);
      if (error) throw new Error(error.message);
    }
  }

  // Year rows — upsert supplied years, drop the rest.
  if (Array.isArray(data.spend)) {
    const keep = data.spend.filter((r) => Number(r.amount) > 0 || (r.notes ?? "").trim());
    await ctx.supabase.from("vendor_spend").delete().eq("vendor_id", vendorId);
    if (keep.length) {
      const { error } = await ctx.supabase.from("vendor_spend").insert(
        keep.map((r) => ({
          vendor_id: vendorId,
          year: r.year,
          amount: r.amount,
          notes: r.notes ?? "",
        })),
      );
      if (error) throw new Error(error.message);
    }
  }
  if (Array.isArray(data.donations)) {
    const keep = data.donations.filter(
      (r) =>
        Number(r.committed_amount) > 0 ||
        Number(r.actual_donated_amount) > 0 ||
        Number(r.kids_amount) > 0 ||
        (r.recipient ?? "").trim() ||
        (r.notes ?? "").trim(),
    );
    await ctx.supabase.from("vendor_donations").delete().eq("vendor_id", vendorId);
    if (keep.length) {
      const { error } = await ctx.supabase.from("vendor_donations").insert(
        keep.map((r) => ({
          vendor_id: vendorId,
          year: r.year,
          committed_amount: r.committed_amount,
          actual_donated_amount: r.actual_donated_amount,
          kids_amount: r.kids_amount ?? 0,
          recipient: r.recipient ?? "",
          notes: r.notes ?? "",
        })),
      );
      if (error) throw new Error(error.message);
    }
  }

  await logAudit(
    ctx,
    vendorId!,
    data.id ? "edited" : "created",
    data.id ? { fields: changed } : {},
  );
  return { id: vendorId! };
}

export async function setArchived(ctx: Ctx, id: string, archived: boolean) {
  await assertCanArchive(ctx);
  const { error } = await ctx.supabase
    .from("vendors")
    .update({
      archived,
      archived_by: archived ? ctx.userId : null,
      archived_at: archived ? new Date().toISOString() : null,
      updated_by: ctx.userId,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  await logAudit(ctx, id, archived ? "archived" : "restored");
  return { ok: true };
}

export async function purgeVendor(ctx: Ctx, id: string) {
  await assertCanPurge(ctx);
  const { data: v } = await ctx.supabase
    .from("vendors")
    .select("id, archived")
    .eq("id", id)
    .maybeSingle();
  if (!v) throw new Error("Vendor not found");
  if (!v.archived)
    throw new Error(
      "Archive the vendor first — permanent deletion is only allowed after archiving.",
    );

  const { data: files } = await ctx.supabase
    .from("vendor_attachments")
    .select("file_path")
    .eq("vendor_id", id);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const paths = (files ?? []).map((f) => f.file_path).filter(Boolean);
  if (paths.length) await supabaseAdmin.storage.from("vendor-files").remove(paths);

  const { error } = await ctx.supabase.from("vendors").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function addActivity(ctx: Ctx, input: VendorActivityInput) {
  await assertVendorAccess(ctx);
  const { error } = await ctx.supabase.from("vendor_activity").insert({
    vendor_id: input.vendor_id,
    contact_date: input.contact_date,
    contacted_by: input.contacted_by ?? "",
    contact_method: input.contact_method,
    interaction_notes: input.interaction_notes ?? "",
    next_step: input.next_step ?? "",
    created_by: ctx.userId,
  });
  if (error) throw new Error(error.message);
  await logAudit(ctx, input.vendor_id, "activity_logged", { method: input.contact_method });
  return { ok: true };
}

// ------------------------------------------------------------------ files

const BUCKET = "vendor-files";

export async function uploadAttachment(ctx: Ctx, data: VendorFileInput) {
  await assertVendorAccess(ctx);
  const bytes = Buffer.from(data.base64, "base64");
  if (bytes.byteLength > 15 * 1024 * 1024) throw new Error("File must be 15 MB or smaller.");

  const { data: vendor } = await ctx.supabase
    .from("vendors")
    .select("id")
    .eq("id", data.vendor_id)
    .maybeSingle();
  if (!vendor) throw new Error("Vendor not found");

  const ext = data.fileName.includes(".") ? data.fileName.split(".").pop()!.toLowerCase() : "bin";
  const path = `${data.vendor_id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error: upErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: data.contentType, upsert: false });
  if (upErr) throw new Error(upErr.message);

  const { error } = await ctx.supabase.from("vendor_attachments").insert({
    vendor_id: data.vendor_id,
    file_path: path,
    file_name: data.fileName,
    content_type: data.contentType,
    size_bytes: bytes.byteLength,
    uploaded_by: ctx.userId,
  });
  if (error) throw new Error(error.message);
  await logAudit(ctx, data.vendor_id, "attachment_uploaded", { file: data.fileName });
  return { ok: true };
}

export async function setAttachmentArchived(ctx: Ctx, id: string, archived: boolean) {
  await assertCanArchive(ctx);
  const { data: row, error } = await ctx.supabase
    .from("vendor_attachments")
    .update({ archived })
    .eq("id", id)
    .select("vendor_id, file_name")
    .single();
  if (error) throw new Error(error.message);
  await logAudit(ctx, row.vendor_id, archived ? "attachment_archived" : "attachment_restored", {
    file: row.file_name,
  });
  return { ok: true };
}

export async function purgeAttachment(ctx: Ctx, id: string) {
  await assertCanPurge(ctx);
  const { data: row } = await ctx.supabase
    .from("vendor_attachments")
    .select("id, vendor_id, file_path, file_name, archived")
    .eq("id", id)
    .maybeSingle();
  if (!row) throw new Error("Attachment not found");
  if (!row.archived)
    throw new Error(
      "Archive the attachment first — permanent deletion is only allowed after archiving.",
    );

  const { error } = await ctx.supabase.from("vendor_attachments").delete().eq("id", id);
  if (error) throw new Error(error.message);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.storage.from(BUCKET).remove([row.file_path]);
  await logAudit(ctx, row.vendor_id, "attachment_deleted", {
    file: row.file_name,
  });
  return { ok: true };
}

/** Same-origin, authorization-checked download (no public storage URLs). */
export async function readAttachment(ctx: Ctx, id: string) {
  await assertVendorAccess(ctx);
  const { data: row } = await ctx.supabase
    .from("vendor_attachments")
    .select("file_path, file_name, content_type")
    .eq("id", id)
    .maybeSingle();
  if (!row) throw new Error("Attachment not found");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: file, error } = await supabaseAdmin.storage.from(BUCKET).download(row.file_path);
  if (error || !file) throw new Error("File could not be read.");
  const buf = Buffer.from(await file.arrayBuffer());
  return {
    fileName: row.file_name,
    contentType: row.content_type ?? "application/octet-stream",
    base64: buf.toString("base64"),
  };
}

// ------------------------------------------------- super-user access control

export interface VendorCaptainRow {
  user_id: string;
  email: string;
  full_name: string | null;
  has_access: boolean;
}

async function assertSuper(ctx: Ctx) {
  const { data, error } = await ctx.supabase.rpc("is_superuser", { _user_id: ctx.userId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Only super users can manage vendor dashboard access.");
}

export async function listVendorCaptains(ctx: Ctx): Promise<VendorCaptainRow[]> {
  await assertSuper(ctx);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: roles, error } = await supabaseAdmin
    .from("user_roles")
    .select("user_id, created_at")
    .eq("role", "vendor_captain")
    .order("created_at");
  if (error) throw new Error(error.message);
  const ids = (roles ?? []).map((r) => r.user_id);
  if (!ids.length) return [];
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name, has_vendor_dashboard_access")
    .in("id", ids);
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  return ids.map((id) => {
    const p = byId.get(id);
    return {
      user_id: id,
      email: p?.email ?? "(unknown)",
      full_name: p?.full_name ?? null,
      has_access: Boolean(p?.has_vendor_dashboard_access),
    };
  });
}

export async function setVendorAccessFlag(ctx: Ctx, userId: string, value: boolean) {
  await assertSuper(ctx);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ has_vendor_dashboard_access: value })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

// Access probe for the nav/gate: signed-out visitors get a plain "not
// allowed" answer instead of an Unauthorized error.
export async function vendorAccessFor(
  ctx: Parameters<typeof getAccess>[0] | null,
): Promise<VendorAccess> {
  const denied: VendorAccess = { allowed: false, roles: [], canArchive: false, canPurge: false };
  if (!ctx) return denied;
  try {
    return await getAccess(ctx);
  } catch {
    return denied;
  }
}

// ---------------------------------------------------------------- rider slots

/** Adds the rider's Pelotonia name and total when the rider ID is on the roster. */
async function withPelotonia(slots: VendorRiderSlotRow[]): Promise<VendorRiderSlotRow[]> {
  const ids = slots.map((s) => s.pelotonia_id).filter(Boolean);
  if (!ids.length) return slots;
  const { ridersByPublicId } = await import("@/lib/pelotonia-data.server");
  const riders = await ridersByPublicId(ids).catch(() => new Map());
  return slots.map((s) => {
    const r = riders.get(s.pelotonia_id);
    return { ...s, pelotonia: r ? { name: r.name, raised: r.raised, subTeam: r.subTeam } : null };
  });
}

/**
 * Replaces one year's sponsored rider slots for a vendor. Slot count and hotel
 * details follow the vendor's tier for that year (Pinnacle: 5 with hotel;
 * One Goal: 2 without); anything beyond that is rejected, not silently dropped.
 */
export async function saveRiderSlots(
  ctx: Ctx,
  input: { vendor_id: string; year: number; slots: VendorRiderSlotInput[] },
) {
  await assertVendorAccess(ctx);
  const { data: donations, error: dErr } = await ctx.supabase
    .from("vendor_donations")
    .select("year, committed_amount, actual_donated_amount, kids_amount")
    .eq("vendor_id", input.vendor_id);
  if (dErr) throw new Error(dErr.message);
  const tier = tierFor(yearTotals(donations ?? []), input.year);
  const allowed = tier?.riderSlots ?? 0;
  const used = input.slots.filter((s) => s.slot_number > allowed);
  if (used.length) {
    throw new Error(
      allowed
        ? `${tier!.label} includes ${allowed} sponsored rider slot${allowed === 1 ? "" : "s"}.`
        : "Sponsored rider slots come with the Pinnacle Partner and One Goal tiers.",
    );
  }

  const rows = input.slots
    .filter((s) => s.rider_name || s.pelotonia_id || s.bike_needed || s.hotel_needed)
    .map((s) => ({
      vendor_id: input.vendor_id,
      year: input.year,
      slot_number: s.slot_number,
      rider_name: s.rider_name ?? "",
      pelotonia_id: (s.pelotonia_id ?? "").toUpperCase(),
      bike_needed: !!s.bike_needed,
      bike_size: s.bike_needed ? (s.bike_size ?? "") : "",
      hotel_needed: tier?.slotHotel ? !!s.hotel_needed : false,
      hotel_check_in:
        tier?.slotHotel && s.hotel_needed && s.hotel_check_in ? s.hotel_check_in : null,
      hotel_check_out:
        tier?.slotHotel && s.hotel_needed && s.hotel_check_out ? s.hotel_check_out : null,
      updated_by: ctx.userId,
    }));

  const { error: delErr } = await ctx.supabase
    .from("vendor_rider_slots")
    .delete()
    .eq("vendor_id", input.vendor_id)
    .eq("year", input.year);
  if (delErr) throw new Error(delErr.message);
  if (rows.length) {
    const { error } = await ctx.supabase.from("vendor_rider_slots").insert(rows);
    if (error) throw new Error(error.message);
  }
  await logAudit(ctx, input.vendor_id, "rider_slots_updated", {
    year: input.year,
    filled: rows.length,
  });
  return { ok: true as const, filled: rows.length };
}
