import { z } from "zod";

/** Sentinel year used for the "Beyond" bucket so years stay dynamic rows. */
export const BEYOND_YEAR = 9999;
export const DEFAULT_YEARS = [2024, 2025, 2026, 2027, BEYOND_YEAR] as const;

export function yearLabel(year: number) {
  return year === BEYOND_YEAR ? "Beyond" : String(year);
}

export const VENDOR_STATUSES = ["Active", "Prospect", "Inactive"] as const;
export const CONTACT_METHODS = ["Phone", "Email", "In-Person", "Video Call", "Other"] as const;

export const BUSINESS_SEGMENTS = [
  "Consumer & Regional Banking",
  "Commercial Banking",
  "Wealth & Investment Management",
  "Vehicle Finance",
  "Technology",
  "Operations",
  "Marketing",
  "Risk & Compliance",
  "Human Resources",
  "Corporate & Other",
] as const;

export const MAX_ADDITIONAL_CONTACTS = 10;
export const HIGH_SPEND_THRESHOLD = 25000;
export const MAX_VENDOR_FILE_BYTES = 15 * 1024 * 1024;

export const ALLOWED_VENDOR_FILE_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
] as const;

// ---------------------------------------------------------------- validation

const phoneOptional = z
  .string()
  .trim()
  .max(40)
  .refine((v) => v === "" || /^[+()\-.\s\d x]{7,40}$/i.test(v), "Enter a valid phone number")
  .optional()
  .default("");

const emailOptional = z
  .string()
  .trim()
  .max(160)
  .refine((v) => v === "" || z.string().email().safeParse(v).success, "Enter a valid email address")
  .optional()
  .default("");

export const vendorContactSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Contact name is required").max(120),
  email: emailOptional,
  title: z.string().trim().max(120).optional().default(""),
  phone: phoneOptional,
});

export const vendorSpendSchema = z.object({
  year: z.number().int().min(2000).max(BEYOND_YEAR),
  amount: z.number().min(0, "Amount can't be negative"),
  notes: z.string().trim().max(2000).optional().default(""),
});

export const vendorDonationSchema = z.object({
  year: z.number().int().min(2000).max(BEYOND_YEAR),
  committed_amount: z.number().min(0, "Amount can't be negative"),
  actual_donated_amount: z.number().min(0, "Amount can't be negative"),
  kids_amount: z.number().min(0, "Amount can't be negative").optional().default(0),
  recipient: z.string().trim().max(200).optional().default(""),
  notes: z.string().trim().max(2000).optional().default(""),
});

export const vendorActivitySchema = z.object({
  vendor_id: z.string().uuid(),
  contact_date: z.string().min(4),
  contacted_by: z.string().trim().max(160).optional().default(""),
  contact_method: z.enum(CONTACT_METHODS),
  interaction_notes: z.string().trim().max(4000).optional().default(""),
  next_step: z.string().trim().max(1000).optional().default(""),
});

export const vendorInputSchema = z.object({
  id: z.string().uuid().optional(),
  business_name: z.string().trim().min(2, "Business name is required").max(200),
  status: z.enum(VENDOR_STATUSES),
  business_segment: z.string().trim().max(120).optional().default(""),
  internal_business_segment: z.string().trim().max(120).optional().default(""),
  relationship_owner: z.string().trim().max(160).optional().default(""),
  secondary_relationship_owner: z.string().trim().max(160).optional().default(""),
  internal_notes: z.string().trim().max(8000).optional().default(""),
  primary_contact_name: z.string().trim().min(1, "A primary point of contact is required").max(160),
  primary_contact_phone: phoneOptional,
  general_notes: z.string().trim().max(8000).optional().default(""),
  contacts: z.array(vendorContactSchema).max(MAX_ADDITIONAL_CONTACTS).optional().default([]),
  spend: z.array(vendorSpendSchema).max(60).optional().default([]),
  donations: z.array(vendorDonationSchema).max(60).optional().default([]),
  confirmDuplicate: z.boolean().optional().default(false),
});

export type VendorInput = z.input<typeof vendorInputSchema>;

export const vendorIdSchema = z.object({ id: z.string().uuid() });

export const vendorFileSchema = z.object({
  vendor_id: z.string().uuid(),
  fileName: z.string().trim().min(1).max(200),
  contentType: z.enum(ALLOWED_VENDOR_FILE_TYPES),
  base64: z.string().min(4),
});

// ---------------------------------------------------------------- row types

export interface VendorContactRow {
  id: string;
  vendor_id: string;
  name: string;
  email: string | null;
  title: string | null;
  phone: string | null;
  sort_order: number;
}

export interface VendorSpendRow {
  id: string;
  vendor_id: string;
  year: number;
  amount: number;
  notes: string;
}

export interface VendorDonationRow {
  id: string;
  vendor_id: string;
  year: number;
  committed_amount: number;
  actual_donated_amount: number;
  /** Pelotonia Kids donations that year; counts toward the sponsorship tier. */
  kids_amount: number;
  recipient: string;
  notes: string;
}

export interface VendorActivityRow {
  id: string;
  vendor_id: string;
  contact_date: string;
  contacted_by: string;
  contact_method: string;
  interaction_notes: string;
  next_step: string;
  created_at: string;
}

export interface VendorAttachmentRow {
  id: string;
  vendor_id: string;
  file_name: string;
  content_type: string | null;
  size_bytes: number | null;
  archived: boolean;
  uploaded_by: string;
  uploader_name?: string | null;
  created_at: string;
}

export interface VendorAuditRow {
  id: string;
  vendor_id: string;
  action: string;
  actor_email: string | null;
  details: Record<string, string | number | boolean | null | string[]>;
  created_at: string;
}

export interface VendorRollup {
  total_spend: number;
  total_committed: number;
  total_donated: number;
  outstanding: number;
  fulfillment: number | null;
  support_rate: number | null;
}

export interface VendorListRow {
  id: string;
  business_name: string;
  status: string;
  business_segment: string | null;
  internal_business_segment: string | null;
  relationship_owner: string | null;
  archived: boolean;
  updated_at: string;
  updated_by_name: string | null;
  years: number[];
  rollup: VendorRollup;
  /** Contribution per year (committed or donated, whichever is higher, plus Kids). */
  year_totals: YearTotals;
}

export interface VendorDetail {
  id: string;
  business_name: string;
  status: string;
  business_segment: string | null;
  internal_business_segment: string | null;
  relationship_owner: string | null;
  secondary_relationship_owner: string | null;
  internal_notes: string;
  primary_contact_name: string | null;
  primary_contact_phone: string | null;
  general_notes: string;
  archived: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  created_by_name: string | null;
  updated_by_name: string | null;
  contacts: VendorContactRow[];
  spend: VendorSpendRow[];
  donations: VendorDonationRow[];
  activity: VendorActivityRow[];
  attachments: VendorAttachmentRow[];
  rider_slots: VendorRiderSlotRow[];
}

export interface VendorAccess {
  allowed: boolean;
  roles: string[];
  canArchive: boolean;
  canPurge: boolean;
  /** The tool is switched off site-wide; only Super Users may still use it. */
  paused?: boolean;
}

// ---------------------------------------------------------------- rollups

export function rollup(
  spend: { amount: number; year?: number }[],
  donations: { committed_amount: number; actual_donated_amount: number; year?: number }[],
): VendorRollup {
  const total_spend = spend.reduce((s, r) => s + Number(r.amount || 0), 0);
  const total_committed = donations.reduce((s, r) => s + Number(r.committed_amount || 0), 0);
  const total_donated = donations.reduce((s, r) => s + Number(r.actual_donated_amount || 0), 0);
  return {
    total_spend,
    total_committed,
    total_donated,
    outstanding: total_committed - total_donated,
    fulfillment: total_committed > 0 ? total_donated / total_committed : null,
    support_rate: total_spend > 0 ? total_donated / total_spend : null,
  };
}

export function isOpportunity(r: VendorRollup) {
  return r.total_spend >= HIGH_SPEND_THRESHOLD && r.total_donated === 0;
}

export const currency = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export const percent = (n: number | null) => (n === null ? "—" : `${Math.round(n * 100)}%`);

/** Loose similarity used for duplicate-name warnings. */
export function normalizeName(name: string) {
  return name
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|co|corp|company|the|group|holdings)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function isSimilarName(a: string, b: string) {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

// ---------------------------------------------------------------- tiers

export interface VendorTier {
  key: "pinnacle" | "one_goal" | "gold_honeycomb" | "green_honeycomb";
  label: string;
  /** Lowest single-year contribution for this tier. */
  min: number;
  /** Sponsored rider slots that come with the tier. */
  riderSlots: number;
  /** Whether those slots include hotel details. */
  slotHotel: boolean;
  rank: number;
}

/** Highest first. Thresholds from Chris Kemper, 2026-09-28. */
export const VENDOR_TIERS: readonly VendorTier[] = [
  { key: "pinnacle", label: "Pinnacle Partner", min: 50000, riderSlots: 5, slotHotel: true, rank: 4 },
  { key: "one_goal", label: "One Goal", min: 30000, riderSlots: 2, slotHotel: false, rank: 3 },
  { key: "gold_honeycomb", label: "Gold Honeycomb", min: 15000, riderSlots: 0, slotHotel: false, rank: 2 },
  { key: "green_honeycomb", label: "Green Honeycomb", min: 5000, riderSlots: 0, slotHotel: false, rank: 1 },
];

export type YearTotals = Record<number, { total: number; kids: number }>;

/**
 * A vendor's contribution in one year: for each donation row, the larger of
 * what they committed and what they actually gave (a commitment counts as
 * soon as it's made), plus that year's Pelotonia Kids donations.
 */
export function yearTotals(
  donations: { year: number; committed_amount: number; actual_donated_amount: number; kids_amount?: number }[],
): YearTotals {
  const out: YearTotals = {};
  for (const d of donations) {
    const kids = Number(d.kids_amount || 0);
    const main = Math.max(Number(d.committed_amount || 0), Number(d.actual_donated_amount || 0));
    const cur = out[d.year] ?? { total: 0, kids: 0 };
    out[d.year] = { total: cur.total + main + kids, kids: cur.kids + kids };
  }
  return out;
}

export function tierForAmount(amount: number): VendorTier | null {
  return VENDOR_TIERS.find((t) => amount >= t.min) ?? null;
}

export function tierFor(totals: YearTotals, year: number): VendorTier | null {
  return tierForAmount(totals[year]?.total ?? 0);
}

export function isKidsSupporter(totals: YearTotals, year: number): boolean {
  return (totals[year]?.kids ?? 0) > 0;
}

/** The ride year the CRM defaults to (the next August ride once this one has passed). */
export function currentRideYear(now = new Date()): number {
  return now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear();
}

// ---------------------------------------------------------------- rider slots

export const BIKE_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

export const vendorRiderSlotSchema = z
  .object({
    slot_number: z.number().int().min(1).max(5),
    rider_name: z.string().trim().max(160).optional().default(""),
    pelotonia_id: z
      .string()
      .trim()
      .toUpperCase()
      .max(12)
      .refine((v) => v === "" || /^[A-Z0-9]{3,12}$/.test(v), "Rider IDs are letters and numbers, like CK0132")
      .optional()
      .default(""),
    bike_needed: z.boolean().optional().default(false),
    bike_size: z.string().trim().max(20).optional().default(""),
    hotel_needed: z.boolean().optional().default(false),
    hotel_check_in: z.string().trim().optional().default(""),
    hotel_check_out: z.string().trim().optional().default(""),
  })
  .refine((s) => !s.hotel_check_in || !s.hotel_check_out || s.hotel_check_out >= s.hotel_check_in, {
    message: "Check-out must be on or after check-in",
    path: ["hotel_check_out"],
  });

export const vendorRiderSlotsInputSchema = z.object({
  vendor_id: z.string().uuid(),
  year: z.number().int().min(2000).max(BEYOND_YEAR),
  slots: z.array(vendorRiderSlotSchema).max(5),
});

export interface VendorRiderSlotRow {
  id: string;
  vendor_id: string;
  year: number;
  slot_number: number;
  rider_name: string;
  pelotonia_id: string;
  bike_needed: boolean;
  bike_size: string;
  hotel_needed: boolean;
  hotel_check_in: string | null;
  hotel_check_out: string | null;
  /** Filled in from the synced Pelotonia roster when the rider ID matches. */
  pelotonia?: { name: string; raised: number; subTeam: string | null } | null;
}
