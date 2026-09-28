import { useQuery } from "@tanstack/react-query";
import { getVendorAccess } from "@/lib/vendors.functions";
import type { VendorAccess } from "@/lib/vendors.shared";

/** Whether the signed-in colleague can open the Vendor CRM (cached for a minute). */
export function useVendorAccess() {
  return useQuery<VendorAccess>({
    queryKey: ["vendor-access"],
    queryFn: () => getVendorAccess(),
    retry: false,
    staleTime: 60_000,
  });
}
