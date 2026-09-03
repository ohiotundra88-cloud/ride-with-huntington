import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowMotif } from "@/components/AppNav";
import { toast } from "sonner";
import { Building2, LogIn, MailCheck, ShieldCheck } from "lucide-react";
import { supabaseBrowser as supabase } from "@/integrations/supabase/proxy-client";
import { useServerFn } from "@tanstack/react-start";
import { ensureDemoAccount } from "@/lib/auth-demo.functions";
import { checkActivation, completeActivation } from "@/lib/activation.functions";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

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

// Deterministic password used only for already-activated accounts, so repeat
// sign-ins stay instant after the one-time passcode activation.
const derivedPassword = (email: string) => `Hub!${email.trim().toLowerCase()}#2027`;

function SignIn() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const ensureAccount = useServerFn(ensureDemoAccount);
  const isActivated = useServerFn(checkActivation);
  const finishActivation = useServerFn(completeActivation);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const validDomain = (e: string) => {
    const parts = e.trim().toLowerCase().split("@");
    return parts.length === 2 && HUNTINGTON_DOMAINS.includes(parts[1]);
  };

  const clearGuestCache = () => {
    try { localStorage.removeItem("hh_reg_v2"); } catch { /* noop */ }
  };

  const sendCode = async (cleanEmail: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: { shouldCreateUser: true },
    });
    if (error) throw error;
    setCooldown(45);
  };

  const start = async () => {
    if (!validDomain(email)) {
      toast.error("Use your @huntington.com work email");
      return;
    }
    setBusy(true);
    const cleanEmail = email.trim().toLowerCase();

    try {
      const { activated } = await isActivated({ data: { email: cleanEmail } });

      if (activated) {
        const password = derivedPassword(cleanEmail);
        await ensureAccount({ data: { email: cleanEmail, password } });
        clearGuestCache();
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) throw error;
        toast.success("Signed in");
        nav({ to: "/dashboard" });
        return;
      }

      await sendCode(cleanEmail);
      setStep("code");
      toast.success("Verification code sent", { description: `Check ${cleanEmail} for a 6-digit code.` });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Please try again.";
      toast.error("Couldn't continue", { description: message });
    } finally {
      setBusy(false);
    }
  };

  const verify = async (token: string) => {
    const cleanEmail = email.trim().toLowerCase();
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email: cleanEmail, token, type: "email" });
      if (error) throw error;

      clearGuestCache();
      await finishActivation({ data: { password: derivedPassword(cleanEmail) } });

      toast.success("Account activated", { description: "You're all set — future sign-ins are instant." });
      nav({ to: "/dashboard" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Please try again.";
      setCode("");
      toast.error("That code didn't work", { description: message });
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0) return;
    setBusy(true);
    try {
      await sendCode(email.trim().toLowerCase());
      toast.success("New code sent");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Please try again.";
      toast.error("Couldn't resend the code", { description: message });
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
              {step === "email" ? <Building2 className="h-6 w-6" /> : <MailCheck className="h-6 w-6" />}
            </div>
            <CardTitle className="mt-2 text-2xl">
              {step === "email" ? "Sign in to the Hub" : "Enter your code"}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {step === "email"
                ? "Enter your @huntington.com work email. First-time colleagues verify with a one-time passcode we email you."
                : `We emailed a 6-digit code to ${email.trim().toLowerCase()}. It expires in 10 minutes.`}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === "email" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Work email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    autoFocus
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && start()}
                    placeholder="you@huntington.com"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Only @huntington.com addresses are accepted.
                  </p>
                </div>
                <Button
                  onClick={start}
                  disabled={busy || !email}
                  className="w-full h-11 bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90 font-semibold"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  {busy ? "Checking…" : "Continue with work email"}
                </Button>
                <p className="flex items-start gap-2 text-[11px] text-muted-foreground">
                  <ShieldCheck className="mt-[1px] h-3.5 w-3.5 shrink-0" />
                  Access is limited to colleagues with a Huntington mailbox. Activation happens once per person.
                </p>
              </>
            ) : (
              <>
                <div className="flex justify-center py-2">
                  <InputOTP
                    maxLength={6}
                    value={code}
                    autoFocus
                    onChange={(v) => {
                      setCode(v);
                      if (v.length === 6 && !busy) verify(v);
                    }}
                  >
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button
                  onClick={() => verify(code)}
                  disabled={busy || code.length !== 6}
                  className="w-full h-11 bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90 font-semibold"
                >
                  {busy ? "Verifying…" : "Activate my access"}
                </Button>
                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    className="text-[var(--brand-dark)] hover:underline"
                    onClick={() => { setStep("email"); setCode(""); }}
                  >
                    Use a different email
                  </button>
                  <button
                    type="button"
                    disabled={busy || cooldown > 0}
                    className="text-[var(--brand-dark)] hover:underline disabled:text-muted-foreground disabled:no-underline"
                    onClick={resend}
                  >
                    {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                  </button>
                </div>
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
