import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { CheckCircle2, Mail, ArrowRight, Shield } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";

export const Route = createFileRoute("/confirmation")({
  head: () => ({ meta: [
    { title: "Confirmation — Team Huntington Hub" },
    { name: "description", content: "Team Huntington registration confirmation and mock email preview." },
  ] }),
  component: Confirmation,
});

function Confirmation() {
  const { user, registration, completion } = useStore();
  const outstanding: string[] = [];
  if (registration.pelotonia.status !== "complete") outstanding.push("Confirm Pelotonia registration");
  if (registration.travel.status !== "complete") outstanding.push("Complete travel & hotel");
  if ((registration.participation === "rider" || registration.participation === "both") && registration.bike.status !== "complete") outstanding.push("Finalize bike rental");
  if (registration.apparel.status !== "complete") outstanding.push("Confirm apparel & mailing address");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* Success card */}
      <Card className="border-0 bg-gradient-to-br from-[var(--brand)] to-[var(--brand)]/70 text-[var(--brand-foreground)]">
        <CardContent className="p-8 text-center">
          <CheckCircle2 className="mx-auto h-14 w-14" />
          <h1 className="mt-3 text-3xl font-black">You're on Team Huntington!</h1>
          <p className="mt-2 opacity-80">Registration {registration.id ? "submitted" : "in progress"} · {completion}% complete</p>
          {registration.id && <p className="mt-4 font-mono text-lg font-bold">{registration.id}</p>}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button asChild className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90"><Link to="/dashboard">Go to my dashboard <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
            <Button asChild variant="outline" className="bg-transparent border-[var(--brand-foreground)]/30"><Link to="/register">Edit my registration</Link></Button>
          </div>
        </CardContent>
      </Card>

      {/* Mock email */}
      <h2 className="mt-10 text-lg font-bold text-[var(--brand-dark)] flex items-center gap-2"><Mail className="h-4 w-4" /> Confirmation email preview</h2>
      <Card className="mt-3">
        <CardContent className="p-6 text-sm">
          <div className="border-b pb-3 mb-3">
            <p><span className="text-muted-foreground">From:</span> Team Huntington &lt;pelotonia@huntington.com&gt;</p>
            <p><span className="text-muted-foreground">To:</span> {user.email}</p>
            <p><span className="text-muted-foreground">Subject:</span> Your Team Huntington Pelotonia registration</p>
          </div>
          <p>Hi {user.name.split(" ")[0]},</p>
          <p className="mt-3">Thanks for joining Team Huntington for Pelotonia 2027! Here's your snapshot.</p>

          <div className="mt-4 rounded-lg bg-muted/50 p-4 space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Registration ID</span><span className="font-mono font-bold">{registration.id ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Participation</span><span className="capitalize">{registration.participation ?? "—"}{[registration.pelotonia.highRoller && "High Roller", registration.pelotonia.survivor && "Survivor"].filter(Boolean).length > 0 && <span className="ml-2 text-xs font-semibold text-[var(--brand-dark)]">· {[registration.pelotonia.highRoller && "High Roller", registration.pelotonia.survivor && "Survivor"].filter(Boolean).join(" · ")}</span>}</span></div>
            <div className="flex justify-between items-center"><span className="text-muted-foreground">Pelotonia</span><StatusBadge status={registration.pelotonia.status} /></div>
            <div className="flex justify-between items-center"><span className="text-muted-foreground">Travel</span><StatusBadge status={registration.travel.status} /></div>
            <div className="flex justify-between items-center"><span className="text-muted-foreground">Bike</span><StatusBadge status={registration.bike.status} /></div>
            <div className="flex justify-between items-center"><span className="text-muted-foreground">Apparel</span><StatusBadge status={registration.apparel.status} /></div>
          </div>

          {outstanding.length > 0 && (
            <>
              <p className="mt-4 font-semibold">Outstanding actions:</p>
              <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                {outstanding.map((o) => <li key={o}>{o}</li>)}
              </ul>
            </>
          )}

          <p className="mt-4 text-muted-foreground">Deadlines: Apparel Jul 10 · Travel Jul 22 · Pelotonia Jul 15</p>

          <div className="mt-6 flex items-center gap-3">
            <Button asChild className="bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90"><Link to="/dashboard"><Shield className="mr-1 h-4 w-4" /> Secure return to Hub</Link></Button>
            <span className="text-xs text-muted-foreground">This email updates automatically as you make changes.</span>
          </div>
        </CardContent>
      </Card>

      {/* README / integrations */}
      <details className="mt-10 rounded-lg border p-4 text-sm">
        <summary className="cursor-pointer font-semibold text-[var(--brand-dark)]">Future enterprise integrations</summary>
        <ul className="mt-3 list-disc pl-5 text-muted-foreground space-y-1">
          <li>Microsoft Entra ID (SSO)</li>
          <li>Pelotonia API / deep link registration</li>
          <li>Concur / ATG travel & expense</li>
          <li>Unlimited Biking rentals</li>
          <li>Microsoft email service for confirmations & reminders</li>
          <li>Approved Huntington colleague database</li>
          <li>Power BI reporting for admins</li>
        </ul>
      </details>
    </div>
  );
}
