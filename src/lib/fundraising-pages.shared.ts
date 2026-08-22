import { z } from "zod";

/**
 * Mini fundraising pages — shared types, schemas and math.
 * Client-safe: no server-only imports here.
 */

export const FUNDRAISER_KINDS = ["donation", "raffle", "tickets", "sponsorship", "auction"] as const;
export type FundraiserKind = (typeof FUNDRAISER_KINDS)[number];

export const KIND_LABELS: Record<FundraiserKind, string> = {
  donation: "Donations",
  raffle: "Raffle",
  tickets: "Event tickets",
  sponsorship: "Sponsorships",
  auction: "Auction",
};

export const KIND_BLURBS: Record<FundraiserKind, string> = {
  donation: "Open-amount giving with a goal thermometer.",
  raffle: "Sell numbered raffle entries with a draw date.",
  tickets: "Sell tickets or paid registrations with limited capacity.",
  sponsorship: "Named sponsor tiers with set amounts and recognition.",
  auction: "Collect bids on lots; only the winner is charged.",
};

export const KIND_ITEM_NOUN: Record<FundraiserKind, string> = {
  donation: "Giving level",
  raffle: "Ticket bundle",
  tickets: "Ticket type",
  sponsorship: "Sponsor tier",
  auction: "Lot",
};

export const FUNDRAISER_STATUSES = [
  "draft",
  "pending_approval",
  "live",
  "closed",
  "paid_out",
  "cancelled",
] as const;
export type FundraiserStatus = (typeof FUNDRAISER_STATUSES)[number];

export const STATUS_LABELS: Record<FundraiserStatus, string> = {
  draft: "Draft",
  pending_approval: "In approval",
  live: "Live",
  closed: "Closed — pending payout",
  paid_out: "Paid out",
  cancelled: "Cancelled",
};

export const PUBLIC_STATUSES: FundraiserStatus[] = ["live", "closed", "paid_out"];

/** Demo mode fee model — mirrors typical card processing so reports look real. */
export const DEMO_FEE_PERCENT = 0.029;
export const DEMO_FEE_FLAT = 0.3;

export function estimateFee(amount: number) {
  if (amount <= 0) return 0;
  return round2(amount * DEMO_FEE_PERCENT + DEMO_FEE_FLAT);
}

export function round2(n: number) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function money(n: number | null | undefined) {
  return (Number(n) || 0).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function moneyExact(n: number | null | undefined) {
  return (Number(n) || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

// ------------------------------------------------------------------ types

export interface FundraiserItem {
  id: string;
  fundraiser_id: string;
  label: string;
  description: string;
  unit_price: number;
  quantity_available: number | null;
  quantity_sold: number;
  max_per_order: number;
  entries_per_unit: number;
  sort_order: number;
  active: boolean;
}

export interface FundraiserRecord {
  id: string;
  slug: string;
  kind: FundraiserKind;
  title: string;
  summary: string;
  story: string;
  cover_path: string | null;
  cover_name: string | null;
  flier_path: string | null;
  flier_name: string | null;
  flier_content_type: string | null;
  goal_amount: number;
  currency: string;
  opens_at: string | null;
  closes_at: string | null;
  status: FundraiserStatus;
  is_demo: boolean;
  allow_custom_amount: boolean;
  min_custom_amount: number;
  draw_at: string | null;
  beneficiary: string;
  contact_email: string | null;
  season: string;
  request_id: string | null;
  organizer_id: string;
  organizer_name: string;
  published_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FundraiserTotals {
  gross: number;
  fees: number;
  net: number;
  refunded: number;
  supporters: number;
  units: number;
  goalPercent: number;
}

export interface PublicSupporter {
  name: string;
  amount: number;
  message: string;
  at: string;
}

export interface PublicFundraiser {
  fundraiser: Pick<
    FundraiserRecord,
    | "id"
    | "slug"
    | "kind"
    | "title"
    | "summary"
    | "story"
    | "cover_path"
    | "goal_amount"
    | "closes_at"
    | "draw_at"
    | "status"
    | "is_demo"
    | "allow_custom_amount"
    | "min_custom_amount"
    | "beneficiary"
    | "organizer_name"
    | "contact_email"
  >;
  items: FundraiserItem[];
  totals: FundraiserTotals;
  supporters: PublicSupporter[];
}

export interface FundraiserOrderRow {
  id: string;
  fundraiser_id: string;
  item_id: string | null;
  supporter_name: string;
  supporter_email: string;
  quantity: number;
  amount: number;
  fee_amount: number;
  net_amount: number;
  status: "pending" | "paid" | "refunded" | "failed";
  anonymous: boolean;
  message: string;
  provider: string;
  provider_payment_id: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface FundraiserEntryRow {
  id: string;
  kind: "raffle_entry" | "auction_bid";
  entry_number: number | null;
  bid_amount: number | null;
  supporter_name: string;
  supporter_email: string;
  is_winner: boolean;
  created_at: string;
}

export interface FundraiserPayoutRow {
  id: string;
  gross_amount: number;
  fee_amount: number;
  net_amount: number;
  recipient: string;
  transfer_date: string;
  reference: string;
  notes: string;
  recorded_by_email: string | null;
  created_at: string;
}

export interface FundraiserAuditRow {
  id: string;
  action: string;
  actor_email: string | null;
  details: Record<string, string | number | boolean | null | string[]>;
  created_at: string;
}

export interface FundraiserListRow extends FundraiserRecord {
  totals: FundraiserTotals;
  paid_out_amount: number;
}

export interface FundraiserDetail {
  fundraiser: FundraiserRecord;
  items: FundraiserItem[];
  orders: FundraiserOrderRow[];
  entries: FundraiserEntryRow[];
  payouts: FundraiserPayoutRow[];
  audit: FundraiserAuditRow[];
  totals: FundraiserTotals;
}

export interface FundraiserAccess {
  signedIn: boolean;
  roles: string[];
  canCreate: boolean;
  canReview: boolean;
  canManageAll: boolean;
  canPayout: boolean;
}

// ------------------------------------------------------------------ math

export function totalsFromOrders(
  orders: Array<Pick<FundraiserOrderRow, "amount" | "fee_amount" | "net_amount" | "status" | "quantity" | "supporter_email">>,
  goal: number,
): FundraiserTotals {
  let gross = 0;
  let fees = 0;
  let net = 0;
  let refunded = 0;
  let units = 0;
  const emails = new Set<string>();

  for (const o of orders) {
    if (o.status === "paid") {
      gross += Number(o.amount) || 0;
      fees += Number(o.fee_amount) || 0;
      net += Number(o.net_amount) || 0;
      units += Number(o.quantity) || 0;
      if (o.supporter_email) emails.add(o.supporter_email.toLowerCase());
    } else if (o.status === "refunded") {
      refunded += Number(o.amount) || 0;
    }
  }

  return {
    gross: round2(gross),
    fees: round2(fees),
    net: round2(net),
    refunded: round2(refunded),
    supporters: emails.size,
    units,
    goalPercent: goal > 0 ? Math.min(100, Math.round((gross / goal) * 100)) : 0,
  };
}

export function isOpenForOrders(f: Pick<FundraiserRecord, "status" | "opens_at" | "closes_at">, now = new Date()) {
  if (f.status !== "live") return false;
  if (f.opens_at && new Date(f.opens_at) > now) return false;
  if (f.closes_at && new Date(f.closes_at) < now) return false;
  return true;
}

export function remainingQuantity(item: FundraiserItem) {
  if (item.quantity_available == null) return null;
  return Math.max(0, item.quantity_available - item.quantity_sold);
}

// ------------------------------------------------------------------ schemas

const optionalEmail = z
  .string()
  .trim()
  .max(255)
  .email("Enter a valid email address")
  .optional()
  .or(z.literal("").transform(() => undefined));

export const itemInputSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().trim().min(1, "Label is required").max(120),
  description: z.string().trim().max(600).default(""),
  unit_price: z.coerce.number().min(0, "Price cannot be negative").max(1000000),
  quantity_available: z.coerce.number().int().min(0).max(1000000).nullable().optional(),
  max_per_order: z.coerce.number().int().min(1).max(100).default(10),
  entries_per_unit: z.coerce.number().int().min(1).max(1000).default(1),
  sort_order: z.coerce.number().int().min(0).max(999).default(0),
  active: z.boolean().default(true),
});
export type ItemInput = z.infer<typeof itemInputSchema>;

export const fundraiserInputSchema = z.object({
  id: z.string().uuid().optional(),
  kind: z.enum(FUNDRAISER_KINDS),
  title: z.string().trim().min(3, "Give your fundraiser a title").max(140),
  summary: z.string().trim().max(240).default(""),
  story: z.string().trim().max(6000).default(""),
  goal_amount: z.coerce.number().min(0, "Goal cannot be negative").max(10000000).default(0),
  opens_at: z.string().trim().max(40).nullable().optional(),
  closes_at: z.string().trim().max(40).nullable().optional(),
  draw_at: z.string().trim().max(40).nullable().optional(),
  beneficiary: z.string().trim().max(160).default(""),
  contact_email: optionalEmail,
  allow_custom_amount: z.boolean().default(true),
  min_custom_amount: z.coerce.number().min(1).max(100000).default(5),
  items: z.array(itemInputSchema).max(20).default([]),
});
export type FundraiserInput = z.infer<typeof fundraiserInputSchema>;

export const checkoutSchema = z.object({
  slug: z.string().trim().min(1).max(80),
  item_id: z.string().uuid().nullable().optional(),
  quantity: z.coerce.number().int().min(1).max(100).default(1),
  custom_amount: z.coerce.number().min(0).max(1000000).nullable().optional(),
  supporter_name: z.string().trim().min(2, "Your name is required").max(120),
  supporter_email: z.string().trim().toLowerCase().email("Enter a valid email address").max(255),
  message: z.string().trim().max(500).default(""),
  anonymous: z.boolean().default(false),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const payoutSchema = z.object({
  fundraiser_id: z.string().uuid(),
  recipient: z.string().trim().min(2, "Recipient is required").max(160),
  transfer_date: z.string().trim().min(4).max(20),
  gross_amount: z.coerce.number().min(0),
  fee_amount: z.coerce.number().min(0),
  net_amount: z.coerce.number().min(0),
  reference: z.string().trim().max(120).default(""),
  notes: z.string().trim().max(1000).default(""),
});
export type PayoutInput = z.infer<typeof payoutSchema>;

export function validationIssues(input: FundraiserInput): string[] {
  const issues: string[] = [];
  if (input.kind !== "donation" && input.items.filter((i) => i.active).length === 0) {
    issues.push(`Add at least one ${KIND_ITEM_NOUN[input.kind].toLowerCase()} before going live.`);
  }
  if (input.kind === "raffle" && !input.draw_at) issues.push("Raffles need a drawing date.");
  if (!input.closes_at) issues.push("Set a close date so the fundraiser can be reconciled.");
  if (input.goal_amount <= 0) issues.push("Set a fundraising goal.");
  return issues;
}
