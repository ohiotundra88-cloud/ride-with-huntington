import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowMotif } from "@/components/AppNav";
import { toast } from "sonner";
import { Building2, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { ensureDemoAccount } from "@/lib/auth-demo.functions";

export const Route = createFileRoute("/signin")({
  head: () => ({
    meta: [
      { title: "Sign in — Team Huntington Hub" },
      { name: "description", content: "Sign in with your Huntington work email to access Team Huntington Hub." },
    ],
  }),
  component: SignIn,
});

const HUNTINGTON_DOMAINS = ["huntington.com"];

// Demo-mode deterministic password derived from email. Verification codes are
// temporarily disabled; auto-confirm is enabled at the auth layer.
const demoPassword = (email: string) => `Hub!${email.trim().toLowerCase()}#2027`;

function SignIn() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const ensureAccount = useServerFn(ensureDemoAccount);

  const validDomain = (e: string) => {
    const parts = e.trim().toLowerCase().split("@");
    return parts.length === 2 && HUNTINGTON_DOMAINS.includes(parts[1]);
  };

  const signIn = async () => {
    if (!validDomain(email)) {
      toast.error("Use your @huntington.com work email");
      return;
    }
    setBusy(true);
    const cleanEmail = email.trim().toLowerCase();
    const password = demoPassword(cleanEmail);

    try {
      // Ensure the account exists with the deterministic demo password.
      // Handles both first-time users and legacy OTP-only accounts.
      await ensureAccount({ data: { email: cleanEmail, password } });

      // Clear any stale guest registration cached locally so it doesn't
      // leak into the newly signed-in session.
      try { localStorage.removeItem("hh_reg_v2"); } catch { /* noop */ }

      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (error) throw error;

      toast.success("Signed in");
      nav({ to: "/dashboard" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Please try again.";
      toast.error("Couldn't sign in", { description: message });
    } finally {
      setBusy(false);
    }
  };


  return (
    <div className="relative">
      <div className="text-[var(--brand-dark)]"><ArrowMotif /></div>
      <div className="mx-auto max-w-md px-4 py-14">
        <Card>
          <CardHeader>
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--brand)] text-[var(--brand-foreground)]">
              <Building2 className="h-6 w-6" />
            </div>
            <CardTitle className="mt-2 text-2xl">Sign in to the Hub</CardTitle>
            <p className="text-sm text-muted-foreground">
              Use your Huntington work email. Verification codes are temporarily disabled — you'll be signed in instantly.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                autoFocus
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && signIn()}
                placeholder="you@huntington.com"
              />
              <p className="text-[11px] text-muted-foreground">
                Only @huntington.com addresses are accepted.
              </p>
            </div>
            <Button
              onClick={signIn}
              disabled={busy || !email}
              className="w-full h-11 bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90 font-semibold"
            >
              <LogIn className="mr-2 h-4 w-4" />
              {busy ? "Signing in…" : "Sign in"}
            </Button>

            <div className="text-center text-xs pt-2">
              <Link to="/" className="text-[var(--brand-dark)] hover:underline">Back to home</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
