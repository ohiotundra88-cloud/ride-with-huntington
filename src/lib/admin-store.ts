// Super User editable content (announcements, readiness steps, timeline,
// concierge answers, Family Guide, feature flags) and the Super User session.
//
// Storage: this browser's localStorage only. Edits are not shared with other
// colleagues. Types, defaults and helpers live in src/lib/admin-content.ts.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Context,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  defaultAdminState,
  migrateStoredAdminState,
  type AdminState,
  type APIManagedField,
  type AuditEntry,
} from "@/lib/admin-content";

// ============ PERSISTENCE ============

const KEY = "hh_admin_v1";

function load(): AdminState {
  if (typeof window === "undefined") return defaultAdminState();
  try {
    const raw = localStorage.getItem(KEY);
    return migrateStoredAdminState(raw ? JSON.parse(raw) : null);
  } catch {
    return defaultAdminState();
  }
}

// ============ CONTEXT ============

export interface AdminCtx {
  state: AdminState;
  setState: Dispatch<SetStateAction<AdminState>>;
  audit: (entry: Omit<AuditEntry, "id" | "at" | "user">) => void;
  resetSection: (section: keyof AdminState) => void;
  resetAll: () => void;
  isApiManaged: (key: string) => APIManagedField | undefined;
}

// Keep a single context instance across hot-module reloads. Without this, an
// HMR update re-evaluates this module, creating a fresh context that consumers
// read while the mounted provider still uses the old one — which surfaced as
// "useAdmin must be used inside AdminStoreProvider" with a blank screen.
const g = globalThis as unknown as { __adminStoreCtx?: Context<AdminCtx | null> };
export const AdminStoreContext = (g.__adminStoreCtx ??= createContext<AdminCtx | null>(null));

/** All of the admin store's state and actions; rendered by <AdminStoreProvider>. */
export function useAdminStoreState(): AdminCtx {
  const [state, setState] = useState<AdminState>(() => defaultAdminState());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // Storage full or blocked: edits still apply for this session.
    }
  }, [state, hydrated]);

  const audit = useCallback((entry: Omit<AuditEntry, "id" | "at" | "user">) => {
    setState((s) => ({
      ...s,
      audit: [
        {
          id: crypto.randomUUID(),
          at: new Date().toISOString(),
          user: s.superUser.currentEditor || "Super User",
          ...entry,
        },
        ...s.audit,
      ].slice(0, 200),
    }));
  }, []);

  const resetSection = useCallback((section: keyof AdminState) => {
    const defaults = defaultAdminState();
    setState((s) => ({ ...s, [section]: defaults[section] }));
  }, []);

  const resetAll = useCallback(() => setState(defaultAdminState()), []);

  const isApiManaged = useCallback(
    (key: string) => state.apiManaged.find((f) => f.key === key),
    [state.apiManaged],
  );

  return useMemo<AdminCtx>(
    () => ({ state, setState, audit, resetSection, resetAll, isApiManaged }),
    [state, audit, resetSection, resetAll, isApiManaged],
  );
}

export function useAdmin() {
  const c = useContext(AdminStoreContext);
  if (!c) throw new Error("useAdmin must be used inside AdminStoreProvider");
  return c;
}
