import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Context,
} from "react";
import { supabaseBrowser as supabase } from "@/integrations/supabase/proxy-client";
import { useQueryClient } from "@tanstack/react-query";
import { upsertMyParticipant, getMyParticipant } from "@/lib/participants.functions";
import { ensureMyProfile } from "@/lib/profile.functions";
import { effectiveStatuses, registrationCompletion } from "@/lib/registration-progress";

// ============ TYPES ============
/** "both" is a legacy choice kept readable; new registrations can't pick it. */
export type Participation = "rider" | "volunteer" | "challenger" | "both" | "unsure" | null;
export type StepStatus = "not_started" | "pending" | "complete";

export interface User {
  name: string;
  email: string;
  mobile: string;
  segment: string;
  market: string;
  region: string;
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

// ============ DEFAULTS ============
const emptyReg: Registration = {
  id: null,
  participation: null,
  pelotonia: {
    discountCode: "Huntington",
    confirmation: "",
    hbNumber: "",
    completed: false,
    highRoller: false,
    survivor: false,
    employmentType: "",
    payGrade74Below: "",
    status: "not_started",
  },
  travel: {
    needs: "",
    departureCity: "",
    arrivalDate: "",
    departureDate: "",
    hotelCheckIn: "",
    hotelCheckOut: "",
    notes: "",
    travelConfirmation: "",
    hotelConfirmation: "",
    hotelName: "",
    arrivalTime: "",
    departureTime: "",
    bookLater: false,
    status: "not_started",
  },
  bike: {
    needs: "",
    height: "",
    bikeSize: "",
    bikeType: "",
    pedals: "",
    helmet: false,
    pickupDate: "",
    returnDate: "",
    confirmation: "",
    status: "not_started",
  },
  apparel: {
    jerseySize: "",
    jerseyStyle: "",
    shirtSize: "",
    cut: "",
    volunteerShirtSize: "",
    volunteerCut: "",
    status: "not_started",
  },
  address: {
    name: "",
    street: "",
    unit: "",
    city: "",
    state: "",
    zip: "",
    country: "USA",
    type: "",
    confirmed: false,
  },
  submittedAt: null,
  audit: [],
};

const guestUser: User = {
  name: "Guest",
  email: "",
  mobile: "",
  segment: "",
  market: "",
  region: "",
  manager: "",
  consent: false,
  signedIn: false,
  activated: false,

  isAdmin: false,
  isCaptain: false,
  isSuperUser: false,
  isReviewer: false,
  roles: [],
  userId: null,
};

/** A registration section saved as JSON; anything but a plain object reads as empty. */
function storedSection<T extends object>(value: unknown): Partial<T> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Partial<T>) : {};
}

// ============ CONTEXT ============
export interface StoreCtx {
  /** False until the Supabase session has been resolved once. */
  authReady: boolean;
  user: User;
  setUser: (u: Partial<User>) => void;
  registration: Registration;
  setRegistration: (r: Partial<Registration> | ((prev: Registration) => Registration)) => void;
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
export const StoreContext = (g.__appStoreCtx ??= createContext<StoreCtx | null>(null));
const REG_KEY = "hh_reg_v2";

/** Cache key is namespaced per person so one colleague's answers can never
 *  appear on another colleague's account on a shared device. */
function regKeyFor(userId: string | null): string {
  return userId ? `${REG_KEY}:${userId}` : `${REG_KEY}:guest`;
}

function loadRegistrationFromStorage(userId: string | null): Registration | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(regKeyFor(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** All of the store's state and actions; rendered by <StoreProvider>. */
export function useStoreState(): StoreCtx {
  const queryClient = useQueryClient();
  const [user, setUserState] = useState<User>(guestUser);
  const [registration, setRegState] = useState<Registration>(emptyReg);
  const [hydrated, setHydrated] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const skipNextPersist = useRef(false);
  /** Whose answers are currently in state (null = guest). */
  const loadedFor = useRef<string | null>(null);

  // Hydrate the guest cache from localStorage (works offline / guest preview).
  // Signing in replaces this with the account's own record.
  useEffect(() => {
    const s = loadRegistrationFromStorage(null);
    if (s) setRegState({ ...emptyReg, ...s });
    setHydrated(true);
  }, []);

  // Sync auth session → user state; fetch roles + participant row on sign in
  useEffect(() => {
    let cancelled = false;

    async function applySession(sessionUser: { id: string; email?: string | null } | null) {
      if (!sessionUser) {
        setUserState(guestUser);
        if (loadedFor.current !== null) {
          loadedFor.current = null;
          skipNextPersist.current = true;
          setRegState(emptyReg);
        }
        return;
      }

      const email = sessionUser.email ?? "";
      const nameGuess = email
        ? email
            .split("@")[0]
            .replace(/[._-]+/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase())
        : "Colleague";
      // Fetch role + profile in parallel
      const [rolesRes, profileRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", sessionUser.id),
        supabase
          .from("profiles")
          .select(
            "full_name, email, mobile, segment, market, region, manager, consent, activated_at",
          )
          .eq("id", sessionUser.id)
          .maybeSingle(),
      ]);
      const myRoles = (rolesRes.data ?? []).map((r) => String(r.role));
      const isAdmin = myRoles.includes("admin");
      const isSuperUser = myRoles.includes("superuser");
      const isCaptain = isAdmin || isSuperUser || myRoles.includes("captain");
      const isReviewer =
        isCaptain ||
        ["legal", "risk", "compliance", "marketing", "cochair"].some((r) => myRoles.includes(r));
      const prof = profileRes.data as {
        full_name?: string | null;
        mobile?: string | null;
        segment?: string | null;
        market?: string | null;
        region?: string | null;
        manager?: string | null;
        consent?: boolean | null;
        activated_at?: string | null;
      } | null;

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
        region: prof?.region ?? "",
        manager: prof?.manager ?? "",
        consent: !!prof?.consent,
        signedIn: true,
        activated: !!prof?.activated_at,

        isAdmin,
        isCaptain,
        isSuperUser,
        isReviewer,
        roles: myRoles,
      });

      // Switching accounts on the same device: drop whatever answers are in
      // state so a previous colleague's cached answers can't leak through.
      if (loadedFor.current !== sessionUser.id) {
        loadedFor.current = sessionUser.id;
        const cached = loadRegistrationFromStorage(sessionUser.id);
        skipNextPersist.current = true;
        setRegState(cached ? { ...emptyReg, ...cached } : emptyReg);
      }

      // The account's own record from the cloud is the source of truth.
      try {
        const row = await getMyParticipant();
        if (cancelled) return;
        skipNextPersist.current = true;
        if (!row) {
          setRegState(emptyReg);
          return;
        }
        setRegState({
          ...emptyReg,
          id: row.reg_id ?? null,
          participation: (row.participation as Participation) ?? null,
          pelotonia: { ...emptyReg.pelotonia, ...storedSection<PelotoniaReg>(row.pelotonia) },
          travel: { ...emptyReg.travel, ...storedSection<TravelInfo>(row.travel) },
          bike: { ...emptyReg.bike, ...storedSection<BikeRental>(row.bike) },
          apparel: { ...emptyReg.apparel, ...storedSection<Apparel>(row.apparel) },
          address: { ...emptyReg.address, ...storedSection<MailingAddress>(row.address) },
          audit: Array.isArray(row.audit) ? (row.audit as unknown as AuditEvent[]) : [],
          submittedAt: row.submitted_at ?? null,
        });
      } catch {
        // ignore — server fn may be unavailable during SSR
      }
    }

    // Sign-in happens on the Aspire Identity page (full-page redirects), so the
    // session is read once per page load from the server.
    fetch("/auth/me", { credentials: "same-origin", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then(({ user: me }: { user: { id: string; email: string } | null }) => applySession(me))
      .catch(() => applySession(null))
      .finally(() => {
        if (cancelled) return;
        setAuthReady(true);
        // Menu entries (Vendor CRM, Rider Progress, Team Messages) come from
        // access checks cached per session.
        queryClient.invalidateQueries({ queryKey: ["vendor-access"] });
        queryClient.invalidateQueries({ queryKey: ["rider-progress-access"] });
        queryClient.invalidateQueries({ queryKey: ["messaging-access"] });
      });

    return () => {
      cancelled = true;
    };
  }, [queryClient]);

  // Persist registration to localStorage (cache), namespaced per person
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(regKeyFor(user.userId), JSON.stringify(registration));
  }, [registration, hydrated, user.userId]);

  // Debounced write-through to Lovable Cloud when signed in
  useEffect(() => {
    if (!hydrated) return;
    if (!user.signedIn || !user.userId) return;
    // Don't write until this account's own record has loaded, so cached state
    // can never be pushed onto a different account.
    if (loadedFor.current !== user.userId) return;
    if (skipNextPersist.current) {
      skipNextPersist.current = false;
      return;
    }

    const t = setTimeout(() => {
      upsertMyParticipant({
        data: {
          participation: registration.participation ?? null,
          pelotonia: registration.pelotonia,
          travel: registration.travel,
          bike: registration.bike,
          apparel: registration.apparel,
          address: registration.address,
          audit: registration.audit,
          submitted_at: registration.submittedAt,
          reg_id: registration.id,
        },
      }).catch(() => {
        /* offline / transient */
      });
    }, 900);
    return () => clearTimeout(t);
  }, [registration, user.signedIn, user.userId, hydrated]);

  const setUser = (u: Partial<User>) => setUserState((prev) => ({ ...prev, ...u }));

  // Persist colleague details to the cloud profile so they survive reloads.
  // Use .update() on the allowed columns only; upsert touches the protected id
  // column and fails under the column-scoped UPDATE grant.
  const saveProfile = async (u: Partial<User>) => {
    setUserState((prev) => ({ ...prev, ...u }));
    const id = user.userId;
    if (!id) return;
    const payload: {
      full_name?: string;
      mobile?: string;
      segment?: string;
      market?: string;
      region?: string;
      manager?: string;
      consent?: boolean;
    } = {};
    if (u.name !== undefined) payload.full_name = u.name;
    if (u.mobile !== undefined) payload.mobile = u.mobile;
    if (u.segment !== undefined) payload.segment = u.segment;
    if (u.market !== undefined) payload.market = u.market;
    if (u.region !== undefined) payload.region = u.region;
    if (u.manager !== undefined) payload.manager = u.manager;
    if (u.consent !== undefined) payload.consent = u.consent;
    if (Object.keys(payload).length === 0) return;
    const { error, count } = await supabase
      .from("profiles")
      .update(payload, { count: "exact" })
      .eq("id", id);
    if (error) throw new Error(error.message);
    // No row matched: this colleague has no profile row yet. Create it through
    // a trusted server action (personal fields only), then retry the update.
    if ((count ?? 0) === 0) {
      await ensureMyProfile({ data: { fields: payload } });
      const retry = await supabase.from("profiles").update(payload).eq("id", id);
      if (retry.error) throw new Error(retry.error.message);
    }
  };

  const setRegistration = (r: Partial<Registration> | ((prev: Registration) => Registration)) =>
    setRegState((prev) => (typeof r === "function" ? r(prev) : { ...prev, ...r }));

  const reset = () => {
    setRegState(emptyReg);
  };

  const signOut = async () => {
    const id = user.userId;
    setUserState(guestUser);
    setRegState(emptyReg);
    loadedFor.current = null;
    localStorage.removeItem(REG_KEY);
    localStorage.removeItem(regKeyFor(null));
    if (id) localStorage.removeItem(regKeyFor(id));
    // Ends the Hub session and the Aspire Identity session.
    window.location.assign("/auth/logout");
  };

  /**
   * Effective step statuses derived from the answers actually on file: opting
   * out counts as done ("no hotel needed", "using my own bike"), volunteers
   * skip the bike step, and a stored status never outranks missing fields.
   */
  const effective = useMemo(() => effectiveStatuses(registration), [registration]);

  /** Percent of the steps that actually apply to this person. */
  const completion = useMemo(() => registrationCompletion(registration), [registration]);

  const incompleteStep = useMemo(() => {
    if (!registration.participation) return 0;
    if (effective.pelotonia !== "complete") return 1;
    if (effective.travel !== "complete") return 2;
    if (effective.bike !== "complete") return 3;
    if (effective.apparel !== "complete") return 4;
    return 5;
  }, [registration.participation, effective]);

  return {
    authReady,
    user,
    setUser,
    saveProfile,
    registration,
    setRegistration,
    reset,
    completion,
    incompleteStep,
    signOut,
  };
}

export function useStore() {
  const c = useContext(StoreContext);
  if (!c) throw new Error("useStore must be used within StoreProvider");
  return c;
}

export function addAudit(reg: Registration, message: string): Registration {
  return {
    ...reg,
    audit: [{ id: crypto.randomUUID(), at: new Date().toISOString(), message }, ...reg.audit].slice(
      0,
      30,
    ),
  };
}

export function genRegId() {
  return (
    "TH-" + Math.random().toString(36).slice(2, 7).toUpperCase() + "-" + new Date().getFullYear()
  );
}
