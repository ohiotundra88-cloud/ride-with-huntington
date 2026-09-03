/** Shared types and pure helpers for role/tag-targeted team messaging. */

export const MESSAGE_PRIORITIES = ["info", "important", "urgent"] as const;
export const MESSAGE_CATEGORIES = ["reminder", "deadline", "event", "fundraising", "general"] as const;

export type MessagePriority = (typeof MESSAGE_PRIORITIES)[number];
export type MessageCategory = (typeof MESSAGE_CATEGORIES)[number];
export type MessageStatus = "draft" | "scheduled" | "sent";

/** App roles a sender can target. */
export const TARGETABLE_ROLES = [
  "user",
  "captain",
  "cochair",
  "superuser",
  "admin",
  "editor",
  "legal",
  "risk",
  "compliance",
  "marketing",
  "vendor_captain",
] as const;

export const ROLE_LABELS: Record<string, string> = {
  user: "Member",
  captain: "Captain",
  cochair: "Co-Chair",
  superuser: "Super User",
  admin: "Admin",
  editor: "Editor",
  legal: "Legal",
  risk: "Risk",
  compliance: "Compliance",
  marketing: "Marketing",
  vendor_captain: "Vendor Captain",
};

/** Roles only co-chairs, admins and super users may target. */
export const LEADERSHIP_ONLY_ROLES = [
  "cochair",
  "superuser",
  "admin",
  "editor",
  "legal",
  "risk",
  "compliance",
  "marketing",
  "vendor_captain",
];

export const PARTICIPATION_OPTIONS = ["rider", "volunteer", "both", "unsure"] as const;

export const PELOTONIA_FLAGS = [
  { key: "highRoller", label: "High Roller" },
  { key: "survivor", label: "Survivor" },
  { key: "pelotoniaCaptain", label: "Captain (Pelotonia)" },
  { key: "challenger", label: "Challenger" },
  { key: "riderOnPelotonia", label: "Registered rider" },
  { key: "volunteerOnPelotonia", label: "Registered volunteer" },
] as const;

export const READINESS_GAPS = [
  { key: "no_rider_id", label: "Missing Rider ID" },
  { key: "not_registered", label: "Not registered with Pelotonia" },
  { key: "no_hotel", label: "No hotel booked" },
  { key: "no_bike", label: "Bike not settled" },
  { key: "no_address", label: "Missing shipping address" },
  { key: "no_jersey", label: "Missing jersey size" },
  { key: "below_goal", label: "Below fundraising threshold" },
] as const;

export interface AudienceRules {
  roles: string[];
  participation: string[];
  tags: string[];
  subPelotons: string[];
  routes: string[];
  flags: string[];
  gaps: string[];
  /** Used with the `below_goal` gap. */
  raisedBelow: number | null;
  includeUserIds: string[];
  excludeUserIds: string[];
}

export const emptyAudience = (): AudienceRules => ({
  roles: [],
  participation: [],
  tags: [],
  subPelotons: [],
  routes: [],
  flags: [],
  gaps: [],
  raisedBelow: null,
  includeUserIds: [],
  excludeUserIds: [],
});

/** Normalizes any stored/incoming JSON blob into a complete rule set. */
export function normalizeAudience(raw: unknown): AudienceRules {
  const o = (raw ?? {}) as Record<string, unknown>;
  const list = (v: unknown) =>
    Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];
  const n = o["raisedBelow"];
  return {
    roles: list(o["roles"]),
    participation: list(o["participation"]),
    tags: list(o["tags"]),
    subPelotons: list(o["subPelotons"]),
    routes: list(o["routes"]),
    flags: list(o["flags"]),
    gaps: list(o["gaps"]),
    raisedBelow: typeof n === "number" && Number.isFinite(n) && n >= 0 ? n : null,
    includeUserIds: list(o["includeUserIds"]),
    excludeUserIds: list(o["excludeUserIds"]),
  };
}

/**
 * True when no group rule is set and no individuals were hand-picked (i.e. the
 * whole roster matches). Picking specific people means only those people.
 */
export function audienceIsEveryone(a: AudienceRules): boolean {
  return (
    a.includeUserIds.length === 0 &&
    a.roles.length === 0 &&
    a.participation.length === 0 &&
    a.tags.length === 0 &&
    a.subPelotons.length === 0 &&
    a.routes.length === 0 &&
    a.flags.length === 0 &&
    a.gaps.length === 0
  );
}


/** Short human summary of the audience rules, for lists and history. */
export function describeAudience(a: AudienceRules): string {
  const parts: string[] = [];
  if (a.roles.length) parts.push(a.roles.map((r) => ROLE_LABELS[r] ?? r).join(", "));
  if (a.participation.length) parts.push(a.participation.join(", "));
  if (a.tags.length) parts.push(`tags: ${a.tags.join(", ")}`);
  if (a.subPelotons.length) parts.push(`sub-peloton: ${a.subPelotons.join(", ")}`);
  if (a.routes.length) parts.push(`route: ${a.routes.join(", ")}`);
  if (a.flags.length) {
    parts.push(
      a.flags
        .map((f) => PELOTONIA_FLAGS.find((x) => x.key === f)?.label ?? f)
        .join(", "),
    );
  }
  if (a.gaps.length) {
    parts.push(
      a.gaps.map((g) => READINESS_GAPS.find((x) => x.key === g)?.label ?? g).join(", "),
    );
  }
  if (!parts.length && !a.includeUserIds.length) parts.push("Everyone");
  if (a.includeUserIds.length) {
    parts.push(
      `${a.includeUserIds.length} hand-picked ${a.includeUserIds.length === 1 ? "person" : "people"}`,
    );
  }
  if (a.excludeUserIds.length) parts.push(`−${a.excludeUserIds.length} excluded`);

  return parts.join(" · ");
}

/** One targetable person, with everything the audience rules can filter on. */
export interface AudiencePerson {
  userId: string;
  name: string;
  email: string;
  roles: string[];
  participation: string | null;
  riderId: string | null;
  registered: boolean;
  hotelBooked: boolean;
  bikeSettled: boolean;
  hasAddress: boolean;
  hasJersey: boolean;
  subPeloton: string | null;
  route: string | null;
  tags: string[];
  highRoller: boolean;
  survivor: boolean;
  pelotoniaCaptain: boolean;
  challenger: boolean;
  riderOnPelotonia: boolean;
  volunteerOnPelotonia: boolean;
  raised: number | null;
}

export interface MessageSummary {
  id: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  priority: MessagePriority;
  category: MessageCategory;
  status: MessageStatus;
  audience: AudienceRules;
  audienceSummary: string;
  recipientCount: number;
  readCount: number;
  scheduledAt: string | null;
  sentAt: string | null;
  createdBy: string;
  createdByEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageRecipientRow {
  userId: string;
  name: string;
  email: string;
  readAt: string | null;
}

export interface InboxMessage {
  id: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  priority: MessagePriority;
  category: MessageCategory;
  sentAt: string | null;
  readAt: string | null;
  dismissedAt: string | null;
  fromEmail: string;
}

export interface MessagingAccess {
  allowed: boolean;
  roles: string[];
  canTargetLeadership: boolean;
  canDelete: boolean;
}

export interface AudienceOptions {
  roles: string[];
  tags: string[];
  subPelotons: string[];
  routes: string[];
}

/** Validates composed content the same way on client and server. */
export function validateMessageDraft(input: {
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
}): string | null {
  if (!input.title.trim()) return "A title is required.";
  if (input.title.trim().length > 140) return "Keep the title under 140 characters.";
  if (!input.body.trim()) return "A message body is required.";
  if (input.body.length > 5000) return "Keep the message under 5,000 characters.";
  if (input.ctaLabel.trim() && !input.ctaHref.trim()) {
    return "Add a link for the call-to-action button.";
  }
  if (input.ctaHref.trim() && !/^(\/|https?:\/\/)/.test(input.ctaHref.trim())) {
    return "The call-to-action link must start with / or https://";
  }
  return null;
}
