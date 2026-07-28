// Client hooks for FAQs — backed by Lovable Cloud via server functions.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listFaqsPublic,
  listFaqsAdmin,
  upsertFaqAdmin,
  toggleFaqHiddenAdmin,
  deleteFaqAdmin,
  type FaqRow,
} from "@/lib/faqs.functions";
import { faqCategories, type FAQCategory } from "@/lib/faq-data";

export type { FaqRow };
export type FAQArticle = {
  id: string;
  title: string;
  category: FAQCategory;
  keywords: string[];
  body: string;
  hidden?: boolean;
  is_builtin?: boolean;
};
export { faqCategories };
export type { FAQCategory };

function toArticle(row: FaqRow): FAQArticle {
  return {
    id: row.id,
    title: row.title,
    category: row.category as FAQCategory,
    keywords: row.keywords ?? [],
    body: row.body,
    hidden: row.hidden,
    is_builtin: row.is_builtin,
  };
}

export function usePublicFaqs() {
  const fn = useServerFn(listFaqsPublic);
  return useQuery({
    queryKey: ["faqs", "public"],
    queryFn: () => fn(),
    select: (rows) => rows.map(toArticle),
  });
}

export function useAdminFaqs() {
  const fn = useServerFn(listFaqsAdmin);
  const upsertFn = useServerFn(upsertFaqAdmin);
  const toggleFn = useServerFn(toggleFaqHiddenAdmin);
  const deleteFn = useServerFn(deleteFaqAdmin);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["faqs", "admin"],
    queryFn: () => fn(),
    select: (rows) => rows.map((r) => ({ ...toArticle(r), hidden: r.hidden, is_builtin: r.is_builtin })),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["faqs"] });
  };

  const upsert = useMutation({
    mutationFn: (a: Partial<FAQArticle> & { title: string; category: string; body: string; keywords: string[] }) =>
      upsertFn({
        data: {
          id: a.id && a.id.length === 36 ? a.id : undefined,
          title: a.title,
          category: a.category,
          keywords: a.keywords,
          body: a.body,
        },
      }),
    onSuccess: invalidate,
  });

  const toggleHidden = useMutation({
    mutationFn: (v: { id: string; hidden: boolean }) => toggleFn({ data: v }),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: invalidate,
  });

  return { ...query, upsert, toggleHidden, remove };
}
