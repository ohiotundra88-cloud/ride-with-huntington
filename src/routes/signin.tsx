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

    // Try sign-in first; if the account doesn't exist, sign up (auto-confirmed).
    let { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    if (error) {
      const signUpRes = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (signUpRes.error) {
        setBusy(false);
        toast.error("Couldn't sign in", { description: signUpRes.error.message });
        return;
      }
      if (!signUpRes.data.session) {
        const retry = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        error = retry.error;
      } else {
        error = null;
      }
    }
    setBusy(false);
    if (error) {
      toast.error("Couldn't sign in", { description: error.message });
      return;
    }
    toast.success("Signed in");
    nav({ to: "/dashboard" });
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
