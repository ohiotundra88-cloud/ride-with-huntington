import { z } from "zod";

export const CONTACT_COLUMNS =
  "id, name, role, email, phone, department, region, category, hours, emergency, internal_only, active, sort_order, updated_by_email, updated_at";

export interface DirectoryContact {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  department: string;
  region: string;
  category: string;
  hours: string;
  emergency: boolean;
  internal_only: boolean;
  active: boolean;
  sort_order: number;
  updated_by_email: string | null;
  updated_at: string;
}

export const CONTACT_CATEGORIES = ["General", "Travel", "Volunteers", "Fundraising", "Apparel", "Emergency"] as const;
export const CONTACT_REGIONS = ["All", "Columbus, OH", "Northeast", "Midwest", "Southeast", "West"] as const;

const phoneOk = (v: string) => v.trim() === "" || /^[\d\s()+.\-x]{7,25}$/i.test(v.trim());

export const contactInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  role: z.string().trim().max(120).default(""),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]).default(""),
  phone: z.string().trim().max(25).refine(phoneOk, "Enter a valid phone number").default(""),
  department: z.string().trim().max(120).default(""),
  region: z.string().trim().max(60).default("All"),
  category: z.string().trim().max(60).default("General"),
  hours: z.string().trim().max(120).default(""),
  emergency: z.boolean().default(false),
  /** Leadership-only rows stay out of the general team directory. */
  internal_only: z.boolean().default(false),
  active: z.boolean().default(true),
});

export type ContactInput = z.infer<typeof contactInputSchema>;

export const contactSaveSchema = z.object({
  id: z.string().uuid().nullable().default(null),
  values: contactInputSchema,
});

export const contactDeleteSchema = z.object({ id: z.string().uuid() });

export function blankContactInput(): ContactInput {
  return {
    name: "",
    role: "",
    email: "",
    phone: "",
    department: "",
    region: "All",
    category: "General",
    hours: "Mon–Fri 9–5 ET",
    emergency: false,
    internal_only: false,
    active: true,
  };
}

export const contactsQueryKey = ["contacts"] as const;
