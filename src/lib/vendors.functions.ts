import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  vendorActivitySchema,
  vendorFileSchema,
  vendorIdSchema,
  vendorInputSchema,
  type VendorAccess,
  type VendorAuditRow,
  type VendorDetail,
  type VendorListRow,
} from "@/lib/vendors.shared";
import type { VendorCaptainRow } from "@/lib/vendors.server";

export type { VendorCaptainRow };

export const getVendorAccess = createServerFn({ method: "GET" })
  .handler(async (): Promise<VendorAccess> => {
    const { getRequestHeader } = await import("@tanstack/react-start/server");
    const header = getRequestHeader("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    const { getAccessFromToken } = await import("@/lib/vendors.server");
    return getAccessFromToken(token);
  });

export const listVendorRecords = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ archived: z.boolean().default(false) }).parse(d))
  .handler(async ({ data, context }): Promise<VendorListRow[]> => {
    const { listVendors } = await import("@/lib/vendors.server");
    return listVendors(context as any, data.archived);
  });

export const getVendorRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => vendorIdSchema.parse(d))
  .handler(async ({ data, context }): Promise<VendorDetail> => {
    const { getVendor } = await import("@/lib/vendors.server");
    return getVendor(context as any, data.id);
  });

export const saveVendorRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => vendorInputSchema.parse(d))
  .handler(async ({ data, context }): Promise<{ id: string; duplicates?: string[] }> => {
    const { saveVendor } = await import("@/lib/vendors.server");
    return saveVendor(context as any, data as any);
  });

export const archiveVendorRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), archived: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { setArchived } = await import("@/lib/vendors.server");
    return setArchived(context as any, data.id, data.archived);
  });

export const deleteVendorRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => vendorIdSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { purgeVendor } = await import("@/lib/vendors.server");
    return purgeVendor(context as any, data.id);
  });

export const logVendorActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => vendorActivitySchema.parse(d))
  .handler(async ({ data, context }) => {
    const { addActivity } = await import("@/lib/vendors.server");
    return addActivity(context as any, data);
  });

export const listVendorAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => vendorIdSchema.parse(d))
  .handler(async ({ data, context }): Promise<VendorAuditRow[]> => {
    const { listAudit } = await import("@/lib/vendors.server");
    return listAudit(context as any, data.id);
  });

export const uploadVendorAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => vendorFileSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { uploadAttachment } = await import("@/lib/vendors.server");
    return uploadAttachment(context as any, data);
  });

export const archiveVendorAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), archived: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { setAttachmentArchived } = await import("@/lib/vendors.server");
    return setAttachmentArchived(context as any, data.id, data.archived);
  });

export const deleteVendorAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => vendorIdSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { purgeAttachment } = await import("@/lib/vendors.server");
    return purgeAttachment(context as any, data.id);
  });

export const getVendorAttachment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => vendorIdSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { readAttachment } = await import("@/lib/vendors.server");
    return readAttachment(context as any, data.id);
  });

export const listVendorCaptainAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<VendorCaptainRow[]> => {
    const { listVendorCaptains } = await import("@/lib/vendors.server");
    return listVendorCaptains(context as any);
  });

export const setVendorDashboardAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ user_id: z.string().uuid(), value: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { setVendorAccessFlag } = await import("@/lib/vendors.server");
    return setVendorAccessFlag(context as any, data.user_id, data.value);
  });
