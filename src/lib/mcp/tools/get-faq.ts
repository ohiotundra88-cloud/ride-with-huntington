import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { faqs } from "@/lib/faq-data";

export default defineTool({
  name: "get_faq",
  title: "Get FAQ article",
  description: "Get the full body of a single Team Huntington Hub FAQ article by id.",
  inputSchema: {
    id: z.string().min(1).describe("FAQ article id, e.g. 'reg-1'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ id }) => {
    const article = faqs.find((f) => f.id === id);
    if (!article) {
      return {
        content: [{ type: "text", text: `No FAQ found with id "${id}".` }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(article, null, 2) }],
      structuredContent: { article },
    };
  },
});
