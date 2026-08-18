import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useAdmin, type EditableNotification } from "@/lib/admin-store";
import { listMyRequests } from "@/lib/fundraiser-requests.functions";
import {
  STAGES, stageStatus, isFullyApproved, trackerPhases,
  type FundraiserRequest, type StageKey, type StageStatus,
} from "@/lib/fundraiser-requests.shared";

const SNAPSHOT_KEY = "thh.approval-snapshot.v1";

type Snapshot = Record<string, Partial<Record<StageKey | "final", string>>>;

function readSnapshot(): Snapshot {
  try {
    return JSON.parse(localStorage.getItem(SNAPSHOT_KEY) ?? "{}") as Snapshot;
  } catch {
    return {};
  }
}

function snapshotOf(rows: FundraiserRequest[]): Snapshot {
  const out: Snapshot = {};
  for (const r of rows) {
    const entry: Snapshot[string] = {};
    for (const s of STAGES) entry[s.key] = stageStatus(r, s.key);
    entry.final = isFullyApproved(r) ? "approved" : r.status;
    out[r.id] = entry;
  }
  return out;
}

function decisionCopy(status: StageStatus, stageLabel: string, title: string) {
  if (status === "approved") return { headline: `${stageLabel} approved “${title}”`, priority: "info" as const };
  if (status === "changes_requested")
    return { headline: `${stageLabel} requested changes on “${title}”`, priority: "important" as const };
  if (status === "declined") return { headline: `${stageLabel} declined “${title}”`, priority: "urgent" as const };
  return null;
}

function makeNotification(
  id: string,
  title: string,
  body: string,
  priority: EditableNotification["priority"]
): EditableNotification {
  const now = new Date().toISOString();
  return {
    id,
    title,
    body,
    kind: "milestone",
    audience: "all",
    priority,
    href: "/fundraiser-request",
    ctaLabel: "View request status",
    publishAt: now,
    expireAt: new Date(Date.now() + 30 * 864e5).toISOString(),
    read: false,
    publish: "published",
    updatedAt: now,
    updatedBy: "system",
  };
}

/**
 * Watches the signed-in colleague's fundraiser requests and drops an in-app
 * notification (bell + toast) whenever a request advances a stage.
 */
export function useApprovalNotifications() {
  const { user } = useStore();
  const { setState } = useAdmin();
  const primed = useRef(false);

  const { data: requests } = useQuery<FundraiserRequest[]>({
    queryKey: ["my-fundraiser-requests"],
    queryFn: () => listMyRequests(),
    enabled: user.signedIn,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!requests) return;
    const next = snapshotOf(requests);

    if (!primed.current) {
      primed.current = true;
      if (!localStorage.getItem(SNAPSHOT_KEY)) {
        localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(next));
        return;
      }
    }

    const prev = readSnapshot();
    const fresh: EditableNotification[] = [];

    for (const r of requests) {
      const before = prev[r.id];
      if (!before) continue; // brand-new request: nothing to compare against
      for (const s of STAGES) {
        const was = before[s.key];
        const now = stageStatus(r, s.key);
        if (!was || was === now) continue;
        const copy = decisionCopy(now, s.label, r.title);
        if (!copy) continue;
        fresh.push(
          makeNotification(
            `fr-${r.id}-${s.key}-${now}`,
            copy.headline,
            trackerPhases(r).message,
            copy.priority
          )
        );
      }
      const finalNow = isFullyApproved(r) ? "approved" : r.status;
      if (before.final !== "approved" && finalNow === "approved") {
        fresh.push(
          makeNotification(
            `fr-${r.id}-final-approved`,
            `“${r.title}” is fully approved`,
            "Every reviewer signed off — your fundraiser is headed to the Team Huntington calendar.",
            "important"
          )
        );
      }
    }

    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(next));
    if (fresh.length === 0) return;

    setState((s) => {
      const existing = new Set(s.notifications.map((n) => n.id));
      const add = fresh.filter((n) => !existing.has(n.id));
      if (add.length === 0) return s;
      return { ...s, notifications: [...add, ...s.notifications] };
    });
    for (const n of fresh) toast.success(n.title, { description: n.body });
  }, [requests, setState]);
}
