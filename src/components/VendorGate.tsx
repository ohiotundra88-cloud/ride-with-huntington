import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { useVendorAccess } from "@/lib/useVendorAccess";
import { Button } from "@/components/ui/button";
import { VendorCrmPaused } from "@/components/VendorCrmPaused";

/** Client-side convenience only — the server re-checks on every call. */
export function VendorGate({ children }: { children: React.ReactNode }) {
  const { data, isPending, error } = useVendorAccess();

  if (isPending) {
    return (
      <p className="mx-auto max-w-md px-4 py-24 text-center text-sm text-muted-foreground">
        Checking access…
      </p>
    );
  }

  if (!error && data?.paused && !data.allowed) return <VendorCrmPaused />;

  if (error || !data?.allowed) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-[var(--brand-dark)]" />
        <h1 className="mt-4 text-xl font-bold text-[var(--brand-dark)]">
          Vendor CRM is restricted
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Access is limited to vendor captains who have been granted dashboard access by a super
          user, plus co-chairs and super users.
        </p>
        <Button
          asChild
          className="mt-6 bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90"
        >
          <Link to="/">Back to the hub</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
