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
