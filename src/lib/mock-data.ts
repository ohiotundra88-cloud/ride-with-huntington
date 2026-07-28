// Central mock data for the Ride Weekend Command Center demo.
// All values are sample/demonstration data — clearly labeled in UI.

import type { LucideIcon } from "lucide-react";
import {
  Bike,
  CheckCircle2,
  DollarSign,
  Hotel,
  Shirt,
  Users,
} from "lucide-react";

// Demo event date used across countdowns, timeline, notifications.
export const RIDE_WEEKEND_DATE = "2027-08-07T07:00:00-04:00";

// ============ TYPES ============
export type ReadinessStatus =
  | "complete"
  | "reserved"
  | "in_progress"
  | "action_needed"
  | "ordered"
  | "not_applicable";

export interface ReadinessItem {
  id: string;
  title: string;
  status: ReadinessStatus;
  detail: string;
  icon: LucideIcon;
  ctaLabel: string;
  href?: string;
  action?: "packing" | "concierge" | "fundraising";
  progress?: { current: number; goal: number };
}

export type TimelinePhase =
  | "today"
  | "next_week"
  | "two_weeks"
  | "ride_week"
  | "friday"
  | "saturday"
  | "sunday";

export type TimelineState = "completed" | "current" | "upcoming";

export interface TimelineItem {
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
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  href?: string;
  kind: "deadline" | "reminder" | "milestone" | "event";
}

export interface PackingItem {
  id: string;
  label: string;
  category: string;
  checked: boolean;
  custom?: boolean;
}

export interface TeamMetric {
  id: string;
  label: string;
  value: string;
  note?: string;
}

export interface TeamActivity {
  id: string;
  title: string;
  body: string;
  time: string;
}

export interface AnalyticsMetric {
  id: string;
  label: string;
  value: string;
  delta?: string;
  helper?: string;
}

export interface ConciergeResponse {
  keywords: string[];
  title: string;
  body: string;
  links?: { label: string; href: string }[];
}

// ============ READINESS ============
export const readinessItems: ReadinessItem[] = [
  {
    id: "pelotonia",
    title: "Pelotonia registration",
    status: "complete",
    detail: "Registered as Rider · Confirmation PELO-2027-12345",
    icon: CheckCircle2,
    ctaLabel: "View registration",
    href: "/register",
  },
  {
    id: "hotel",
    title: "Hotel reservation",
    status: "reserved",
    detail: "Hilton Columbus Downtown · Aug 6–8, 2027",
    icon: Hotel,
    ctaLabel: "View travel",
    href: "/register",
  },
  {
    id: "bike",
    title: "Bike rental",
    status: "action_needed",
    detail: "Reserve or confirm your rental before Jul 22.",
    icon: Bike,
    ctaLabel: "Reserve bike",
    href: "/register",
  },
  {
    id: "volunteer",
    title: "Volunteer shift",
    status: "not_applicable",
    detail: "You're registered as a Rider — no shift needed.",
    icon: Users,
    ctaLabel: "Learn about volunteering",
    href: "/resources",
  },
  {
    id: "fundraising",
    title: "Fundraising",
    status: "in_progress",
    detail: "$3,800 of $5,000 raised · 76% to goal",
    icon: DollarSign,
    ctaLabel: "Fundraising resources",
    action: "fundraising",
    progress: { current: 3800, goal: 5000 },
  },
  {
    id: "apparel",
    title: "Apparel",
    status: "ordered",
    detail: "Short-sleeve jersey (M) · Shipping Jul 20",
    icon: Shirt,
    ctaLabel: "View apparel",
    href: "/register",
  },
];

export const overallReadiness = 72;

// ============ TIMELINE ============
export const timelineItems: TimelineItem[] = [
  {
    id: "t-1",
    phase: "today",
    state: "completed",
    title: "Complete Pelotonia registration",
    time: "Completed",
    instructions: "You're registered with confirmation PELO-2027-12345.",
    ctaLabel: "View registration",
    href: "/register",
  },
  {
    id: "t-2",
    phase: "today",
    state: "current",
    title: "Reserve or inspect your bike",
    time: "Due Jul 22",
    location: "roll: Bicycles — Columbus, OH",
    instructions: "Choose rental or bring-your-own and confirm size and pedals.",
    note: "Rentals ship the week of Jul 28 for pickup Friday.",
    ctaLabel: "Open bike step",
    href: "/register",
  },
  {
    id: "t-3",
    phase: "next_week",
    state: "upcoming",
    title: "Confirm hotel dates",
    time: "By Jul 22",
    location: "Hilton Columbus Downtown",
    instructions: "Verify check-in Aug 6 and check-out Aug 8. Update in Concur if changing.",
    ctaLabel: "Review travel",
    href: "/register",
  },
  {
    id: "t-4",
    phase: "next_week",
    state: "upcoming",
    title: "Order apparel",
    time: "By Jul 10",
    instructions: "Pick jersey style and size — orders ship to your mailing address.",
    ctaLabel: "Open apparel step",
    href: "/register",
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
  },
  {
    id: "t-6",
    phase: "ride_week",
    state: "upcoming",
    title: "Attend Team Huntington kickoff call",
    time: "Wed Aug 4 · 12:00 PM ET",
    location: "Virtual (calendar invite)",
    instructions: "Final logistics, weather brief, and Q&A with team captains.",
    ctaLabel: "Ask a question",
    action: "concierge",
  },
  {
    id: "t-7",
    phase: "friday",
    state: "upcoming",
    title: "Pick up rider packet",
    time: "Fri Aug 6 · 2:00–7:00 PM",
    location: "Columbus Convention Center",
    instructions: "Bring photo ID. Grab your bib, wristband, and swag bag.",
    ctaLabel: "Where is packet pickup?",
    action: "concierge",
  },
  {
    id: "t-8",
    phase: "friday",
    state: "upcoming",
    title: "Team Huntington gathering",
    time: "Fri Aug 6 · 6:30 PM",
    location: "Hilton Columbus Downtown — Union Ballroom",
    instructions: "Dinner, remarks from leadership, and route briefing.",
    ctaLabel: "Add to calendar",
    href: "/resources",
  },
  {
    id: "t-9",
    phase: "saturday",
    state: "upcoming",
    title: "Arrive at staging",
    time: "Sat Aug 7 · 5:30 AM",
    location: "McFerson Commons",
    instructions: "Team lineup, bag drop, and start-corral entry by 6:15 AM.",
    contact: "team-huntington@hub.demo",
    ctaLabel: "Ask the Concierge",
    action: "concierge",
  },
  {
    id: "t-10",
    phase: "saturday",
    state: "upcoming",
    title: "Begin the ride",
    time: "Sat Aug 7 · 7:00 AM",
    instructions: "Roll-out with your route group. Hydrate at every rest stop.",
    ctaLabel: "Weather & packing tips",
    action: "concierge",
  },
  {
    id: "t-11",
    phase: "saturday",
    state: "upcoming",
    title: "Visit the Team Huntington tent",
    time: "Sat Aug 7 · rest stops & finish",
    location: "Rest stops 2, 4, and finish village",
    instructions: "Team snacks, cheer squad, and photo backdrop.",
    ctaLabel: "Find the tent",
    action: "concierge",
  },
  {
    id: "t-12",
    phase: "sunday",
    state: "upcoming",
    title: "Finish-line celebration",
    time: "Sun Aug 8 · 11:00 AM",
    location: "Hilton Columbus Downtown",
    instructions: "Team brunch, recognition, and group photo.",
    ctaLabel: "Team events",
    href: "/team",
  },
  {
    id: "t-13",
    phase: "sunday",
    state: "upcoming",
    title: "Submit expenses",
    time: "Within 30 days",
    instructions: "Follow the Concur guide — cost center HH-PELO-2027.",
    ctaLabel: "Open expense guide",
    href: "/expenses",
  },
];

export const timelineSections: { phase: TimelinePhase; label: string }[] = [
  { phase: "today", label: "Today" },
  { phase: "next_week", label: "Next week" },
  { phase: "two_weeks", label: "Two weeks before" },
  { phase: "ride_week", label: "Ride week" },
  { phase: "friday", label: "Friday · Aug 6" },
  { phase: "saturday", label: "Saturday · Aug 7 (Ride Day)" },
  { phase: "sunday", label: "Sunday · Aug 8" },
];

// ============ NOTIFICATIONS ============
export const seedNotifications: Notification[] = [
  {
    id: "n-1",
    kind: "deadline",
    title: "Hotel booking deadline approaching",
    body: "Group rate at Hilton Columbus Downtown closes Jul 22.",
    time: "2h ago",
    read: false,
    href: "/register",
  },
  {
    id: "n-2",
    kind: "reminder",
    title: "Bike rental incomplete",
    body: "Choose a rental option or confirm bring-your-own before Jul 22.",
    time: "Yesterday",
    read: false,
    href: "/register",
  },
  {
    id: "n-3",
    kind: "reminder",
    title: "Packet pickup — save the time",
    body: "Fri Aug 6 · 2–7 PM at the Columbus Convention Center.",
    time: "2d ago",
    read: false,
    href: "/dashboard",
  },
  {
    id: "n-4",
    kind: "milestone",
    title: "Fundraising milestone reached",
    body: "You've crossed $3,500 raised — 70% of your $5,000 goal.",
    time: "3d ago",
    read: true,
    href: "/team",
  },
  {
    id: "n-5",
    kind: "event",
    title: "New Team Huntington event added",
    body: "Sunday brunch added to the Ride Weekend schedule.",
    time: "5d ago",
    read: true,
    href: "/team",
  },
];

// ============ PACKING ============
export const riderPackingCategories = [
  "Ride Essentials",
  "Clothing",
  "Nutrition",
  "Travel",
  "Technology",
  "Recovery",
] as const;

export const volunteerPackingCategories = [
  "Shift Essentials",
  "Clothing",
  "Weather Protection",
  "Food and Hydration",
  "Technology",
  "Travel",
] as const;

const riderDefaults: Omit<PackingItem, "checked">[] = [
  { id: "r-1", label: "Helmet (required)", category: "Ride Essentials" },
  { id: "r-2", label: "Bib number + safety pins", category: "Ride Essentials" },
  { id: "r-3", label: "Water bottles (2)", category: "Ride Essentials" },
  { id: "r-4", label: "Spare tube & tire levers", category: "Ride Essentials" },
  { id: "r-5", label: "Team jersey", category: "Clothing" },
  { id: "r-6", label: "Padded cycling shorts", category: "Clothing" },
  { id: "r-7", label: "Cycling socks", category: "Clothing" },
  { id: "r-8", label: "Rain shell", category: "Clothing" },
  { id: "r-9", label: "Energy gels / chews", category: "Nutrition" },
  { id: "r-10", label: "Electrolyte mix", category: "Nutrition" },
  { id: "r-11", label: "Breakfast bar", category: "Nutrition" },
  { id: "r-12", label: "Photo ID", category: "Travel" },
  { id: "r-13", label: "Hotel confirmation", category: "Travel" },
  { id: "r-14", label: "Duffle & shoe bag", category: "Travel" },
  { id: "r-15", label: "Phone + charger", category: "Technology" },
  { id: "r-16", label: "Bike computer / GPS", category: "Technology" },
  { id: "r-17", label: "Portable battery", category: "Technology" },
  { id: "r-18", label: "Chamois cream", category: "Recovery" },
  { id: "r-19", label: "Ibuprofen / first aid", category: "Recovery" },
  { id: "r-20", label: "Compression sleeves", category: "Recovery" },
];

const volunteerDefaults: Omit<PackingItem, "checked">[] = [
  { id: "v-1", label: "Volunteer credential", category: "Shift Essentials" },
  { id: "v-2", label: "Shift assignment printout", category: "Shift Essentials" },
  { id: "v-3", label: "Reusable water bottle", category: "Shift Essentials" },
  { id: "v-4", label: "Team volunteer shirt", category: "Clothing" },
  { id: "v-5", label: "Comfortable sneakers", category: "Clothing" },
  { id: "v-6", label: "Cap or visor", category: "Clothing" },
  { id: "v-7", label: "Sunscreen (SPF 30+)", category: "Weather Protection" },
  { id: "v-8", label: "Rain poncho", category: "Weather Protection" },
  { id: "v-9", label: "Light jacket for morning", category: "Weather Protection" },
  { id: "v-10", label: "Snacks & granola bars", category: "Food and Hydration" },
  { id: "v-11", label: "Electrolyte packets", category: "Food and Hydration" },
  { id: "v-12", label: "Phone + charger", category: "Technology" },
  { id: "v-13", label: "Portable battery", category: "Technology" },
  { id: "v-14", label: "Photo ID", category: "Travel" },
  { id: "v-15", label: "Hotel confirmation", category: "Travel" },
];

export function getDefaultPackingList(preset: "rider" | "volunteer"): PackingItem[] {
  const src = preset === "rider" ? riderDefaults : volunteerDefaults;
  return src.map((i) => ({ ...i, checked: false }));
}

// ============ TEAM HUB ============
export const teamMetrics: TeamMetric[] = [
  { id: "m-1", label: "Riders", value: "2,400", note: "sample" },
  { id: "m-2", label: "Volunteers", value: "1,500", note: "sample" },
  { id: "m-3", label: "Cumulative raised", value: "$52,296,574", note: "sample · 18 seasons" },
  { id: "m-4", label: "Seasons", value: "18", note: "since inception" },
];

export const teamActivities: TeamActivity[] = [
  {
    id: "a-1",
    title: "$5,000 milestone",
    body: "A Columbus colleague crossed their $5,000 fundraising milestone (sample).",
    time: "1h ago",
  },
  {
    id: "a-2",
    title: "5 new recruits",
    body: "A Cleveland rider recruited five new Team Huntington participants (sample).",
    time: "3h ago",
  },
  {
    id: "a-3",
    title: "Leadership milestone",
    body: "A volunteer captain completed their leadership certification (sample).",
    time: "Yesterday",
  },
  {
    id: "a-4",
    title: "Regional goal exceeded",
    body: "Detroit region passed 120% of its Ride Weekend goal (sample).",
    time: "2d ago",
  },
];

export const teamGoal = { current: 3_450_000, goal: 5_000_000 };

// ============ ANALYTICS ============
export function analyticsMetrics(filter: "all" | "riders" | "volunteers"): AnalyticsMetric[] {
  const factor = filter === "riders" ? 0.62 : filter === "volunteers" ? 0.38 : 1;
  const n = (v: number) => Math.round(v * factor).toLocaleString();
  return [
    { id: "a-1", label: "Riders registered", value: filter === "volunteers" ? "0" : n(2400), delta: "+8%" },
    { id: "a-2", label: "Volunteers registered", value: filter === "riders" ? "0" : n(1500), delta: "+12%" },
    { id: "a-3", label: "Registration completion", value: "78%", delta: "+4 pts" },
    { id: "a-4", label: "Hotel bookings", value: n(1120), delta: "+6%" },
    { id: "a-5", label: "Bike rentals", value: n(640), delta: "+11%" },
    { id: "a-6", label: "Apparel orders", value: n(2210), delta: "+5%" },
    { id: "a-7", label: "Support requests", value: n(184), delta: "-9%" },
    { id: "a-8", label: "Demo adoption", value: "92%", delta: "+15 pts" },
    { id: "a-9", label: "Fundraising progress", value: "$3.45M / $5M", delta: "69% of goal" },
    { id: "a-10", label: "Avg. readiness", value: "72%", delta: "+3 pts" },
  ];
}

export const funnelStages = [
  { id: "invited", label: "Invited", value: 4200 },
  { id: "started", label: "Started registration", value: 3800 },
  { id: "registered", label: "Registered", value: 3120 },
  { id: "travel", label: "Travel completed", value: 2450 },
  { id: "bike", label: "Bike plan completed", value: 2010 },
  { id: "ready", label: "Fully ready", value: 1720 },
];

export const topSupportTopics = [
  { label: "Hotel & travel", value: 34 },
  { label: "Bike rental", value: 28 },
  { label: "Expenses / Concur", value: 22 },
  { label: "Apparel sizing", value: 18 },
  { label: "Family logistics", value: 14 },
];

export const readinessBreakdown = [
  { label: "Fully ready (90–100%)", value: 41 },
  { label: "On track (70–89%)", value: 32 },
  { label: "Needs attention (40–69%)", value: 19 },
  { label: "At risk (<40%)", value: 8 },
];

export const regionCompletion = [
  { label: "Columbus, OH", value: 82 },
  { label: "Cleveland, OH", value: 76 },
  { label: "Cincinnati, OH", value: 71 },
  { label: "Detroit, MI", value: 68 },
  { label: "Pittsburgh, PA", value: 74 },
  { label: "Chicago, IL", value: 65 },
];

export const outstandingActions = [
  "312 riders have not confirmed bike rental",
  "148 hotel reservations awaiting deadline",
  "97 apparel orders missing size",
  "54 expense reports overdue from prior year",
];

// ============ CONCIERGE ============
export const conciergeResponses: ConciergeResponse[] = [
  {
    keywords: ["park", "parking"],
    title: "Family & spectator parking",
    body: "Recommended lots: McFerson Commons Garage and Neil Ave. Garage. Arrive by 6:00 AM Saturday for closest access. Accessible parking is available in the Nationwide Blvd lot with a placard.",
    links: [{ label: "Family Guide", href: "/family" }],
  },
  {
    keywords: ["packet", "pickup", "bib", "credential"],
    title: "Packet pickup",
    body: "Friday, Aug 6 · 2:00–7:00 PM at the Columbus Convention Center, Hall B. Bring a photo ID. If you can't make Friday, packets are available Saturday morning at staging until 5:45 AM.",
    links: [{ label: "Timeline", href: "/dashboard" }],
  },
  {
    keywords: ["hotel", "lodging", "room"],
    title: "Hotel information",
    body: "Team block: Hilton Columbus Downtown, Aug 6–8, 2027. Group rate closes Jul 22. Check-in from 3 PM; late arrival is fine — front desk holds all reservations.",
    links: [{ label: "Travel step", href: "/register" }],
  },
  {
    keywords: ["bike", "rental", "rent"],
    title: "Bike rental",
    body: "Rentals ship the week of Jul 28. Pickup is Friday at packet pickup or Saturday at staging. Bring the confirmation email and your ID. Sizing is based on the height you provided at registration.",
    links: [{ label: "Bike step", href: "/register" }],
  },
  {
    keywords: ["inspection"],
    title: "Bike inspection",
    body: "Free inspections run all day Friday at packet pickup. Bring-your-own riders are strongly encouraged to have their bike tuned within 30 days of Ride Day.",
    links: [{ label: "Resources", href: "/resources" }],
  },
  {
    keywords: ["family", "view", "spectate", "spectator", "cheer"],
    title: "Best family viewing locations",
    body: "Top spectator spots: Mile 12 (McFerson Commons), Mile 34 (Pickerington Cheer Zone), and the finish line at Hilton Columbus. Team Huntington tent is at the finish and rest stops 2 and 4.",
    links: [{ label: "Family Guide", href: "/family" }],
  },
  {
    keywords: ["weather"],
    title: "Weather planning",
    body: "August in Columbus averages 82°F high, 62°F low. Pack a light rain shell, sun sleeves, and extra water. We'll send a final forecast in the Wednesday kickoff email.",
    links: [{ label: "Packing list", href: "/packing" }],
  },
  {
    keywords: ["pack", "packing", "bring"],
    title: "What to pack",
    body: "Open the smart packing list — it's split into Ride Essentials, Clothing, Nutrition, Travel, Technology, and Recovery for riders (with a separate volunteer preset). Check items off as you pack.",
    links: [{ label: "Open packing list", href: "/packing" }],
  },
  {
    keywords: ["tent", "team huntington tent"],
    title: "Team Huntington tent",
    body: "The tent is at the finish line village (near the bandshell) and at rest stops 2 and 4 along the route. Look for the bright lime canopy with the team banner.",
    links: [{ label: "Family Guide", href: "/family" }],
  },
  {
    keywords: ["expense", "concur", "reimburse"],
    title: "Expenses",
    body: "Submit within 30 days of Ride Weekend. Cost center HH-PELO-2027. Use the step-by-step Concur guide.",
    links: [{ label: "Expense guide", href: "/expenses" }],
  },
  {
    keywords: ["emergency", "help", "medical", "urgent", "911"],
    title: "Emergency & medical",
    body: "For life-threatening emergencies, call 911. Medical tents are at every rest stop and the finish. On-course support: flag any staff member in a yellow vest or call the rider hotline printed on your bib.",
    links: [{ label: "Family Guide", href: "/family" }],
  },
  {
    keywords: ["register", "registration", "signup", "sign up"],
    title: "Registration",
    body: "Use the guided registration flow — role, Pelotonia ID, travel, bike, apparel, mailing, and review. Progress saves as you go.",
    links: [{ label: "Continue registration", href: "/register" }],
  },
  {
    keywords: ["apparel", "jersey", "shirt", "size"],
    title: "Apparel",
    body: "Choose short-sleeve or sleeveless jersey and confirm shirt size. Orders ship to the mailing address on your registration. Sizing questions? Sample kits are at the Team Huntington office in Columbus.",
    links: [{ label: "Apparel step", href: "/register" }],
  },
  {
    keywords: ["fundraising", "donate", "raise", "goal"],
    title: "Fundraising",
    body: "Your personal page is live. Share your custom link on Teams and LinkedIn. Huntington matches employee gifts up to $2,500 per colleague per year.",
    links: [{ label: "Team hub", href: "/team" }],
  },
];

export const conciergeStarters = [
  "Where should my family park?",
  "When is packet pickup?",
  "Do I need a bike inspection?",
  "Where is the Team Huntington tent?",
  "How do I submit expenses?",
  "What should I pack?",
];

export const conciergeFallback: ConciergeResponse = {
  keywords: [],
  title: "I don't have an exact answer for that",
  body: "This is a demo assistant, so I match on keywords. Try one of the suggested questions, or explore the resources below.",
  links: [
    { label: "Ride Weekend timeline", href: "/dashboard" },
    { label: "Family Guide", href: "/family" },
    { label: "Packing list", href: "/packing" },
    { label: "Resources & FAQ", href: "/resources" },
    { label: "Expense guide", href: "/expenses" },
  ],
};
