import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  checkoutSchema,
  fundraiserFlierSchema,
  fundraiserInputSchema,
  payoutSchema,
  FUNDRAISER_STATUSES,
  type FundraiserAccess,
  type FundraiserDetail,
  type FundraiserListRow,
  type FundraiserYearRow,
  type PublicFundraiser,
} from "@/lib/fundraising-pages.shared";

const idSchema = z.object({ id: z.string().uuid() });

/** Site-wide switch: donate/sign-up pages can be paused without touching requests. */
async function guardPages() {
  const { assertFundraiserPagesEnabled } = await import("@/lib/site-settings.server");
  await assertFundraiserPagesEnabled();
}


/** Which payment provider is active (demo vs live) — safe for anyone. */
export const getPaymentMode = createServerFn({ method: "GET" }).handler(async () => {
  const { paymentMode } = await import("@/lib/fundraising-pages.server");
  return paymentMode();
});

/** Role snapshot; returns a denied shape for signed-out visitors instead of throwing. */
export const getFundraiserAccess = createServerFn({ method: "GET" }).handler(async (): Promise<FundraiserAccess> => {
  const { getRequestHeader } = await import("@tanstack/react-start/server");
  const header = getRequestHeader("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const { DENIED_ACCESS, getAccess } = await import("@/lib/fundraising-pages.server");
  if (!token) return DENIED_ACCESS;
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const client = createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: any, init: any) => {
        const h = new Headers(init?.headers);
        h.set("apikey", key);
        h.set("Authorization", `Bearer ${token}`);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return DENIED_ACCESS;
  return getAccess({ supabase: client, userId: data.user.id, claims: { email: data.user.email } } as any);
});

// ------------------------------------------------------------------ public

export const listPublicFundraisers = createServerFn({ method: "GET" }).handler(async (): Promise<FundraiserListRow[]> => {
  await guardPages();
    const { listPublic } = await import("@/lib/fundraising-pages.server");
  return listPublic();
});

export const getPublicFundraiser = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ slug: z.string().trim().min(1).max(80) }).parse(d))
  .handler(async ({ data }): Promise<PublicFundraiser> => {
    await guardPages();
    const { getPublic } = await import("@/lib/fundraising-pages.server");
    return getPublic(data.slug);
  });

export const startCheckout = createServerFn({ method: "POST" })
  .inputValidator((d) => checkoutSchema.parse(d))
  .handler(async ({ data }) => {
    const { getRequestUrl } = await import("@tanstack/react-start/server");
    const origin = new URL(getRequestUrl()).origin;
    await guardPages();
    const { createOrder } = await import("@/lib/fundraising-pages.server");
    return createOrder(data, origin);
  });

export const getOrderReceipt = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ order_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await guardPages();
    const { getReceipt } = await import("@/lib/fundraising-pages.server");
    return getReceipt(data.order_id);
  });

// ------------------------------------------------------------------ organizer / admin

export const listMyFundraisers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ all: z.boolean().default(false) }).parse(d))
  .handler(async ({ data, context }): Promise<FundraiserListRow[]> => {
    await guardPages();
    const { listMine } = await import("@/lib/fundraising-pages.server");
    return listMine(context as any, data.all);
  });

export const getFundraiserDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => idSchema.parse(d))
  .handler(async ({ data, context }): Promise<FundraiserDetail> => {
    await guardPages();
    const { getDetail } = await import("@/lib/fundraising-pages.server");
    return getDetail(context as any, data.id);
  });

export const getFundraiserApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ request_id: z.string().uuid().nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    const { approvalState } = await import("@/lib/fundraising-pages.server");
    return approvalState(context as any, data.request_id);
  });

export const saveFundraiserPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => fundraiserInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    await guardPages();
    const { saveFundraiser } = await import("@/lib/fundraising-pages.server");
    return saveFundraiser(context as any, data);
  });

export const submitFundraiserForApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { submitForApproval } = await import("@/lib/fundraising-pages.server");
    return submitForApproval(context as any, data.id);
  });

export const setFundraiserStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), status: z.enum(FUNDRAISER_STATUSES) }).parse(d))
  .handler(async ({ data, context }) => {
    const { setStatus } = await import("@/lib/fundraising-pages.server");
    return setStatus(context as any, data.id, data.status);
  });

export const setFundraiserPublicVisibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), hidden: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { setPublicVisibility } = await import("@/lib/fundraising-pages.server");
    return setPublicVisibility(context as any, data.id, data.hidden);
  });

export const getFundraiserYearSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FundraiserYearRow[]> => {
    const { yearlySummary } = await import("@/lib/fundraising-pages.server");
    return yearlySummary(context as any);
  });

export const refundFundraiserOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ order_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await guardPages();
    const { refundOrder } = await import("@/lib/fundraising-pages.server");
    return refundOrder(context as any, data.order_id);
  });

export const recordFundraiserPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => payoutSchema.parse(d))
  .handler(async ({ data, context }) => {
    await guardPages();
    const { recordPayout } = await import("@/lib/fundraising-pages.server");
    return recordPayout(context as any, data);
  });

export const drawFundraiserWinner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    await guardPages();
    const { drawRaffleWinner } = await import("@/lib/fundraising-pages.server");
    return drawRaffleWinner(context as any, data.id);
  });

export const seedFundraiserDemoSupporters = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), count: z.coerce.number().int().min(1).max(25).default(8) }).parse(d))
  .handler(async ({ data, context }) => {
    await guardPages();
    const { seedDemoSupporters } = await import("@/lib/fundraising-pages.server");
    return seedDemoSupporters(context as any, data.id, data.count);
  });

// ------------------------------------------------------------------ flier attachment

export const uploadFundraiserFlier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => fundraiserFlierSchema.parse(d))
  .handler(async ({ data, context }) => {
    await guardPages();
    const { setFlier } = await import("@/lib/fundraising-pages.server");
    return setFlier(context as any, data);
  });

export const removeFundraiserFlier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    await guardPages();
    const { clearFlier } = await import("@/lib/fundraising-pages.server");
    return clearFlier(context as any, data.id);
  });
