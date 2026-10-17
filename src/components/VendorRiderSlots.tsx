import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bike, BedDouble, CheckCircle2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VendorTierBadge } from "@/components/VendorTierBadge";
import { saveVendorRiderSlots } from "@/lib/vendors.functions";
import {
  BIKE_SIZES,
  currency,
  tierFor,
  yearTotals,
  type VendorDetail,
  type VendorRiderSlotRow,
} from "@/lib/vendors.shared";

type Draft = {
  slot_number: number;
  rider_name: string;
  pelotonia_id: string;
  bike_needed: boolean;
  bike_size: string;
  hotel_needed: boolean;
  hotel_check_in: string;
  hotel_check_out: string;
};

function draftsFor(slots: VendorRiderSlotRow[], year: number, count: number): Draft[] {
  return Array.from({ length: count }, (_, i) => {
    const s = slots.find((r) => r.year === year && r.slot_number === i + 1);
    return {
      slot_number: i + 1,
      rider_name: s?.rider_name ?? "",
      pelotonia_id: s?.pelotonia_id ?? "",
      bike_needed: !!s?.bike_needed,
      bike_size: s?.bike_size ?? "",
      hotel_needed: !!s?.hotel_needed,
      hotel_check_in: s?.hotel_check_in ?? "",
      hotel_check_out: s?.hotel_check_out ?? "",
    };
  });
}

/**
 * Sponsored riders that come with the top tiers: Pinnacle Partner (5 riders,
 * with hotel) and One Goal (2 riders). Shown only for years the vendor earned
 * one of those tiers.
 */
export function VendorRiderSlots({ vendor }: { vendor: VendorDetail }) {
  const totals = useMemo(() => yearTotals(vendor.donations), [vendor.donations]);
  const eligible = useMemo(
    () =>
      Object.keys(totals)
        .map(Number)
        .filter((y) => (tierFor(totals, y)?.riderSlots ?? 0) > 0)
        .sort((a, b) => b - a),
    [totals],
  );
  const [year, setYear] = useState<number | null>(eligible[0] ?? null);
  useEffect(() => {
    if (year === null || !eligible.includes(year)) setYear(eligible[0] ?? null);
  }, [eligible, year]);

  if (year === null) return null;
  return <SlotsForYear key={year} vendor={vendor} year={year} years={eligible} setYear={setYear} />;
}

function SlotsForYear({
  vendor,
  year,
  years,
  setYear,
}: {
  vendor: VendorDetail;
  year: number;
  years: number[];
  setYear: (y: number) => void;
}) {
  const qc = useQueryClient();
  const tier = tierFor(yearTotals(vendor.donations), year)!;
  const [drafts, setDrafts] = useState<Draft[]>(() =>
    draftsFor(vendor.rider_slots, year, tier.riderSlots),
  );
  const saved = vendor.rider_slots.filter((s) => s.year === year);

  const save = useMutation({
    mutationFn: () => saveVendorRiderSlots({ data: { vendor_id: vendor.id, year, slots: drafts } }),
    onSuccess: (r) => {
      toast.success("Sponsored riders saved", {
        description: `${r.filled} of ${tier.riderSlots} filled for ${year}.`,
      });
      qc.invalidateQueries({ queryKey: ["vendor", vendor.id] });
    },
    onError: (e: Error) =>
      toast.error("Couldn't save sponsored riders", { description: e.message }),
  });

  const set = (i: number, patch: Partial<Draft>) =>
    setDrafts((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3">
        <div>
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            <UserRound className="h-4 w-4 text-[var(--brand)]" /> Sponsored riders
            <VendorTierBadge tier={tier} year={year} />
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {tier.label} includes {tier.riderSlots} rider{tier.riderSlots === 1 ? "" : "s"}
            {tier.slotHotel ? " with bike and hotel details" : " with bike details"}.
          </p>
        </div>
        {years.length > 1 && (
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-28" aria-label="Year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {drafts.map((d, i) => {
          const match = saved.find(
            (s) => s.slot_number === d.slot_number && s.pelotonia_id === d.pelotonia_id,
          )?.pelotonia;
          const idFor = (f: string) => `slot-${year}-${d.slot_number}-${f}`;
          return (
            <fieldset key={d.slot_number} className="rounded-lg border p-3">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Rider {d.slot_number}
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor={idFor("name")}>Name</Label>
                  <Input
                    id={idFor("name")}
                    value={d.rider_name}
                    onChange={(e) => set(i, { rider_name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={idFor("rid")}>Pelotonia rider ID</Label>
                  <Input
                    id={idFor("rid")}
                    value={d.pelotonia_id}
                    placeholder="e.g. CK0132"
                    autoCapitalize="characters"
                    onChange={(e) =>
                      set(i, { pelotonia_id: e.target.value.toUpperCase().replace(/\s/g, "") })
                    }
                  />
                  {match && (
                    <p className="flex items-center gap-1 text-[11px] text-emerald-800">
                      <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                      {match.name} · {currency(match.raised)} raised
                      {match.subTeam ? ` · ${match.subTeam}` : ""}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={idFor("bike")}
                      checked={d.bike_needed}
                      onCheckedChange={(v) => set(i, { bike_needed: v === true })}
                    />
                    <Label htmlFor={idFor("bike")} className="flex items-center gap-1 font-normal">
                      <Bike className="h-3.5 w-3.5" aria-hidden="true" /> Needs a bike
                    </Label>
                  </div>
                  {d.bike_needed && (
                    <Select value={d.bike_size} onValueChange={(v) => set(i, { bike_size: v })}>
                      <SelectTrigger aria-label={`Rider ${d.slot_number} bike size`}>
                        <SelectValue placeholder="Bike size" />
                      </SelectTrigger>
                      <SelectContent>
                        {BIKE_SIZES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {tier.slotHotel && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={idFor("hotel")}
                        checked={d.hotel_needed}
                        onCheckedChange={(v) => set(i, { hotel_needed: v === true })}
                      />
                      <Label
                        htmlFor={idFor("hotel")}
                        className="flex items-center gap-1 font-normal"
                      >
                        <BedDouble className="h-3.5 w-3.5" aria-hidden="true" /> Needs a hotel
                      </Label>
                    </div>
                    {d.hotel_needed && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor={idFor("in")} className="text-[11px]">
                            Check-in
                          </Label>
                          <Input
                            id={idFor("in")}
                            type="date"
                            value={d.hotel_check_in}
                            onChange={(e) => set(i, { hotel_check_in: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={idFor("out")} className="text-[11px]">
                            Check-out
                          </Label>
                          <Input
                            id={idFor("out")}
                            type="date"
                            value={d.hotel_check_out}
                            min={d.hotel_check_in || undefined}
                            onChange={(e) => set(i, { hotel_check_out: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </fieldset>
          );
        })}
        <div className="flex justify-end">
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90"
          >
            {save.isPending ? "Saving…" : "Save sponsored riders"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
