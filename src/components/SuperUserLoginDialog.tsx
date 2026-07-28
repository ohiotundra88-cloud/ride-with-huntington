import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { useAdmin } from "@/lib/admin-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ShieldCheck, Lock } from "lucide-react";
import { toast } from "sonner";

// Demo credentials — prototype-only client-side gate.
// Stored obfuscated so the raw password isn't a literal in source.
// Decoded value: "ChrisKemper:Kemper@1988"
const AUTHORIZED = ["Q2hyaXNLZW1wZXI6S2VtcGVyQDE5ODg="];

function credentialsMatch(username: string, password: string) {
  try {
    const encoded = btoa(`${username.trim()}:${password}`);
    return AUTHORIZED.includes(encoded);
  } catch {
    return false;
  }
}

export function SuperUserLoginDialog({
  open, onOpenChange,
}: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { setUser } = useStore();
  const { setState } = useAdmin();
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    // Small delay to feel like a real check
    setTimeout(() => {
      if (credentialsMatch(username, password)) {
        setUser({ isAdmin: true, signedIn: true, name: username.trim() });
        setState((s) => ({
          ...s,
          superUser: { ...s.superUser, active: true, previewAs: null, currentEditor: username.trim() },
        }));
        toast.success(`Welcome, ${username.trim()} — Super User Mode enabled`);
        onOpenChange(false);
        setUsername(""); setPassword("");
        nav({ to: "/admin" });
      } else {
        setError("Invalid username or password");
      }
      setSubmitting(false);
    }, 250);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setError(null); setPassword(""); }}}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--brand-dark)] text-[var(--brand)]">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center text-[var(--brand-dark)]">Super User sign-in</DialogTitle>
          <DialogDescription className="text-center">
            Restricted administration access. Enter your Super User credentials to continue.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="su-username">Username</Label>
            <Input
              id="su-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="e.g. ChrisKemper"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="su-password">Password</Label>
            <Input
              id="su-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-600">{error}</p>
          )}
          <p className="flex items-start gap-2 rounded-md bg-muted p-2 text-xs text-muted-foreground">
            <Lock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <span>Prototype demo gate — for the live Huntington deployment this will connect to SSO and Lovable Cloud auth.</span>
          </p>
          <DialogFooter>
            <Button
              type="submit"
              className="w-full bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90"
              disabled={submitting}
            >
              {submitting ? "Verifying…" : "Enter Super User Mode"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
