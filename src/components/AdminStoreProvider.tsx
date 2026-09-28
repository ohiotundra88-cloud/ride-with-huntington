import type { ReactNode } from "react";
import { AdminStoreContext, useAdminStoreState } from "@/lib/admin-store";

export function AdminStoreProvider({ children }: { children: ReactNode }) {
  return (
    <AdminStoreContext.Provider value={useAdminStoreState()}>{children}</AdminStoreContext.Provider>
  );
}
