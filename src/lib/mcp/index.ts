import { defineMcp } from "@lovable.dev/mcp-js";
import listFaqsTool from "./tools/list-faqs";
import searchFaqsTool from "./tools/search-faqs";
import getFaqTool from "./tools/get-faq";
import rideWeekendInfoTool from "./tools/ride-weekend-info";

export default defineMcp({
  name: "team-huntington-hub-mcp",
  title: "Team Huntington Hub",
  version: "0.1.0",
  instructions:
    "Public tools for the Team Huntington Hub — a prototype site helping Huntington colleagues participate in Pelotonia. Use `search_faqs` or `list_faqs` to explore FAQ articles, `get_faq` for a single article's full body, and `ride_weekend_info` for the 2027 Ride Weekend schedule.",
  tools: [listFaqsTool, searchFaqsTool, getFaqTool, rideWeekendInfoTool],
});
