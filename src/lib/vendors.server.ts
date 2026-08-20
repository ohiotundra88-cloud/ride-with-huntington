import {
  isSimilarName,
  rollup,
  type VendorAccess,
  type VendorAuditRow,
  type VendorDetail,
  type VendorInput,
  type VendorListRow,
} from "@/lib/vendors.shared";

export type Ctx = { supabase: any; userId: string; claims?: Record<string, any> };

const actorEmail = (ctx: Ctx) => (ctx.claims?.email as string | undefined) ?? null;

// ------------------------------------------------------------------ guards

export async function getAccess(ctx: Ctx): Promise<VendorAccess> {
  const { data, error } = await ctx.supabase.from("user_roles").select("role").eq("user_id", ctx.userId);
  if (error) throw new Error(error.message);
  const roles = (data ?? []).map((r: { role: string }) => String(r.role));

  let flag = false;
  if (roles.includes("vendor_captain")) {
    const { data: prof } = await ctx.supabase
      .from("profiles")
      .select("has_vendor_dashboard_access")
      .eq("id", ctx.userId)
      .maybeSingle();
    flag = Boolean((prof as any)?.has_vendor_dashboard_access);
  }

  const isSuper = roles.includes("superuser");
  const isCochair = roles.includes("cochair");
  const allowed = isSuper || isCochair || (roles.includes("vendor_captain") && flag);

  return { allowed, roles, canArchive: isSuper || isCochair, canPurge: isSuper };
}

export async function assertVendorAccess(ctx: Ctx) {
  const access = await getAccess(ctx);
  if (!access.allowed) {
    throw new Error("The Vendor CRM is limited to vendor captains with dashboard access, co-chairs, and super users.");
  }
  return access;
}

export async function assertCanArchive(ctx: Ctx) {
  const access = await assertVendorAccess(ctx);
  if (!access.canArchive) throw new Error("Only co-chairs and super users can archive vendor records.");
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
  const { data } = await (supabaseAdmin as any).from("profiles").select("id, full_name, email").in("id", clean);
  return new Map<string, string>((data ?? []).map((p: any) => [p.id, p.full_name || p.email || "Unknown"]));
}

async function logAudit(ctx: Ctx, vendorId: string, action: string, details: Record<string, unknown> = {}) {
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
    ctx.supabase.from("vendor_donations").select("vendor_id, year, committed_amount, actual_donated_amount"),
  ]);
  if (error) throw new Error(error.message);

  const rows = (vendors ?? []) as any[];
  const names = await nameMap(rows.flatMap((v) => [v.updated_by, v.created_by]));

  return rows.map((v) => {
    const s = (spend ?? []).filter((r: any) => r.vendor_id === v.id);
    const d = (donations ?? []).filter((r: any) => r.vendor_id === v.id);
    const years = Array.from(new Set([...s.map((r: any) => r.year), ...d.map((r: any) => r.year)])).sort();
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
      rollup: rollup(s as any, d as any),
    } satisfies VendorListRow;
  });
}

export async function getVendor(ctx: Ctx, id: string): Promise<VendorDetail> {
  await assertVendorAccess(ctx);

  const { data: v, error } = await ctx.supabase.from("vendors").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!v) throw new Error("Vendor not found");

  const [{ data: contacts }, { data: spend }, { data: donations }, { data: activity }, { data: attachments }] =
    await Promise.all([
      ctx.supabase.from("vendor_contacts").select("*").eq("vendor_id", id).order("sort_order"),
      ctx.supabase.from("vendor_spend").select("*").eq("vendor_id", id).order("year"),
      ctx.supabase.from("vendor_donations").select("*").eq("vendor_id", id).order("year"),
      ctx.supabase.from("vendor_activity").select("*").eq("vendor_id", id).order("contact_date", { ascending: false }),
      ctx.supabase
        .from("vendor_attachments")
        .select("*")
        .eq("vendor_id", id)
        .order("created_at", { ascending: false }),
    ]);

  const names = await nameMap([
    (v as any).created_by,
    (v as any).updated_by,
    ...((attachments ?? []) as any[]).map((a) => a.uploaded_by),
  ]);

  return {
    ...(v as any),
    created_by_name: names.get((v as any).created_by) ?? null,
    updated_by_name: names.get((v as any).updated_by ?? (v as any).created_by) ?? null,
    contacts: (contacts ?? []) as any,
    spend: ((spend ?? []) as any[]).map((r) => ({ ...r, amount: Number(r.amount) })),
    donations: ((donations ?? []) as any[]).map((r) => ({
      ...r,
      committed_amount: Number(r.committed_amount),
      actual_donated_amount: Number(r.actual_donated_amount),
    })),
    activity: (activity ?? []) as any,
    attachments: ((attachments ?? []) as any[]).map((a) => ({
      ...a,
      uploader_name: names.get(a.uploaded_by) ?? null,
    })),
  } as VendorDetail;
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
  input: VendorInput & { contacts?: any[]; spend?: any[]; donations?: any[] },
): Promise<{ id: string; duplicates?: string[] }> {
  await assertVendorAccess(ctx);
  const data = input as any;

  // Duplicate-name guard on create.
  if (!data.id && !data.confirmDuplicate) {
    const { data: existing } = await ctx.supabase.from("vendors").select("business_name");
    const dupes = ((existing ?? []) as any[])
      .map((r) => r.business_name as string)
      .filter((n) => isSimilarName(n, data.business_name));
    if (dupes.length) return { id: "", duplicates: dupes };
  }

  const payload: Record<string, unknown> = {};
  for (const f of CORE_FIELDS) payload[f] = data[f] ?? "";
  payload["updated_by"] = ctx.userId;

  let vendorId = data.id as string | undefined;
  let changed: string[] = [];

  if (vendorId) {
    const { data: before } = await ctx.supabase.from("vendors").select("*").eq("id", vendorId).maybeSingle();
    changed = CORE_FIELDS.filter((f) => String((before as any)?.[f] ?? "") !== String(payload[f] ?? ""));
    const { error } = await ctx.supabase.from("vendors").update(payload).eq("id", vendorId);
    if (error) throw new Error(error.message);
  } else {
    const { data: row, error } = await ctx.supabase
      .from("vendors")
      .insert({ ...payload, created_by: ctx.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    vendorId = (row as any).id as string;
  }

  // Additional contacts — replace the set.
  if (Array.isArray(data.contacts)) {
    await ctx.supabase.from("vendor_contacts").delete().eq("vendor_id", vendorId);
    const rows = data.contacts
      .filter((c: any) => c.name?.trim())
      .map((c: any, i: number) => ({
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
    const keep = data.spend.filter((r: any) => Number(r.amount) > 0 || (r.notes ?? "").trim());
    await ctx.supabase.from("vendor_spend").delete().eq("vendor_id", vendorId);
    if (keep.length) {
      const { error } = await ctx.supabase.from("vendor_spend").insert(
        keep.map((r: any) => ({ vendor_id: vendorId, year: r.year, amount: r.amount, notes: r.notes ?? "" })),
      );
      if (error) throw new Error(error.message);
    }
  }
  if (Array.isArray(data.donations)) {
    const keep = data.donations.filter(
      (r: any) =>
        Number(r.committed_amount) > 0 ||
        Number(r.actual_donated_amount) > 0 ||
        (r.recipient ?? "").trim() ||
        (r.notes ?? "").trim(),
    );
    await ctx.supabase.from("vendor_donations").delete().eq("vendor_id", vendorId);
    if (keep.length) {
      const { error } = await ctx.supabase.from("vendor_donations").insert(
        keep.map((r: any) => ({
          vendor_id: vendorId,
          year: r.year,
          committed_amount: r.committed_amount,
          actual_donated_amount: r.actual_donated_amount,
          recipient: r.recipient ?? "",
          notes: r.notes ?? "",
        })),
      );
      if (error) throw new Error(error.message);
    }
  }

  await logAudit(ctx, vendorId!, data.id ? "edited" : "created", data.id ? { fields: changed } : {});
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
  const { data: v } = await ctx.supabase.from("vendors").select("id, archived").eq("id", id).maybeSingle();
  if (!v) throw new Error("Vendor not found");
  if (!(v as any).archived) throw new Error("Archive the vendor first — permanent deletion is only allowed after archiving.");

  const { data: files } = await ctx.supabase.from("vendor_attachments").select("file_path").eq("vendor_id", id);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const paths = ((files ?? []) as any[]).map((f) => f.file_path).filter(Boolean);
  if (paths.length) await supabaseAdmin.storage.from("vendor-files").remove(paths);

  const { error } = await ctx.supabase.from("vendors").delete().eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function addActivity(ctx: Ctx, input: any) {
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

export async function uploadAttachment(ctx: Ctx, data: any) {
  await assertVendorAccess(ctx);
  const bytes = Buffer.from(data.base64, "base64");
  if (bytes.byteLength > 15 * 1024 * 1024) throw new Error("File must be 15 MB or smaller.");

  const { data: vendor } = await ctx.supabase.from("vendors").select("id").eq("id", data.vendor_id).maybeSingle();
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
  await logAudit(ctx, (row as any).vendor_id, archived ? "attachment_archived" : "attachment_restored", {
    file: (row as any).file_name,
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
  if (!(row as any).archived) throw new Error("Archive the attachment first — permanent deletion is only allowed after archiving.");

  const { error } = await ctx.supabase.from("vendor_attachments").delete().eq("id", id);
  if (error) throw new Error(error.message);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.storage.from(BUCKET).remove([(row as any).file_path]);
  await logAudit(ctx, (row as any).vendor_id, "attachment_deleted", { file: (row as any).file_name });
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
  const { data: file, error } = await supabaseAdmin.storage.from(BUCKET).download((row as any).file_path);
  if (error || !file) throw new Error("File could not be read.");
  const buf = Buffer.from(await file.arrayBuffer());
  return {
    fileName: (row as any).file_name as string,
    contentType: ((row as any).content_type as string) ?? "application/octet-stream",
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
  const { data: roles, error } = await (supabaseAdmin as any)
    .from("user_roles")
    .select("user_id, created_at")
    .eq("role", "vendor_captain")
    .order("created_at");
  if (error) throw new Error(error.message);
  const ids = ((roles ?? []) as any[]).map((r) => r.user_id);
  if (!ids.length) return [];
  const { data: profiles } = await (supabaseAdmin as any)
    .from("profiles")
    .select("id, email, full_name, has_vendor_dashboard_access")
    .in("id", ids);
  const byId = new Map(((profiles ?? []) as any[]).map((p) => [p.id, p]));
  return ids.map((id: string) => {
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
  const { error } = await (supabaseAdmin as any)
    .from("profiles")
    .update({ has_vendor_dashboard_access: value })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  return { ok: true };
}
