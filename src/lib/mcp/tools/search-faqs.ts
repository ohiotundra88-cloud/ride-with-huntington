import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { faqs } from "@/lib/faq-data";

export default defineTool({
  name: "search_faqs",
  title: "Search FAQs",
  description:
    "Full-text search over Team Huntington Hub FAQ articles. Matches title, body, keywords, and category. Returns matching articles with full body text.",
  inputSchema: {
    query: z.string().min(1).describe("Search query."),
    limit: z.number().int().min(1).max(25).optional().describe("Max results (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ query, limit }) => {
    const q = query.toLowerCase();
    const results = faqs
      .filter((f) =>
        [f.title, f.body, f.category, ...f.keywords].some((v) =>
          v.toLowerCase().includes(q),
        ),
      )
      .slice(0, limit ?? 10);
    return {
      content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
      structuredContent: { results, count: results.length },
    };
  },
});
