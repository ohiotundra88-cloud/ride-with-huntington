import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface RiderProgressRow {
  userId: string;
  name: string;
  email: string;
  participation: string | null;
  region: string | null;
  riderId: string | null;
  registeredWithPelotonia: boolean;
  pelotoniaStatus: string;
  travelStatus: string;
  hotelBooked: boolean;
  hotelName: string | null;
  hotelCheckIn: string | null;
  hotelCheckOut: string | null;
  travelNeeds: string | null;
  bikeStatus: string;
  bikePlan: string | null;
  bikeType: string | null;
  bikeSize: string | null;
  pedals: string | null;
  bikeConfirmed: boolean;
  apparelStatus: string;
  jerseyStyle: string | null;
  jerseySize: string | null;
  completion: number;
  raised: number | null;
  goal: number | null;
  committed: number | null;
  allTimeRaised: number | null;
  updatedAt: string;
  submittedAt: string | null;
  // Live Pelotonia profile details (null when the rider ID has no match)
  pelotoniaName: string | null;
  subPeloton: string | null;
  rideRoute: string | null;
  rideType: string | null;
  registrationTypes: string[];
  tags: string[];
  isCaptain: boolean;
  isChallenger: boolean;
  isRiderOnPelotonia: boolean;
  isVolunteerOnPelotonia: boolean;
  isSurvivor: boolean;
  highRoller: boolean;
  personalGoal: number | null;
}

export interface RiderProgressAccess {
  allowed: boolean;
  roles: string[];
}

const ALLOWED_ROLES = ["captain", "cochair", "superuser", "admin"];

/** Roles allowed to view rider progress reporting. */
export const getRiderProgressAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RiderProgressAccess> => {
    const { data } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const roles = (data ?? []).map((r: { role: string }) => String(r.role));
    return { allowed: roles.some((r) => ALLOWED_ROLES.includes(r)), roles };
  });

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
/** Pelotonia sends tags / registration types as JSON-encoded strings. */
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
const flag = (v: unknown) => v === true || v === 1 || v === "1" || v === "true";

/**
 * Roster-wide readiness snapshot (registration, travel/hotel, bike, apparel)
 * joined with live Pelotonia fundraising totals by rider/public ID.
 * Authorization is enforced here, not by the route guard.
 */
export const listRiderProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RiderProgressRow[]> => {
    const { data: roleRows } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const roles = (roleRows ?? []).map((r: { role: string }) => String(r.role));
    if (!roles.some((r) => ALLOWED_ROLES.includes(r))) {
      throw new Error("Forbidden — captain, co-chair or super user access required.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("participants")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = data ?? [];

    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, region")
      .in("id", rows.map((r: { user_id: string }) => r.user_id));
    const people = new Map(
      (profiles ?? []).map((p: { id: string; email: string | null; full_name: string | null; region?: string | null }) => [p.id, p] as const),
    );

    // Live fundraising totals, keyed by Pelotonia public/rider ID.
    const fundraising = new Map<string, Record<string, unknown>>();
    try {
      const res = await fetch(
        "https://pelotonia-dashboard-401340053598.us-central1.run.app/api/members",
        { headers: { Accept: "application/json" } },
      );
      if (res.ok) {
        const members = (await res.json()) as Record<string, unknown>[];
        for (const m of members) {
          const id = String(m["public_id"] ?? "").trim().toLowerCase();
          if (id) fundraising.set(id, m);
        }
      }
    } catch {
      // Fundraising is best-effort; readiness data still renders.
    }

    return rows.map((r): RiderProgressRow => {
      const p = (r.pelotonia ?? {}) as Record<string, unknown>;
      const t = (r.travel ?? {}) as Record<string, unknown>;
      const b = (r.bike ?? {}) as Record<string, unknown>;
      const a = (r.apparel ?? {}) as Record<string, unknown>;
      const statuses = [p["status"], t["status"], b["status"], a["status"]];
      const riderId = str(p["confirmation"]);
      const member = riderId ? fundraising.get(riderId.toLowerCase()) : undefined;
      const profile = people.get(r.user_id);

      return {
        userId: r.user_id,
        name: profile?.full_name ?? str(profile?.email) ?? "(unknown)",
        email: profile?.email ?? "(unknown)",
        participation: r.participation,
        riderId,
        registeredWithPelotonia: p["completed"] === true || p["status"] === "complete",
        pelotoniaStatus: String(p["status"] ?? "not_started"),
        travelStatus: String(t["status"] ?? "not_started"),
        hotelBooked: !!str(t["hotelConfirmation"]) || (!!str(t["hotelName"]) && !!str(t["hotelCheckIn"])),
        hotelName: str(t["hotelName"]),
        hotelCheckIn: str(t["hotelCheckIn"]),
        hotelCheckOut: str(t["hotelCheckOut"]),
        travelNeeds: str(t["needs"]),
        bikeStatus: String(b["status"] ?? "not_started"),
        bikePlan:
          b["needs"] === "yes" ? "Rental" : b["needs"] === "no" ? "Own bike" : b["needs"] === "unsure" ? "Undecided" : null,
        bikeType: str(b["bikeType"]),
        bikeSize: str(b["bikeSize"]),
        pedals: str(b["pedals"]),
        bikeConfirmed: b["needs"] === "no" || b["status"] === "complete",
        apparelStatus: String(a["status"] ?? "not_started"),
        jerseyStyle: str(a["jerseyStyle"]),
        jerseySize: str(a["jerseySize"]),
        completion: Math.round((statuses.filter((s) => s === "complete").length / 4) * 100),
        raised: member ? num(member["raised"]) : null,
        goal: member ? num(member["fundraising_goal"]) || num(member["personal_goal"]) : null,
        committed: member ? num(member["committed_amount"]) || num(member["commitment_amount"]) : null,
        allTimeRaised: member ? num(member["all_time_raised"]) : null,
        updatedAt: r.updated_at,
        submittedAt: r.submitted_at,
        pelotoniaName: member ? str(member["name"]) : null,
        subPeloton: member ? str(member["team_name"]) : null,
        rideRoute: member ? str(member["route_names"]) : null,
        rideType: member ? str(member["ride_type"]) : null,
        registrationTypes: member ? jsonList(member["registration_types"]) : [],
        tags: member ? jsonList(member["tags"]) : [],
        isCaptain: !!member && flag(member["is_captain"]),
        isChallenger: !!member && flag(member["is_challenger"]),
        isRiderOnPelotonia: !!member && flag(member["is_rider"]),
        isVolunteerOnPelotonia: !!member && flag(member["is_volunteer"]),
        isSurvivor: !!member && flag(member["is_cancer_survivor"]),
        highRoller: !!member && flag(member["committed_high_roller"]),
        personalGoal: member ? num(member["personal_goal"]) || null : null,
      };
    });
  });

/**
 * Super-user-only correction of a participant's Pelotonia rider/public ID.
 * Role is verified server-side against user_roles before any write.
 */
export const updateRiderId = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; riderId: string }) => {
    const userId = String(input?.userId ?? "").trim();
    const riderId = String(input?.riderId ?? "").trim();
    if (!userId) throw new Error("A participant is required.");
    if (riderId && !/^[A-Za-z0-9-]{2,32}$/.test(riderId)) {
      throw new Error("Rider ID may only contain letters, numbers and dashes.");
    }
    return { userId, riderId };
  })
  .handler(async ({ data, context }): Promise<{ riderId: string | null }> => {
    const { data: roleRows } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const roles = (roleRows ?? []).map((r: { role: string }) => String(r.role));
    if (!roles.includes("superuser")) {
      throw new Error("Only super users can change a rider ID.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error: readError } = await supabaseAdmin
      .from("participants")
      .select("pelotonia")
      .eq("user_id", data.userId)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!row) throw new Error("Participant not found.");

    const pelotonia = { ...((row.pelotonia ?? {}) as Record<string, unknown>) };
    pelotonia["confirmation"] = data.riderId || "";

    const { error } = await supabaseAdmin
      .from("participants")
      .update({ pelotonia: pelotonia as never })
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);

    return { riderId: data.riderId || null };
  });
