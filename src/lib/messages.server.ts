/** Server-only roster building and audience resolution for team messaging. */
import {
  audienceIsEveryone,
  type AudiencePerson,
  type AudienceRules,
} from "./messages.shared";

const PELOTONIA_MEMBERS =
  "https://pelotonia-dashboard-401340053598.us-central1.run.app/api/members";

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const flag = (v: unknown) => v === true || v === 1 || v === "1" || v === "true";

const jsonList = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean);
  const raw = typeof v === "string" ? v.trim() : "";
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((x) => String(x)).filter(Boolean) : [raw];
  } catch {
    return raw.split(/\s*[,;|]\s*/).filter(Boolean);
  }
};

/**
 * Everyone with an account, enriched with app roles, registration readiness and
 * live Pelotonia profile details. This is the single source the audience rules
 * filter against, so preview counts always match what actually gets sent.
 */
export async function buildAudienceRoster(): Promise<AudiencePerson[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [{ data: profiles }, { data: participants }, { data: roleRows }] = await Promise.all([
    supabaseAdmin.from("profiles").select("id, email, full_name"),
    supabaseAdmin
      .from("participants")
      .select("user_id, participation, pelotonia, travel, bike, apparel, address"),
    supabaseAdmin.from("user_roles").select("user_id, role"),
  ]);

  const byUser = new Map<string, Record<string, unknown>>();
  for (const p of participants ?? []) byUser.set(p.user_id, p as Record<string, unknown>);

  const rolesByUser = new Map<string, string[]>();
  for (const r of roleRows ?? []) {
    const list = rolesByUser.get(r.user_id) ?? [];
    list.push(String(r.role));
    rolesByUser.set(r.user_id, list);
  }

  // Live Pelotonia member records keyed by public/rider ID (best effort).
  const members = new Map<string, Record<string, unknown>>();
  try {
    const res = await fetch(PELOTONIA_MEMBERS, { headers: { Accept: "application/json" } });
    if (res.ok) {
      const list = (await res.json()) as Record<string, unknown>[];
      for (const m of list) {
        const id = String(m["public_id"] ?? "").trim().toLowerCase();
        if (id) members.set(id, m);
      }
    }
  } catch {
    // Tag/fundraising targeting degrades gracefully when the API is unreachable.
  }

  return (profiles ?? []).map((profile): AudiencePerson => {
    const row = byUser.get(profile.id) ?? {};
    const p = (row["pelotonia"] ?? {}) as Record<string, unknown>;
    const t = (row["travel"] ?? {}) as Record<string, unknown>;
    const b = (row["bike"] ?? {}) as Record<string, unknown>;
    const a = (row["apparel"] ?? {}) as Record<string, unknown>;
    const addr = (row["address"] ?? {}) as Record<string, unknown>;
    const riderId = str(p["confirmation"]);
    const member = riderId ? members.get(riderId.toLowerCase()) : undefined;

    return {
      userId: profile.id,
      name: profile.full_name ?? profile.email ?? "(unknown)",
      email: profile.email ?? "",
      roles: rolesByUser.get(profile.id) ?? [],
      participation: (row["participation"] as string | null) ?? null,
      riderId,
      registered: p["completed"] === true || p["status"] === "complete",
      hotelBooked:
        !!str(t["hotelConfirmation"]) || (!!str(t["hotelName"]) && !!str(t["hotelCheckIn"])),
      bikeSettled: b["needs"] === "no" || b["status"] === "complete",
      hasAddress: !!str(addr["street"]) && !!str(addr["city"]) && !!str(addr["zip"]),
      hasJersey: !!str(a["jerseySize"]),
      subPeloton: member ? str(member["team_name"]) : null,
      route: member ? str(member["route_names"]) : null,
      tags: member ? jsonList(member["tags"]) : [],
      highRoller: !!member && flag(member["committed_high_roller"]),
      survivor: !!member && flag(member["is_cancer_survivor"]),
      pelotoniaCaptain: !!member && flag(member["is_captain"]),
      challenger: !!member && flag(member["is_challenger"]),
      riderOnPelotonia: !!member && flag(member["is_rider"]),
      volunteerOnPelotonia: !!member && flag(member["is_volunteer"]),
      raised: member ? num(member["raised"]) : null,
    };
  });
}

function matchesFlag(person: AudiencePerson, key: string): boolean {
  switch (key) {
    case "highRoller":
      return person.highRoller;
    case "survivor":
      return person.survivor;
    case "pelotoniaCaptain":
      return person.pelotoniaCaptain;
    case "challenger":
      return person.challenger;
    case "riderOnPelotonia":
      return person.riderOnPelotonia;
    case "volunteerOnPelotonia":
      return person.volunteerOnPelotonia;
    default:
      return false;
  }
}

function matchesGap(person: AudiencePerson, key: string, raisedBelow: number | null): boolean {
  switch (key) {
    case "no_rider_id":
      return !person.riderId;
    case "not_registered":
      return !person.registered;
    case "no_hotel":
      return !person.hotelBooked;
    case "no_bike":
      return !person.bikeSettled;
    case "no_address":
      return !person.hasAddress;
    case "no_jersey":
      return !person.hasJersey;
    case "below_goal":
      return raisedBelow !== null && (person.raised ?? 0) < raisedBelow;
    default:
      return false;
  }
}

/**
 * Applies the audience rules: AND across categories, OR within a category.
 * Explicit includes always win; explicit excludes always lose.
 */
export function resolveAudience(
  roster: AudiencePerson[],
  rules: AudienceRules,
): AudiencePerson[] {
  const excluded = new Set(rules.excludeUserIds);
  const included = new Set(rules.includeUserIds);
  const everyone = audienceIsEveryone(rules);

  const matched = roster.filter((person) => {
    if (excluded.has(person.userId)) return false;
    if (included.has(person.userId)) return true;
    if (everyone) return true;

    if (rules.roles.length) {
      const has = rules.roles.some((r) =>
        r === "user" ? person.roles.length === 0 || person.roles.includes("user") : person.roles.includes(r),
      );
      if (!has) return false;
    }
    if (rules.participation.length && !rules.participation.includes(person.participation ?? "unsure")) {
      return false;
    }
    if (rules.tags.length && !rules.tags.some((t) => person.tags.includes(t))) return false;
    if (rules.subPelotons.length && !(person.subPeloton && rules.subPelotons.includes(person.subPeloton))) {
      return false;
    }
    if (rules.routes.length && !(person.route && rules.routes.includes(person.route))) return false;
    if (rules.flags.length && !rules.flags.some((f) => matchesFlag(person, f))) return false;
    if (rules.gaps.length && !rules.gaps.some((g) => matchesGap(person, g, rules.raisedBelow))) {
      return false;
    }
    return true;
  });

  return matched
    .filter((p) => !!p.userId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Distinct filter values present in the roster, for the audience builder UI. */
export function audienceOptionsFrom(roster: AudiencePerson[]) {
  const roles = new Set<string>();
  const tags = new Set<string>();
  const subPelotons = new Set<string>();
  const routes = new Set<string>();
  for (const p of roster) {
    p.roles.forEach((r) => roles.add(r));
    p.tags.forEach((t) => tags.add(t));
    if (p.subPeloton) subPelotons.add(p.subPeloton);
    if (p.route) routes.add(p.route);
  }
  const sorted = (s: Set<string>) => [...s].sort((a, b) => a.localeCompare(b));
  return {
    roles: sorted(roles),
    tags: sorted(tags),
    subPelotons: sorted(subPelotons),
    routes: sorted(routes),
  };
}

// ---------------------------------------------------------------------------
// Authorization + row mapping helpers used by the messaging server functions.
// ---------------------------------------------------------------------------

import {
  LEADERSHIP_ONLY_ROLES,
  ROLE_LABELS,
  describeAudience,
  normalizeAudience,
  type MessageCategory,
  type MessagePriority,
  type MessageStatus,
  type MessageSummary,
  type MessagingAccess,
} from "./messages.shared";

type AnySupabase = {
  from: (table: string) => any;
};

const SENDER_ROLES = ["captain", "cochair", "superuser", "admin"];

export async function loadRoles(supabase: AnySupabase, userId: string): Promise<string[]> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return ((data ?? []) as { role: string }[]).map((r) => String(r.role));
}

export function accessFromRoles(roles: string[]): MessagingAccess {
  const canTargetLeadership = roles.some((r) => ["cochair", "superuser", "admin"].includes(r));
  return {
    allowed: roles.some((r) => SENDER_ROLES.includes(r)),
    roles,
    canTargetLeadership,
    canDelete: roles.includes("superuser"),
  };
}

/** Throws unless the caller may compose/send messages. */
export async function requireSender(
  supabase: AnySupabase,
  userId: string,
): Promise<MessagingAccess> {
  const access = accessFromRoles(await loadRoles(supabase, userId));
  if (!access.allowed) {
    throw new Error("Forbidden — captain, co-chair or super user access required.");
  }
  return access;
}

/** Captains may not target leadership roles; enforced server-side. */
export function assertAudienceAllowed(access: MessagingAccess, roles: string[]) {
  if (access.canTargetLeadership) return;
  const blocked = roles.filter((r) => LEADERSHIP_ONLY_ROLES.includes(r));
  if (blocked.length) {
    throw new Error(
      `Only co-chairs and super users can message ${blocked
        .map((r) => ROLE_LABELS[r] ?? r)
        .join(", ")}.`,
    );
  }
}

export function mapMessageRow(row: Record<string, unknown>, readCount = 0): MessageSummary {
  const audience = normalizeAudience(row["audience"]);
  return {
    id: String(row["id"]),
    title: String(row["title"] ?? ""),
    body: String(row["body"] ?? ""),
    ctaLabel: String(row["cta_label"] ?? ""),
    ctaHref: String(row["cta_href"] ?? ""),
    priority: String(row["priority"] ?? "info") as MessagePriority,
    category: String(row["category"] ?? "general") as MessageCategory,
    status: String(row["status"] ?? "draft") as MessageStatus,
    audience,
    audienceSummary: describeAudience(audience),
    recipientCount: Number(row["recipient_count"] ?? 0),
    readCount,
    scheduledAt: (row["scheduled_at"] as string | null) ?? null,
    sentAt: (row["sent_at"] as string | null) ?? null,
    createdBy: String(row["created_by"] ?? ""),
    createdByEmail: String(row["created_by_email"] ?? ""),
    createdAt: String(row["created_at"] ?? ""),
    updatedAt: String(row["updated_at"] ?? ""),
  };
}

/**
 * Resolves the audience for a stored message and writes immutable recipient
 * rows, then flips the message to `sent`. Safe to call twice — existing
 * recipient rows are left untouched by the unique (message_id, user_id) key.
 */
export async function deliverMessage(
  supabase: AnySupabase,
  messageId: string,
  actorEmail: string,
): Promise<{ recipientCount: number }> {
  const { data: row, error } = await supabase
    .from("messages")
    .select("*")
    .eq("id", messageId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) throw new Error("Message not found.");
  if (row.status === "sent") throw new Error("This message has already been sent.");

  const rules = normalizeAudience(row.audience);
  const roster = await buildAudienceRoster();
  const people = resolveAudience(roster, rules);
  if (!people.length) throw new Error("That audience has no recipients right now.");

  const { error: insertError } = await supabase.from("message_recipients").insert(
    people.map((p) => ({
      message_id: messageId,
      user_id: p.userId,
      email: p.email,
      name: p.name,
    })),
  );
  if (insertError) throw new Error(insertError.message);

  const { error: updateError } = await supabase
    .from("messages")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      recipient_count: people.length,
    })
    .eq("id", messageId);
  if (updateError) throw new Error(updateError.message);

  await supabase.from("message_audit").insert({
    message_id: messageId,
    action: "sent",
    actor_email: actorEmail,
    details: { recipientCount: people.length },
  });

  return { recipientCount: people.length };
}
