import { Hexagon, Mountain, Smile, Target } from "lucide-react";
import type { VendorTier } from "@/lib/vendors.shared";

const STYLES: Record<VendorTier["key"], { className: string; Icon: typeof Hexagon }> = {
  pinnacle: { className: "bg-[var(--brand-dark)] text-white", Icon: Mountain },
  one_goal: { className: "bg-[var(--brand)] text-[var(--brand-foreground)]", Icon: Target },
  gold_honeycomb: { className: "bg-amber-100 text-amber-900 ring-1 ring-amber-300", Icon: Hexagon },
  green_honeycomb: {
    className: "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-300",
    Icon: Hexagon,
  },
};

const base =
  "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide";

export function VendorTierBadge({ tier, year }: { tier: VendorTier | null; year?: number }) {
  if (!tier) return null;
  const { className, Icon } = STYLES[tier.key];
  return (
    <span className={`${base} ${className}`} title={`${tier.label}${year ? ` · ${year}` : ""}`}>
      <Icon
        className="h-3 w-3"
        aria-hidden="true"
        fill={tier.key.endsWith("honeycomb") ? "currentColor" : "none"}
      />
      {tier.label}
    </span>
  );
}

export function KidsSupporterBadge({ show, year }: { show: boolean; year?: number }) {
  if (!show) return null;
  return (
    <span
      className={`${base} bg-sky-50 text-sky-900 ring-1 ring-sky-300`}
      title={`Pelotonia Kids Supporter${year ? ` · ${year}` : ""}`}
    >
      <Smile className="h-3 w-3" aria-hidden="true" />
      Pelotonia Kids Supporter
    </span>
  );
}
