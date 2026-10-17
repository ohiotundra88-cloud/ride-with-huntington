import type { ReactNode } from "react";
import { StoreContext, useStoreState } from "@/lib/store";

export function StoreProvider({ children }: { children: ReactNode }) {
  return <StoreContext.Provider value={useStoreState()}>{children}</StoreContext.Provider>;
}
