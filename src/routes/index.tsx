import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, MapPin, Plane, Bike, Shirt, CheckCircle2, LifeBuoy, FileText, ClipboardCheck, HelpCircle, Calendar, User, TrendingUp, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowMotif } from "@/components/AppNav";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Team Huntington Hub — Your Pelotonia Journey Starts Here" },
      { name: "description", content: "The guided front door for Huntington colleagues joining Pelotonia. Register, travel, bike, apparel, and support in one place." },
      { property: "og:title", content: "Team Huntington Hub" },
      { property: "og:description", content: "Your Team Huntington Pelotonia journey starts here." },
    ],
  }),
  component: Landing,
});


const steps = [
  { icon: ClipboardCheck, title: "Register", desc: "Choose Rider or Volunteer and apply the team code." },
  { icon: Plane, title: "Travel", desc: "Book flights and hotel via Concur / ATG." },
  { icon: Bike, title: "Bike", desc: "Rent a bike sized to you — or bring your own." },
  { icon: Shirt, title: "Apparel", desc: "Pick your jersey or volunteer shirt and confirm mailing." },
  { icon: CheckCircle2, title: "Complete", desc: "Review, submit, and get your confirmation." },
];

const resources = [
  { icon: HelpCircle, title: "FAQ Center", desc: "Search 25+ answers by topic.", to: "/resources" },
  { icon: FileText, title: "Expense Guide", desc: "How to submit Pelotonia expenses.", to: "/expenses" },
  { icon: ClipboardCheck, title: "Ride Weekend Checklist", desc: "What to bring and when.", to: "/resources/rw-1" },
  { icon: LifeBuoy, title: "Contact Support", desc: "Reach the Team Huntington coordinators.", to: "/resources", hash: "contacts" },
];

function Landing() {
  return (
    <div>
      {/* HERO */}
      <section className="relative bg-[var(--brand-dark)] text-white overflow-hidden">
        <div className="text-[var(--brand)]"><ArrowMotif /></div>
        <div className="mx-auto max-w-7xl px-4 py-16 sm:py-24 relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/15">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand)]" />
            Team Huntington · Pelotonia 2027
          </div>
          <h1 className="mt-8 text-4xl sm:text-6xl font-black tracking-tight leading-[1.08] max-w-5xl">
            Your Team Huntington Pelotonia <span className="text-[var(--brand)]">Journey Starts Here.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-white/80">
            One place to register, plan travel, rent a bike, pick apparel, and access support —
            guided step by step, saved as you go.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90 h-12 px-6 text-base font-semibold">
              <Link to="/register">Let's Go <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-6 text-base bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white">
              <Link to="/dashboard">View My Registration</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Announcements */}
      <div className="mx-auto max-w-7xl px-4 pt-6">
        <AnnouncementBanner />
      </div>

      {/* 5 STEPS */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:py-20">
        <div className="max-w-2xl">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight text-[var(--brand-dark)]">Five simple steps</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">Progress autosaves. Come back anytime to pick up where you left off.</p>
        </div>
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((s, i) => (
            <li key={s.title}>
              <Card className="h-full border-2 hover:border-[var(--brand)] transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 text-xs font-bold text-[var(--brand-dark)]/60">
                    STEP {i + 1}
                  </div>
                  <div className="mt-3 grid h-10 w-10 place-items-center rounded-lg bg-[var(--brand)]/15 text-[var(--brand-dark)]">
                    <s.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-bold text-[var(--brand-dark)]">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      {/* RESOURCES */}
      <section className="bg-muted/40 border-y">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight text-[var(--brand-dark)]">Resources & support</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed max-w-2xl">Everything you need alongside your registration.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {resources.map((r) => (
              <Link key={r.title} to={r.to} hash={r.hash} className="group">
                <Card className="h-full transition-shadow hover:shadow-lg">
                  <CardContent className="p-5">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--brand-dark)] text-white">
                      <r.icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 font-bold text-[var(--brand-dark)]">{r.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{r.desc}</p>
                    <span className="mt-3 inline-flex items-center text-sm font-semibold text-[var(--brand-dark)] group-hover:underline">
                      Open <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* EVENTS PLACEHOLDER */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:py-20">
        <div className="max-w-2xl">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight text-[var(--brand-dark)]">Ride Weekend events</h2>
          <p className="mt-3 text-muted-foreground leading-relaxed">More details around the August 6–8, 2027 weekend will be posted here.</p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border-2 border-dashed border-[var(--brand-dark)]/20">
            <CardContent className="p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--brand-dark)]/60">Friday, Aug 6</p>
              <h3 className="mt-3 font-bold text-[var(--brand-dark)]">Packet Pickup & Expo</h3>
              <p className="mt-1 text-sm text-muted-foreground">Timing and location to be announced.</p>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--brand)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--brand-dark)]">
                <Calendar className="h-3.5 w-3.5" /> Details coming soon
              </span>
            </CardContent>
          </Card>
          <Card className="border-2 border-dashed border-[var(--brand)]/40">
            <CardContent className="p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--brand-dark)]/60">Saturday, Aug 7</p>
              <h3 className="mt-3 font-bold text-[var(--brand-dark)]">Ride Day</h3>
              <p className="mt-1 text-sm text-muted-foreground">Route start times and team meetup details coming soon.</p>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--brand)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--brand-dark)]">
                <Calendar className="h-3.5 w-3.5" /> Details coming soon
              </span>
            </CardContent>
          </Card>
          <Card className="border-2 border-dashed border-[var(--brand-dark)]/20">
            <CardContent className="p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--brand-dark)]/60">Sunday, Aug 8</p>
              <h3 className="mt-3 font-bold text-[var(--brand-dark)]">Team Celebration</h3>
              <p className="mt-1 text-sm text-muted-foreground">Post-ride gathering info will be shared here.</p>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--brand)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--brand-dark)]">
                <Calendar className="h-3.5 w-3.5" /> Details coming soon
              </span>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
