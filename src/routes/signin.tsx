import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { LogIn, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowMotif } from "@/components/AppNav";

/**
 * Sign-in is handled by the Hub's identity provider (Aspire Identity today,
 * Huntington's Microsoft sign-in later). This page just explains and hands off.
 */
export const Route = createFileRoute("/signin")({
  validateSearch: z.object({ returnTo: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Sign in — Team Huntington Hub" },
      { name: "description", content: "Sign in to the Team Huntington Hub." },
    ],
  }),
  component: SignIn,
});

/** Only same-site paths are allowed as a destination after sign-in. */
function safeReturnTo(value: string | undefined) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

function SignIn() {
  const { returnTo } = Route.useSearch();
  const href = `/auth/login?returnTo=${encodeURIComponent(safeReturnTo(returnTo))}`;

  return (
    <div className="relative">
      <div className="text-[var(--brand-dark)]">
        <ArrowMotif />
      </div>
      <div className="mx-auto max-w-md px-4 py-14">
        <Card>
          <CardHeader>
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--brand)] text-[var(--brand-foreground)]">
              <LogIn className="h-6 w-6" />
            </div>
            <CardTitle className="mt-2 text-2xl">
              <h1>Sign in to the Team Huntington Hub</h1>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              You'll continue to our secure sign-in page, then come straight back here.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              asChild
              className="h-11 w-full bg-[var(--brand-dark)] font-semibold text-white hover:bg-[var(--brand-dark)]/90"
            >
              <a href={href}>
                <LogIn className="mr-2 h-4 w-4" />
                Continue to sign in
              </a>
            </Button>
            <p className="flex items-start gap-2 text-[11px] text-muted-foreground">
              <ShieldCheck className="mt-[1px] h-3.5 w-3.5 shrink-0" />
              Access is by invitation. Sign in with Google or with a one-time code sent to your email.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
