import { useQuery } from "@tanstack/react-query";
import { FlaskConical } from "lucide-react";
import { getPaymentMode } from "@/lib/fundraising-pages.functions";

/** Shows a clear "no real money" notice while the demo payment provider is active. */
export function DemoPaymentBanner({ className = "" }: { className?: string }) {
  const { data } = useQuery({
    queryKey: ["payment-mode"],
    queryFn: () => getPaymentMode(),
    staleTime: 5 * 60 * 1000,
  });

  if (!data || data.live) return null;

  return (
    <div
      className={`flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 ${className}`}
      role="status"
    >
      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        <span className="font-semibold">Demo mode.</span> Checkout is simulated — no card is charged and no money moves.
        Totals, raffle entries, and payout reporting all work so the team can test the full flow before a live payment
        account is connected.
      </p>
    </div>
  );
}
