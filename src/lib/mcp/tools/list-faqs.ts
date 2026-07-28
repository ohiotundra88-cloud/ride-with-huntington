import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { faqs } from "@/lib/faq-data";

export default defineTool({
  name: "list_faqs",
  title: "List FAQs",
  description:
    "List Team Huntington Hub FAQ articles. Optionally filter by category. Returns id, title, category, and keywords for each article.",
  inputSchema: {
    category: z
      .string()
      .optional()
      .describe(
        "Optional category filter, e.g. Registration, Travel, Bike Rental, Apparel, Fundraising, Ride Weekend, Volunteers, Expense Reports.",
      ),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ category }) => {
    const filtered = category
      ? faqs.filter((f) => f.category.toLowerCase() === category.toLowerCase())
      : faqs;
    const items = filtered.map(({ id, title, category, keywords }) => ({
      id,
      title,
      category,
      keywords,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(items, null, 2) }],
      structuredContent: { items, count: items.length },
    };
  },
});
