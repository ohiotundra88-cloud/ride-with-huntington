import { z } from "zod";

export type StageKey = "captain" | "legal" | "risk" | "compliance" | "marketing" | "cochair";
/** "not_required": the stage doesn't apply (Marketing, when no logos are used). */
export type StageStatus = "pending" | "approved" | "changes_requested" | "declined" | "not_required";
export type RequestStatus = "submitted" | "in_review" | "changes_requested" | "declined" | "approved";
/** Raffles never go on the calendar; approved ones are listed under "Active raffles". */
export type EventType = "in_person" | "virtual" | "raffle";

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
  /** Answers to the approval questions (null on requests filed before they existed). */
  on_huntington_property: boolean | null;
  facilities_approved: boolean | null;
  serves_alcohol: boolean | null;
  alcohol_details: string;
  serves_food: boolean | null;
  food_policy_acknowledged: boolean | null;
  /** Food trucks can't be hosted on Huntington Bank property. */
  food_truck: boolean | null;
  uses_logos: boolean | null;
  contract_needed: boolean | null;
  liability_waiver_needed: boolean | null;
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
  "id, title, description, event_type, event_date, start_time, end_time, location, expected_attendance, fundraising_method, contact_name, contact_email, contact_phone, on_huntington_property, facilities_approved, serves_alcohol, alcohol_details, serves_food, food_policy_acknowledged, food_truck, uses_logos, contract_needed, liability_waiver_needed, flier_path, flier_name, status, captain_status, legal_status, risk_status, compliance_status, marketing_status, cochair_status, event_id, submitted_by, captain_id, created_at, updated_at";

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

/** Approved, or not needed for this request. */
export function isStageCleared(status: StageStatus | string | null | undefined): boolean {
  return status === "approved" || status === "not_required";
}

/** Marketing reviews only requests that use Huntington or Pelotonia logos. */
export function initialMarketingStatus(usesLogos: boolean | null | undefined): StageStatus {
  return usesLogos === false ? "not_required" : "pending";
}

/** Stages that can be acted on right now (captain first, then the four in parallel, then co-chair). */
export function actionableStages(r: FundraiserRequest): StageKey[] {
  if (r.status === "declined" || r.status === "approved") return [];
  if (stageStatus(r, "captain") !== "approved") return ["captain"];
  const tier2 = STAGES.filter((s) => s.tier === 2);
  const pending = tier2.filter((s) => !isStageCleared(stageStatus(r, s.key))).map((s) => s.key);
  if (pending.length > 0) return pending;
  return stageStatus(r, "cochair") === "approved" ? [] : ["cochair"];
}

export function isFullyApproved(r: FundraiserRequest) {
  return STAGES.every((s) => isStageCleared(stageStatus(r, s.key)));
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

/**
 * Can this person act on the stage? Admins and super users always can. The
 * captain stage is limited to the captain the submitter picked (when one is
 * recorded), so other captains don't see requests that aren't theirs.
 */
export function canActOnStage(
  roles: string[],
  stage: StageKey,
  ctx?: { request?: FundraiserRequest; userId?: string | null },
) {
  if (roles.includes("admin") || roles.includes("superuser")) return true;
  const meta = STAGES.find((s) => s.key === stage)!;
  if (!roles.includes(meta.role)) return false;
  if (stage === "captain" && ctx?.request?.captain_id) {
    return ctx.request.captain_id === ctx.userId;
  }
  return true;
}

const yesNo = (message: string) => z.boolean({ required_error: message, invalid_type_error: message });

export const requestInputSchema = z.object({
  id: z.string().uuid().optional(),
  captain_id: z.string().uuid({ message: "Select your Business Unit Captain" }),
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().min(10).max(4000),
  event_type: z.enum(["in_person", "virtual", "raffle"]),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date"),
  start_time: z.string().trim().max(20).optional().nullable().transform((v) => v || null),
  end_time: z.string().trim().max(20).optional().nullable().transform((v) => v || null),
  location: z.string().trim().max(200).optional().nullable().transform((v) => v || null),
  expected_attendance: z.coerce.number().int().min(0).max(100000).optional().nullable(),
  fundraising_method: z.string().trim().max(300).optional().nullable().transform((v) => v || null),
  contact_name: z.string().trim().max(120).optional().nullable().transform((v) => v || null),
  contact_email: z.string().trim().max(255).optional().nullable().transform((v) => v || null),
  contact_phone: z.string().trim().max(40).optional().nullable().transform((v) => v || null),
  on_huntington_property: yesNo("Tell us whether the event is on Huntington Bank property"),
  facilities_approved: z.boolean().optional().nullable(),
  serves_alcohol: yesNo("Tell us whether alcohol will be served"),
  alcohol_details: z.string().trim().max(1000).optional().default(""),
  serves_food: yesNo("Tell us whether food will be served"),
  food_policy_acknowledged: z.boolean().optional().nullable(),
  food_truck: z.boolean().optional().nullable(),
  uses_logos: yesNo("Tell us whether you'll use Huntington or Pelotonia logos"),
  contract_needed: yesNo("Tell us whether a contract is needed"),
  liability_waiver_needed: yesNo("Tell us whether a liability waiver is needed"),
}).superRefine((v, ctx) => {
  if (v.on_huntington_property && typeof v.facilities_approved !== "boolean") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["facilities_approved"], message: "Tell us whether your Regional Facilities Manager has approved it" });
  }
  if (v.serves_alcohol && (v.alcohol_details ?? "").trim().length < 5) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["alcohol_details"], message: "Describe how alcohol will be served" });
  }
  if (v.serves_food && v.food_policy_acknowledged !== true) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["food_policy_acknowledged"],
      message: "Food can't be served by a Huntington colleague. Confirm you agree to submit this request.",
    });
  }
  if (v.serves_food && typeof v.food_truck !== "boolean") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["food_truck"], message: "Tell us whether a food truck will be there" });
  }
  if (v.on_huntington_property && v.serves_food && v.food_truck) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["food_truck"],
      message: "Food trucks can't be hosted on Huntington Bank property. Choose another location or skip the food truck.",
    });
  }
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
  const cleared = tier2.filter((s) => isStageCleared(stageStatus(r, s.key)));
  const blocked = tier2.filter((s) => stageStatus(r, s.key) === "changes_requested");
  const refused = tier2.filter((s) => stageStatus(r, s.key) === "declined");
  const captain = stageStatus(r, "captain");
  const cochair = stageStatus(r, "cochair");
  const declined = r.status === "declined";
  const approved = isFullyApproved(r);

  const toState = (s: StageStatus, isCurrent: boolean): TrackerState =>
    s === "approved" || s === "not_required" ? "done"
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
    {
      key: "captain",
      label: "Peloton Captain",
      detail: r.captain_name || r.captain_email || undefined,
      state: captainState,
    },
    {
      key: "departments",
      label: "Department review",
      detail: `${cleared.length} of ${tier2.length} cleared`,
      state: departmentsState,
      chips: tier2.map((s) => ({
        label: stageStatus(r, s.key) === "not_required" ? `${s.label} (not needed)` : s.label,
        state: toState(stageStatus(r, s.key), false),
      })),
    },
    { key: "cochair", label: "Co-Chair sign-off", state: cochairState },
    {
      key: "calendar",
      label: r.event_type === "virtual" ? "Live" : r.event_type === "raffle" ? "Active raffles" : "On the calendar",
      state: r.event_id || (r.event_type === "raffle" && approved) ? "done" : declined ? "declined" : "todo",
    },
  ];

  let message: string;
  if (declined) {
    const who = refused[0]?.label ?? (captain === "declined" ? "Your peloton captain" : cochair === "declined" ? "A co-chair" : "A reviewer");
    message = `${who} denied this request and left a comment below — update the details and resubmit.`;
  } else if (approved) {
    message = r.event_type === "raffle"
      ? "Fully approved — your raffle is listed under Active raffles."
      : r.event_id
      ? "Fully approved — your fundraiser is live on the Team Huntington calendar."
      : "Fully approved. It publishes to the fundraising calendar momentarily.";
  } else if (captain === "changes_requested") {
    message = "Your peloton captain sent this back for changes — edit and resubmit below.";
  } else if (blocked.length > 0) {
    message = `Sent back for changes by ${blocked.map((s) => s.label).join(", ")} — edit and resubmit.`;
  } else if (captain !== "approved") {
    message = "Waiting on your peloton captain to review the details.";
  } else if (cleared.length < tier2.length) {
    const waiting = tier2.filter((s) => !isStageCleared(stageStatus(r, s.key))).map((s) => s.label);
    message = `Captain approved. Now with ${waiting.join(", ")} — they review in any order.`;
  } else {
    message = "All departments cleared. Waiting on final co-chair sign-off.";
  }

  return { phases, message, updatedLabel: relativeTime(r.updated_at) };
}
