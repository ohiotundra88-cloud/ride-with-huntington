import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserSearchPicker } from "@/components/UserSearchPicker";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";
import { setActivationForUser } from "@/lib/activation.functions";

/**
 * Super User escape hatch: mark a colleague activated when the one-time
 * passcode email never reaches their Huntington mailbox.
 */
export function ActivationCard() {
  const activate = useMutation({
    mutationFn: (userId: string) => setActivationForUser({ data: { userId, activated: true } }),
    onSuccess: () => toast.success("Access activated", { description: "They can sign in without a passcode now." }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MailCheck className="h-4 w-4 text-[var(--brand)]" /> Manual passcode activation
        </CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}
