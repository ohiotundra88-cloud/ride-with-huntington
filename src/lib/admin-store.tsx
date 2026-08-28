// Centralized editable content, feature flags, API-managed fields, audit log,
// and Super User session state for the Team Huntington Hub demo.
//
// This is a front-end demonstration: all data lives in-memory and localStorage.
// Production would replace this with real services and identity/access controls.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  conciergeFallback as seedConciergeFallback,
  conciergeResponses as seedConciergeIntents,
  conciergeStarters as seedConciergeStarters,
  readinessItems as seedReadiness,
  seedNotifications,
  teamActivities as seedTeamActivities,
  teamGoal as seedTeamGoal,
  teamMetrics as seedTeamMetrics,
  timelineItems as seedTimeline,
  timelineSections as seedTimelineSections,
  type ConciergeResponse,
  type Notification as MDNotification,
  type ReadinessItem as MDReadinessItem,
  type ReadinessStatus,
  type TeamActivity,
  type TeamMetric,
  type TimelineItem as MDTimelineItem,
  type TimelinePhase,
} from "./mock-data";

// ============ TYPES ============

export type PublishState = "draft" | "published" | "archived";
export type Audience =
  | "all"
  | "riders"
  | "volunteers"
  | "families"
  | "admins";

export interface SuperUserState {
  active: boolean;
  previewAs: null | "participant" | "family" | "standard-admin";
  currentEditor: string;
}

export interface FeatureFlags {
  familyMode: boolean;
  concierge: boolean;
  packingList: boolean;
  teamMetrics: boolean;
  executiveAnalytics: boolean;
  fundraisingProgress: boolean;
  announcements: boolean;
  notificationCenter: boolean;
  dashboardReadiness: boolean;
  dashboardTimeline: boolean;
  dashboardQuickActions: boolean;
}

export interface Announcement {
  id: string;
  headline: string;
  body: string;
  icon: string;
  audience: Audience;
  ctaLabel?: string;
  ctaHref?: string;
  publishAt: string;
  expireAt: string;
  pinned: boolean;
  dismissible: boolean;
  publish: PublishState;
  updatedAt: string;
  updatedBy: string;
}

export type GoalUnit = "dollars" | "participants" | "percentage" | "events" | "hours";

export interface Goal {
  id: string;
  name: string;
  current: number;
  target: number;
  unit: GoalUnit;
  startDate: string;
  endDate: string;
  status: "on_track" | "at_risk" | "behind" | "achieved";
  location: string;
  visibleToParticipants: boolean;
  publish: PublishState;
  updatedAt: string;
  updatedBy: string;
}

export interface EditableReadinessItem {
  id: string;
  title: string;
  status: ReadinessStatus;
  detail: string;
  icon: string;
  ctaLabel: string;
  href?: string;
  action?: "packing" | "concierge" | "fundraising";
  progressCurrent?: number;
  progressGoal?: number;
  weight: number;
  required: boolean;
  audience: Audience;
  deadline?: string;
  active: boolean;
  publish: PublishState;
  updatedAt: string;
  updatedBy: string;
}

export interface EditableTimelineItem {
  id: string;
  phase: TimelinePhase;
  title: string;
  state: "completed" | "current" | "upcoming";
  time?: string;
  location?: string;
  instructions?: string;
  note?: string;
  ctaLabel?: string;
  href?: string;
  action?: "packing" | "concierge";
  contact?: string;
  audience: Audience;
  required: boolean;
  order: number;
  publish: PublishState;
  updatedAt: string;
  updatedBy: string;
}

export interface EditableNotification {
  id: string;
  title: string;
  body: string;
  kind: "deadline" | "reminder" | "milestone" | "event";
  audience: Audience;
  priority: "info" | "important" | "urgent";
  href?: string;
  ctaLabel?: string;
  publishAt: string;
  expireAt: string;
  read: boolean;
  publish: PublishState;
  updatedAt: string;
  updatedBy: string;
}

export interface ConciergeIntent {
  id: string;
  title: string;
  keywords: string[];
  body: string;
  links: { label: string; href: string }[];
  order: number;
  active: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface PackingDefault {
  id: string;
  label: string;
  category: string;
  preset: "rider" | "volunteer";
  required: boolean;
  description?: string;
  order: number;
  active: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface FamilySection {
  id: string;
  icon: string;
  title: string;
  body: string;
  order: number;
  active: boolean;
  publish: PublishState;
  updatedAt: string;
  updatedBy: string;
}

export interface FamilyScheduleDay {
  id: string;
  day: string;
  items: string[];
  active: boolean;
}

export interface Contact {
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
  active: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface APIManagedField {
  key: string;
  label: string;
  source: string;
  lastSync: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  user: string;
  action: "create" | "update" | "delete" | "publish" | "unpublish" | "archive" | "reorder" | "reset" | "toggle";
  entity: string;
  entityId?: string;
  detail?: string;
}

export interface AdminState {
  superUser: SuperUserState;
  flags: FeatureFlags;
  announcements: Announcement[];
  goals: Goal[];
  readiness: EditableReadinessItem[];
  timeline: EditableTimelineItem[];
  notifications: EditableNotification[];
  concierge: {
    intents: ConciergeIntent[];
    starters: string[];
    fallbackTitle: string;
    fallbackBody: string;
  };
  packing: {
    categories: { rider: string[]; volunteer: string[] };
    items: PackingDefault[];
  };
  family: {
    sections: FamilySection[];
    schedule: FamilyScheduleDay[];
    parkingActive: boolean;
  };
  team: {
    metrics: TeamMetric[];
    activity: TeamActivity[];
    goalCurrent: number;
    goalTarget: number;
  };
  apiManaged: APIManagedField[];
  audit: AuditEntry[];
  /** Static copy on the My Journey page, editable by a Super User. */
  journeyCopy: Record<string, string>;
}

export const journeyCopyDefaults: Record<string, string> = {
  heroEyebrow: "Your Ride Weekend Command Center",
  heroReadyPrefix: "You're",
  heroReadySuffix: "ready for Ride Weekend.",
  countdownLabel: "Countdown",
  countdownCaption: "Sat Aug 7, 2027 · demo date",
  viewSwitchNote: "Switch views without losing your place — sample content.",
  timelineHeading: "My Ride Weekend timeline",
  qaContinue: "Continue My Journey",
  qaPacking: "View Packing List",
  qaFamily: "Family Guide",
  qaConcierge: "Ask the Concierge",
  qaEvents: "View Team Events",
  qaFundraising: "Fundraising Resources",
};


// ============ SEED ============

const NOW = () => new Date().toISOString();
const EDITOR = "Demo Admin";

const readinessIconMap: Record<string, string> = {
  pelotonia: "check",
  hotel: "hotel",
  bike: "bike",
  volunteer: "users",
  fundraising: "dollar",
  apparel: "shirt",
};

const readinessWeights: Record<string, number> = {
  pelotonia: 25,
  hotel: 20,
  bike: 15,
  volunteer: 0,
  fundraising: 25,
  apparel: 15,
};


function seedReadinessItems(): EditableReadinessItem[] {
  const items = seedReadiness as MDReadinessItem[];
  return items.map((r) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    detail: r.detail,
    icon: readinessIconMap[r.id] ?? "check",
    ctaLabel: r.ctaLabel,
    href: r.href,
    action: r.action,
    progressCurrent: r.progress?.current,
    progressGoal: r.progress?.goal,
    weight: readinessWeights[r.id] ?? 0,
    required: r.id !== "volunteer",
    audience: r.id === "volunteer" ? "volunteers" : "riders",
    active: r.id !== "volunteer",
    publish: "published",
    updatedAt: NOW(),
    updatedBy: EDITOR,
  }));
}

function seedTimelineItems(): EditableTimelineItem[] {
  return (seedTimeline as MDTimelineItem[]).map((t, i) => ({
    id: t.id,
    phase: t.phase,
    title: t.title,
    state: t.state,
    time: t.time,
    location: t.location,
    instructions: t.instructions,
    note: t.note,
    ctaLabel: t.ctaLabel,
    href: t.href,
    action: t.action,
    contact: t.contact,
    audience: "all",
    required: t.state !== "upcoming",
    order: i,
    publish: "published",
    updatedAt: NOW(),
    updatedBy: EDITOR,
  }));
}

function seedNotificationList(): EditableNotification[] {
  return (seedNotifications as MDNotification[]).map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    kind: n.kind,
    audience: "all",
    priority: n.kind === "deadline" ? "important" : "info",
    href: n.href,
    ctaLabel: undefined,
    publishAt: NOW(),
    expireAt: "",
    read: n.read,
    publish: "published",
    updatedAt: NOW(),
    updatedBy: EDITOR,
  }));
}

function seedConciergeIntentList(): ConciergeIntent[] {
  return (seedConciergeIntents as ConciergeResponse[]).map((r, i) => ({
    id: `intent-${i + 1}`,
    title: r.title,
    keywords: [...r.keywords],
    body: r.body,
    links: r.links ? r.links.map((l) => ({ ...l })) : [],
    order: i,
    active: true,
    updatedAt: NOW(),
    updatedBy: EDITOR,
  }));
}

const riderPackingSeed: Omit<PackingDefault, "order" | "active" | "updatedAt" | "updatedBy">[] = [
  { id: "r-1", label: "Helmet", category: "Ride Essentials", preset: "rider", required: true, description: "Required by Pelotonia." },
  { id: "r-2", label: "Bib number + safety pins", category: "Ride Essentials", preset: "rider", required: true },
  { id: "r-3", label: "Water bottles (2)", category: "Ride Essentials", preset: "rider", required: true },
  { id: "r-4", label: "Spare tube & tire levers", category: "Ride Essentials", preset: "rider", required: false },
  { id: "r-5", label: "Team jersey", category: "Clothing", preset: "rider", required: true },
  { id: "r-6", label: "Padded cycling shorts", category: "Clothing", preset: "rider", required: false },
  { id: "r-7", label: "Cycling socks", category: "Clothing", preset: "rider", required: false },
  { id: "r-8", label: "Rain shell", category: "Clothing", preset: "rider", required: false },
  { id: "r-9", label: "Energy gels / chews", category: "Nutrition", preset: "rider", required: false },
  { id: "r-10", label: "Electrolyte mix", category: "Nutrition", preset: "rider", required: false },
  { id: "r-11", label: "Breakfast bar", category: "Nutrition", preset: "rider", required: false },
  { id: "r-12", label: "Photo ID", category: "Travel", preset: "rider", required: true },
  { id: "r-13", label: "Hotel confirmation", category: "Travel", preset: "rider", required: false },
  { id: "r-14", label: "Duffle & shoe bag", category: "Travel", preset: "rider", required: false },
  { id: "r-15", label: "Phone + charger", category: "Technology", preset: "rider", required: true },
  { id: "r-16", label: "Bike computer / GPS", category: "Technology", preset: "rider", required: false },
  { id: "r-17", label: "Portable battery", category: "Technology", preset: "rider", required: false },
  { id: "r-18", label: "Chamois cream", category: "Recovery", preset: "rider", required: false },
  { id: "r-19", label: "Ibuprofen / first aid", category: "Recovery", preset: "rider", required: false },
  { id: "r-20", label: "Compression sleeves", category: "Recovery", preset: "rider", required: false },
];

const volunteerPackingSeed: Omit<PackingDefault, "order" | "active" | "updatedAt" | "updatedBy">[] = [
  { id: "v-1", label: "Volunteer credential", category: "Shift Essentials", preset: "volunteer", required: true },
  { id: "v-2", label: "Shift assignment printout", category: "Shift Essentials", preset: "volunteer", required: false },
  { id: "v-3", label: "Reusable water bottle", category: "Shift Essentials", preset: "volunteer", required: true },
  { id: "v-4", label: "Team volunteer shirt", category: "Clothing", preset: "volunteer", required: true },
  { id: "v-5", label: "Comfortable sneakers", category: "Clothing", preset: "volunteer", required: false },
  { id: "v-6", label: "Cap or visor", category: "Clothing", preset: "volunteer", required: false },
  { id: "v-7", label: "Sunscreen (SPF 30+)", category: "Weather Protection", preset: "volunteer", required: false },
  { id: "v-8", label: "Rain poncho", category: "Weather Protection", preset: "volunteer", required: false },
  { id: "v-9", label: "Light jacket for morning", category: "Weather Protection", preset: "volunteer", required: false },
  { id: "v-10", label: "Snacks & granola bars", category: "Food and Hydration", preset: "volunteer", required: false },
  { id: "v-11", label: "Electrolyte packets", category: "Food and Hydration", preset: "volunteer", required: false },
  { id: "v-12", label: "Phone + charger", category: "Technology", preset: "volunteer", required: true },
  { id: "v-13", label: "Portable battery", category: "Technology", preset: "volunteer", required: false },
  { id: "v-14", label: "Photo ID", category: "Travel", preset: "volunteer", required: true },
  { id: "v-15", label: "Hotel confirmation", category: "Travel", preset: "volunteer", required: false },
];

function seedPackingItems(): PackingDefault[] {
  return [...riderPackingSeed, ...volunteerPackingSeed].map((p, i) => ({
    ...p,
    order: i,
    active: true,
    updatedAt: NOW(),
    updatedBy: EDITOR,
  }));
}

const familySeed: FamilySection[] = [
  { id: "parking", icon: "car", title: "Spectator parking", body: "Recommended lots: McFerson Commons Garage and Neil Ave. Garage. Arrive by 6:00 AM Saturday for closest access. Overflow: Convention Center North Garage.", order: 0, active: true, publish: "published", updatedAt: NOW(), updatedBy: EDITOR },
  { id: "viewing", icon: "map", title: "Recommended viewing locations", body: "Mile 12 (McFerson Commons), Mile 34 (Pickerington Cheer Zone), Mile 68 (Granville), and the finish line at Hilton Columbus Downtown.", order: 1, active: true, publish: "published", updatedAt: NOW(), updatedBy: EDITOR },
  { id: "tent", icon: "tent", title: "Team Huntington tent", body: "Bright-lime canopy at the finish village near the bandshell, plus rest stops 2 and 4. Team snacks, cheer squad, and photo backdrop.", order: 2, active: true, publish: "published", updatedAt: NOW(), updatedBy: EDITOR },
  { id: "tracking", icon: "radio", title: "Rider tracking", body: "Live rider tracker will be linked here on Ride Day (placeholder). Save your rider's bib number to search quickly.", order: 3, active: true, publish: "published", updatedAt: NOW(), updatedBy: EDITOR },
  { id: "kids", icon: "baby", title: "Kids activities", body: "Family village at the finish: face painting, balloon artist, mini-obstacle course, and a shaded story-time tent. Free for all ages.", order: 4, active: true, publish: "published", updatedAt: NOW(), updatedBy: EDITOR },
  { id: "food", icon: "utensils", title: "Food & rest areas", body: "Food trucks open 7 AM at the finish village. Free water and shaded seating throughout the family village.", order: 5, active: true, publish: "published", updatedAt: NOW(), updatedBy: EDITOR },
  { id: "access", icon: "accessibility", title: "Accessibility", body: "Accessible parking with placard in the Nationwide Blvd lot. Accessible restrooms and viewing platforms at Mile 12, Mile 34, and the finish.", order: 6, active: true, publish: "published", updatedAt: NOW(), updatedBy: EDITOR },
  { id: "weather", icon: "cloud", title: "Weather preparation", body: "August in Columbus averages 82°F high, 62°F low. Bring sunscreen, hats, water, and a light rain shell. Final forecast in Wednesday update.", order: 7, active: true, publish: "published", updatedAt: NOW(), updatedBy: EDITOR },
  { id: "emergency", icon: "alert", title: "Emergency & contact", body: "For life-threatening emergencies dial 911. Medical tents at every rest stop. Family info hotline: (614) 555-0142 (demo).", order: 8, active: true, publish: "published", updatedAt: NOW(), updatedBy: EDITOR },
];

const familyScheduleSeed: FamilyScheduleDay[] = [
  { id: "fri", day: "Friday · Aug 6", items: ["2–7 PM — Packet pickup, Columbus Convention Center", "6:30 PM — Team gathering, Hilton Union Ballroom"], active: true },
  { id: "sat", day: "Saturday · Aug 7 (Ride Day)", items: ["5:30 AM — Staging opens", "7:00 AM — Roll-out", "10 AM–3 PM — Finish village open"], active: true },
  { id: "sun", day: "Sunday · Aug 8", items: ["11:00 AM — Team brunch, Hilton", "1:00 PM — Recognition & photos"], active: true },
];

const apiManagedSeed: APIManagedField[] = [
  { key: "readiness.pelotonia.status", label: "Official Pelotonia registration status", source: "Pelotonia.org API", lastSync: "2027-07-14T09:12:00Z" },
  { key: "readiness.hotel.status", label: "Hotel reservation status", source: "Concur / ATG", lastSync: "2027-07-14T09:12:00Z" },
  { key: "readiness.fundraising.current", label: "Fundraising total raised", source: "Pelotonia CRM", lastSync: "2027-07-14T09:12:00Z" },
  { key: "team.goal.current", label: "Team cumulative raised", source: "Pelotonia CRM", lastSync: "2027-07-14T09:12:00Z" },
  { key: "route.official", label: "Official rider route", source: "Pelotonia Course Ops", lastSync: "2027-06-30T00:00:00Z" },
  { key: "weather", label: "Live weather", source: "NOAA", lastSync: "n/a — live" },
  { key: "rider.tracking", label: "Live rider tracking", source: "Pelotonia Timing", lastSync: "n/a — live" },
  { key: "expenses.reimbursement", label: "Expense reimbursement status", source: "Concur Expense", lastSync: "2027-07-13T00:00:00Z" },
];

const announcementsSeed: Announcement[] = [
  {
    id: "a-1",
    headline: "Hotel block closes Jul 22",
    body: "Book your room at the Hilton Columbus Downtown before the group rate closes.",
    icon: "hotel",
    audience: "all",
    ctaLabel: "Reserve hotel",
    ctaHref: "/register",
    publishAt: NOW(),
    expireAt: "",
    pinned: true,
    dismissible: true,
    publish: "published",
    updatedAt: NOW(),
    updatedBy: EDITOR,
  },
  {
    id: "a-2",
    headline: "Fundraising match doubled",
    body: "Huntington will match your Pelotonia fundraising up to $2,500 per colleague this year.",
    icon: "dollar",
    audience: "riders",
    ctaLabel: "Fundraising resources",
    ctaHref: "/team",
    publishAt: NOW(),
    expireAt: "",
    pinned: false,
    dismissible: true,
    publish: "published",
    updatedAt: NOW(),
    updatedBy: EDITOR,
  },
];

const goalsSeed: Goal[] = [
  { id: "g-1", name: "Team Huntington fundraising", current: 3_450_000, target: 5_000_000, unit: "dollars", startDate: "2027-01-01", endDate: "2027-08-31", status: "on_track", location: "Dashboard, Team Hub", visibleToParticipants: true, publish: "published", updatedAt: NOW(), updatedBy: EDITOR },
  { id: "g-2", name: "Rider registration goal", current: 2400, target: 3000, unit: "participants", startDate: "2027-01-01", endDate: "2027-07-15", status: "on_track", location: "Analytics", visibleToParticipants: false, publish: "published", updatedAt: NOW(), updatedBy: EDITOR },
  { id: "g-3", name: "Volunteer registration goal", current: 1500, target: 2000, unit: "participants", startDate: "2027-01-01", endDate: "2027-07-15", status: "at_risk", location: "Analytics", visibleToParticipants: false, publish: "published", updatedAt: NOW(), updatedBy: EDITOR },
  { id: "g-4", name: "Participant fundraising goal", current: 3800, target: 5000, unit: "dollars", startDate: "2027-01-01", endDate: "2027-08-31", status: "on_track", location: "Dashboard readiness", visibleToParticipants: true, publish: "published", updatedAt: NOW(), updatedBy: EDITOR },
  { id: "g-5", name: "Readiness completion target", current: 72, target: 90, unit: "percentage", startDate: "2027-01-01", endDate: "2027-08-01", status: "on_track", location: "Analytics", visibleToParticipants: false, publish: "published", updatedAt: NOW(), updatedBy: EDITOR },
];

const defaultFlags: FeatureFlags = {
  familyMode: true,
  concierge: true,
  packingList: true,
  teamMetrics: true,
  executiveAnalytics: true,
  fundraisingProgress: true,
  announcements: true,
  notificationCenter: true,
  dashboardReadiness: true,
  dashboardTimeline: true,
  dashboardQuickActions: true,
};

function initialState(): AdminState {
  return {
    superUser: { active: false, previewAs: null, currentEditor: EDITOR },
    flags: defaultFlags,
    announcements: announcementsSeed,
    goals: goalsSeed,
    readiness: seedReadinessItems(),
    timeline: seedTimelineItems(),
    notifications: seedNotificationList(),
    concierge: {
      intents: seedConciergeIntentList(),
      starters: [...seedConciergeStarters],
      fallbackTitle: seedConciergeFallback.title,
      fallbackBody: seedConciergeFallback.body,
    },
    packing: {
      categories: {
        rider: ["Ride Essentials", "Clothing", "Nutrition", "Travel", "Technology", "Recovery"],
        volunteer: ["Shift Essentials", "Clothing", "Weather Protection", "Food and Hydration", "Technology", "Travel"],
      },
      items: seedPackingItems(),
    },
    family: {
      sections: familySeed,
      schedule: familyScheduleSeed,
      parkingActive: true,
    },
    team: {
      metrics: [...seedTeamMetrics],
      activity: [...seedTeamActivities],
      goalCurrent: seedTeamGoal.current,
      goalTarget: seedTeamGoal.goal,
    },
    apiManaged: apiManagedSeed,
    audit: [],
    journeyCopy: { ...journeyCopyDefaults },
  };

}

// ============ PERSISTENCE ============

const KEY = "hh_admin_v1";

function load(): AdminState {
  if (typeof window === "undefined") return initialState();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as Partial<AdminState>;
    const base = initialState();
    return { ...base, ...parsed, superUser: { ...base.superUser, ...parsed.superUser } };
  } catch {
    return initialState();
  }
}

// ============ CONTEXT ============

interface AdminCtx {
  state: AdminState;
  setState: React.Dispatch<React.SetStateAction<AdminState>>;
  audit: (entry: Omit<AuditEntry, "id" | "at" | "user">) => void;
  resetSection: (section: keyof AdminState) => void;
  resetAll: () => void;
  isApiManaged: (key: string) => APIManagedField | undefined;
}

const Ctx = createContext<AdminCtx | null>(null);

export function AdminStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AdminState>(() => initialState());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const audit = useCallback((entry: Omit<AuditEntry, "id" | "at" | "user">) => {
    setState((s) => ({
      ...s,
      audit: [
        {
          id: crypto.randomUUID(),
          at: new Date().toISOString(),
          user: s.superUser.currentEditor,
          ...entry,
        },
        ...s.audit,
      ].slice(0, 200),
    }));
  }, []);

  const resetSection = useCallback((section: keyof AdminState) => {
    const seed = initialState();
    setState((s) => ({ ...s, [section]: seed[section] }));
  }, []);

  const resetAll = useCallback(() => setState(initialState()), []);

  const isApiManaged = useCallback(
    (key: string) => state.apiManaged.find((f) => f.key === key),
    [state.apiManaged]
  );

  const value = useMemo<AdminCtx>(
    () => ({ state, setState, audit, resetSection, resetAll, isApiManaged }),
    [state, audit, resetSection, resetAll, isApiManaged]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAdmin() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAdmin must be used inside AdminStoreProvider");
  return c;
}

// ============ HELPERS ============

export function readinessScore(items: EditableReadinessItem[]): number {
  // Items that don't apply to the participant (or carry no weight) are excluded
  // from both sides of the ratio so the ring can still reach 100%.
  const active = items.filter(
    (i) => i.active && i.publish === "published" && i.status !== "not_applicable" && i.weight > 0,
  );
  const totalWeight = active.reduce((n, i) => n + i.weight, 0);
  if (totalWeight === 0) return 0;
  const earned = active.reduce((n, i) => {
    const done = i.status === "complete" || i.status === "reserved" || i.status === "ordered";
    return n + (done ? i.weight : 0);
  }, 0);
  return Math.round((earned / totalWeight) * 100);
}


export function announcementIsActive(a: Announcement): boolean {
  if (a.publish !== "published") return false;
  const now = Date.now();
  if (a.publishAt && new Date(a.publishAt).getTime() > now) return false;
  if (a.expireAt && new Date(a.expireAt).getTime() < now) return false;
  return true;
}

export function formatCurrencyUSD(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatGoalValue(g: Goal): { current: string; target: string } {
  if (g.unit === "dollars") return { current: formatCurrencyUSD(g.current), target: formatCurrencyUSD(g.target) };
  if (g.unit === "percentage") return { current: `${g.current}%`, target: `${g.target}%` };
  return { current: g.current.toLocaleString(), target: g.target.toLocaleString() };
}
