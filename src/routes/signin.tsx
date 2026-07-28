import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useStore } from "@/lib/store";
import { ArrowMotif } from "@/components/AppNav";
import { toast } from "sonner";
import { Building2 } from "lucide-react";

export const Route = createFileRoute("/signin")({
  head: () => ({ meta: [
    { title: "Sign in — Team Huntington Hub" },
    { name: "description", content: "Sign in with your Huntington work email or simulated Huntington SSO." },
  ] }),
  component: SignIn,
});

function SignIn() {
  const { user, setUser } = useStore();
  const nav = useNavigate();
  const [email, setEmail] = useState(user.email);

  const complete = () => {
    setUser({ signedIn: true, email });
    toast.success("Signed in", { description: `Welcome, ${user.name}` });
    nav({ to: "/profile" });
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
            <p className="text-sm text-muted-foreground">Use your Huntington work email.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={complete}
              className="w-full h-12 bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90 font-semibold"
            >
              Continue with Huntington SSO
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or</span></div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@huntington.com" />
            </div>
            <Button onClick={complete} className="w-full h-11 bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90 font-semibold">
              Continue
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">
              Demo only. Access data is not stored beyond your browser.
            </p>
            <div className="text-center text-xs">
              <Link to="/" className="text-[var(--brand-dark)] hover:underline">Back to home</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
