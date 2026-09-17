import { z } from "zod";

export type StageKey = "captain" | "legal" | "risk" | "compliance" | "marketing" | "cochair";
export type StageStatus = "pending" | "approved" | "changes_requested" | "declined";
export type RequestStatus = "submitted" | "in_review" | "changes_requested" | "declined" | "approved";
export type EventType = "in_person" | "virtual";

export interface FundraiserRequest {
  id: string;
  title: string;
  description: string;
  event_type: EventType;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  expected_attendance: number | null;
  fundraising_method: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  flier_path: string | null;
  flier_name: string | null;
  status: RequestStatus;
  captain_status: StageStatus;
  legal_status: StageStatus;
  risk_status: StageStatus;
  compliance_status: StageStatus;
  marketing_status: StageStatus;
  cochair_status: StageStatus;
  event_id: string | null;
  submitted_by: string;
  captain_id: string | null;
  created_at: string;
  updated_at: string;
  submitter_email?: string | null;
  submitter_name?: string | null;
  captain_name?: string | null;
  captain_email?: string | null;
}

export interface ApprovalEntry {
  id: string;
  request_id: string;
  stage: string;
  decision: string;
  note: string | null;
  actor_email: string | null;
  created_at: string;
}

export const REQUEST_COLUMNS =
  "id, title, description, event_type, event_date, start_time, end_time, location, expected_attendance, fundraising_method, contact_name, contact_email, contact_phone, flier_path, flier_name, status, captain_status, legal_status, risk_status, compliance_status, marketing_status, cochair_status, event_id, submitted_by, captain_id, created_at, updated_at";

export const STAGES: { key: StageKey; label: string; role: string; tier: 1 | 2 | 3 }[] = [
  { key: "captain", label: "Peloton Captain", role: "captain", tier: 1 },
  { key: "legal", label: "Legal", role: "legal", tier: 2 },
  { key: "risk", label: "Risk", role: "risk", tier: 2 },
  { key: "compliance", label: "Compliance", role: "compliance", tier: 2 },
  { key: "marketing", label: "Marketing", role: "marketing", tier: 2 },
  { key: "cochair", label: "Co-Chair sign-off", role: "cochair", tier: 3 },
];

export const REVIEWER_ROLES = ["captain", "legal", "risk", "compliance", "marketing", "cochair"] as const;

export function stageStatus(r: FundraiserRequest, key: StageKey): StageStatus {
  return r[`${key}_status` as const] as StageStatus;
}

/** Stages that can be acted on right now (captain first, then the four in parallel, then co-chair). */
export function actionableStages(r: FundraiserRequest): StageKey[] {
  if (r.status === "declined" || r.status === "approved") return [];
  if (stageStatus(r, "captain") !== "approved") return ["captain"];
  const tier2 = STAGES.filter((s) => s.tier === 2);
  const pending = tier2.filter((s) => stageStatus(r, s.key) !== "approved").map((s) => s.key);
  if (pending.length > 0) return pending;
  return stageStatus(r, "cochair") === "approved" ? [] : ["cochair"];
}

export function isFullyApproved(r: FundraiserRequest) {
  return STAGES.every((s) => stageStatus(r, s.key) === "approved");
}

export function statusLabel(status: RequestStatus) {
  switch (status) {
    case "submitted": return "Awaiting captain";
    case "in_review": return "In review";
    case "changes_requested": return "Changes requested";
    case "declined": return "Denied — needs attention";
    case "approved": return "Approved";
  }
}

/** The submitter can still edit and resubmit these. */
export function needsSubmitterAttention(r: FundraiserRequest) {
  return r.status === "declined" || r.status === "changes_requested";
}

export function canActOnStage(roles: string[], stage: StageKey) {
  if (roles.includes("admin") || roles.includes("superuser")) return true;
  const meta = STAGES.find((s) => s.key === stage)!;
  return roles.includes(meta.role);
}

export const requestInputSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().min(10).max(4000),
  event_type: z.enum(["in_person", "virtual"]),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date"),
  start_time: z.string().trim().max(20).optional().nullable().transform((v) => v || null),
  end_time: z.string().trim().max(20).optional().nullable().transform((v) => v || null),
  location: z.string().trim().max(200).optional().nullable().transform((v) => v || null),
  expected_attendance: z.coerce.number().int().min(0).max(100000).optional().nullable(),
  fundraising_method: z.string().trim().max(300).optional().nullable().transform((v) => v || null),
  contact_name: z.string().trim().max(120).optional().nullable().transform((v) => v || null),
  contact_email: z.string().trim().max(255).optional().nullable().transform((v) => v || null),
  contact_phone: z.string().trim().max(40).optional().nullable().transform((v) => v || null),
});

export type RequestInput = z.input<typeof requestInputSchema>;

export const decisionSchema = z
  .object({
    id: z.string().uuid(),
    stage: z.enum(["captain", "legal", "risk", "compliance", "marketing", "cochair"]),
    decision: z.enum(["approved", "changes_requested", "declined"]),
    note: z.string().trim().max(1000).optional().nullable().transform((v) => v || null),
  })
  .superRefine((v, ctx) => {
    if (v.decision !== "approved" && (!v.note || v.note.length < 5)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["note"],
        message: "Add a comment explaining what the submitter needs to change.",
      });
    }
  });

export const ALLOWED_FLIER_TYPES = ["image/png", "image/jpeg", "image/webp", "application/pdf"] as const;
export const MAX_FLIER_BYTES = 5 * 1024 * 1024;

export const requestFlierSchema = z.object({
  id: z.string().uuid(),
  fileName: z.string().trim().min(1).max(160),
  contentType: z.enum(ALLOWED_FLIER_TYPES),
  base64: z.string().min(1),
});

export type TrackerState = "todo" | "current" | "done" | "changes" | "declined";

export interface TrackerPhase {
  key: "submitted" | "captain" | "departments" | "cochair" | "calendar";
  label: string;
  detail?: string;
  state: TrackerState;
  chips?: { label: string; state: TrackerState }[];
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}

/** Pizza-tracker phases derived from the request's stage columns. */
export function trackerPhases(r: FundraiserRequest): {
  phases: TrackerPhase[];
  message: string;
  updatedLabel: string;
} {
  const tier2 = STAGES.filter((s) => s.tier === 2);
  const cleared = tier2.filter((s) => stageStatus(r, s.key) === "approved");
  const blocked = tier2.filter((s) => stageStatus(r, s.key) === "changes_requested");
  const refused = tier2.filter((s) => stageStatus(r, s.key) === "declined");
  const captain = stageStatus(r, "captain");
  const cochair = stageStatus(r, "cochair");
  const declined = r.status === "declined";
  const approved = isFullyApproved(r);

  const toState = (s: StageStatus, isCurrent: boolean): TrackerState =>
    s === "approved" ? "done"
      : s === "declined" ? "declined"
        : s === "changes_requested" ? "changes"
          : isCurrent ? "current" : "todo";

  const captainState = toState(captain, true);
  const departmentsActive = captain === "approved" && cleared.length < tier2.length;
  const departmentsState: TrackerState =
    refused.length > 0 ? "declined"
      : blocked.length > 0 ? "changes"
        : cleared.length === tier2.length ? "done"
          : departmentsActive ? "current" : "todo";
  const cochairState: TrackerState =
    cleared.length === tier2.length ? toState(cochair, true) : toState(cochair, false);

  const phases: TrackerPhase[] = [
    { key: "submitted", label: "Submitted", detail: new Date(r.created_at).toLocaleDateString(), state: "done" },
    { key: "captain", label: "Peloton Captain", state: captainState },
    {
      key: "departments",
      label: "Department review",
      detail: `${cleared.length} of ${tier2.length} cleared`,
      state: departmentsState,
      chips: tier2.map((s) => ({
        label: s.label,
        state: toState(stageStatus(r, s.key), false),
      })),
    },
    { key: "cochair", label: "Co-Chair sign-off", state: cochairState },
    {
      key: "calendar",
      label: r.event_type === "virtual" ? "Live" : "On the calendar",
      state: r.event_id ? "done" : declined ? "declined" : "todo",
    },
  ];

  let message: string;
  if (declined) {
    const who = refused[0]?.label ?? (captain === "declined" ? "Your peloton captain" : cochair === "declined" ? "A co-chair" : "A reviewer");
    message = `${who} denied this request and left a comment below — update the details and resubmit.`;
  } else if (approved) {
    message = r.event_id
      ? "Fully approved — your fundraiser is live on the Team Huntington calendar."
      : "Fully approved. It publishes to the fundraising calendar momentarily.";
  } else if (captain === "changes_requested") {
    message = "Your peloton captain sent this back for changes — edit and resubmit below.";
  } else if (blocked.length > 0) {
    message = `Sent back for changes by ${blocked.map((s) => s.label).join(", ")} — edit and resubmit.`;
  } else if (captain !== "approved") {
    message = "Waiting on your peloton captain to review the details.";
  } else if (cleared.length < tier2.length) {
    const waiting = tier2.filter((s) => stageStatus(r, s.key) !== "approved").map((s) => s.label);
    message = `Captain approved. Now with ${waiting.join(", ")} — they review in any order.`;
  } else {
    message = "All departments cleared. Waiting on final co-chair sign-off.";
  }

  return { phases, message, updatedLabel: relativeTime(r.updated_at) };
}
