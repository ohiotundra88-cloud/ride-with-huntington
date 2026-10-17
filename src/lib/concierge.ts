import type { ConciergeIntent } from "./admin-content.ts";

export const CONCIERGE_OPEN_EVENT = "open-concierge";

/** The first active intent, in admin order, with a keyword found in the question. */
export function matchIntent(input: string, intents: ConciergeIntent[]): ConciergeIntent | null {
  const q = input.toLowerCase();
  const active = intents.filter((i) => i.active).sort((a, b) => a.order - b.order);
  for (const r of active) if (r.keywords.some((k) => q.includes(k.toLowerCase()))) return r;
  return null;
}

/** Opens the Concierge drawer from anywhere on the page. */
export function openConcierge() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CONCIERGE_OPEN_EVENT));
}
