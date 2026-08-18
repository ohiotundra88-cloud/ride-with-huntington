import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listFaqsTool from "./tools/list-faqs";
import searchFaqsTool from "./tools/search-faqs";
import getFaqTool from "./tools/get-faq";
import rideWeekendInfoTool from "./tools/ride-weekend-info";

const supabaseUrl =
  process.env["SUPABASE_URL"] ?? import.meta.env["VITE_SUPABASE_URL"] ?? "";

export default defineMcp({
  name: "team-huntington-hub-mcp",
  title: "Team Huntington Hub",
  version: "0.1.0",
  instructions:
    "Tools for the Team Huntington Hub — a prototype site helping Huntington colleagues participate in Pelotonia. Use `search_faqs` or `list_faqs` to explore FAQ articles, `get_faq` for a single article's full body, and `ride_weekend_info` for the 2027 Ride Weekend schedule.",
  // Agents must present a valid hub sign-in token; the server no longer answers
  // anonymous callers once published.
  auth: auth.oauth.issuer({
    issuer: `${supabaseUrl}/auth/v1`,
    jwksUri: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
    acceptedAudiences: ["authenticated"],
    resourceName: "Team Huntington Hub",
  }),
  tools: [listFaqsTool, searchFaqsTool, getFaqTool, rideWeekendInfoTool],
});
