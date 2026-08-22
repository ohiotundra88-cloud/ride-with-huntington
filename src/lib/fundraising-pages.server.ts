import {
  estimateFee,
  isOpenForOrders,
  remainingQuantity,
  round2,
  slugify,
  totalsFromOrders,
  type CheckoutInput,
  type FundraiserAccess,
  type FundraiserAuditRow,
  type FundraiserDetail,
  type FundraiserEntryRow,
  type FundraiserInput,
  type FundraiserItem,
  type FundraiserListRow,
  type FundraiserOrderRow,
  type FundraiserPayoutRow,
  type FundraiserRecord,
  type FundraiserStatus,
  type PayoutInput,
  type PublicFundraiser,
  type PublicSupporter,
} from "@/lib/fundraising-pages.shared";
import { activeProvider } from "@/lib/payments/demo.server";

export type Ctx = { supabase: any; userId: string; claims?: Record<string, any> };

const LEADERSHIP = ["admin", "superuser", "captain", "legal", "risk", "compliance", "marketing", "cochair"];
const PAYOUT_ROLES = ["cochair", "superuser", "admin"];

const actorEmail = (ctx: Ctx) => (ctx.claims?.email as string | undefined) ?? null;

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

/** Publishable-key client for public reads (RLS applies as anon). */
async function publicClient() {
  const { createClient } = await import("@supabase/supabase-js");
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: any, init: any) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  }) as any;
}

// ------------------------------------------------------------------ access

export async function getAccess(ctx: Ctx): Promise<FundraiserAccess> {
  const { data } = await ctx.supabase.from("user_roles").select("role").eq("user_id", ctx.userId);
  const roles = (data ?? []).map((r: { role: string }) => String(r.role));
  const canManageAll = roles.some((r: string) => LEADERSHIP.includes(r));
  return {
    signedIn: true,
    roles,
    canCreate: true,
    canReview: canManageAll,
    canManageAll,
    canPayout: roles.some((r: string) => PAYOUT_ROLES.includes(r)),
  };
}

export const DENIED_ACCESS: FundraiserAccess = {
  signedIn: false,
  roles: [],
  canCreate: false,
  canReview: false,
  canManageAll: false,
  canPayout: false,
};

export function paymentMode() {
  const p = activeProvider();
  return { provider: p.id, live: p.live };
}

// ------------------------------------------------------------------ helpers

async function audit(fundraiserId: string, action: string, ctx: Ctx | null, details: Record<string, unknown> = {}) {
  const db = await admin();
  await db.from("fundraiser_audit").insert({
    fundraiser_id: fundraiserId,
    action,
    actor_id: ctx?.userId ?? null,
    actor_email: ctx ? actorEmail(ctx) : null,
    details,
  });
}

async function uniqueSlug(base: string, ignoreId?: string) {
  const db = await admin();
  const root = slugify(base) || "fundraiser";
  let candidate = root;
  for (let i = 2; i < 60; i++) {
    const { data } = await db.from("fundraisers").select("id").eq("slug", candidate).maybeSingle();
    if (!data || (ignoreId && data.id === ignoreId)) return candidate;
    candidate = `${root}-${i}`;
  }
  return `${root}-${Date.now()}`;
}

async function ordersFor(db: any, fundraiserId: string) {
  const { data } = await db
    .from("fundraiser_orders")
    .select(
      "id, fundraiser_id, item_id, supporter_name, supporter_email, quantity, amount, fee_amount, net_amount, status, anonymous, message, provider, provider_payment_id, paid_at, created_at",
    )
    .eq("fundraiser_id", fundraiserId)
    .order("created_at", { ascending: false });
  return (data ?? []) as FundraiserOrderRow[];
}

async function assertManageable(ctx: Ctx, id: string) {
  const access = await getAccess(ctx);
  const db = await admin();
  const { data } = await db.from("fundraisers").select("*").eq("id", id).maybeSingle();
  if (!data) throw new Error("That fundraiser no longer exists.");
  const owned = data.organizer_id === ctx.userId;
  if (!owned && !access.canManageAll) throw new Error("You can only manage fundraisers you created.");
  return { access, record: data as FundraiserRecord, owned };
}

// ------------------------------------------------------------------ public reads

export async function listPublic(): Promise<FundraiserListRow[]> {
  const client = await publicClient();
  const { data, error } = await client
    .from("fundraisers")
    .select("*")
    .in("status", ["live", "closed", "paid_out"])
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as FundraiserRecord[];
  if (rows.length === 0) return [];

  const db = await admin();
  const { data: orders } = await db
    .from("fundraiser_orders")
    .select("fundraiser_id, amount, fee_amount, net_amount, status, quantity, supporter_email")
    .in(
      "fundraiser_id",
      rows.map((r) => r.id),
    );

  return rows.map((r) => ({
    ...r,
    totals: totalsFromOrders(
      ((orders ?? []) as any[]).filter((o) => o.fundraiser_id === r.id),
      Number(r.goal_amount),
    ),
    paid_out_amount: 0,
  }));
}

export async function getPublic(slug: string): Promise<PublicFundraiser> {
  const client = await publicClient();
  const { data: f, error } = await client
    .from("fundraisers")
    .select("*")
    .eq("slug", slug)
    .in("status", ["live", "closed", "paid_out"])
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!f) throw new Error("That fundraiser page isn't available.");

  const { data: items } = await client
    .from("fundraiser_items")
    .select("*")
    .eq("fundraiser_id", f.id)
    .eq("active", true)
    .order("sort_order", { ascending: true });

  const db = await admin();
  const orders = await ordersFor(db, f.id);
  const totals = totalsFromOrders(orders, Number(f.goal_amount));

  const supporters: PublicSupporter[] = orders
    .filter((o) => o.status === "paid")
    .slice(0, 25)
    .map((o) => ({
      name: o.anonymous ? "Anonymous" : o.supporter_name || "Anonymous",
      amount: Number(o.amount),
      message: o.message ?? "",
      at: o.created_at,
    }));

  return {
    fundraiser: {
      id: f.id,
      slug: f.slug,
      kind: f.kind,
      title: f.title,
      summary: f.summary,
      story: f.story,
      cover_path: f.cover_path,
      goal_amount: Number(f.goal_amount),
      closes_at: f.closes_at,
      draw_at: f.draw_at,
      status: f.status,
      is_demo: f.is_demo,
      allow_custom_amount: f.allow_custom_amount,
      min_custom_amount: Number(f.min_custom_amount),
      beneficiary: f.beneficiary,
      organizer_name: f.organizer_name,
      contact_email: f.contact_email,
    },
    items: ((items ?? []) as FundraiserItem[]).map((i) => ({ ...i, unit_price: Number(i.unit_price) })),
    totals,
    supporters,
  };
}

// ------------------------------------------------------------------ checkout (public)

export async function createOrder(input: CheckoutInput, origin: string) {
  const db = await admin();
  const { data: f } = await db.from("fundraisers").select("*").eq("slug", input.slug).maybeSingle();
  if (!f) throw new Error("That fundraiser page isn't available.");
  if (!isOpenForOrders(f)) throw new Error("This fundraiser is no longer accepting contributions.");

  let item: FundraiserItem | null = null;
  let amount = 0;
  let quantity = input.quantity;

  if (input.item_id) {
    const { data: it } = await db
      .from("fundraiser_items")
      .select("*")
      .eq("id", input.item_id)
      .eq("fundraiser_id", f.id)
      .maybeSingle();
    if (!it || !it.active) throw new Error("That option is no longer available.");
    item = { ...it, unit_price: Number(it.unit_price) } as FundraiserItem;

    if (quantity > item.max_per_order) throw new Error(`You can buy at most ${item.max_per_order} at a time.`);
    const left = remainingQuantity(item);
    if (left !== null && quantity > left) {
      throw new Error(left === 0 ? "That option is sold out." : `Only ${left} left.`);
    }
    // Server-side pricing only — the client total is never trusted.
    amount = round2(item.unit_price * quantity);
  } else {
    if (!f.allow_custom_amount) throw new Error("Please choose one of the options listed.");
    quantity = 1;
    amount = round2(Number(input.custom_amount ?? 0));
    if (amount < Number(f.min_custom_amount)) {
      throw new Error(`The minimum amount is $${Number(f.min_custom_amount).toFixed(0)}.`);
    }
  }

  if (amount <= 0) throw new Error("Enter an amount greater than zero.");

  const fee = estimateFee(amount);
  const provider = activeProvider();

  const { data: order, error } = await db
    .from("fundraiser_orders")
    .insert({
      fundraiser_id: f.id,
      item_id: item?.id ?? null,
      supporter_name: input.supporter_name,
      supporter_email: input.supporter_email,
      quantity,
      amount,
      fee_amount: fee,
      net_amount: round2(amount - fee),
      status: "pending",
      anonymous: input.anonymous,
      message: input.message,
      provider: provider.id,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const checkout = await provider.createCheckout({
    orderId: order.id,
    amount,
    currency: f.currency ?? "USD",
    description: `${f.title}${item ? ` — ${item.label}` : ""}`,
    supporterEmail: input.supporter_email,
    successUrl: `${origin}/fundraisers/${f.slug}/thanks?order=${order.id}`,
    cancelUrl: `${origin}/fundraisers/${f.slug}`,
  });

  await db
    .from("fundraiser_orders")
    .update({ provider_session_id: checkout.sessionId, provider_payment_id: checkout.paymentId })
    .eq("id", order.id);

  if (checkout.settledImmediately) {
    await settleOrder(order.id);
  }

  return { order_id: order.id as string, redirect_url: checkout.redirectUrl, slug: f.slug as string };
}

/** Marks an order paid, decrements inventory and mints raffle entries. Idempotent. */
export async function settleOrder(orderId: string) {
  const db = await admin();
  const { data: order } = await db.from("fundraiser_orders").select("*").eq("id", orderId).maybeSingle();
  if (!order) throw new Error("Order not found.");
  if (order.status === "paid") return { ok: true, already: true };

  await db
    .from("fundraiser_orders")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("status", "pending");

  const { data: f } = await db.from("fundraisers").select("id, kind").eq("id", order.fundraiser_id).maybeSingle();

  let item: any = null;
  if (order.item_id) {
    const { data: it } = await db.from("fundraiser_items").select("*").eq("id", order.item_id).maybeSingle();
    item = it;
    if (it) {
      await db
        .from("fundraiser_items")
        .update({ quantity_sold: (it.quantity_sold ?? 0) + order.quantity })
        .eq("id", it.id);
    }
  }

  if (f?.kind === "raffle") {
    const per = Number(item?.entries_per_unit ?? 1) || 1;
    const count = per * Number(order.quantity || 1);
    const { count: existing } = await db
      .from("fundraiser_entries")
      .select("id", { count: "exact", head: true })
      .eq("fundraiser_id", order.fundraiser_id)
      .eq("kind", "raffle_entry");
    const start = (existing ?? 0) + 1;
    const rows = Array.from({ length: count }, (_, i) => ({
      fundraiser_id: order.fundraiser_id,
      order_id: order.id,
      item_id: order.item_id,
      kind: "raffle_entry",
      entry_number: start + i,
      supporter_name: order.supporter_name,
      supporter_email: order.supporter_email,
    }));
    if (rows.length > 0) await db.from("fundraiser_entries").insert(rows);
  }

  if (f?.kind === "auction") {
    await db.from("fundraiser_entries").insert({
      fundraiser_id: order.fundraiser_id,
      order_id: order.id,
      item_id: order.item_id,
      kind: "auction_bid",
      bid_amount: order.amount,
      supporter_name: order.supporter_name,
      supporter_email: order.supporter_email,
    });
  }

  await audit(order.fundraiser_id, "order_paid", null, {
    order_id: order.id,
    amount: Number(order.amount),
    supporter: order.anonymous ? "Anonymous" : order.supporter_name,
  });

  return { ok: true, already: false };
}

export async function getReceipt(orderId: string) {
  const db = await admin();
  const { data: order } = await db
    .from("fundraiser_orders")
    .select("id, fundraiser_id, supporter_name, quantity, amount, fee_amount, status, created_at, item_id, anonymous")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) throw new Error("We couldn't find that confirmation.");
  const { data: f } = await db
    .from("fundraisers")
    .select("title, slug, kind, beneficiary, is_demo")
    .eq("id", order.fundraiser_id)
    .maybeSingle();
  let itemLabel: string | null = null;
  if (order.item_id) {
    const { data: it } = await db.from("fundraiser_items").select("label").eq("id", order.item_id).maybeSingle();
    itemLabel = it?.label ?? null;
  }
  let entryNumbers: number[] = [];
  if (f?.kind === "raffle") {
    const { data: entries } = await db
      .from("fundraiser_entries")
      .select("entry_number")
      .eq("order_id", order.id)
      .order("entry_number", { ascending: true });
    entryNumbers = ((entries ?? []) as any[]).map((e) => Number(e.entry_number)).filter(Boolean);
  }
  return {
    order: {
      id: order.id,
      supporter_name: order.supporter_name,
      quantity: order.quantity,
      amount: Number(order.amount),
      status: order.status,
      created_at: order.created_at,
    },
    fundraiser: f,
    item_label: itemLabel,
    entry_numbers: entryNumbers,
  };
}

// ------------------------------------------------------------------ organizer / admin reads

export async function listMine(ctx: Ctx, all: boolean): Promise<FundraiserListRow[]> {
  const access = await getAccess(ctx);
  const db = await admin();
  let q = db.from("fundraisers").select("*").order("created_at", { ascending: false });
  if (!(all && access.canManageAll)) q = q.eq("organizer_id", ctx.userId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as FundraiserRecord[];
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const { data: orders } = await db
    .from("fundraiser_orders")
    .select("fundraiser_id, amount, fee_amount, net_amount, status, quantity, supporter_email")
    .in("fundraiser_id", ids);
  const { data: payouts } = await db.from("fundraiser_payouts").select("fundraiser_id, net_amount").in("fundraiser_id", ids);

  return rows.map((r) => ({
    ...r,
    goal_amount: Number(r.goal_amount),
    totals: totalsFromOrders(
      ((orders ?? []) as any[]).filter((o) => o.fundraiser_id === r.id),
      Number(r.goal_amount),
    ),
    paid_out_amount: round2(
      ((payouts ?? []) as any[]).filter((p) => p.fundraiser_id === r.id).reduce((s, p) => s + Number(p.net_amount), 0),
    ),
  }));
}

export async function getDetail(ctx: Ctx, id: string): Promise<FundraiserDetail> {
  const { record } = await assertManageable(ctx, id);
  const db = await admin();

  const [{ data: items }, orders, { data: entries }, { data: payouts }, { data: auditRows }] = await Promise.all([
    db.from("fundraiser_items").select("*").eq("fundraiser_id", id).order("sort_order", { ascending: true }),
    ordersFor(db, id),
    db
      .from("fundraiser_entries")
      .select("id, kind, entry_number, bid_amount, supporter_name, supporter_email, is_winner, created_at")
      .eq("fundraiser_id", id)
      .order("created_at", { ascending: false })
      .limit(500),
    db
      .from("fundraiser_payouts")
      .select("id, gross_amount, fee_amount, net_amount, recipient, transfer_date, reference, notes, recorded_by_email, created_at")
      .eq("fundraiser_id", id)
      .order("created_at", { ascending: false }),
    db
      .from("fundraiser_audit")
      .select("id, action, actor_email, details, created_at")
      .eq("fundraiser_id", id)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  return {
    fundraiser: { ...record, goal_amount: Number(record.goal_amount) },
    items: ((items ?? []) as any[]).map((i) => ({ ...i, unit_price: Number(i.unit_price) })) as FundraiserItem[],
    orders,
    entries: (entries ?? []) as FundraiserEntryRow[],
    payouts: (payouts ?? []) as FundraiserPayoutRow[],
    audit: (auditRows ?? []) as FundraiserAuditRow[],
    totals: totalsFromOrders(orders, Number(record.goal_amount)),
  };
}

// ------------------------------------------------------------------ writes

function nullableTs(v: string | null | undefined) {
  return v && v.trim() !== "" ? new Date(v).toISOString() : null;
}

export async function saveFundraiser(ctx: Ctx, input: FundraiserInput) {
  const db = await admin();
  const isNew = !input.id;
  let organizerName = (ctx.claims?.email as string) ?? "";
  const { data: prof } = await db.from("profiles").select("full_name, email").eq("id", ctx.userId).maybeSingle();
  if (prof?.full_name) organizerName = prof.full_name;

  if (!isNew) await assertManageable(ctx, input.id!);

  const base = {
    kind: input.kind,
    title: input.title,
    summary: input.summary,
    story: input.story,
    goal_amount: input.goal_amount,
    opens_at: nullableTs(input.opens_at),
    closes_at: nullableTs(input.closes_at),
    draw_at: nullableTs(input.draw_at),
    beneficiary: input.beneficiary,
    contact_email: input.contact_email ?? null,
    allow_custom_amount: input.allow_custom_amount,
    min_custom_amount: input.min_custom_amount,
  };

  let id = input.id ?? "";
  if (isNew) {
    const slug = await uniqueSlug(input.title);
    const { data, error } = await db
      .from("fundraisers")
      .insert({ ...base, slug, organizer_id: ctx.userId, organizer_name: organizerName, status: "draft" })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    id = data.id;
    await audit(id, "created", ctx, { title: input.title, kind: input.kind });
  } else {
    const { error } = await db.from("fundraisers").update(base).eq("id", id);
    if (error) throw new Error(error.message);
    await audit(id, "edited", ctx, { fields: Object.keys(base) });
  }

  // Items: upsert the submitted set, remove the ones dropped from the form.
  const { data: existing } = await db.from("fundraiser_items").select("id").eq("fundraiser_id", id);
  const keep = new Set(input.items.map((i) => i.id).filter(Boolean) as string[]);
  const remove = ((existing ?? []) as any[]).map((e) => e.id).filter((eid: string) => !keep.has(eid));
  if (remove.length > 0) await db.from("fundraiser_items").delete().in("id", remove);

  for (const [idx, item] of input.items.entries()) {
    const row = {
      fundraiser_id: id,
      label: item.label,
      description: item.description,
      unit_price: item.unit_price,
      quantity_available: item.quantity_available ?? null,
      max_per_order: item.max_per_order,
      entries_per_unit: item.entries_per_unit,
      sort_order: item.sort_order ?? idx,
      active: item.active,
    };
    if (item.id) await db.from("fundraiser_items").update(row).eq("id", item.id);
    else await db.from("fundraiser_items").insert(row);
  }

  return { id };
}

export async function submitForApproval(ctx: Ctx, id: string) {
  const { record } = await assertManageable(ctx, id);
  const db = await admin();
  if (record.status !== "draft") throw new Error("Only drafts can be submitted for approval.");

  let requestId = record.request_id;
  if (!requestId) {
    const { data: req, error } = await db
      .from("fundraiser_requests")
      .insert({
        title: record.title,
        description: record.summary || record.story || record.title,
        event_type: record.kind,
        event_date: (record.closes_at ?? new Date().toISOString()).slice(0, 10),
        fundraising_method: `Online fundraising page (${record.kind})`,
        contact_name: record.organizer_name,
        contact_email: record.contact_email ?? (ctx.claims?.email as string) ?? null,
        submitted_by: ctx.userId,
        season: record.season,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    requestId = req.id;
  }

  const { error: upErr } = await db
    .from("fundraisers")
    .update({ status: "pending_approval", request_id: requestId })
    .eq("id", id);
  if (upErr) throw new Error(upErr.message);
  await audit(id, "submitted_for_approval", ctx, { request_id: requestId });
  return { ok: true, request_id: requestId };
}

export async function approvalState(ctx: Ctx, requestId: string | null) {
  if (!requestId) return null;
  const db = await admin();
  const { data } = await db
    .from("fundraiser_requests")
    .select("id, status, captain_status, legal_status, risk_status, compliance_status, marketing_status, cochair_status")
    .eq("id", requestId)
    .maybeSingle();
  return data ?? null;
}

export async function setStatus(ctx: Ctx, id: string, status: FundraiserStatus) {
  const { record, access } = await assertManageable(ctx, id);
  const db = await admin();

  if (status === "live") {
    if (!access.canManageAll) throw new Error("A captain or co-chair publishes the page once approvals are complete.");
    const state = await approvalState(ctx, record.request_id);
    const stages = ["captain_status", "legal_status", "risk_status", "compliance_status", "marketing_status", "cochair_status"];
    if (!state || stages.some((s) => (state as any)[s] !== "approved")) {
      throw new Error("Every approval stage must be approved before this page can go live.");
    }
  }
  if (status === "paid_out" && !access.canPayout) throw new Error("Only co-chairs and super users can close out payouts.");

  const patch: Record<string, unknown> = { status };
  if (status === "live") patch.published_at = new Date().toISOString();
  if (status === "closed") patch.closed_at = new Date().toISOString();

  const { error } = await db.from("fundraisers").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  await audit(id, `status_${status}`, ctx, { from: record.status });
  return { ok: true };
}

export async function refundOrder(ctx: Ctx, orderId: string) {
  const db = await admin();
  const { data: order } = await db.from("fundraiser_orders").select("*").eq("id", orderId).maybeSingle();
  if (!order) throw new Error("Order not found.");
  const { access } = await assertManageable(ctx, order.fundraiser_id);
  if (!access.canPayout) throw new Error("Only co-chairs and super users can issue refunds.");
  if (order.status !== "paid") throw new Error("Only paid contributions can be refunded.");

  const provider = activeProvider();
  const result = await provider.refund(order.provider_payment_id, Number(order.amount));

  await db
    .from("fundraiser_orders")
    .update({ status: "refunded", refunded_at: new Date().toISOString() })
    .eq("id", orderId);
  if (order.item_id) {
    const { data: it } = await db.from("fundraiser_items").select("quantity_sold").eq("id", order.item_id).maybeSingle();
    if (it) {
      await db
        .from("fundraiser_items")
        .update({ quantity_sold: Math.max(0, (it.quantity_sold ?? 0) - order.quantity) })
        .eq("id", order.item_id);
    }
  }
  await db.from("fundraiser_entries").delete().eq("order_id", orderId);
  await audit(order.fundraiser_id, "order_refunded", ctx, { order_id: orderId, amount: Number(order.amount), refund_id: result.refundId });
  return { ok: true };
}

export async function recordPayout(ctx: Ctx, input: PayoutInput) {
  const { access } = await assertManageable(ctx, input.fundraiser_id);
  if (!access.canPayout) throw new Error("Only co-chairs and super users can record payouts.");
  const db = await admin();
  const { error } = await db.from("fundraiser_payouts").insert({
    fundraiser_id: input.fundraiser_id,
    gross_amount: input.gross_amount,
    fee_amount: input.fee_amount,
    net_amount: input.net_amount,
    recipient: input.recipient,
    transfer_date: input.transfer_date,
    reference: input.reference,
    notes: input.notes,
    recorded_by: ctx.userId,
    recorded_by_email: actorEmail(ctx),
  });
  if (error) throw new Error(error.message);
  await db.from("fundraisers").update({ status: "paid_out" }).eq("id", input.fundraiser_id);
  await audit(input.fundraiser_id, "payout_recorded", ctx, {
    net: input.net_amount,
    recipient: input.recipient,
    reference: input.reference,
  });
  return { ok: true };
}

export async function drawRaffleWinner(ctx: Ctx, id: string) {
  const { record, access } = await assertManageable(ctx, id);
  if (!access.canManageAll) throw new Error("A captain or co-chair runs the drawing.");
  if (record.kind !== "raffle") throw new Error("Only raffles have a drawing.");
  const db = await admin();
  const { data: entries } = await db
    .from("fundraiser_entries")
    .select("id, entry_number, supporter_name, supporter_email")
    .eq("fundraiser_id", id)
    .eq("kind", "raffle_entry");
  const pool = (entries ?? []) as any[];
  if (pool.length === 0) throw new Error("There are no entries to draw from yet.");
  const winner = pool[Math.floor(Math.random() * pool.length)];
  await db.from("fundraiser_entries").update({ is_winner: false }).eq("fundraiser_id", id);
  await db.from("fundraiser_entries").update({ is_winner: true }).eq("id", winner.id);
  await audit(id, "raffle_drawn", ctx, { entry_number: winner.entry_number, supporter: winner.supporter_name });
  return { entry_number: winner.entry_number as number, supporter_name: winner.supporter_name as string };
}

const DEMO_NAMES = [
  "Avery Bennett", "Jordan Ellis", "Riley Chen", "Morgan Patel", "Casey Nguyen",
  "Devon Brooks", "Harper Diaz", "Quinn Walker", "Sasha Romano", "Toby Fischer",
];

export async function seedDemoSupporters(ctx: Ctx, id: string, count: number) {
  const { record, access } = await assertManageable(ctx, id);
  if (!access.canManageAll) throw new Error("Only leadership can seed demo supporters.");
  if (!record.is_demo) throw new Error("Demo seeding is disabled once real payments are enabled.");
  const db = await admin();
  const { data: items } = await db.from("fundraiser_items").select("*").eq("fundraiser_id", id).eq("active", true);
  const pool = (items ?? []) as any[];

  let created = 0;
  for (let i = 0; i < count; i++) {
    const name = DEMO_NAMES[Math.floor(Math.random() * DEMO_NAMES.length)]!;
    const email = `${name.toLowerCase().replace(/\s+/g, ".")}.${i}@demo.invalid`;
    const item = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;
    const quantity = item ? 1 + Math.floor(Math.random() * Math.min(3, item.max_per_order || 1)) : 1;
    const amount = item ? round2(Number(item.unit_price) * quantity) : round2(25 + Math.floor(Math.random() * 8) * 25);
    if (amount <= 0) continue;
    const fee = estimateFee(amount);
    const { data: order } = await db
      .from("fundraiser_orders")
      .insert({
        fundraiser_id: id,
        item_id: item?.id ?? null,
        supporter_name: name,
        supporter_email: email,
        quantity,
        amount,
        fee_amount: fee,
        net_amount: round2(amount - fee),
        status: "pending",
        provider: "demo",
        message: "Go Team Huntington!",
      })
      .select("id")
      .single();
    if (order) {
      await settleOrder(order.id);
      created++;
    }
  }
  await audit(id, "demo_supporters_seeded", ctx, { count: created });
  return { created };
}
