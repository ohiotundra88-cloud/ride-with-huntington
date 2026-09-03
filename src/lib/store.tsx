import { createContext, useContext, useEffect, useMemo, useRef, useState, type Context, type ReactNode } from "react";
import { supabaseBrowser as supabase } from "@/integrations/supabase/proxy-client";
import { upsertMyParticipant, getMyParticipant } from "@/lib/participants.functions";

// ============ TYPES ============
export type Participation = "rider" | "volunteer" | "both" | "unsure" | null;
export type StepStatus = "not_started" | "pending" | "complete";

export interface User {
  name: string;
  email: string;
  mobile: string;
  segment: string;
  market: string;
  manager: string;
  consent: boolean;
  signedIn: boolean;
  activated: boolean;

  isAdmin: boolean;
  isCaptain: boolean;
  isSuperUser: boolean;
  isReviewer: boolean;
  roles: string[];
  userId: string | null;
}

export interface TravelInfo {
  needs: "none" | "hotel" | "airrail" | "both" | "unsure" | "";
  departureCity: string;
  arrivalDate: string;
  departureDate: string;
  hotelCheckIn: string;
  hotelCheckOut: string;
  notes: string;
  travelConfirmation: string;
  hotelConfirmation: string;
  hotelName: string;
  arrivalTime: string;
  departureTime: string;
  bookLater: boolean;
  status: StepStatus;
}

export interface BikeRental {
  needs: "yes" | "no" | "unsure" | "";
  height: string;
  bikeSize: string;
  bikeType: string;
  pedals: string;
  helmet: boolean;
  pickupDate: string;
  returnDate: string;
  confirmation: string;
  status: StepStatus;
}

export interface Apparel {
  jerseySize: string;
  jerseyStyle: "short-sleeve" | "sleeveless" | "";
  shirtSize: string;
  cut: string;
  volunteerShirtSize: string;
  volunteerCut: string;
  status: StepStatus;
}

export interface MailingAddress {
  name: string;
  street: string;
  unit: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  type: "residential" | "business" | "";
  confirmed: boolean;
}

export interface PelotoniaReg {
  discountCode: string;
  confirmation: string;
  hbNumber: string;
  completed: boolean;
  highRoller: boolean;
  survivor: boolean;
  employmentType: "salary" | "hourly" | "";
  payGrade74Below: "yes" | "no" | "";

  status: StepStatus;
}

export interface AuditEvent {
  id: string;
  at: string;
  message: string;
}

export interface Registration {
  id: string | null;
  participation: Participation;
  pelotonia: PelotoniaReg;
  travel: TravelInfo;
  bike: BikeRental;
  apparel: Apparel;
  address: MailingAddress;
  submittedAt: string | null;
  audit: AuditEvent[];
}

export interface AdminParticipant {
  id: string;
  name: string;
  email: string;
  role: "Rider" | "Volunteer" | "Both";
  market: string;
  segment: string;
  pelotoniaStatus: StepStatus;
  travelStatus: StepStatus;
  bikeStatus: StepStatus;
  apparelStatus: StepStatus;
  completion: number;
  hotelNights: number;
  arrivalDate: string;
  bikeRental: boolean;
  jerseySize?: string;
  shirtSize?: string;
  notes: string[];
}

// ============ DEFAULTS ============
const emptyReg: Registration = {
  id: null,
  participation: null,
  pelotonia: { discountCode: "Huntington", confirmation: "", hbNumber: "", completed: false, highRoller: false, survivor: false, employmentType: "", payGrade74Below: "", status: "not_started" },
  travel: {
    needs: "", departureCity: "", arrivalDate: "", departureDate: "",
    hotelCheckIn: "", hotelCheckOut: "", notes: "", travelConfirmation: "",
    hotelConfirmation: "", hotelName: "", arrivalTime: "", departureTime: "",
    bookLater: false, status: "not_started",
  },
  bike: {
    needs: "", height: "", bikeSize: "", bikeType: "", pedals: "",
    helmet: false, pickupDate: "", returnDate: "", confirmation: "",
    status: "not_started",
  },
  apparel: { jerseySize: "", jerseyStyle: "", shirtSize: "", cut: "", volunteerShirtSize: "", volunteerCut: "", status: "not_started" },
  address: { name: "", street: "", unit: "", city: "", state: "", zip: "", country: "USA", type: "", confirmed: false },
  submittedAt: null,
  audit: [],
};

const guestUser: User = {
  name: "Guest",
  email: "",
  mobile: "",
  segment: "",
  market: "",
  manager: "",
  consent: false,
  signedIn: false,
  isAdmin: false,
  isCaptain: false,
  isSuperUser: false,
  isReviewer: false,
  roles: [],
  userId: null,
};

// ============ SEED ADMIN DATA (mock table for admin dashboard fallback) ============
const markets = ["Columbus, OH", "Cleveland, OH", "Cincinnati, OH", "Detroit, MI", "Pittsburgh, PA", "Indianapolis, IN", "Chicago, IL"];
const segments = ["Consumer & Business Banking", "Commercial Banking", "Wealth Management", "Technology", "Risk", "Marketing"];
const roles: AdminParticipant["role"][] = ["Rider", "Volunteer", "Both"];
const names = [
  "Jordan Blake", "Sam Rivera", "Taylor Chen", "Morgan Patel", "Casey Kim",
  "Riley Nguyen", "Avery Johnson", "Quinn O'Brien", "Rowan Diaz", "Skyler Reed",
  "Drew Sullivan", "Parker Hayes", "Reese Martinez", "Emerson Lee", "Sage Thompson",
  "Kendall Brooks", "Blair Foster", "Hayden Cole", "Micah Bennett", "Peyton Grant",
];
const statuses: StepStatus[] = ["not_started", "pending", "complete"];
function pick<T>(a: T[], i: number): T { return a[i % a.length]; }
function rand(seed: number) { let x = seed; return () => (x = (x * 9301 + 49297) % 233280) / 233280; }

export const seedParticipants: AdminParticipant[] = names.map((name, i) => {
  const r = rand(i + 7);
  const role = pick(roles, i);
  const pel = pick(statuses, Math.floor(r() * 3));
  const trv = pick(statuses, Math.floor(r() * 3));
  const bk = role === "Volunteer" ? "not_started" : pick(statuses, Math.floor(r() * 3));
  const ap = pick(statuses, Math.floor(r() * 3));
  const arr = [pel, trv, bk, ap];
  const completion = Math.round((arr.filter((s) => s === "complete").length / 4) * 100);
  return {
    id: `HH-${1000 + i}`,
    name,
    email: name.toLowerCase().replace(/[^a-z]+/g, ".") + "@huntington.com",
    role,
    market: pick(markets, i * 3),
    segment: pick(segments, i * 2),
    pelotoniaStatus: pel,
    travelStatus: trv,
    bikeStatus: bk,
    apparelStatus: ap,
    completion,
    hotelNights: trv === "complete" ? 2 : trv === "pending" ? 1 : 0,
    arrivalDate: trv !== "not_started" ? "2027-08-07" : "",
    bikeRental: bk === "complete",
    jerseySize: role !== "Volunteer" ? pick(["S", "M", "L", "XL", "XXL"], i) : undefined,
    shirtSize: pick(["S", "M", "L", "XL", "XXL"], i + 1),
    notes: [],
  };
});

// ============ CONTEXT ============
interface StoreCtx {
  /** False until the Supabase session has been resolved once. */
  authReady: boolean;
  user: User;
  setUser: (u: Partial<User>) => void;
  registration: Registration;
  setRegistration: (r: Partial<Registration> | ((prev: Registration) => Registration)) => void;
  participants: AdminParticipant[];
  addNote: (id: string, note: string) => void;
  reset: () => void;
  completion: number;
  incompleteStep: number;
  signOut: () => Promise<void>;
  saveProfile: (u: Partial<User>) => Promise<void>;

}

// Reuse one context instance across hot-module reloads so a re-evaluated
// module never leaves consumers reading a different context than the mounted
// provider ("useStore must be used within StoreProvider").
const g = globalThis as unknown as { __appStoreCtx?: Context<StoreCtx | null> };
const Ctx = (g.__appStoreCtx ??= createContext<StoreCtx | null>(null));
const REG_KEY = "hh_reg_v2";

function loadRegistrationFromStorage(): Registration | null {
  if (typeof window === "undefined") return null;
  try { const raw = localStorage.getItem(REG_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User>(guestUser);
  const [registration, setRegState] = useState<Registration>(emptyReg);
  const [participants, setParticipants] = useState<AdminParticipant[]>(seedParticipants);
  const [hydrated, setHydrated] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const skipNextPersist = useRef(false);

  // Hydrate registration from localStorage (works offline / guest preview)
  useEffect(() => {
    const s = loadRegistrationFromStorage();
    if (s) setRegState({ ...emptyReg, ...s });
    setHydrated(true);
  }, []);

  // Sync auth session → user state; fetch roles + participant row on sign in
  useEffect(() => {
    let cancelled = false;

    async function applySession(sessionUser: { id: string; email?: string | null } | null) {
      if (!sessionUser) {
        setUserState(guestUser);
        return;
      }
      const email = sessionUser.email ?? "";
      const nameGuess = email ? email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Colleague";
      // Fetch role + profile in parallel
      const [rolesRes, profileRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", sessionUser.id),
        supabase
          .from("profiles")
          .select("full_name, email, mobile, segment, market, manager, consent")
          .eq("id", sessionUser.id)
          .maybeSingle(),
      ]);
      const myRoles = (rolesRes.data ?? []).map((r) => String(r.role));
      const isAdmin = myRoles.includes("admin");
      const isSuperUser = myRoles.includes("superuser");
      const isCaptain = isAdmin || isSuperUser || myRoles.includes("captain");
      const isReviewer = isCaptain || ["legal", "risk", "compliance", "marketing", "cochair"].some((r) => myRoles.includes(r));
      const prof = profileRes.data as
        | { full_name?: string | null; mobile?: string | null; segment?: string | null; market?: string | null; manager?: string | null; consent?: boolean | null }
        | null;
      const fullName = prof?.full_name || nameGuess;
      if (cancelled) return;
      setUserState({
        ...guestUser,
        userId: sessionUser.id,
        email,
        name: fullName,
        mobile: prof?.mobile ?? "",
        segment: prof?.segment ?? "",
        market: prof?.market ?? "",
        manager: prof?.manager ?? "",
        consent: !!prof?.consent,
        signedIn: true,
        isAdmin,
        isCaptain,
        isSuperUser,
        isReviewer,
        roles: myRoles,
      });


      // Load participant row from cloud (overrides local if present)
      try {
        const row = await getMyParticipant();
        if (cancelled || !row) return;
        skipNextPersist.current = true;
        setRegState((prev) => ({
          ...prev,
          id: row.reg_id ?? prev.id,
          participation: (row.participation as Participation) ?? prev.participation,
          pelotonia: { ...prev.pelotonia, ...(row.pelotonia as any) },
          travel: { ...prev.travel, ...(row.travel as any) },
          bike: { ...prev.bike, ...(row.bike as any) },
          apparel: { ...prev.apparel, ...(row.apparel as any) },
          address: { ...prev.address, ...(row.address as any) },
          audit: Array.isArray(row.audit) ? (row.audit as unknown as AuditEvent[]) : prev.audit,
          submittedAt: row.submitted_at ?? prev.submittedAt,
        }));
      } catch {
        // ignore — server fn may be unavailable during SSR
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      applySession(data.session?.user ? { id: data.session.user.id, email: data.session.user.email } : null)
        .finally(() => { if (!cancelled) setAuthReady(true); });
    }).catch(() => { if (!cancelled) setAuthReady(true); });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        applySession(session?.user ? { id: session.user.id, email: session.user.email } : null);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Persist registration to localStorage (cache)
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(REG_KEY, JSON.stringify(registration));
  }, [registration, hydrated]);

  // Debounced write-through to Lovable Cloud when signed in
  useEffect(() => {
    if (!hydrated) return;
    if (!user.signedIn || !user.userId) return;
    if (skipNextPersist.current) { skipNextPersist.current = false; return; }
    const t = setTimeout(() => {
      upsertMyParticipant({
        data: {
          participation: registration.participation ?? null,
          pelotonia: registration.pelotonia as any,
          travel: registration.travel as any,
          bike: registration.bike as any,
          apparel: registration.apparel as any,
          address: registration.address as any,
          audit: registration.audit as any,
          submitted_at: registration.submittedAt,
          reg_id: registration.id,
        },
      }).catch(() => { /* offline / transient */ });
    }, 900);
    return () => clearTimeout(t);
  }, [registration, user.signedIn, user.userId, hydrated]);

  const setUser = (u: Partial<User>) => setUserState((prev) => ({ ...prev, ...u }));

  // Persist colleague details to the cloud profile so they survive reloads
  const saveProfile = async (u: Partial<User>) => {
    setUserState((prev) => ({ ...prev, ...u }));
    const id = user.userId;
    if (!id) return;
    const { error } = await supabase.from("profiles").upsert({
      id,
      email: u.email ?? user.email,
      full_name: u.name ?? user.name,
      mobile: u.mobile ?? user.mobile,
      segment: u.segment ?? user.segment,
      market: u.market ?? user.market,
      manager: u.manager ?? user.manager,
      consent: u.consent ?? user.consent,
    });
    if (error) throw new Error(error.message);
  };

  const setRegistration = (r: Partial<Registration> | ((prev: Registration) => Registration)) =>
    setRegState((prev) => typeof r === "function" ? r(prev) : { ...prev, ...r });

  const addNote = (id: string, note: string) => {
    setParticipants((prev) => prev.map((p) => p.id === id ? { ...p, notes: [...p.notes, note] } : p));
  };

  const reset = () => { setRegState(emptyReg); };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUserState(guestUser);
    setRegState(emptyReg);
    localStorage.removeItem(REG_KEY);
  };

  /**
   * Effective step statuses: opting out counts as done. "No hotel needed" and
   * "using my own bike" are complete answers, and volunteers skip the bike step.
   */
  const effective = useMemo(() => {
    const isRider = registration.participation === "rider" || registration.participation === "both";
    const travel = registration.travel.needs === "none" ? "complete" : registration.travel.status;
    const bike = !isRider || registration.bike.needs === "no" ? "complete" : registration.bike.status;
    return { pelotonia: registration.pelotonia.status, travel, bike, apparel: registration.apparel.status };
  }, [registration]);

  const completion = useMemo(() => {
    const s = [effective.pelotonia, effective.travel, effective.bike, effective.apparel];
    return Math.round((s.filter((x) => x === "complete").length / 4) * 100);
  }, [effective]);

  const incompleteStep = useMemo(() => {
    if (!registration.participation) return 0;
    if (effective.pelotonia !== "complete") return 1;
    if (effective.travel !== "complete") return 2;
    if (effective.bike !== "complete") return 3;
    if (effective.apparel !== "complete") return 4;
    return 5;
  }, [registration.participation, effective]);


  return (
    <Ctx.Provider value={{ authReady, user, setUser, saveProfile, registration, setRegistration, participants, addNote, reset, completion, incompleteStep, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore must be used within StoreProvider");
  return c;
}

export function addAudit(reg: Registration, message: string): Registration {
  return {
    ...reg,
    audit: [{ id: crypto.randomUUID(), at: new Date().toISOString(), message }, ...reg.audit].slice(0, 30),
  };
}

export function genRegId() {
  return "TH-" + Math.random().toString(36).slice(2, 7).toUpperCase() + "-" + new Date().getFullYear();
}
