import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowMotif } from "@/components/AppNav";
import { toast } from "sonner";
import { Building2, KeyRound, LockKeyhole, LogIn, MailCheck, ShieldCheck } from "lucide-react";
import { supabaseBrowser as supabase } from "@/integrations/supabase/proxy-client";
import { useServerFn } from "@tanstack/react-start";
import {
  clearSignInFailures,
  completeActivation,
  noteSignInFailure,
  setMyPassword,
  startLegacyPasswordReset,
  startSignIn,
} from "@/lib/activation.functions";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export const Route = createFileRoute("/signin")({
  head: () => ({
    meta: [
      { title: "Sign in — Team Huntington Hub" },
      { name: "description", content: "Sign in with your Huntington work email and password to access Team Huntington Hub." },
    ],
  }),
  component: SignIn,
});

const HUNTINGTON_DOMAINS = ["huntington.com"];
const MIN_PASSWORD = 10;

type Step = "email" | "password" | "code" | "choose";
/** Why we're asking for a code: brand new colleague, or an existing one resetting. */
type CodeReason = "activate" | "reset";

function SignIn() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState<Step>("email");
  const [reason, setReason] = useState<CodeReason>("activate");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const begin = useServerFn(startSignIn);
  const noteFailure = useServerFn(noteSignInFailure);
  const clearFailures = useServerFn(clearSignInFailures);
  const retireLegacyPassword = useServerFn(startLegacyPasswordReset);
  const finishActivation = useServerFn(completeActivation);
  const savePassword = useServerFn(setMyPassword);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const cleanEmail = () => email.trim().toLowerCase();

  const validDomain = (e: string) => {
    const parts = e.trim().toLowerCase().split("@");
    return parts.length === 2 && HUNTINGTON_DOMAINS.includes(parts[1]);
  };

  const clearGuestCache = () => {
    try { localStorage.removeItem("hh_reg_v2"); } catch { /* noop */ }
  };

  const sendCode = async (addr: string, createUser: boolean) => {
    const { error } = await supabase.auth.signInWithOtp({
      email: addr,
      options: { shouldCreateUser: createUser },
    });
    if (error) throw error;
    setCooldown(45);
  };

  /** Step 1 — decide between password, first-time activation, or a reset. */
  const start = async () => {
    if (!validDomain(email)) {
      toast.error("Use your @huntington.com work email");
      return;
    }
    setBusy(true);
    const addr = cleanEmail();
    try {
      const { mode, lockedSeconds } = await begin({ data: { email: addr } });

      if (mode === "locked") {
        toast.error("Too many attempts", {
          description: `Try again in about ${Math.ceil(lockedSeconds / 60)} minute(s), or use "Forgot password".`,
        });
        return;
      }
      if (mode === "password") {
        setStep("password");
        return;
      }

      if (mode === "reset") await retireLegacyPassword({ data: { email: addr } });
      setReason(mode === "activate" ? "activate" : "reset");
      await sendCode(addr, mode === "activate");
      setStep("code");
      toast.success("Verification code sent", { description: `Check ${addr} for a 6-digit code.` });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Please try again.";
      toast.error("Couldn't continue", { description: message });
    } finally {
      setBusy(false);
    }
  };

  /** Step 2a — normal password sign-in. */
  const signInWithPassword = async () => {
    const addr = cleanEmail();
    setBusy(true);
    try {
      clearGuestCache();
      const { error } = await supabase.auth.signInWithPassword({ email: addr, password });
      if (error) {
        const { locked, remaining } = await noteFailure({ data: { email: addr } });
        setPassword("");
        toast.error("That email or password is incorrect", {
          description: locked
            ? "This address is locked for 15 minutes."
            : `${remaining} attempt(s) left before this address is locked.`,
        });
        return;
      }
      await clearFailures({ data: { email: addr } });
      toast.success("Signed in");
      nav({ to: "/dashboard" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Please try again.";
      toast.error("Couldn't sign in", { description: message });
    } finally {
      setBusy(false);
    }
  };

  /** "Forgot password" — retire the old one and email a fresh code. */
  const forgotPassword = async () => {
    const addr = cleanEmail();
    setBusy(true);
    try {
      setReason("reset");
      await sendCode(addr, false);
      setStep("code");
      setPassword("");
      toast.success("Verification code sent", { description: `Check ${addr} for a 6-digit code.` });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Please try again.";
      toast.error("Couldn't send a code", { description: message });
    } finally {
      setBusy(false);
    }
  };

  /** Step 2b — verify the emailed code, then ask for a password. */
  const verify = async (token: string) => {
    const addr = cleanEmail();
    setBusy(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email: addr, token, type: "email" });
      if (error) throw error;
      clearGuestCache();
      setStep("choose");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Please try again.";
      setCode("");
      toast.error("That code didn't work", { description: message });
    } finally {
      setBusy(false);
    }
  };

  /** Step 3 — save the password they chose. */
  const choosePassword = async () => {
    if (newPassword.length < MIN_PASSWORD) {
      toast.error(`Use at least ${MIN_PASSWORD} characters`);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Those passwords don't match");
      return;
    }
    setBusy(true);
    try {
      if (reason === "activate") await finishActivation({ data: { password: newPassword } });
      else await savePassword({ data: { password: newPassword } });

      toast.success("Password saved", { description: "Use your work email and this password from now on." });
      nav({ to: "/dashboard" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Please try again.";
      toast.error("Couldn't save that password", { description: message });
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0) return;
    setBusy(true);
    try {
      await sendCode(cleanEmail(), reason === "activate");
      toast.success("New code sent");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Please try again.";
      toast.error("Couldn't resend the code", { description: message });
    } finally {
      setBusy(false);
    }
  };

  const titles: Record<Step, string> = {
    email: "Sign in to the Hub",
    password: "Enter your password",
    code: "Enter your code",
    choose: reason === "activate" ? "Create your password" : "Choose a new password",
  };

  const blurbs: Record<Step, string> = {
    email: "Enter your @huntington.com work email. First-time colleagues verify with a one-time passcode we email you.",
    password: `Signing in as ${cleanEmail()}.`,
    code: `We emailed a 6-digit code to ${cleanEmail()}. It expires in 10 minutes.`,
    choose: `Pick a password only you know — at least ${MIN_PASSWORD} characters. You'll use it every time you sign in.`,
  };

  const icons: Record<Step, JSX.Element> = {
    email: <Building2 className="h-6 w-6" />,
    password: <LockKeyhole className="h-6 w-6" />,
    code: <MailCheck className="h-6 w-6" />,
    choose: <KeyRound className="h-6 w-6" />,
  };

  return (
    <div className="relative">
      <div className="text-[var(--brand-dark)]"><ArrowMotif /></div>
      <div className="mx-auto max-w-md px-4 py-14">
        <Card>
          <CardHeader>
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--brand)] text-[var(--brand-foreground)]">
              {icons[step]}
            </div>
            <CardTitle className="mt-2 text-2xl">{titles[step]}</CardTitle>
            <p className="text-sm text-muted-foreground">{blurbs[step]}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === "email" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Work email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="username"
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
                  {busy ? "Checking…" : "Continue"}
                </Button>
                <p className="flex items-start gap-2 text-[11px] text-muted-foreground">
                  <ShieldCheck className="mt-[1px] h-3.5 w-3.5 shrink-0" />
                  Access is limited to colleagues with a Huntington mailbox, and every account is protected
                  by a personal password.
                </p>
              </>
            )}

            {step === "password" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && password && signInWithPassword()}
                  />
                </div>
                <Button
                  onClick={signInWithPassword}
                  disabled={busy || !password}
                  className="w-full h-11 bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90 font-semibold"
                >
                  {busy ? "Signing in…" : "Sign in"}
                </Button>
                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    className="text-[var(--brand-dark)] hover:underline"
                    onClick={() => { setStep("email"); setPassword(""); }}
                  >
                    Use a different email
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className="text-[var(--brand-dark)] hover:underline disabled:text-muted-foreground"
                    onClick={forgotPassword}
                  >
                    Forgot password
                  </button>
                </div>
              </>
            )}

            {step === "code" && (
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
                  {busy ? "Verifying…" : "Continue"}
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

            {step === "choose" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    autoFocus
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && choosePassword()}
                  />
                </div>
                <Button
                  onClick={choosePassword}
                  disabled={busy || !newPassword || !confirmPassword}
                  className="w-full h-11 bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90 font-semibold"
                >
                  {busy ? "Saving…" : "Save password and continue"}
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  Passwords that appear in known data breaches are rejected — pick something unique to the Hub.
                </p>
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
