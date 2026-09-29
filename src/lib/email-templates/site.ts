import { setting } from "@/server/runtime";

/** The Hub's public address for links in emails: PUBLIC_ORIGIN, read when the email is built. */
export function siteUrl(): string {
  return (
    setting("PUBLIC_ORIGIN", { optional: true }) ?? "https://www.ridewithhuntington.com"
  ).replace(/\/+$/, "");
}
