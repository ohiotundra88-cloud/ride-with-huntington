import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserSearchPicker } from "@/components/UserSearchPicker";
import { Button } from "@/components/ui/button";
import { KeyRound, MailCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import {
  invalidateLegacyPasswords,
  requirePasswordResetForUser,
  setActivationForUser,
} from "@/lib/activation.functions";

/**
 * Super User escape hatches: mark a colleague activated when the one-time
 * passcode email never arrives, force a password reset, and retire the old
 * automatic passwords in one sweep.
 */
export function ActivationCard() {
  const activate = useMutation({
    mutationFn: (userId: string) => setActivationForUser({ data: { userId, activated: true } }),
    onSuccess: () => toast.success("Access activated", { description: "They can sign in without a passcode now." }),
    onError: (e: Error) => toast.error(e.message),
  });

  const resetPassword = useMutation({
    mutationFn: (userId: string) => requirePasswordResetForUser({ data: { userId } }),
    onSuccess: () =>
      toast.success("Password reset required", {
        description: "Their old password stops working now. Next sign-in emails them a code to pick a new one.",
      }),
    onError: (e: Error) => toast.error(e.message),
  });

  const sweep = useMutation({
    mutationFn: () => invalidateLegacyPasswords({ data: undefined }),
    onSuccess: (r: { changed: number }) =>
      toast.success("Old passwords retired", {
        description: `${r.changed} account(s) will choose a new password at their next sign-in.`,
      }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MailCheck className="h-4 w-4 text-[var(--brand)]" /> Access &amp; passwords
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <UserSearchPicker
            id="activate-user"
            label="Activate a colleague"
            placeholder="Search by name or email…"
            disabled={activate.isPending}
            onSelect={(u) => activate.mutate(u.user_id)}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Use this only when the emailed one-time passcode can't be delivered. Everyone else activates
            themselves on first sign-in.
          </p>
        </div>

        <div>
          <UserSearchPicker
            id="reset-password-user"
            label="Force a password reset"
            placeholder="Search by name or email…"
            disabled={resetPassword.isPending}
            onSelect={(u) => resetPassword.mutate(u.user_id)}
          />
          <p className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
            <KeyRound className="mt-[1px] h-3.5 w-3.5 shrink-0" />
            Their current password stops working immediately. They'll get a verification code by email and choose
            a new one — no one ever sees or sets a password for them.
          </p>
        </div>

        <div className="rounded-lg border border-dashed p-3">
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-[2px] h-4 w-4 shrink-0 text-[var(--brand-dark)]" />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Retire the old automatic passwords</p>
              <p className="mt-1">
                Run this once. Every colleague who hasn't chosen a personal password yet will be asked to pick
                one, with an emailed code, the next time they sign in.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            disabled={sweep.isPending}
            onClick={() => sweep.mutate()}
          >
            {sweep.isPending ? "Working…" : "Retire old passwords"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
