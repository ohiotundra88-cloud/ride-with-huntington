import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight, Copy as CopyIcon, ExternalLink, Bike, Shirt, Plane, ClipboardCheck, CheckCircle2, Info, Pencil, RotateCcw, Save, X } from "lucide-react";
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
import { useAdmin } from "@/lib/admin-store";
import {
  Copy,
  FieldLabel,
  LinkSettings,
  ListSettings,
  RegisterContentProvider,
  useRegisterContent,
} from "@/components/RegisterEditor";
import {
  DEFAULT_REGISTER_CONTENT,
  type RegisterContent,
} from "@/lib/register-content.shared";
import { getRegisterContent, saveRegisterContent } from "@/lib/register-content.functions";
import { toast } from "sonner";

const STEP_KEYS = ["A", "B", "C", "D", "E", "F"] as const;
export type StepKey = (typeof STEP_KEYS)[number];

const registerContentQuery = queryOptions({
  queryKey: ["register-content"],
  queryFn: () => getRegisterContent(),
  staleTime: 60_000,
});

export const Route = createFileRoute("/register")({
  validateSearch: (search: Record<string, unknown>): { step?: StepKey } => {
    const s = search.step;
    return typeof s === "string" && (STEP_KEYS as readonly string[]).includes(s)
      ? { step: s as StepKey }
      : {};
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(registerContentQuery),
  head: () => ({ meta: [
    { title: "Register — Team Huntington Hub" },
    { name: "description", content: "Multi-step Team Huntington Pelotonia registration wizard." },
  ] }),
  component: RegisterPage,
});

/* ---------- content shell: loads config + Super User editing ---------- */
function RegisterPage() {
  const saved = useQuery(registerContentQuery).data ?? DEFAULT_REGISTER_CONTENT;
  const qc = useQueryClient();
  const { state } = useAdmin();
  const { user } = useStore();
  const persist = useServerFn(saveRegisterContent);

  const canEdit =
    state.superUser.active && (user.roles.includes("superuser") || user.roles.includes("admin"));

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<RegisterContent | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!canEdit) { setEditing(false); setDraft(null); } }, [canEdit]);

  const content = editing && draft ? draft : saved;

  const startEditing = () => { setDraft(saved); setEditing(true); };
  const discard = () => { setDraft(null); setEditing(false); };
  const restoreDefaults = () => setDraft(DEFAULT_REGISTER_CONTENT);

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const next = await persist({ data: { content: draft } });
      qc.setQueryData(registerContentQuery.queryKey, next);
      setDraft(null);
      setEditing(false);
      toast.success("Register page updated", { description: "Everyone sees the new wording and options." });
    } catch (err) {
      toast.error("Couldn't save changes", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <RegisterContentProvider
      content={content}
      editing={editing}
      setContent={(next) => setDraft(next)}
    >
      {canEdit && (
        <div className="border-b bg-[var(--brand)]/10">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-2">
            <p className="text-xs font-semibold text-[var(--brand-dark)]">
              {editing ? "Editing Register page — click any text or gear to change it" : "Super User"}
            </p>
            <div className="flex gap-2">
              {editing ? (
                <>
                  <Button size="sm" variant="outline" onClick={restoreDefaults}>
                    <RotateCcw className="mr-1 h-3.5 w-3.5" /> Restore defaults
                  </Button>
                  <Button size="sm" variant="outline" onClick={discard}>
                    <X className="mr-1 h-3.5 w-3.5" /> Discard
                  </Button>
                  <Button
                    size="sm"
                    onClick={save}
                    disabled={saving}
                    className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90"
                  >
                    <Save className="mr-1 h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={startEditing}>
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Edit this page
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      <RegisterWizard />
    </RegisterContentProvider>
  );
}

/** Any visible+required field that has no answer yet. */
function missingRequired(
  field: (k: string) => { visible: boolean; required: boolean; label: string },
  entries: [string, unknown][],
) {
  return entries.filter(([key, value]) => {
    const f = field(key);
    if (!f.visible || !f.required) return false;
    return value === undefined || value === null || value === "" || value === false;
  });
}

function RegisterWizard() {
  const { registration, setRegistration } = useStore();
  const { t, list } = useRegisterContent();
  const nav = useNavigate();
  const { step: stepKeyParam } = Route.useSearch();
  const [step, setStep] = useState(1);

  const isRider = registration.participation === "rider" || registration.participation === "both";

  const steps = useMemo(() => {
    const base = [
      { key: "A", label: t("step.A"), icon: ClipboardCheck },
      { key: "B", label: t("step.B"), icon: CheckCircle2 },
      { key: "C", label: t("step.C"), icon: Plane },
    ];
    if (isRider) base.push({ key: "D", label: t("step.D"), icon: Bike });
    base.push({ key: "E", label: t("step.E"), icon: Shirt });
    base.push({ key: "F", label: t("step.F"), icon: CheckCircle2 });
    return base;
  }, [isRider, t]);

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

  void list; // lists are read inside the individual steps

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* PROGRESS */}
      <div className="sticky top-14 z-30 -mx-4 bg-background/95 backdrop-blur px-4 py-4 border-b">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Step {step} of {total}</p>
            <Copy k={`step.${steps[step - 1].key}`} as="div" className="text-lg font-black text-[var(--brand-dark)]" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={back} disabled={step === 1}>
              <ChevronLeft className="h-4 w-4" /> {t("btn.back")}
            </Button>
            {step < total ? (
              <Button size="sm" onClick={next} className="bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90">
                {t("btn.next")} <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button size="sm" onClick={submit} className="bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90 font-semibold">
                {t("btn.submit")}
              </Button>
            )}
          </div>
        </div>
        <Progress value={progress} className="mt-3 h-2" />
        <Copy k="top.autosave" as="p" className="mt-2 text-[11px] text-muted-foreground" />
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
  const { list } = useRegisterContent();
  const set = (v: Participation) => setRegistration((prev) => addAudit({ ...prev, participation: v }, `Selected participation: ${v}`));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle><Copy k="A.title" /></CardTitle>
          <ListSettings listKey="participation" title="Participation choices" withDesc />
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {list("participation").map((o) => {
          const selected = registration.participation === o.value;
          return (
            <button
              key={o.value}
              onClick={() => set(o.value as Participation)}
              className={`text-left rounded-xl border-2 p-4 transition-all ${selected ? "border-[var(--brand)] bg-[var(--brand)]/10 shadow-sm" : "border-border hover:border-[var(--brand)]/50"}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[var(--brand-dark)]">{o.label}</h3>
                {selected && <CheckCircle2 className="h-5 w-5 text-[var(--brand-dark)]" />}
              </div>
              {o.desc && <p className="mt-1 text-sm text-muted-foreground">{o.desc}</p>}
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
  const { t, field, list, link, editing, setText } = useRegisterContent();
  const p = registration.pelotonia;
  const upd = (patch: Partial<typeof p>) => setRegistration((prev) => ({ ...prev, pelotonia: { ...prev.pelotonia, ...patch } }));
  const code = t("B.discountCode") || p.discountCode;

  const markComplete = () => {
    const missing = missingRequired(field, [
      ["confirmation", p.confirmation],
      ["hbNumber", p.hbNumber],
      ["employmentType", p.employmentType],
      ["payGrade74Below", p.payGrade74Below],
      ["completed", p.completed],
    ]);
    upd({ completed: true, status: missing.length === 0 ? "complete" : "pending" });
    setRegistration((prev) => addAudit(prev, "Pelotonia registration marked complete"));
    toast.success(missing.length === 0 ? "Pelotonia step complete" : "Pelotonia step updated — some required answers are missing");
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle><Copy k="B.card1Title" /></CardTitle>
            <StatusBadge status={p.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-4 text-sm">
            <Copy k="B.instructionsTitle" as="p" className="font-semibold text-[var(--brand-dark)]" />
            <ol className="mt-2 space-y-1 list-decimal pl-5 text-muted-foreground">
              <li><Copy k="B.instr1" /></li>
              <li><Copy k="B.instr2" /></li>
              <li><Copy k="B.instr3" /></li>
            </ol>
          </div>
          <div>
            <Label><Copy k="B.discountLabel" /></Label>
            <div className="mt-1.5 flex gap-2">
              {editing ? (
                <Input
                  value={code}
                  onChange={(e) => setLink("discountCode", { label: e.target.value, url: "" })}
                  className="font-mono font-bold text-[var(--brand-dark)]"
                />
              ) : (
                <Input readOnly value={code} className="font-mono font-bold text-[var(--brand-dark)]" />
              )}
              <Button variant="outline" onClick={() => { navigator.clipboard.writeText(code); toast.success("Copied"); }}>
                <CopyIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => window.open(link("pelotonia").url, "_blank")}
              className="h-11 flex-1 bg-[var(--brand-dark)] hover:bg-[var(--brand-dark)]/90 text-white"
            >
              <ExternalLink className="mr-2 h-4 w-4" /> {link("pelotonia").label}
            </Button>
            <LinkSettings linkKey="pelotonia" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle><Copy k="B.card2Title" /></CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {field("confirmation").visible && (
            <div>
              <Label><FieldLabel name="confirmation" /></Label>
              <Input value={p.confirmation} onChange={(e) => upd({ confirmation: e.target.value })} placeholder="e.g. PELO-2027-12345" />
            </div>
          )}
          {field("hbNumber").visible && (
            <div>
              <Label><FieldLabel name="hbNumber" /></Label>
              <Input value={p.hbNumber} onChange={(e) => upd({ hbNumber: e.target.value })} placeholder="e.g. HB123456" />
              {!p.hbNumber && field("hbNumber").required && (
                <Copy k="B.hbHelp" as="p" className="text-xs text-red-500 mt-1" />
              )}
            </div>
          )}
          {field("completed").visible && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={p.completed} onCheckedChange={(v) => upd({ completed: !!v })} />
              <Copy k="B.completedLabel" />
            </label>
          )}

          {(field("highRoller").visible || field("survivor").visible) && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <Copy k="B.designationsTitle" as="p" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" />
              {field("highRoller").visible && (
                <label className="flex items-start gap-2 text-sm cursor-pointer">
                  <Checkbox checked={p.highRoller} onCheckedChange={(v) => upd({ highRoller: !!v })} className="mt-0.5" />
                  <span>
                    <b><Copy k="B.highRollerTitle" /></b>
                    <Copy k="B.highRollerDesc" as="span" className="block text-xs text-muted-foreground" />
                  </span>
                </label>
              )}
              {field("survivor").visible && (
                <label className="flex items-start gap-2 text-sm cursor-pointer">
                  <Checkbox checked={p.survivor} onCheckedChange={(v) => upd({ survivor: !!v })} className="mt-0.5" />
                  <span>
                    <b><Copy k="B.survivorTitle" /></b>
                    <Copy k="B.survivorDesc" as="span" className="block text-xs text-muted-foreground" />
                  </span>
                </label>
              )}
            </div>
          )}

          {(field("employmentType").visible || field("payGrade74Below").visible) && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
              <Copy k="B.colleagueTitle" as="p" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground" />
              {field("employmentType").visible && (
                <div>
                  <Label><FieldLabel name="employmentType" listKey="employmentTypes" /></Label>
                  <Select value={p.employmentType} onValueChange={(v) => upd({ employmentType: v as "salary" | "hourly" })}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {list("employmentTypes").map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {field("payGrade74Below").visible && (
                <div>
                  <Label><FieldLabel name="payGrade74Below" listKey="payGrades" /></Label>
                  <Select value={p.payGrade74Below} onValueChange={(v) => upd({ payGrade74Below: v as "yes" | "no" })}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {list("payGrades").map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <Button onClick={markComplete} variant="outline" className="w-full">{t("B.saveBtn")}</Button>
        </CardContent>
      </Card>
    </>
  );
}

/* ---------- STEP C ---------- */
function StepTravel() {
  const { registration, setRegistration } = useStore();
  const { t, field, list, link } = useRegisterContent();
  const tr = registration.travel;
  const upd = (patch: Partial<typeof tr>) => setRegistration((prev) => ({ ...prev, travel: { ...prev.travel, ...patch } }));

  const save = () => {
    if (!tr.needs) {
      upd({ status: "pending" });
    } else if (tr.needs === "none") {
      upd({ status: "complete" });
    } else {
      const missing = missingRequired(field, [
        ["departureCity", tr.departureCity],
        ["arrivalDate", tr.arrivalDate],
        ["departureDate", tr.departureDate],
        ["hotelCheckIn", tr.hotelCheckIn],
        ["hotelCheckOut", tr.hotelCheckOut],
        ["travelNotes", tr.notes],
        ["travelConfirmation", tr.travelConfirmation],
        ["hotelConfirmation", tr.hotelConfirmation],
        ["hotelName", tr.hotelName],
        ["arrivalTime", tr.arrivalTime],
        ["departureTime", tr.departureTime],
      ]);
      upd({ status: missing.length === 0 && tr.travelConfirmation ? "complete" : "pending" });
    }
    setRegistration((prev) => addAudit(prev, "Travel details updated"));
    toast.success("Travel saved");
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle><Copy k="C.title" /></CardTitle>
            <div className="flex items-center gap-2">
              <ListSettings listKey="travelNeeds" title="Travel choices" />
              <StatusBadge status={tr.status} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <RadioGroup value={tr.needs} onValueChange={(v) => upd({ needs: v as typeof tr.needs })} className="grid gap-2 sm:grid-cols-2">
            {list("travelNeeds").map((o) => (
              <label key={o.value} className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer has-[[data-state=checked]]:border-[var(--brand)] has-[[data-state=checked]]:bg-[var(--brand)]/10">
                <RadioGroupItem value={o.value} /> <span className="text-sm">{o.label}</span>
              </label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {tr.needs && tr.needs !== "none" && (
        <>
          <Card>
            <CardHeader><CardTitle><Copy k="C.tripTitle" /></CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {field("departureCity").visible && <div className="space-y-2"><Label><FieldLabel name="departureCity" /></Label><Input value={tr.departureCity} onChange={(e) => upd({ departureCity: e.target.value })} /></div>}
              {field("arrivalDate").visible && <div className="space-y-2"><Label><FieldLabel name="arrivalDate" /></Label><Input type="date" value={tr.arrivalDate} onChange={(e) => upd({ arrivalDate: e.target.value })} /></div>}
              {field("departureDate").visible && <div className="space-y-2"><Label><FieldLabel name="departureDate" /></Label><Input type="date" value={tr.departureDate} onChange={(e) => upd({ departureDate: e.target.value })} /></div>}
              {field("hotelCheckIn").visible && <div className="space-y-2"><Label><FieldLabel name="hotelCheckIn" /></Label><Input type="date" value={tr.hotelCheckIn} onChange={(e) => upd({ hotelCheckIn: e.target.value })} /></div>}
              {field("hotelCheckOut").visible && <div className="space-y-2"><Label><FieldLabel name="hotelCheckOut" /></Label><Input type="date" value={tr.hotelCheckOut} onChange={(e) => upd({ hotelCheckOut: e.target.value })} /></div>}
              {field("travelNotes").visible && <div className="space-y-2 sm:col-span-2"><Label><FieldLabel name="travelNotes" /></Label><Textarea value={tr.notes} onChange={(e) => upd({ notes: e.target.value })} /></div>}
            </CardContent>
          </Card>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => window.open(link("travel").url, "_blank")} className="h-11 flex-1 bg-[var(--brand-dark)] hover:bg-[var(--brand-dark)]/90 text-white">
              <ExternalLink className="mr-2 h-4 w-4" /> {link("travel").label}
            </Button>
            <LinkSettings linkKey="travel" />
          </div>

          <Card>
            <CardHeader><CardTitle><Copy k="C.confirmTitle" /></CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {field("travelConfirmation").visible && <div className="space-y-2"><Label><FieldLabel name="travelConfirmation" /></Label><Input value={tr.travelConfirmation} onChange={(e) => upd({ travelConfirmation: e.target.value })} /></div>}
              {field("hotelConfirmation").visible && <div className="space-y-2"><Label><FieldLabel name="hotelConfirmation" /></Label><Input value={tr.hotelConfirmation} onChange={(e) => upd({ hotelConfirmation: e.target.value })} /></div>}
              {field("hotelName").visible && <div className="space-y-2"><Label><FieldLabel name="hotelName" /></Label><Input value={tr.hotelName} onChange={(e) => upd({ hotelName: e.target.value })} /></div>}
              {field("arrivalTime").visible && <div className="space-y-2"><Label><FieldLabel name="arrivalTime" /></Label><Input type="time" value={tr.arrivalTime} onChange={(e) => upd({ arrivalTime: e.target.value })} /></div>}
              {field("departureTime").visible && <div className="space-y-2"><Label><FieldLabel name="departureTime" /></Label><Input type="time" value={tr.departureTime} onChange={(e) => upd({ departureTime: e.target.value })} /></div>}
              {field("bookLater").visible && (
                <label className="sm:col-span-2 flex items-center gap-2 text-sm">
                  <Checkbox checked={tr.bookLater} onCheckedChange={(v) => upd({ bookLater: !!v })} /> <Copy k="C.bookLater" />
                </label>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Button onClick={save} variant="outline" className="w-full">{t("C.saveBtn")}</Button>
    </>
  );
}

/* ---------- STEP D ---------- */
function StepBike() {
  const { registration, setRegistration } = useStore();
  const { t, field, list, link } = useRegisterContent();
  const b = registration.bike;
  const upd = (patch: Partial<typeof b>) => setRegistration((prev) => ({ ...prev, bike: { ...prev.bike, ...patch } }));

  const save = () => {
    let status: "complete" | "pending" | "not_started" = "not_started";
    if (b.needs === "no") status = "complete";
    else if (b.needs === "yes") {
      const missing = missingRequired(field, [
        ["height", b.height],
        ["bikeSize", b.bikeSize],
        ["bikeType", b.bikeType],
        ["pedals", b.pedals],
        ["pickupDate", b.pickupDate],
        ["returnDate", b.returnDate],
        ["bikeConfirmation", b.confirmation],
      ]);
      status = missing.length === 0 ? "complete" : "pending";
    } else if (b.needs) status = "pending";
    upd({ status });
    setRegistration((prev) => addAudit(prev, "Bike rental updated"));
    toast.success("Bike info saved");
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle><Copy k="D.title" /></CardTitle>
            <div className="flex items-center gap-2">
              <ListSettings listKey="bikeNeeds" title="Rental choices" />
              <StatusBadge status={b.status} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <RadioGroup value={b.needs} onValueChange={(v) => upd({ needs: v as typeof b.needs })} className="grid gap-2 sm:grid-cols-3">
            {list("bikeNeeds").map((o) => (
              <label key={o.value} className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer has-[[data-state=checked]]:border-[var(--brand)] has-[[data-state=checked]]:bg-[var(--brand)]/10">
                <RadioGroupItem value={o.value} /> <span className="text-sm">{o.label}</span>
              </label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {b.needs === "yes" && (
        <>
          <Card>
            <CardHeader><CardTitle><Copy k="D.specsTitle" /></CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {field("height").visible && <div className="space-y-2"><Label><FieldLabel name="height" /></Label><Input placeholder="e.g. 5'10&quot;" value={b.height} onChange={(e) => upd({ height: e.target.value })} /></div>}
              {field("bikeSize").visible && (
                <div className="space-y-2">
                  <Label><FieldLabel name="bikeSize" listKey="bikeSizes" /></Label>
                  <Select value={b.bikeSize} onValueChange={(v) => upd({ bikeSize: v })}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{list("bikeSizes").map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              {field("bikeType").visible && (
                <div className="space-y-2">
                  <Label><FieldLabel name="bikeType" listKey="bikeTypes" /></Label>
                  <Select value={b.bikeType} onValueChange={(v) => upd({ bikeType: v })}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{list("bikeTypes").map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              {field("pedals").visible && (
                <div className="space-y-2">
                  <Label><FieldLabel name="pedals" listKey="pedals" /></Label>
                  <Select value={b.pedals} onValueChange={(v) => upd({ pedals: v })}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{list("pedals").map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              {field("helmet").visible && (
                <label className="sm:col-span-2 flex items-center gap-2 text-sm">
                  <Checkbox checked={b.helmet} onCheckedChange={(v) => upd({ helmet: !!v })} /> <FieldLabel name="helmet" />
                </label>
              )}
              {field("pickupDate").visible && <div className="space-y-2"><Label><FieldLabel name="pickupDate" /></Label><Input type="date" value={b.pickupDate} onChange={(e) => upd({ pickupDate: e.target.value })} /></div>}
              {field("returnDate").visible && <div className="space-y-2"><Label><FieldLabel name="returnDate" /></Label><Input type="date" value={b.returnDate} onChange={(e) => upd({ returnDate: e.target.value })} /></div>}
            </CardContent>
          </Card>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => window.open(link("bikeRental").url, "_blank")} className="h-11 flex-1 bg-[var(--brand-dark)] hover:bg-[var(--brand-dark)]/90 text-white">
              <ExternalLink className="mr-2 h-4 w-4" /> {link("bikeRental").label}
            </Button>
            <LinkSettings linkKey="bikeRental" />
          </div>
          {field("bikeConfirmation").visible && (
            <Card>
              <CardHeader><CardTitle><Copy k="D.rentalConfTitle" /></CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Label><FieldLabel name="bikeConfirmation" /></Label>
                <Input value={b.confirmation} onChange={(e) => upd({ confirmation: e.target.value })} />
              </CardContent>
            </Card>
          )}
        </>
      )}
      <Button onClick={save} variant="outline" className="w-full">{t("D.saveBtn")}</Button>
    </>
  );
}

/* ---------- STEP E ---------- */
function StepApparel() {
  const { registration, setRegistration } = useStore();
  const { t, field, list } = useRegisterContent();
  const a = registration.apparel;
  const addr = registration.address;
  // When participation isn't a definite rider/volunteer choice (null or "unsure"),
  // show both apparel sections so options are always editable.
  const undecided = registration.participation !== "rider" && registration.participation !== "volunteer" && registration.participation !== "both";
  const isRider = undecided || registration.participation === "rider" || registration.participation === "both";
  const isVol = undecided || registration.participation === "volunteer" || registration.participation === "both";
  const upd = (patch: Partial<typeof a>) => setRegistration((prev) => ({ ...prev, apparel: { ...prev.apparel, ...patch } }));
  const updA = (patch: Partial<typeof addr>) => setRegistration((prev) => ({ ...prev, address: { ...prev.address, ...patch } }));

  const save = () => {
    const riderMissing = isRider
      ? missingRequired(field, [
          ["jerseySize", a.jerseySize],
          ["jerseyStyle", a.jerseyStyle],
          ["shirtSize", a.shirtSize],
          ["cut", a.cut],
        ])
      : [];
    const volMissing = isVol
      ? missingRequired(field, [
          ["volunteerShirtSize", a.volunteerShirtSize],
          ["volunteerCut", a.volunteerCut],
        ])
      : [];
    const addrMissing = missingRequired(field, [
      ["addrName", addr.name],
      ["street", addr.street],
      ["unit", addr.unit],
      ["city", addr.city],
      ["state", addr.state],
      ["zip", addr.zip],
      ["country", addr.country],
      ["addrType", addr.type],
    ]);
    // Undecided participants only need one apparel set filled in.
    const okApparel = undecided
      ? riderMissing.length === 0 || volMissing.length === 0
      : riderMissing.length === 0 && volMissing.length === 0;
    const complete = okApparel && addrMissing.length === 0 && addr.confirmed;
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
              <CardTitle><Copy k="E.riderTitle" /></CardTitle>
              <div className="flex items-center gap-2">
                <ListSettings listKey="sizeGuide" title="Size guide rows" withDesc />
                <Dialog>
                  <DialogTrigger asChild><Button variant="ghost" size="sm"><Info className="mr-1 h-4 w-4" />{t("E.sizeGuideBtn")}</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>{t("E.sizeGuideTitle")}</DialogTitle></DialogHeader>
                    <div className="text-sm space-y-2 text-muted-foreground">
                      <Copy k="E.sizeGuideNote" as="p" />
                      <table className="w-full text-left mt-2 border-t">
                        <thead className="text-xs uppercase text-muted-foreground"><tr><th className="py-2">{t("E.sizeGuideCol1")}</th><th>{t("E.sizeGuideCol2")}</th></tr></thead>
                        <tbody>
                          {list("sizeGuide").map((r) => (
                            <tr key={r.value} className="border-t"><td className="py-1.5 font-mono">{r.label}</td><td>{r.desc}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {field("jerseySize").visible && (
              <div className="space-y-2"><Label><FieldLabel name="jerseySize" listKey="sizes" /></Label>
                <Select value={a.jerseySize} onValueChange={(v) => upd({ jerseySize: v })}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{list("sizes").map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {field("jerseyStyle").visible && (
              <div className="space-y-2"><Label><FieldLabel name="jerseyStyle" listKey="jerseyStyles" /></Label>
                <Select value={a.jerseyStyle} onValueChange={(v) => upd({ jerseyStyle: v as "short-sleeve" | "sleeveless" })}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{list("jerseyStyles").map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {field("shirtSize").visible && (
              <div className="space-y-2"><Label><FieldLabel name="shirtSize" listKey="sizes" /></Label>
                <Select value={a.shirtSize} onValueChange={(v) => upd({ shirtSize: v })}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{list("sizes").map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {field("cut").visible && (
              <div className="space-y-2"><Label><FieldLabel name="cut" listKey="cuts" /></Label>
                <Select value={a.cut} onValueChange={(v) => upd({ cut: v })}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{list("cuts").map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isVol && (
        <Card>
          <CardHeader><CardTitle><Copy k="E.volTitle" /></CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {field("volunteerShirtSize").visible && (
              <div className="space-y-2"><Label><FieldLabel name="volunteerShirtSize" listKey="sizes" /></Label>
                <Select value={a.volunteerShirtSize} onValueChange={(v) => upd({ volunteerShirtSize: v })}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{list("sizes").map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {field("volunteerCut").visible && (
              <div className="space-y-2"><Label><FieldLabel name="volunteerCut" listKey="cuts" /></Label>
                <Select value={a.volunteerCut} onValueChange={(v) => upd({ volunteerCut: v })}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{list("cuts").map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle><Copy k="E.mailTitle" /></CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {field("addrName").visible && <div className="space-y-2 sm:col-span-2"><Label><FieldLabel name="addrName" /></Label><Input value={addr.name} onChange={(e) => updA({ name: e.target.value })} /></div>}
          {field("street").visible && <div className="space-y-2 sm:col-span-2"><Label><FieldLabel name="street" /></Label><Input value={addr.street} onChange={(e) => updA({ street: e.target.value })} /></div>}
          {field("unit").visible && <div className="space-y-2"><Label><FieldLabel name="unit" /></Label><Input value={addr.unit} onChange={(e) => updA({ unit: e.target.value })} /></div>}
          {field("city").visible && <div className="space-y-2"><Label><FieldLabel name="city" /></Label><Input value={addr.city} onChange={(e) => updA({ city: e.target.value })} /></div>}
          {field("state").visible && <div className="space-y-2"><Label><FieldLabel name="state" /></Label><Input maxLength={2} value={addr.state} onChange={(e) => updA({ state: e.target.value.toUpperCase() })} /></div>}
          {field("zip").visible && <div className="space-y-2"><Label><FieldLabel name="zip" /></Label><Input value={addr.zip} onChange={(e) => updA({ zip: e.target.value.replace(/\D/g, "").slice(0, 10) })} /></div>}
          {field("country").visible && <div className="space-y-2"><Label><FieldLabel name="country" /></Label><Input value={addr.country} onChange={(e) => updA({ country: e.target.value })} /></div>}
          {field("addrType").visible && (
            <div className="space-y-2">
              <Label><FieldLabel name="addrType" listKey="addressTypes" /></Label>
              <Select value={addr.type} onValueChange={(v) => updA({ type: v as "residential" | "business" })}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{list("addressTypes").map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <label className="sm:col-span-2 flex items-center gap-2 text-sm">
            <Checkbox checked={addr.confirmed} onCheckedChange={(v) => updA({ confirmed: !!v })} />
            <Copy k="E.addrConfirm" />
          </label>
        </CardContent>
      </Card>

      <Button onClick={save} variant="outline" className="w-full">{t("E.saveBtn")}</Button>
    </>
  );
}

/* ---------- STEP F ---------- */
function StepReview({ onEdit }: { onEdit: (n: number) => void }) {
  const { registration, user } = useStore();
  const { t, field } = useRegisterContent();
  const missing: string[] = [];
  if (!registration.participation) missing.push(t("step.A"));
  if (registration.pelotonia.status !== "complete") missing.push(t("step.B"));
  if (registration.travel.status !== "complete") missing.push(t("step.C"));
  const isRider = registration.participation === "rider" || registration.participation === "both";
  if (isRider && registration.bike.status !== "complete") missing.push(t("step.D"));
  if (registration.apparel.status !== "complete") missing.push(t("step.E"));

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
            <p className="font-semibold text-amber-900">{t("F.missingTitle")}</p>
            <ul className="mt-1 list-disc pl-5 text-amber-900">{missing.map((m) => <li key={m}>{m}</li>)}</ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle><Copy k="F.colleagueTitle" /></CardTitle></CardHeader>
        <CardContent>
          <Row label="Name" value={user.name} editStep={1} />
          <Row label="Email" value={user.email} editStep={1} />
          <Row label="Market" value={user.market} editStep={1} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle><Copy k="F.participationTitle" /></CardTitle></CardHeader>
        <CardContent>
          <Row label="Type" value={registration.participation ?? ""} editStep={1} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle><Copy k="F.pelotoniaTitle" /></CardTitle></CardHeader>
        <CardContent>
          <Row label={t("B.discountLabel")} value={registration.pelotonia.discountCode} editStep={2} />
          <Row label={field("confirmation").label} value={registration.pelotonia.confirmation} editStep={2} />
          <Row label={field("hbNumber").label} value={registration.pelotonia.hbNumber} editStep={2} />
          <Row label={field("employmentType").label} value={registration.pelotonia.employmentType} editStep={2} />
          <Row label={field("payGrade74Below").label} value={registration.pelotonia.payGrade74Below} editStep={2} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle><Copy k="F.travelTitle" /></CardTitle></CardHeader>
        <CardContent>
          <Row label="Needs" value={registration.travel.needs} editStep={3} />
          <Row label={field("departureCity").label} value={registration.travel.departureCity} editStep={3} />
          <Row label={field("hotelName").label} value={registration.travel.hotelName} editStep={3} />
        </CardContent>
      </Card>

      {isRider && (
        <Card>
          <CardHeader><CardTitle><Copy k="F.bikeTitle" /></CardTitle></CardHeader>
          <CardContent>
            <Row label="Rental" value={registration.bike.needs} editStep={4} />
            <Row label={field("bikeSize").label} value={registration.bike.bikeSize} editStep={4} />
            <Row label={field("bikeConfirmation").label} value={registration.bike.confirmation} editStep={4} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle><Copy k="F.apparelTitle" /></CardTitle></CardHeader>
        <CardContent>
          {isRider && <Row label="Jersey" value={[registration.apparel.jerseySize, registration.apparel.jerseyStyle, registration.apparel.cut].filter(Boolean).join(" · ")} editStep={isRider ? 5 : 4} />}
          <Row label="Address" value={[registration.address.street, registration.address.city, registration.address.state, registration.address.zip].filter(Boolean).join(", ")} editStep={isRider ? 5 : 4} />
        </CardContent>
      </Card>
    </>
  );
}
