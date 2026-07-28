import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, ExternalLink, Bike, Shirt, Plane, ClipboardCheck, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { addAudit, genRegId, useStore, type Participation } from "@/lib/store";
import { toast } from "sonner";

const STEP_KEYS = ["A", "B", "C", "D", "E", "F"] as const;
export type StepKey = (typeof STEP_KEYS)[number];

export const Route = createFileRoute("/register")({
  validateSearch: (search: Record<string, unknown>): { step?: StepKey } => {
    const s = search.step;
    return typeof s === "string" && (STEP_KEYS as readonly string[]).includes(s)
      ? { step: s as StepKey }
      : {};
  },
  head: () => ({ meta: [
    { title: "Register — Team Huntington Hub" },
    { name: "description", content: "Multi-step Team Huntington Pelotonia registration wizard." },
  ] }),
  component: RegisterWizard,
});

const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL"];

function RegisterWizard() {
  const { registration, setRegistration, user } = useStore();
  const nav = useNavigate();
  const { step: stepKeyParam } = Route.useSearch();
  const [step, setStep] = useState(1);

  const isRider = registration.participation === "rider" || registration.participation === "both";
  const isVol = registration.participation === "volunteer" || registration.participation === "both";

  const steps = useMemo(() => {
    const base = [
      { key: "A", label: "Participation", icon: ClipboardCheck },
      { key: "B", label: "Pelotonia", icon: CheckCircle2 },
      { key: "C", label: "Travel", icon: Plane },
    ];
    if (isRider) base.push({ key: "D", label: "Bike", icon: Bike });
    base.push({ key: "E", label: "Apparel", icon: Shirt });
    base.push({ key: "F", label: "Review", icon: CheckCircle2 });
    return base;
  }, [isRider]);

  // Deep link: /register?step=D opens that step directly.
  useEffect(() => {
    if (!stepKeyParam) return;
    const idx = steps.findIndex((s) => s.key === stepKeyParam);
    if (idx >= 0) setStep(idx + 1);
  }, [stepKeyParam, steps]);

  const total = steps.length;

  const progress = Math.round(((step - 1) / (total - 1)) * 100);
  const back = () => setStep((s) => Math.max(1, s - 1));
  const next = () => setStep((s) => Math.min(total, s + 1));

  const submit = () => {
    const id = genRegId();
    setRegistration((prev) => addAudit({ ...prev, id, submittedAt: new Date().toISOString() }, `Registration ${id} submitted`));
    toast.success("Registration submitted!", { description: `ID ${id}` });
    nav({ to: "/confirmation" });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* PROGRESS */}
      <div className="sticky top-14 z-30 -mx-4 bg-background/95 backdrop-blur px-4 py-4 border-b">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Step {step} of {total}</p>
            <h1 className="text-lg font-black text-[var(--brand-dark)]">{steps[step - 1].label}</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={back} disabled={step === 1}><ChevronLeft className="h-4 w-4" /> Back</Button>
            {step < total ? (
              <Button size="sm" onClick={next} className="bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button size="sm" onClick={submit} className="bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90 font-semibold">
                Complete Registration
              </Button>
            )}
          </div>
        </div>
        <Progress value={progress} className="mt-3 h-2" />
        <p className="mt-2 text-[11px] text-muted-foreground">Autosaved as you go. You can leave and return anytime.</p>
      </div>

      <div className="mt-6 space-y-6">
        {steps[step - 1].key === "A" && <StepParticipation />}
        {steps[step - 1].key === "B" && <StepPelotonia />}
        {steps[step - 1].key === "C" && <StepTravel />}
        {steps[step - 1].key === "D" && <StepBike />}
        {steps[step - 1].key === "E" && <StepApparel />}
        {steps[step - 1].key === "F" && <StepReview onEdit={(n) => setStep(n)} />}
      </div>
    </div>
  );
}

/* ---------- STEP A ---------- */
function StepParticipation() {
  const { registration, setRegistration } = useStore();
  const set = (v: Participation) => setRegistration((prev) => addAudit({ ...prev, participation: v }, `Selected participation: ${v}`));
  const opts: { v: Exclude<Participation, null>; title: string; desc: string }[] = [
    { v: "rider", title: "Rider", desc: "I'll ride in the Team Huntington peloton." },
    { v: "volunteer", title: "Volunteer", desc: "I'll support the event on the ground." },
    { v: "both", title: "Both", desc: "Volunteering and riding at Team Huntington." },
    { v: "unsure", title: "Not sure yet", desc: "Explore first — you can change this later." },
  ];
  return (
    <Card>
      <CardHeader><CardTitle>How would you like to participate?</CardTitle></CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {opts.map((o) => {
          const selected = registration.participation === o.v;
          return (
            <button
              key={o.v}
              onClick={() => set(o.v)}
              className={`text-left rounded-xl border-2 p-4 transition-all ${selected ? "border-[var(--brand)] bg-[var(--brand)]/10 shadow-sm" : "border-border hover:border-[var(--brand)]/50"}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[var(--brand-dark)]">{o.title}</h3>
                {selected && <CheckCircle2 className="h-5 w-5 text-[var(--brand-dark)]" />}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{o.desc}</p>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}

/* ---------- STEP B ---------- */
function StepPelotonia() {
  const { registration, setRegistration } = useStore();
  const p = registration.pelotonia;
  const upd = (patch: Partial<typeof p>) => setRegistration((prev) => ({ ...prev, pelotonia: { ...prev.pelotonia, ...patch } }));

  const markComplete = () => {
    upd({ completed: true, status: p.confirmation ? "complete" : "pending" });
    setRegistration((prev) => addAudit(prev, "Pelotonia registration marked complete"));
    toast.success("Pelotonia step updated");
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Team Huntington Peloton</CardTitle>
            <StatusBadge status={p.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-4 text-sm">
            <p className="font-semibold text-[var(--brand-dark)]">Register on Pelotonia:</p>
            <ol className="mt-2 space-y-1 list-decimal pl-5 text-muted-foreground">
              <li>Choose <b>Team Huntington</b> as your peloton.</li>
              <li>Select your event type (25/45/55/100/155/200 miles or Volunteer).</li>
              <li>Apply the discount code below at checkout.</li>
            </ol>
          </div>
          <div>
            <Label>Team discount code</Label>
            <div className="mt-1.5 flex gap-2">
              <Input readOnly value={p.discountCode} className="font-mono font-bold text-[var(--brand-dark)]" />
              <Button variant="outline" onClick={() => { navigator.clipboard.writeText(p.discountCode); toast.success("Copied"); }}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Button
            onClick={() => window.open("https://www.pelotonia.org", "_blank")}
            className="w-full h-11 bg-[var(--brand-dark)] hover:bg-[var(--brand-dark)]/90 text-white"
          >
            <ExternalLink className="mr-2 h-4 w-4" /> Open Pelotonia Registration <span className="ml-1 text-xs opacity-70">(demo)</span>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>After you register</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Pelotonia confirmation number</Label>
            <Input value={p.confirmation} onChange={(e) => upd({ confirmation: e.target.value })} placeholder="e.g. PELO-2027-12345" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={p.completed} onCheckedChange={(v) => upd({ completed: !!v })} />
            I completed registration on Pelotonia.
          </label>

          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pelotonia designations</p>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <Checkbox checked={p.highRoller} onCheckedChange={(v) => upd({ highRoller: !!v })} className="mt-0.5" />
              <span>
                <b>High Roller</b>
                <span className="block text-xs text-muted-foreground">I've committed to raise at or above the High Roller fundraising level.</span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <Checkbox checked={p.survivor} onCheckedChange={(v) => upd({ survivor: !!v })} className="mt-0.5" />
              <span>
                <b>Survivor</b>
                <span className="block text-xs text-muted-foreground">I'm riding or volunteering as a cancer survivor.</span>
              </span>
            </label>
          </div>

          <Button onClick={markComplete} variant="outline" className="w-full">Save status</Button>
        </CardContent>
      </Card>
    </>
  );
}

/* ---------- STEP C ---------- */
function StepTravel() {
  const { registration, setRegistration } = useStore();
  const t = registration.travel;
  const upd = (patch: Partial<typeof t>) => setRegistration((prev) => ({ ...prev, travel: { ...prev.travel, ...patch } }));

  const save = () => {
    const complete = (t.travelConfirmation || t.needs === "none") && !!t.needs;
    upd({ status: t.needs === "none" ? "complete" : complete ? "complete" : "pending" });
    setRegistration((prev) => addAudit(prev, "Travel details updated"));
    toast.success("Travel saved");
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Do you need travel or hotel?</CardTitle>
            <StatusBadge status={t.status} />
          </div>
        </CardHeader>
        <CardContent>
          <RadioGroup value={t.needs} onValueChange={(v) => upd({ needs: v as typeof t.needs })} className="grid gap-2 sm:grid-cols-2">
            {[
              { v: "none", l: "None — I'm covered" },
              { v: "hotel", l: "Hotel only" },
              { v: "airrail", l: "Air / Rail only" },
              { v: "both", l: "Travel + Hotel" },
              { v: "unsure", l: "Not sure yet" },
            ].map((o) => (
              <label key={o.v} className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer has-[[data-state=checked]]:border-[var(--brand)] has-[[data-state=checked]]:bg-[var(--brand)]/10">
                <RadioGroupItem value={o.v} /> <span className="text-sm">{o.l}</span>
              </label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {t.needs && t.needs !== "none" && (
        <>
          <Card>
            <CardHeader><CardTitle>Trip details</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Departure city</Label><Input value={t.departureCity} onChange={(e) => upd({ departureCity: e.target.value })} /></div>
              <div className="space-y-2"><Label>Arrival date</Label><Input type="date" value={t.arrivalDate} onChange={(e) => upd({ arrivalDate: e.target.value })} /></div>
              <div className="space-y-2"><Label>Departure date</Label><Input type="date" value={t.departureDate} onChange={(e) => upd({ departureDate: e.target.value })} /></div>
              <div className="space-y-2"><Label>Hotel check-in</Label><Input type="date" value={t.hotelCheckIn} onChange={(e) => upd({ hotelCheckIn: e.target.value })} /></div>
              <div className="space-y-2"><Label>Hotel check-out</Label><Input type="date" value={t.hotelCheckOut} onChange={(e) => upd({ hotelCheckOut: e.target.value })} /></div>
              <div className="space-y-2 sm:col-span-2"><Label>Accessibility / travel notes</Label><Textarea value={t.notes} onChange={(e) => upd({ notes: e.target.value })} /></div>
            </CardContent>
          </Card>
          <Button onClick={() => window.open("about:blank", "_blank")} className="w-full h-11 bg-[var(--brand-dark)] hover:bg-[var(--brand-dark)]/90 text-white">
            <ExternalLink className="mr-2 h-4 w-4" /> Open Concur / ATG <span className="ml-1 text-xs opacity-70">(demo)</span>
          </Button>

          <Card>
            <CardHeader><CardTitle>Confirmations</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Travel confirmation #</Label><Input value={t.travelConfirmation} onChange={(e) => upd({ travelConfirmation: e.target.value })} /></div>
              <div className="space-y-2"><Label>Hotel confirmation #</Label><Input value={t.hotelConfirmation} onChange={(e) => upd({ hotelConfirmation: e.target.value })} /></div>
              <div className="space-y-2"><Label>Hotel name</Label><Input value={t.hotelName} onChange={(e) => upd({ hotelName: e.target.value })} /></div>
              <div className="space-y-2"><Label>Arrival time</Label><Input type="time" value={t.arrivalTime} onChange={(e) => upd({ arrivalTime: e.target.value })} /></div>
              <div className="space-y-2"><Label>Departure time</Label><Input type="time" value={t.departureTime} onChange={(e) => upd({ departureTime: e.target.value })} /></div>
              <label className="sm:col-span-2 flex items-center gap-2 text-sm">
                <Checkbox checked={t.bookLater} onCheckedChange={(v) => upd({ bookLater: !!v })} /> Book later — remind me
              </label>
            </CardContent>
          </Card>
        </>
      )}

      <Button onClick={save} variant="outline" className="w-full">Save travel</Button>
    </>
  );
}

/* ---------- STEP D ---------- */
function StepBike() {
  const { registration, setRegistration } = useStore();
  const b = registration.bike;
  const upd = (patch: Partial<typeof b>) => setRegistration((prev) => ({ ...prev, bike: { ...prev.bike, ...patch } }));

  const save = () => {
    let status: "complete" | "pending" | "not_started" = "not_started";
    if (b.needs === "no") status = "complete";
    else if (b.needs === "yes") {
      const specsFilled = !!(b.height && b.bikeSize && b.bikeType && b.pedals && b.pickupDate && b.returnDate);
      status = specsFilled ? "complete" : "pending";
    } else if (b.needs === "unsure") status = "pending";
    upd({ status });
    setRegistration((prev) => addAudit(prev, "Bike rental updated"));
    toast.success("Bike info saved");
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Rent a bike?</CardTitle>
            <StatusBadge status={b.status} />
          </div>
        </CardHeader>
        <CardContent>
          <RadioGroup value={b.needs} onValueChange={(v) => upd({ needs: v as typeof b.needs })} className="grid gap-2 sm:grid-cols-3">
            {[{ v: "yes", l: "Yes" }, { v: "no", l: "No — bringing my own" }, { v: "unsure", l: "Not sure" }].map((o) => (
              <label key={o.v} className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer has-[[data-state=checked]]:border-[var(--brand)] has-[[data-state=checked]]:bg-[var(--brand)]/10">
                <RadioGroupItem value={o.v} /> <span className="text-sm">{o.l}</span>
              </label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {b.needs === "yes" && (
        <>
          <Card>
            <CardHeader><CardTitle>Rider specs</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Height</Label><Input placeholder="e.g. 5'10&quot;" value={b.height} onChange={(e) => upd({ height: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>Preferred bike size</Label>
                <Select value={b.bikeSize} onValueChange={(v) => upd({ bikeSize: v })}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{["XS", "S", "M", "L", "XL"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Bike type</Label>
                <Select value={b.bikeType} onValueChange={(v) => upd({ bikeType: v })}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="road">Road</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="ebike">E-Bike</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Pedal preference</Label>
                <Select value={b.pedals} onValueChange={(v) => upd({ pedals: v })}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat">Flat</SelectItem>
                    <SelectItem value="clip">Clip-in (SPD)</SelectItem>
                    <SelectItem value="clip-road">Clip-in (Road)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="sm:col-span-2 flex items-center gap-2 text-sm"><Checkbox checked={b.helmet} onCheckedChange={(v) => upd({ helmet: !!v })} /> Helmet needed</label>
              <div className="space-y-2"><Label>Pickup date</Label><Input type="date" value={b.pickupDate} onChange={(e) => upd({ pickupDate: e.target.value })} /></div>
              <div className="space-y-2"><Label>Return date</Label><Input type="date" value={b.returnDate} onChange={(e) => upd({ returnDate: e.target.value })} /></div>
            </CardContent>
          </Card>
          <Button onClick={() => window.open("about:blank", "_blank")} className="w-full h-11 bg-[var(--brand-dark)] hover:bg-[var(--brand-dark)]/90 text-white">
            <ExternalLink className="mr-2 h-4 w-4" /> Open Unlimited Biking <span className="ml-1 text-xs opacity-70">(demo)</span>
          </Button>
          <Card>
            <CardHeader><CardTitle>Rental confirmation</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <Label>Confirmation number</Label>
              <Input value={b.confirmation} onChange={(e) => upd({ confirmation: e.target.value })} />
            </CardContent>
          </Card>
        </>
      )}
      <Button onClick={save} variant="outline" className="w-full">Save bike info</Button>
    </>
  );
}

/* ---------- STEP E ---------- */
function StepApparel() {
  const { registration, setRegistration } = useStore();
  const a = registration.apparel;
  const addr = registration.address;
  const isRider = registration.participation === "rider" || registration.participation === "both";
  const isVol = registration.participation === "volunteer" || registration.participation === "both";
  const upd = (patch: Partial<typeof a>) => setRegistration((prev) => ({ ...prev, apparel: { ...prev.apparel, ...patch } }));
  const updA = (patch: Partial<typeof addr>) => setRegistration((prev) => ({ ...prev, address: { ...prev.address, ...patch } }));

  const save = () => {
    const okRider = !isRider || (a.jerseySize && a.jerseyStyle && a.shirtSize && a.cut);
    const okVol = !isVol || (a.volunteerShirtSize && a.volunteerCut);
    const okAddr = addr.name && addr.street && addr.city && addr.state && addr.zip && addr.confirmed;
    const complete = !!(okRider && okVol && okAddr);
    upd({ status: complete ? "complete" : "pending" });
    setRegistration((prev) => addAudit(prev, "Apparel & mailing updated"));
    toast.success("Apparel saved");
  };

  return (
    <>
      {isRider && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Rider apparel</CardTitle>
              <Dialog>
                <DialogTrigger asChild><Button variant="ghost" size="sm"><Info className="mr-1 h-4 w-4" />Size guide</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Size guide</DialogTitle></DialogHeader>
                  <div className="text-sm space-y-2 text-muted-foreground">
                    <p>Cycling jerseys run one size smaller than everyday shirts. When in doubt, size up.</p>
                    <table className="w-full text-left mt-2 border-t">
                      <thead className="text-xs uppercase text-muted-foreground"><tr><th className="py-2">Size</th><th>Chest (in)</th></tr></thead>
                      <tbody>
                        {[["XS","32-34"],["S","34-36"],["M","36-38"],["L","38-40"],["XL","40-42"],["XXL","42-44"],["3XL","44-46"],["4XL","46-48"]].map((r) => (
                          <tr key={r[0]} className="border-t"><td className="py-1.5 font-mono">{r[0]}</td><td>{r[1]}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2"><Label>Jersey size</Label>
              <Select value={a.jerseySize} onValueChange={(v) => upd({ jerseySize: v })}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Jersey style</Label>
              <Select value={a.jerseyStyle} onValueChange={(v) => upd({ jerseyStyle: v as "short-sleeve" | "sleeveless" })}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="short-sleeve">Short sleeve</SelectItem>
                  <SelectItem value="sleeveless">Sleeveless</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Shirt size</Label>
              <Select value={a.shirtSize} onValueChange={(v) => upd({ shirtSize: v })}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Cut</Label>
              <Select value={a.cut} onValueChange={(v) => upd({ cut: v })}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent><SelectItem value="mens">Men's</SelectItem><SelectItem value="womens">Women's</SelectItem><SelectItem value="unisex">Unisex</SelectItem></SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {isVol && (
        <Card>
          <CardHeader><CardTitle>Volunteer apparel</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Shirt size</Label>
              <Select value={a.volunteerShirtSize} onValueChange={(v) => upd({ volunteerShirtSize: v })}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{SIZES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Cut</Label>
              <Select value={a.volunteerCut} onValueChange={(v) => upd({ volunteerCut: v })}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent><SelectItem value="mens">Men's</SelectItem><SelectItem value="womens">Women's</SelectItem><SelectItem value="unisex">Unisex</SelectItem></SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Mailing address</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2"><Label>Name</Label><Input value={addr.name} onChange={(e) => updA({ name: e.target.value })} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>Street</Label><Input value={addr.street} onChange={(e) => updA({ street: e.target.value })} /></div>
          <div className="space-y-2"><Label>Unit / Apt</Label><Input value={addr.unit} onChange={(e) => updA({ unit: e.target.value })} /></div>
          <div className="space-y-2"><Label>City</Label><Input value={addr.city} onChange={(e) => updA({ city: e.target.value })} /></div>
          <div className="space-y-2"><Label>State</Label><Input maxLength={2} value={addr.state} onChange={(e) => updA({ state: e.target.value.toUpperCase() })} /></div>
          <div className="space-y-2"><Label>ZIP</Label><Input value={addr.zip} onChange={(e) => updA({ zip: e.target.value.replace(/\D/g, "").slice(0, 10) })} /></div>
          <div className="space-y-2"><Label>Country</Label><Input value={addr.country} onChange={(e) => updA({ country: e.target.value })} /></div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={addr.type} onValueChange={(v) => updA({ type: v as "residential" | "business" })}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent><SelectItem value="residential">Residential</SelectItem><SelectItem value="business">Business</SelectItem></SelectContent>
            </Select>
          </div>
          <label className="sm:col-span-2 flex items-center gap-2 text-sm">
            <Checkbox checked={addr.confirmed} onCheckedChange={(v) => updA({ confirmed: !!v })} />
            I confirm this address is current.
          </label>
        </CardContent>
      </Card>

      <Button onClick={save} variant="outline" className="w-full">Save apparel & mailing</Button>
    </>
  );
}

/* ---------- STEP F ---------- */
function StepReview({ onEdit }: { onEdit: (n: number) => void }) {
  const { registration, user } = useStore();
  const missing: string[] = [];
  if (!registration.participation) missing.push("Participation type");
  if (registration.pelotonia.status !== "complete") missing.push("Pelotonia registration");
  if (registration.travel.status !== "complete") missing.push("Travel");
  const isRider = registration.participation === "rider" || registration.participation === "both";
  if (isRider && registration.bike.status !== "complete") missing.push("Bike rental");
  if (registration.apparel.status !== "complete") missing.push("Apparel & mailing");

  const Row = ({ label, value, editStep }: { label: string; value: string; editStep: number }) => (
    <div className="flex items-start justify-between gap-4 py-2 border-b last:border-0">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm font-medium mt-0.5">{value || <span className="text-muted-foreground italic">Not provided</span>}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={() => onEdit(editStep)}>Edit</Button>
    </div>
  );

  return (
    <>
      {missing.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4 text-sm">
            <p className="font-semibold text-amber-900">Missing required items:</p>
            <ul className="mt-1 list-disc pl-5 text-amber-900">{missing.map((m) => <li key={m}>{m}</li>)}</ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Colleague</CardTitle></CardHeader>
        <CardContent>
          <Row label="Name" value={user.name} editStep={1} />
          <Row label="Email" value={user.email} editStep={1} />
          <Row label="Market" value={user.market} editStep={1} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Participation</CardTitle></CardHeader>
        <CardContent>
          <Row label="Type" value={registration.participation ?? ""} editStep={1} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Pelotonia</CardTitle></CardHeader>
        <CardContent>
          <Row label="Discount code" value={registration.pelotonia.discountCode} editStep={2} />
          <Row label="Confirmation #" value={registration.pelotonia.confirmation} editStep={2} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Travel</CardTitle></CardHeader>
        <CardContent>
          <Row label="Needs" value={registration.travel.needs} editStep={3} />
          <Row label="Departure city" value={registration.travel.departureCity} editStep={3} />
          <Row label="Hotel" value={registration.travel.hotelName} editStep={3} />
        </CardContent>
      </Card>

      {isRider && (
        <Card>
          <CardHeader><CardTitle>Bike</CardTitle></CardHeader>
          <CardContent>
            <Row label="Rental" value={registration.bike.needs} editStep={4} />
            <Row label="Size" value={registration.bike.bikeSize} editStep={4} />
            <Row label="Confirmation" value={registration.bike.confirmation} editStep={4} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Apparel & mailing</CardTitle></CardHeader>
        <CardContent>
          {isRider && <Row label="Jersey" value={[registration.apparel.jerseySize, registration.apparel.jerseyStyle, registration.apparel.cut].filter(Boolean).join(" · ")} editStep={isRider ? 5 : 4} />}
          <Row label="Address" value={[registration.address.street, registration.address.city, registration.address.state, registration.address.zip].filter(Boolean).join(", ")} editStep={isRider ? 5 : 4} />
        </CardContent>
      </Card>
    </>
  );
}
