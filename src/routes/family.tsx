import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Car,
  MapPin,
  Tent,
  Radio,
  Baby,
  Utensils,
  Accessibility,
  CloudSun,
  AlertTriangle,
  CalendarDays,
  MessageSquare,
} from "lucide-react";
import { openConcierge } from "@/components/Concierge";

export const Route = createFileRoute("/family")({
  head: () => ({
    meta: [
      { title: "Family Guide — Team Huntington Hub" },
      { name: "description", content: "Family & spectator guide for Ride Weekend 2027: parking, viewing, tent, kids activities, accessibility." },
      { property: "og:title", content: "Ride Weekend Family Guide" },
      { property: "og:description", content: "Everything families and spectators need for Ride Weekend 2027." },
    ],
  }),
  component: FamilyGuide,
});

const sections = [
  {
    id: "parking",
    icon: Car,
    title: "Spectator parking",
    body:
      "Recommended lots: McFerson Commons Garage and Neil Ave. Garage. Arrive by 6:00 AM Saturday for closest access. Overflow: Convention Center North Garage.",
  },
  {
    id: "viewing",
    icon: MapPin,
    title: "Recommended viewing locations",
    body:
      "Mile 12 (McFerson Commons), Mile 34 (Pickerington Cheer Zone), Mile 68 (Granville), and the finish line at Hilton Columbus Downtown.",
  },
  {
    id: "tent",
    icon: Tent,
    title: "Team Huntington tent",
    body:
      "Bright-lime canopy at the finish village near the bandshell, plus rest stops 2 and 4. Team snacks, cheer squad, and photo backdrop.",
  },
  {
    id: "tracking",
    icon: Radio,
    title: "Rider tracking",
    body:
      "Live rider tracker will be linked here on Ride Day (placeholder). Save your rider's bib number to search quickly.",
  },
  {
    id: "kids",
    icon: Baby,
    title: "Kids activities",
    body:
      "Family village at the finish: face painting, balloon artist, mini-obstacle course, and a shaded story-time tent. Free for all ages.",
  },
  {
    id: "food",
    icon: Utensils,
    title: "Food & rest areas",
    body:
      "Food trucks open 7 AM at the finish village. Free water and shaded seating throughout the family village.",
  },
  {
    id: "access",
    icon: Accessibility,
    title: "Accessibility",
    body:
      "Accessible parking with placard in the Nationwide Blvd lot. Accessible restrooms and viewing platforms at Mile 12, Mile 34, and the finish.",
  },
  {
    id: "weather",
    icon: CloudSun,
    title: "Weather preparation",
    body:
      "August in Columbus averages 82°F high, 62°F low. Bring sunscreen, hats, water, and a light rain shell. Final forecast in Wednesday update.",
  },
  {
    id: "emergency",
    icon: AlertTriangle,
    title: "Emergency & contact",
    body:
      "For life-threatening emergencies dial 911. Medical tents at every rest stop. Family info hotline: (614) 555-0142 (demo).",
  },
];

const schedule = [
  { day: "Friday · Aug 6", items: ["2–7 PM — Packet pickup, Columbus Convention Center", "6:30 PM — Team gathering, Hilton Union Ballroom"] },
  { day: "Saturday · Aug 7 (Ride Day)", items: ["5:30 AM — Staging opens", "7:00 AM — Roll-out", "10 AM–3 PM — Finish village open"] },
  { day: "Sunday · Aug 8", items: ["11:00 AM — Team brunch, Hilton", "1:00 PM — Recognition & photos"] },
];

function FamilyGuide() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="rounded-2xl bg-[var(--brand-dark)] p-6 sm:p-8 text-white">
        <p className="text-xs uppercase tracking-wider text-white/60">Ride Weekend</p>
        <h1 className="mt-1 text-3xl sm:text-4xl font-black">Family & Spectator Guide</h1>
        <p className="mt-3 max-w-2xl text-white/80 leading-relaxed">
          Everything the people cheering you on need for Ride Weekend 2027. Sample details for the demo — final
          locations, times, and links will replace these before the event.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild className="bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90">
            <a href="#schedule"><CalendarDays className="mr-1 h-4 w-4" /> View Ride Schedule</a>
          </Button>
          <Button asChild variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white">
            <a href="#parking"><Car className="mr-1 h-4 w-4" /> Open Parking Details</a>
          </Button>
          <Button asChild variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white">
            <a href="#tent"><Tent className="mr-1 h-4 w-4" /> Find the Team Tent</a>
          </Button>
          <Button
            variant="outline"
            onClick={openConcierge}
            className="bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white"
          >
            <MessageSquare className="mr-1 h-4 w-4" /> Ask the Concierge
          </Button>
        </div>
      </div>

      {/* Stylized venue diagram */}
      <Card className="mt-6">
        <CardHeader><CardTitle>Ride Day venue map (demo)</CardTitle></CardHeader>
        <CardContent>
          <div className="relative aspect-[16/8] w-full overflow-hidden rounded-lg border bg-gradient-to-br from-[var(--brand)]/10 via-muted to-[var(--brand-dark)]/10">
            <svg viewBox="0 0 800 400" className="absolute inset-0 h-full w-full">
              <path d="M40 320 C 180 260, 260 340, 400 260 S 640 220, 760 300" fill="none" stroke="var(--brand-dark)" strokeWidth="6" strokeDasharray="6 6" opacity="0.7" />
              <g fontFamily="Inter,system-ui" fontSize="12" fill="oklch(0.24 0.04 170)">
                <circle cx="80" cy="310" r="10" fill="var(--brand)" /><text x="98" y="313">Staging · McFerson</text>
                <circle cx="260" cy="290" r="8" fill="var(--brand-dark)" /><text x="276" y="293">Mile 12 · Family cheer zone</text>
                <circle cx="450" cy="255" r="8" fill="var(--brand-dark)" /><text x="466" y="258">Mile 34 · Pickerington</text>
                <circle cx="620" cy="240" r="8" fill="var(--brand-dark)" /><text x="636" y="243">Mile 68 · Granville</text>
                <rect x="720" y="285" width="20" height="20" fill="var(--brand)" />
                <text x="700" y="322">Finish · Hilton Columbus</text>
                <text x="40" y="40" fontWeight="700" fontSize="14">Route overview (illustrative)</text>
              </g>
            </svg>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Illustrative diagram — not to scale. Final map provided by Pelotonia race day.</p>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <Card key={s.id} id={s.id} className="scroll-mt-20">
            <CardContent className="p-5">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--brand)]/15 text-[var(--brand-dark)]">
                <s.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-bold text-[var(--brand-dark)]">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
              <div className="mt-3">
                <Button size="sm" variant="outline" onClick={openConcierge}>
                  <MessageSquare className="mr-1 h-3.5 w-3.5" /> Ask the Concierge
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6" id="schedule">
        <CardHeader><CardTitle>Ride Weekend schedule</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {schedule.map((s) => (
            <div key={s.day}>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--brand-dark)]/70">{s.day}</p>
              <ul className="mt-2 space-y-1 text-sm">
                {s.items.map((i) => (
                  <li key={i} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand)]" /> {i}</li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild variant="outline"><Link to="/resources">More resources</Link></Button>
        <Button asChild variant="outline"><Link to="/dashboard">Back to my journey</Link></Button>
      </div>
    </div>
  );
}
