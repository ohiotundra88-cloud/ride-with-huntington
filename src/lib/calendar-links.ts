import type { MyTeamEvent } from "@/lib/team-events.shared";

/**
 * Helpers to export a team event to personal calendars.
 * - Apple Calendar (and Outlook desktop) open a downloaded .ics file.
 * - Outlook on the web opens a pre-filled event composer link.
 */

function toDateTime(date: string, time: string | null, fallback: string): Date {
  const t = time && /^\d{2}:\d{2}/.test(time) ? time.slice(0, 5) : fallback;
  return new Date(`${date}T${t}:00`);
}

/** ICS floating local time (no timezone) — shows at the right local time for the recipient. */
function icsStamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function icsEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

export interface EventTimes {
  start: Date;
  end: Date;
  allDay: boolean;
}

export function eventTimes(event: Pick<MyTeamEvent, "eventDate" | "startTime" | "endTime">): EventTimes {
  const hasStart = !!event.startTime;
  const start = toDateTime(event.eventDate, event.startTime, "09:00");
  const end = event.endTime
    ? toDateTime(event.eventDate, event.endTime, "10:00")
    : new Date(start.getTime() + 60 * 60 * 1000);
  if (end <= start) end.setTime(start.getTime() + 60 * 60 * 1000);
  return { start, end, allDay: !hasStart };
}

export function buildIcs(event: MyTeamEvent): string {
  const { start, end, allDay } = eventTimes(event);
  const uid = `${event.id}@team-huntington`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Team Huntington//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${icsEscape(event.title)}`,
    allDay ? "X-MICROSOFT-CDO-ALLDAYEVENT:TRUE" : "",
    event.location ? `LOCATION:${icsEscape(event.location)}` : "",
    event.description ? `DESCRIPTION:${icsEscape(event.description)}` : "",
    event.organizerName || event.organizerEmail
      ? `ORGANIZER;CN=${icsEscape(event.organizerName || event.organizerEmail)}:mailto:${event.organizerEmail || "noreply@ridewithhuntington.com"}`
      : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.join("\r\n");
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "event";
}

/** Download the event as an .ics file — opens in Apple Calendar or Outlook desktop. */
export function downloadIcs(event: MyTeamEvent) {
  const ics = buildIcs(event);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugify(event.title)}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function outlookDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** Pre-filled Outlook on the web composer for this event. */
export function outlookWebUrl(event: MyTeamEvent): string {
  const { start, end } = eventTimes(event);
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: outlookDate(start),
    enddt: outlookDate(end),
  });
  if (event.location) params.set("location", event.location);
  if (event.description) params.set("body", event.description);
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}
