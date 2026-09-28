// Super User editable content for the Team Huntington Hub: types, default
// content, and the pure helpers that read it.
//
// Where this content lives: the admin store (src/lib/admin-store.tsx) keeps it
// in each browser's localStorage. Edits a Super User makes are saved in their
// own browser only and are not shared with other colleagues until this content
// moves to a server-backed table.
//
// The defaults below are what every colleague sees. They hold step
// definitions and guidance only: no invented people, amounts, deadlines,
// venues or contact details. Admins add real announcements, goals and
// notifications themselves.

import { contentFingerprint } from "./content-fingerprint.ts";

// ============ TYPES ============

export type PublishState = "draft" | "published" | "archived";
export type Audience = "all" | "riders" | "volunteers" | "families" | "admins";

export type ReadinessStatus =
  "complete" | "reserved" | "in_progress" | "action_needed" | "ordered" | "not_applicable";

export type TimelinePhase =
  "today" | "next_week" | "two_weeks" | "ride_week" | "friday" | "saturday" | "sunday";

export type TimelineState = "completed" | "current" | "upcoming";

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
  /** Optional admin-set due date (YYYY-MM-DD) shown in the step's guidance. */
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
  state: TimelineState;
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

/** A value that comes from an external system, so admins can't overwrite it. */
export interface APIManagedField {
  key: string;
  label: string;
  source: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  user: string;
  action:
    | "create"
    | "update"
    | "delete"
    | "publish"
    | "unpublish"
    | "archive"
    | "reorder"
    | "reset"
    | "toggle";
  entity: string;
  entityId?: string;
  detail?: string;
}

export interface AdminState {
  /** Bumped when default content changes in a way stored copies must pick up. */
  contentVersion: number;
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
  apiManaged: APIManagedField[];
  audit: AuditEntry[];
  /** Static copy on the My Journey page, editable by a Super User. */
  journeyCopy: Record<string, string>;
}

// ============ DEFAULT CONTENT ============

export const ADMIN_CONTENT_VERSION = 2;

/** Shown as "updated by" on content nobody has edited yet. */
export const DEFAULT_EDITOR = "Default content";

export const journeyCopyDefaults: Record<string, string> = {
  heroEyebrow: "Your Ride Weekend Command Center",
  heroReadyPrefix: "You're",
  heroReadySuffix: "ready for Ride Weekend.",
  countdownLabel: "Countdown",
  countdownCaption: "Sat Aug 7, 2027 · Ride Weekend",
  viewSwitchNote: "Switch views without losing your place.",
  timelineHeading: "My Ride Weekend timeline",
  qaContinue: "Continue My Journey",
  qaPacking: "View Packing List",
  qaFamily: "Family Guide",
  qaConcierge: "Ask the Concierge",
  qaEvents: "Fundraising Event Calendar",
  qaFundraising: "Fundraising Resources",
};

export const defaultFlags: FeatureFlags = {
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

type Stamped = "updatedAt" | "updatedBy";

/** Readiness steps. Status and detail are replaced per colleague from their
 *  own registration answers (src/lib/journey-merge.ts); these are fallbacks. */
const readinessDefaults: Omit<EditableReadinessItem, Stamped>[] = [
  {
    id: "pelotonia",
    title: "Pelotonia registration",
    status: "action_needed",
    detail: "Register with Pelotonia, then add your Rider ID and HB number.",
    icon: "check",
    ctaLabel: "Start registration",
    href: "/register",
    weight: 25,
    required: true,
    audience: "riders",
    active: true,
    publish: "published",
  },
  {
    id: "hotel",
    title: "Hotel reservation",
    status: "action_needed",
    detail: "Tell us whether you need travel or a hotel for Ride Weekend.",
    icon: "hotel",
    ctaLabel: "Add travel",
    href: "/register",
    weight: 20,
    required: true,
    audience: "riders",
    active: true,
    publish: "published",
  },
  {
    id: "bike",
    title: "Bike rental",
    status: "action_needed",
    detail: "Tell us whether you need a bike rental.",
    icon: "bike",
    ctaLabel: "Choose bike plan",
    href: "/register",
    weight: 15,
    required: true,
    audience: "riders",
    active: true,
    publish: "published",
  },
  {
    id: "volunteer",
    title: "Volunteer shift",
    status: "not_applicable",
    detail: "Volunteer shift assignments open closer to Ride Weekend.",
    icon: "users",
    ctaLabel: "Learn about volunteering",
    href: "/resources",
    weight: 0,
    required: false,
    audience: "volunteers",
    active: false,
    publish: "published",
  },
  {
    id: "fundraising",
    title: "Fundraising",
    status: "action_needed",
    detail: "Add your Pelotonia Rider ID to see your fundraising progress.",
    icon: "dollar",
    ctaLabel: "Fundraising resources",
    action: "fundraising",
    weight: 25,
    required: true,
    audience: "riders",
    active: true,
    publish: "published",
  },
  {
    id: "apparel",
    title: "Apparel",
    status: "action_needed",
    detail: "Choose your sizes and confirm your mailing address.",
    icon: "shirt",
    ctaLabel: "Choose apparel",
    href: "/register",
    weight: 15,
    required: true,
    audience: "riders",
    active: true,
    publish: "published",
  },
];

/** Timeline steps. Ride Weekend 2027 is Aug 7 to 8 with the Opening Ceremony
 *  on Aug 6 (pelotonia.org). Times and venues are left for admins to add once
 *  Pelotonia confirms them. */
const timelineDefaults: Omit<EditableTimelineItem, Stamped | "order">[] = [
  {
    id: "t-1",
    phase: "today",
    state: "current",
    title: "Complete Pelotonia registration",
    instructions: "Register with Pelotonia, then add your Rider ID and HB number in the Hub.",
    ctaLabel: "Open registration",
    href: "/register",
    audience: "all",
    required: true,
    publish: "published",
  },
  {
    id: "t-2",
    phase: "today",
    state: "upcoming",
    title: "Choose your bike plan",
    instructions: "Choose a rental or bring your own bike, and confirm size and pedals.",
    ctaLabel: "Open bike step",
    href: "/register",
    audience: "all",
    required: false,
    publish: "published",
  },
  {
    id: "t-3",
    phase: "next_week",
    state: "upcoming",
    title: "Confirm travel and hotel",
    instructions: "Add your travel and hotel details in the Travel step.",
    ctaLabel: "Review travel",
    href: "/register",
    audience: "all",
    required: false,
    publish: "published",
  },
  {
    id: "t-4",
    phase: "next_week",
    state: "upcoming",
    title: "Order apparel",
    instructions: "Pick your jersey style and size, and confirm your mailing address.",
    ctaLabel: "Open apparel step",
    href: "/register",
    audience: "all",
    required: false,
    publish: "published",
  },
  {
    id: "t-5",
    phase: "two_weeks",
    state: "upcoming",
    title: "Review packing list",
    time: "Two weeks out",
    instructions: "Walk through your rider or volunteer list and check off what you already have.",
    ctaLabel: "Open packing list",
    href: "/packing",
    audience: "all",
    required: false,
    publish: "published",
  },
  {
    id: "t-6",
    phase: "ride_week",
    state: "upcoming",
    title: "Check final logistics",
    instructions: "Final Ride Weekend logistics will be posted here as they are confirmed.",
    ctaLabel: "Ask a question",
    action: "concierge",
    audience: "all",
    required: false,
    publish: "published",
  },
  {
    id: "t-7",
    phase: "friday",
    state: "upcoming",
    title: "Pelotonia Opening Ceremony",
    time: "Fri Aug 6",
    instructions: "Times, location and packet pickup details will be posted here once announced.",
    ctaLabel: "Ask the Concierge",
    action: "concierge",
    audience: "all",
    required: false,
    publish: "published",
  },
  {
    id: "t-9",
    phase: "saturday",
    state: "upcoming",
    title: "Ride Day",
    time: "Sat Aug 7",
    instructions: "Start times and team meetup details for your route will be posted here.",
    ctaLabel: "Weather and packing tips",
    action: "concierge",
    audience: "all",
    required: false,
    publish: "published",
  },
  {
    id: "t-12",
    phase: "sunday",
    state: "upcoming",
    title: "Sunday routes",
    time: "Sun Aug 8",
    instructions: "Some routes ride on Sunday. Check your route details on Pelotonia's site.",
    audience: "all",
    required: false,
    publish: "published",
  },
  {
    id: "t-13",
    phase: "sunday",
    state: "upcoming",
    title: "Submit expenses",
    time: "After Ride Weekend",
    instructions: "Follow the Expense Guide to submit eligible expenses in Concur.",
    ctaLabel: "Open expense guide",
    href: "/expenses",
    audience: "all",
    required: false,
    publish: "published",
  },
];

type IntentDefault = Pick<ConciergeIntent, "title" | "keywords" | "body" | "links">;

const conciergeDefaults: IntentDefault[] = [
  {
    keywords: ["park", "parking"],
    title: "Family and spectator parking",
    body: "Parking guidance for families and spectators will be posted in the Family Guide as Ride Weekend gets closer.",
    links: [{ label: "Family Guide", href: "/family" }],
  },
  {
    keywords: ["packet", "pickup", "bib", "credential"],
    title: "Packet pickup",
    body: "Packet pickup times and location will be posted on your timeline once Pelotonia announces them.",
    links: [{ label: "Timeline", href: "/dashboard" }],
  },
  {
    keywords: ["hotel", "lodging", "room"],
    title: "Hotel information",
    body: "Add your travel and hotel plans in the Travel step of your registration.",
    links: [{ label: "Travel step", href: "/register" }],
  },
  {
    keywords: ["bike", "rental", "rent"],
    title: "Bike rental",
    body: "Choose a rental or bring your own bike in the Bike step. Sizing uses the height you enter there.",
    links: [{ label: "Bike step", href: "/register" }],
  },
  {
    keywords: ["inspection"],
    title: "Bike inspection",
    body: "If you're bringing your own bike, have it checked by a bike shop before Ride Weekend.",
    links: [{ label: "Resources", href: "/resources" }],
  },
  {
    keywords: ["family", "view", "spectate", "spectator", "cheer"],
    title: "Best family viewing locations",
    body: "Recommended places to cheer will be posted in the Family Guide once routes are confirmed.",
    links: [{ label: "Family Guide", href: "/family" }],
  },
  {
    keywords: ["weather"],
    title: "Weather planning",
    body: "Ride Weekend is in early August, so plan for heat and possible rain. Pack sunscreen, a light rain shell and extra water.",
    links: [{ label: "Packing list", href: "/packing" }],
  },
  {
    keywords: ["pack", "packing", "bring"],
    title: "What to pack",
    body: "Open the packing list. It's split into Ride Essentials, Clothing, Nutrition, Travel, Technology and Recovery for riders, with a separate volunteer list. Check items off as you pack.",
    links: [{ label: "Open packing list", href: "/packing" }],
  },
  {
    keywords: ["tent", "team huntington tent"],
    title: "Team Huntington tent",
    body: "Team tent locations will be posted in the Family Guide before Ride Weekend.",
    links: [{ label: "Family Guide", href: "/family" }],
  },
  {
    keywords: ["expense", "concur", "reimburse"],
    title: "Expenses",
    body: "Follow the step-by-step Expense Guide to submit eligible Ride Weekend expenses in Concur.",
    links: [{ label: "Expense guide", href: "/expenses" }],
  },
  {
    keywords: ["emergency", "help", "medical", "urgent", "911"],
    title: "Emergency and medical",
    body: "For life-threatening emergencies, call 911. On the course, ask any Pelotonia staff member or volunteer for help.",
    links: [{ label: "Family Guide", href: "/family" }],
  },
  {
    keywords: ["register", "registration", "signup", "sign up"],
    title: "Registration",
    body: "Use the guided registration flow: role, Pelotonia ID, travel, bike, apparel, mailing address and review. Progress saves as you go.",
    links: [{ label: "Continue registration", href: "/register" }],
  },
  {
    keywords: ["apparel", "jersey", "shirt", "size"],
    title: "Apparel",
    body: "Choose your jersey style and confirm your shirt size in the Apparel step, along with the mailing address for your order.",
    links: [{ label: "Apparel step", href: "/register" }],
  },
  {
    keywords: ["fundraising", "donate", "raise", "goal"],
    title: "Fundraising",
    body: "Share your Pelotonia fundraising page with friends and colleagues. Check Huntington's giving policy for any employee match.",
    links: [{ label: "Team hub", href: "/team" }],
  },
];

export const conciergeStarterDefaults = [
  "Where should my family park?",
  "When is packet pickup?",
  "Do I need a bike inspection?",
  "Where is the Team Huntington tent?",
  "How do I submit expenses?",
  "What should I pack?",
];

export const conciergeFallbackDefaults = {
  title: "I don't have an exact answer for that",
  body: "I match on keywords, so try one of the suggested questions or explore the resources below.",
};

type PackingSeed = Omit<PackingDefault, "order" | "active" | Stamped>;

const packingSeed = (
  preset: PackingSeed["preset"],
  category: string,
  items: [id: string, label: string, required: boolean, description?: string][],
): PackingSeed[] =>
  items.map(([id, label, required, description]) => ({
    id,
    label,
    category,
    preset,
    required,
    ...(description ? { description } : {}),
  }));

const packingDefaults: PackingSeed[] = [
  ...packingSeed("rider", "Ride Essentials", [
    ["r-1", "Helmet", true, "Required by Pelotonia."],
    ["r-2", "Bib number + safety pins", true],
    ["r-3", "Water bottles (2)", true],
    ["r-4", "Spare tube & tire levers", false],
  ]),
  ...packingSeed("rider", "Clothing", [
    ["r-5", "Team jersey", true],
    ["r-6", "Padded cycling shorts", false],
    ["r-7", "Cycling socks", false],
    ["r-8", "Rain shell", false],
  ]),
  ...packingSeed("rider", "Nutrition", [
    ["r-9", "Energy gels / chews", false],
    ["r-10", "Electrolyte mix", false],
    ["r-11", "Breakfast bar", false],
  ]),
  ...packingSeed("rider", "Travel", [
    ["r-12", "Photo ID", true],
    ["r-13", "Hotel confirmation", false],
    ["r-14", "Duffle & shoe bag", false],
  ]),
  ...packingSeed("rider", "Technology", [
    ["r-15", "Phone + charger", true],
    ["r-16", "Bike computer / GPS", false],
    ["r-17", "Portable battery", false],
  ]),
  ...packingSeed("rider", "Recovery", [
    ["r-18", "Chamois cream", false],
    ["r-19", "Ibuprofen / first aid", false],
    ["r-20", "Compression sleeves", false],
  ]),
  ...packingSeed("volunteer", "Shift Essentials", [
    ["v-1", "Volunteer credential", true],
    ["v-2", "Shift assignment printout", false],
    ["v-3", "Reusable water bottle", true],
  ]),
  ...packingSeed("volunteer", "Clothing", [
    ["v-4", "Team volunteer shirt", true],
    ["v-5", "Comfortable sneakers", false],
    ["v-6", "Cap or visor", false],
  ]),
  ...packingSeed("volunteer", "Weather Protection", [
    ["v-7", "Sunscreen (SPF 30+)", false],
    ["v-8", "Rain poncho", false],
    ["v-9", "Light jacket for morning", false],
  ]),
  ...packingSeed("volunteer", "Food and Hydration", [
    ["v-10", "Snacks & granola bars", false],
    ["v-11", "Electrolyte packets", false],
  ]),
  ...packingSeed("volunteer", "Technology", [
    ["v-12", "Phone + charger", true],
    ["v-13", "Portable battery", false],
  ]),
  ...packingSeed("volunteer", "Travel", [
    ["v-14", "Photo ID", true],
    ["v-15", "Hotel confirmation", false],
  ]),
];

const familyDefaults: Omit<FamilySection, Stamped | "order" | "active" | "publish">[] = [
  {
    id: "parking",
    icon: "car",
    title: "Spectator parking",
    body: "Parking guidance for Ride Weekend will be posted here once routes and road closures are confirmed.",
  },
  {
    id: "viewing",
    icon: "map",
    title: "Recommended viewing locations",
    body: "Cheer zones and viewing spots will be posted here once Pelotonia confirms the routes.",
  },
  {
    id: "tent",
    icon: "tent",
    title: "Team Huntington tent",
    body: "Team tent locations will be posted here before Ride Weekend.",
  },
  {
    id: "tracking",
    icon: "radio",
    title: "Rider tracking",
    body: "If Pelotonia offers live rider tracking, the link will be posted here.",
  },
  {
    id: "kids",
    icon: "baby",
    title: "Kids activities",
    body: "Family activities at Ride Weekend events will be listed here once announced.",
  },
  {
    id: "food",
    icon: "utensils",
    title: "Food & rest areas",
    body: "Food and rest area details will be posted here once announced.",
  },
  {
    id: "access",
    icon: "accessibility",
    title: "Accessibility",
    body: "Accessible parking and viewing details will be posted here once announced.",
  },
  {
    id: "weather",
    icon: "cloud",
    title: "Weather preparation",
    body: "Ride Weekend is in early August, so plan for heat and possible rain. Bring sunscreen, hats, water and a light rain layer.",
  },
  {
    id: "emergency",
    icon: "alert",
    title: "Emergency & contact",
    body: "For life-threatening emergencies, call 911. On the course, ask any Pelotonia staff member or volunteer for help.",
  },
];

const familyScheduleDefaults: FamilyScheduleDay[] = [
  {
    id: "fri",
    day: "Friday · Aug 6",
    items: ["Pelotonia Opening Ceremony (details to be announced)"],
    active: true,
  },
  {
    id: "sat",
    day: "Saturday · Aug 7",
    items: ["Ride Day (route start times to be announced)"],
    active: true,
  },
  {
    id: "sun",
    day: "Sunday · Aug 8",
    items: ["Sunday routes (details to be announced)"],
    active: true,
  },
];

/** Only values that really come from an integration are listed here. */
export const apiManagedDefaults: APIManagedField[] = [
  {
    key: "readiness.fundraising.current",
    label: "Fundraising total raised",
    source: "Pelotonia rider page",
  },
  {
    key: "team.goal.current",
    label: "Team cumulative raised",
    source: "Pelotonia team dashboard",
  },
];

/** A fresh copy of the default content, stamped with `now`. */
export function defaultAdminState(now: string = new Date().toISOString()): AdminState {
  const stamp = { updatedAt: now, updatedBy: DEFAULT_EDITOR };
  return {
    contentVersion: ADMIN_CONTENT_VERSION,
    superUser: { active: false, previewAs: null, currentEditor: "" },
    flags: { ...defaultFlags },
    announcements: [],
    goals: [],
    readiness: readinessDefaults.map((r) => ({ ...r, ...stamp })),
    timeline: timelineDefaults.map((t, order) => ({ ...t, order, ...stamp })),
    notifications: [],
    concierge: {
      intents: conciergeDefaults.map((r, i) => ({
        id: `intent-${i + 1}`,
        title: r.title,
        keywords: [...r.keywords],
        body: r.body,
        links: r.links.map((l) => ({ ...l })),
        order: i,
        active: true,
        ...stamp,
      })),
      starters: [...conciergeStarterDefaults],
      fallbackTitle: conciergeFallbackDefaults.title,
      fallbackBody: conciergeFallbackDefaults.body,
    },
    packing: {
      categories: {
        rider: ["Ride Essentials", "Clothing", "Nutrition", "Travel", "Technology", "Recovery"],
        volunteer: [
          "Shift Essentials",
          "Clothing",
          "Weather Protection",
          "Food and Hydration",
          "Technology",
          "Travel",
        ],
      },
      items: packingDefaults.map((p, order) => ({ ...p, order, active: true, ...stamp })),
    },
    family: {
      sections: familyDefaults.map((s, order) => ({
        ...s,
        order,
        active: true,
        publish: "published" as const,
        ...stamp,
      })),
      schedule: familyScheduleDefaults.map((d) => ({ ...d, items: [...d.items] })),
      parkingActive: true,
    },
    apiManaged: apiManagedDefaults.map((f) => ({ ...f })),
    audit: [],
    journeyCopy: { ...journeyCopyDefaults },
  };
}

// ============ MIGRATING STORED CONTENT ============

/**
 * Fields fingerprinted to recognise untouched prototype content in a stored
 * copy. Only content fields are used, so reordering, publishing or reading an
 * item doesn't change its fingerprint, but editing its text does.
 */
export const LEGACY_FIELDS = {
  announcements: ["id", "headline", "body"],
  goals: ["id", "name", "current", "target"],
  notifications: ["id", "title", "body"],
  readiness: ["id", "title", "detail"],
  timeline: ["id", "title", "instructions"],
  intents: ["id", "title", "body"],
  familySections: ["id", "title", "body"],
  familySchedule: ["id", "day", "items"],
  text: ["v"],
} as const;

/**
 * Fingerprints of the sample content the Lovable prototype seeded into every
 * browser before version 2 (fake banners, goals, notifications, dates, venues,
 * a 555 phone number). Stored as hashes so the invented text is not kept in
 * the codebase. Any stored item that still matches is replaced by the new
 * default with the same id, or dropped when there is none. Items an admin
 * created or edited don't match and are kept.
 */
// prettier-ignore
export const LEGACY_DEMO_FINGERPRINTS: ReadonlySet<string> = new Set([
  // announcements
  "70af6972", "297449d2",
  // goals
  "0a2053dc", "463d67b0", "18102966", "ce527c8b", "5d37d187",
  // notifications
  "a6f997da", "584255ae", "1f75f654", "71775054", "cc55d0ec",
  // readiness steps
  "631eef36", "828e4ec9", "a312dfdd", "e5b7fb1d", "5aa357c7", "465ca7b4",
  // timeline
  "68f29904", "4f5f62fa", "4348d387", "6c7d36ff", "6ae85ac7", "a421e2aa", "f1892261",
  "68e19988", "c0439e5b", "8ea35b5d", "b905a9da", "6608d73f", "7cbc4dd8",
  // concierge answers
  "04def422", "357bcd34", "fe9c90d7", "99a0c944", "27e9b15c", "935581a3", "07c5ee81",
  "a9a19c22", "b771be18", "06532927", "3784bdab", "34fe2aef", "206ed607", "e461641f",
  // family guide sections and schedule
  "dc588a3c", "a268037d", "31cc83df", "c925255d", "12fe179f", "87e1d9db", "c1fb8b0d",
  "d12fbf26", "9f5cf781", "e38b86bd", "39153192", "ab369248",
  // concierge fallback text, dashboard view-switch note
  "16dfef48", "5dd01dd2",
]);

type Fingerprinted = { id: string } & object;

/** Replace or drop list items that are still untouched prototype content. */
function replaceLegacy<T extends Fingerprinted>(
  stored: T[] | undefined,
  fields: readonly string[],
  defaults: T[],
  legacy: ReadonlySet<string>,
): T[] {
  if (!Array.isArray(stored)) return defaults;
  const byId = new Map(defaults.map((d) => [d.id, d]));
  const out: T[] = [];
  for (const item of stored) {
    if (!legacy.has(contentFingerprint(item as Record<string, unknown>, fields))) {
      out.push(item);
      continue;
    }
    const replacement = byId.get(item.id);
    if (replacement) out.push(replacement);
  }
  return out;
}

function replaceLegacyText(
  stored: string | undefined,
  fallback: string,
  legacy: ReadonlySet<string>,
) {
  if (typeof stored !== "string") return fallback;
  return legacy.has(contentFingerprint({ v: stored }, LEGACY_FIELDS.text)) ? fallback : stored;
}

/**
 * Turn whatever a browser has saved into a complete, current AdminState.
 * Copies saved before version 2 have their prototype sample content removed.
 */
export function migrateStoredAdminState(
  stored: unknown,
  defaults: AdminState = defaultAdminState(),
  legacy: ReadonlySet<string> = LEGACY_DEMO_FINGERPRINTS,
): AdminState {
  if (!stored || typeof stored !== "object") return defaults;
  const saved = stored as Partial<AdminState>;
  const merged: AdminState = {
    contentVersion: ADMIN_CONTENT_VERSION,
    superUser: { ...defaults.superUser, ...saved.superUser },
    flags: { ...defaults.flags, ...saved.flags },
    announcements: saved.announcements ?? defaults.announcements,
    goals: saved.goals ?? defaults.goals,
    readiness: saved.readiness ?? defaults.readiness,
    timeline: saved.timeline ?? defaults.timeline,
    notifications: saved.notifications ?? defaults.notifications,
    concierge: { ...defaults.concierge, ...saved.concierge },
    packing: saved.packing ?? defaults.packing,
    family: { ...defaults.family, ...saved.family },
    // The integration registry is defined in code, never taken from storage.
    apiManaged: defaults.apiManaged,
    audit: saved.audit ?? [],
    journeyCopy: { ...journeyCopyDefaults, ...saved.journeyCopy },
  };
  if ((saved.contentVersion ?? 1) >= 2) return merged;

  const F = LEGACY_FIELDS;
  return {
    ...merged,
    announcements: replaceLegacy(merged.announcements, F.announcements, [], legacy),
    goals: replaceLegacy(merged.goals, F.goals, [], legacy),
    notifications: replaceLegacy(merged.notifications, F.notifications, [], legacy),
    readiness: replaceLegacy(merged.readiness, F.readiness, defaults.readiness, legacy),
    timeline: replaceLegacy(merged.timeline, F.timeline, defaults.timeline, legacy),
    concierge: {
      ...merged.concierge,
      intents: replaceLegacy(
        merged.concierge.intents,
        F.intents,
        defaults.concierge.intents,
        legacy,
      ),
      fallbackBody: replaceLegacyText(
        merged.concierge.fallbackBody,
        defaults.concierge.fallbackBody,
        legacy,
      ),
    },
    family: {
      ...merged.family,
      sections: replaceLegacy(
        merged.family.sections,
        F.familySections,
        defaults.family.sections,
        legacy,
      ),
      schedule: replaceLegacy(
        merged.family.schedule,
        F.familySchedule,
        defaults.family.schedule,
        legacy,
      ),
    },
    journeyCopy: {
      ...merged.journeyCopy,
      viewSwitchNote: replaceLegacyText(
        merged.journeyCopy.viewSwitchNote,
        journeyCopyDefaults.viewSwitchNote,
        legacy,
      ),
    },
  };
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
    if (done) return n + i.weight;
    // Steps that track a running total (fundraising) earn partial credit for
    // progress instead of counting as zero until the goal is reached.
    const goal = i.progressGoal ?? 0;
    const current = i.progressCurrent ?? 0;
    if (goal > 0 && current > 0) {
      return n + i.weight * Math.min(1, current / goal);
    }
    return n;
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
  if (g.unit === "dollars")
    return { current: formatCurrencyUSD(g.current), target: formatCurrencyUSD(g.target) };
  if (g.unit === "percentage") return { current: `${g.current}%`, target: `${g.target}%` };
  return { current: g.current.toLocaleString(), target: g.target.toLocaleString() };
}
