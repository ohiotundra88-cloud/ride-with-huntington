import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";

/**
 * Paths that render without a session. Everything else in the hub requires
 * sign-in — including cached registration progress in this browser.
 */
const PUBLIC_PREFIXES = [
  "/family",
  "/signin",
  "/health",
  "/fundraisers",
];

function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Blocks signed-out and not-yet-activated visitors from any non-public route. */
export function AuthGate({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, authReady } = useStore();

  if (isPublicPath(pathname)) return <>{children}</>;
  if (user.signedIn && user.activated) return <>{children}</>;

  if (!authReady) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center text-sm text-muted-foreground">
        Checking your sign-in…
      </div>
    );
  }

  if (user.signedIn && !user.activated) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Lock className="h-5 w-5 text-muted-foreground" />
        </div>
        <h1 className="mt-4 text-2xl font-bold">Finish activating your access</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account still needs the one-time passcode we email to your Huntington mailbox. Head back to
          sign-in to request a code and finish activation.
        </p>
        <div className="mt-6 flex justify-center">
          <Button asChild className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90">
            <Link to="/signin">Enter my passcode</Link>
          </Button>
        </div>
      </div>
    );
  }


  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Lock className="h-5 w-5 text-muted-foreground" />
      </div>
      <h1 className="mt-4 text-2xl font-bold">Sign in to continue</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This part of the Team Huntington Hub — including your registration progress — is only available to
        signed-in colleagues. The Family &amp; Spectator Guide stays open to everyone.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button asChild className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90">
          <Link to="/signin">Sign in</Link>
        </Button>
        <Button asChild variant="outline"><Link to="/family">Family &amp; Spectator Guide</Link></Button>
      </div>
    </div>
  );
}
