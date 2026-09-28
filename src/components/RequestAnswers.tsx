import type { FundraiserRequest } from "@/lib/fundraiser-requests.shared";

const yn = (v: boolean | null) => (v === null ? "Not answered" : v ? "Yes" : "No");

/** The submitter's answers to the approval questions, for reviewers. */
export function RequestAnswers({ request }: { request: FundraiserRequest }) {
  const rows: { label: string; value: string; flag?: boolean }[] = [
    { label: "On Huntington Bank property", value: yn(request.on_huntington_property) },
    ...(request.on_huntington_property
      ? [{
          label: "Regional Facilities Manager approved",
          value: yn(request.facilities_approved),
          flag: request.facilities_approved === false,
        }]
      : []),
    {
      label: "Alcohol served",
      value: request.serves_alcohol ? `Yes: ${request.alcohol_details || "no details"}` : yn(request.serves_alcohol),
      flag: !!request.serves_alcohol,
    },
    { label: "Food served", value: yn(request.serves_food) },
    ...(request.serves_food
      ? [
          { label: "Agrees food isn't served by colleagues", value: yn(request.food_policy_acknowledged) },
          { label: "Food truck", value: yn(request.food_truck), flag: !!request.food_truck },
        ]
      : []),
    { label: "Uses HNB or Pelotonia logos", value: yn(request.uses_logos) },
    { label: "Contract needed", value: yn(request.contract_needed), flag: !!request.contract_needed },
    { label: "Liability waiver needed", value: yn(request.liability_waiver_needed), flag: !!request.liability_waiver_needed },
  ];
  const answered = request.on_huntington_property !== null || request.uses_logos !== null;
  if (!answered) {
    return <p className="text-xs text-muted-foreground">Filed before the approval questions were added.</p>;
  }
  return (
    <dl className="grid gap-x-4 gap-y-1.5 rounded-md border bg-muted/30 p-3 text-sm sm:grid-cols-2">
      {rows.map((r) => (
        <div key={r.label} className="flex justify-between gap-3 sm:block">
          <dt className="text-xs uppercase text-muted-foreground">{r.label}</dt>
          <dd className={r.flag ? "font-semibold text-amber-800" : undefined}>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}
