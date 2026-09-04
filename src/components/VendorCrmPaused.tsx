import { Link } from "@tanstack/react-router";
import { PauseCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Shown when the Vendor CRM site switch is off. Super Users are exempt, so
 * anyone seeing this cannot use the tool until it is switched back on.
 */
export function VendorCrmPaused() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <PauseCircle className="h-6 w-6 text-muted-foreground" />
      </div>
      <h1 className="mt-4 text-2xl font-bold text-[var(--brand-dark)]">Vendor CRM is paused right now</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        A Super User has temporarily switched off the vendor relationship tool. Nothing has been deleted —
        every vendor, contact, spend, and donation record will be right where you left it once it is
        switched back on.
      </p>
      <Button asChild className="mt-6 bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90">
        <Link to="/">Back to the hub</Link>
      </Button>
    </div>
  );
}
