import { Link } from "@tanstack/react-router";
import { PauseCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Shown wherever a fundraiser donate/sign-up page would render while the
 * site-wide fundraiser-pages switch is off. Requests and approvals are
 * unaffected, so we point people there instead.
 */
export function FundraiserPagesPaused() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <PauseCircle className="h-6 w-6 text-muted-foreground" />
      </div>
      <h1 className="mt-4 text-2xl font-bold text-[var(--brand-dark)]">
        Fundraiser pages are paused right now
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Donations and sign-ups are temporarily unavailable while Team Huntington makes some updates.
        Nothing has been lost — pages and their history will be back as soon as this is switched on again.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button asChild className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90">
          <Link to="/">Back to the hub</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/fundraiser-request">Submit a fundraiser request</Link>
        </Button>
      </div>
    </div>
  );
}
