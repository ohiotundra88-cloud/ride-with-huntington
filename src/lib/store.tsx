import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

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
  isAdmin: boolean;
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
  completed: boolean;
  highRoller: boolean;
  survivor: boolean;
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
  pelotonia: { discountCode: "HUNT-TEAM-2027", confirmation: "", completed: false, highRoller: false, survivor: false, status: "not_started" },
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

const demoUser: User = {
  name: "Alex Morgan",
  email: "alex.morgan@huntington.com",
  mobile: "(614) 555-0142",
  segment: "Consumer & Business Banking",
  market: "Columbus, OH",
  manager: "Priya Shah",
  consent: false,
  signedIn: false,
  isAdmin: false,
};

// ============ SEED ADMIN DATA ============
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
  user: User;
  setUser: (u: Partial<User>) => void;
  registration: Registration;
  setRegistration: (r: Partial<Registration> | ((prev: Registration) => Registration)) => void;
  participants: AdminParticipant[];
  addNote: (id: string, note: string) => void;
  reset: () => void;
  completion: number;
  incompleteStep: number;
}

const Ctx = createContext<StoreCtx | null>(null);
const KEY = "hh_state_v1";

function loadFromStorage() {
  if (typeof window === "undefined") return null;
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User>(demoUser);
  const [registration, setRegState] = useState<Registration>(emptyReg);
  const [participants, setParticipants] = useState<AdminParticipant[]>(seedParticipants);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const s = loadFromStorage();
    if (s) {
      if (s.user) setUserState({ ...demoUser, ...s.user });
      if (s.registration) setRegState({ ...emptyReg, ...s.registration });
      if (s.participants) setParticipants(s.participants);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(KEY, JSON.stringify({ user, registration, participants }));
  }, [user, registration, participants, hydrated]);

  const setUser = (u: Partial<User>) => setUserState((prev) => ({ ...prev, ...u }));
  const setRegistration = (r: Partial<Registration> | ((prev: Registration) => Registration)) =>
    setRegState((prev) => typeof r === "function" ? r(prev) : { ...prev, ...r });

  const addNote = (id: string, note: string) => {
    setParticipants((prev) => prev.map((p) => p.id === id ? { ...p, notes: [...p.notes, note] } : p));
  };

  const reset = () => { setRegState(emptyReg); setUserState(demoUser); };

  const completion = useMemo(() => {
    const s = [registration.pelotonia.status, registration.travel.status, registration.bike.status, registration.apparel.status];
    return Math.round((s.filter((x) => x === "complete").length / 4) * 100);
  }, [registration]);

  const incompleteStep = useMemo(() => {
    if (!registration.participation) return 0;
    if (registration.pelotonia.status !== "complete") return 1;
    if (registration.travel.status !== "complete") return 2;
    const isRider = registration.participation === "rider" || registration.participation === "both";
    if (isRider && registration.bike.status !== "complete") return 3;
    if (registration.apparel.status !== "complete") return 4;
    return 5;
  }, [registration]);

  return (
    <Ctx.Provider value={{ user, setUser, registration, setRegistration, participants, addNote, reset, completion, incompleteStep }}>
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
