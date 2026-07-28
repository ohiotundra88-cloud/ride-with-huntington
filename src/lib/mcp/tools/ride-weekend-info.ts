import { defineTool } from "@lovable.dev/mcp-js";

const info = {
  event: "Pelotonia Ride Weekend 2027",
  team: "Team Huntington",
  rideDay: "Saturday, August 7, 2027",
  weekend: [
    { date: "Friday, August 6, 2027", label: "Pre-ride kickoff", details: "Details coming soon." },
    { date: "Saturday, August 7, 2027", label: "Ride Day", details: "Details coming soon." },
    { date: "Sunday, August 8, 2027", label: "Post-ride celebration", details: "Details coming soon." },
  ],
  hub: "Team Huntington Hub — guided registration, travel, hotel, bike rental, apparel, mailing, and expense-report help for Huntington colleagues participating in Pelotonia.",
};

export default defineTool({
  name: "ride_weekend_info",
  title: "Ride Weekend info",
  description:
    "Public information about Team Huntington's Pelotonia Ride Weekend 2027, including the ride day and weekend schedule placeholders.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [{ type: "text", text: JSON.stringify(info, null, 2) }],
    structuredContent: info,
  }),
});
