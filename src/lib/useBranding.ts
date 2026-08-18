import { useQuery } from "@tanstack/react-query";
import { getBranding } from "@/lib/branding.functions";
import { brandingImageUrl, defaultBranding, type SiteBranding } from "@/lib/branding.shared";

export const brandingQueryKey = ["site-branding"] as const;

export function useBranding() {
  const { data } = useQuery<SiteBranding>({
    queryKey: brandingQueryKey,
    queryFn: () => getBranding(),
    staleTime: 60_000,
  });
  const branding = data ?? defaultBranding;
  return {
    branding,
    heroUrl: brandingImageUrl(branding, "hero"),
    logoUrl: brandingImageUrl(branding, "logo"),
  };
}
