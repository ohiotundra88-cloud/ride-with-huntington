import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { ArrowMotif } from "@/components/AppNav";
import { toast } from "sonner";
import { Building2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

function SignIn() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [phase, setPhase] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);

  const validDomain = (e: string) => {
    const parts = e.trim().toLowerCase().split("@");
    return parts.length === 2 && HUNTINGTON_DOMAINS.includes(parts[1]);
  };

  const sendCode = async () => {
    if (!validDomain(email)) {
      toast.error("Use your @huntington.com work email");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true, emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) {
      toast.error("Couldn't send code", { description: error.message });
      return;
    }
    toast.success("Check your inbox", { description: "We sent a 6-digit code to " + email });
    setPhase("code");
  };

  const verify = async () => {
    if (otp.length !== 6) return;
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: otp,
      type: "email",
    });
    setBusy(false);
    if (error) {
      toast.error("Invalid code", { description: error.message });
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
              Use your Huntington work email. We'll send a 6-digit code.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {phase === "email" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Work email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    autoFocus
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendCode()}
                    placeholder="you@huntington.com"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Only @huntington.com addresses are accepted.
                  </p>
                </div>
                <Button
                  onClick={sendCode}
                  disabled={busy || !email}
                  className="w-full h-11 bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90 font-semibold"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  {busy ? "Sending…" : "Send verification code"}
                </Button>
              </>
            )}

            {phase === "code" && (
              <>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Enter the code sent to</p>
                  <p className="font-semibold text-[var(--brand-dark)]">{email}</p>
                </div>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button
                  onClick={verify}
                  disabled={busy || otp.length !== 6}
                  className="w-full h-11 bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90 font-semibold"
                >
                  {busy ? "Verifying…" : "Verify & sign in"}
                </Button>
                <button
                  type="button"
                  onClick={() => { setOtp(""); setPhase("email"); }}
                  className="w-full text-xs text-muted-foreground hover:text-foreground"
                >
                  Use a different email
                </button>
              </>
            )}

            <div className="text-center text-xs pt-2">
              <Link to="/" className="text-[var(--brand-dark)] hover:underline">Back to home</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
