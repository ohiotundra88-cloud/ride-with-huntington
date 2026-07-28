import { useEffect, useMemo, useState, useCallback } from "react";
import { faqs as builtinFaqs, faqCategories, type FAQArticle, type FAQCategory } from "./faq-data";

const KEY = "hh_faq_admin_v1";

interface FaqAdminState {
  customs: FAQArticle[];
  overrides: Record<string, FAQArticle>;
  hidden: string[];
}

const empty: FaqAdminState = { customs: [], overrides: {}, hidden: [] };

function load(): FaqAdminState {
  if (typeof window === "undefined") return empty;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    return { ...empty, ...JSON.parse(raw) };
  } catch {
    return empty;
  }
}

// Simple event bus so all mounted hooks stay in sync
const listeners = new Set<() => void>();
function emit() { listeners.forEach((l) => l()); }

export function useFaqAdmin() {
  const [state, setState] = useState<FaqAdminState>(() => load());

  useEffect(() => {
    const l = () => setState(load());
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);

  const persist = useCallback((next: FaqAdminState) => {
    localStorage.setItem(KEY, JSON.stringify(next));
    setState(next);
    emit();
  }, []);

  const merged: FAQArticle[] = useMemo(() => {
    const hidden = new Set(state.hidden);
    const base = builtinFaqs
      .filter((f) => !hidden.has(f.id))
      .map((f) => state.overrides[f.id] ?? f);
    return [...base, ...state.customs];
  }, [state]);

  const upsert = useCallback((article: FAQArticle) => {
    const cur = load();
    const isBuiltin = builtinFaqs.some((f) => f.id === article.id);
    if (isBuiltin) {
      persist({ ...cur, overrides: { ...cur.overrides, [article.id]: article } });
    } else {
      const idx = cur.customs.findIndex((f) => f.id === article.id);
      const customs = [...cur.customs];
      if (idx >= 0) customs[idx] = article; else customs.push(article);
      persist({ ...cur, customs });
    }
  }, [persist]);

  const remove = useCallback((id: string) => {
    const cur = load();
    const isBuiltin = builtinFaqs.some((f) => f.id === id);
    if (isBuiltin) {
      persist({ ...cur, hidden: Array.from(new Set([...cur.hidden, id])) });
    } else {
      persist({ ...cur, customs: cur.customs.filter((f) => f.id !== id) });
    }
  }, [persist]);

  const resetBuiltin = useCallback((id: string) => {
    const cur = load();
    const { [id]: _, ...rest } = cur.overrides;
    persist({ ...cur, overrides: rest, hidden: cur.hidden.filter((h) => h !== id) });
  }, [persist]);

  const isCustom = useCallback((id: string) => !builtinFaqs.some((f) => f.id === id), []);
  const isEdited = useCallback((id: string) => Boolean(state.overrides[id]), [state]);

  return { merged, upsert, remove, resetBuiltin, isCustom, isEdited, state };
}

export { faqCategories };
export type { FAQArticle, FAQCategory };
