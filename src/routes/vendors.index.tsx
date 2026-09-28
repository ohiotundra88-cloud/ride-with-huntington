import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { BarChart3, Download, Plus, Search, Building2, Award } from "lucide-react";
import { KidsSupporterBadge, VendorTierBadge } from "@/components/VendorTierBadge";
import { VendorGate, useVendorAccess } from "@/components/VendorGate";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listVendorRecords } from "@/lib/vendors.functions";
import {
  BEYOND_YEAR,
  BUSINESS_SEGMENTS,
  DEFAULT_YEARS,
  HIGH_SPEND_THRESHOLD,
  VENDOR_STATUSES,
  VENDOR_TIERS,
  currency,
  currentRideYear,
  isKidsSupporter,
  isOpportunity,
  percent,
  rollup,
  tierFor,
  yearLabel,
  type VendorListRow,
} from "@/lib/vendors.shared";

export const Route = createFileRoute("/vendors/")({
  component: () => (
    <VendorGate>
      <VendorDashboard />
    </VendorGate>
  ),

  head: () => ({
    meta: [
      { title: "Vendor CRM — Team Huntington Hub" },
      {
        name: "description",
        content: "Track Team Huntington vendor relationships, spend, commitments, and donations.",
      },
      { property: "og:title", content: "Vendor CRM — Team Huntington Hub" },
      {
        property: "og:description",
        content: "Vendor relationships, spend, and donation tracking for Team Huntington.",
      },
    ],
  }),
});

type SortKey =
  | "name"
  | "status"
  | "segment"
  | "modified"
  | "spend_desc"
  | "donated_desc"
  | "support_desc"
  | "support_asc"
  | "tier";

const TIER_YEARS = DEFAULT_YEARS.filter((y) => y !== BEYOND_YEAR);

function VendorDashboard() {
  const { data: access } = useVendorAccess();
  const [tab, setTab] = useState<"active" | "archived">("active");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [segment, setSegment] = useState("all");
  const [year, setYear] = useState("all");
  const [sort, setSort] = useState<SortKey>("name");
  const [opportunityOnly, setOpportunityOnly] = useState(false);
  const [dashYear, setDashYear] = useState(String(currentRideYear()));
  // Sponsorship tiers are earned per year; badges and tier sorting use this year.
  const [tierYear, setTierYear] = useState(currentRideYear());
  const [tierFilter, setTierFilter] = useState("all");

  const {
    data: vendors = [],
    isPending,
    error,
  } = useQuery<VendorListRow[]>({
    queryKey: ["vendors", tab],
    queryFn: () => listVendorRecords({ data: { archived: tab === "archived" } }),
  });

  const filtered = useMemo(() => {
    let rows = vendors.filter((v) => {
      if (q && !v.business_name.toLowerCase().includes(q.toLowerCase())) return false;
      if (status !== "all" && v.status !== status) return false;
      if (
        segment !== "all" &&
        v.business_segment !== segment &&
        v.internal_business_segment !== segment
      )
        return false;
      if (year !== "all" && !v.years.includes(Number(year))) return false;
      if (opportunityOnly && !isOpportunity(v.rollup)) return false;
      if (tierFilter !== "all") {
        const t = tierFor(v.year_totals, tierYear);
        if (
          tierFilter === "kids"
            ? !isKidsSupporter(v.year_totals, tierYear)
            : tierFilter === "none"
              ? !!t
              : t?.key !== tierFilter
        )
          return false;
      }
      return true;
    });
    const by: Record<SortKey, (a: VendorListRow, b: VendorListRow) => number> = {
      name: (a, b) => a.business_name.localeCompare(b.business_name),
      status: (a, b) => a.status.localeCompare(b.status),
      segment: (a, b) => (a.business_segment ?? "").localeCompare(b.business_segment ?? ""),
      modified: (a, b) => b.updated_at.localeCompare(a.updated_at),
      spend_desc: (a, b) => b.rollup.total_spend - a.rollup.total_spend,
      donated_desc: (a, b) => b.rollup.total_donated - a.rollup.total_donated,
      support_desc: (a, b) => (b.rollup.support_rate ?? -1) - (a.rollup.support_rate ?? -1),
      support_asc: (a, b) => (a.rollup.support_rate ?? 99) - (b.rollup.support_rate ?? 99),
      tier: (a, b) =>
        (tierFor(b.year_totals, tierYear)?.rank ?? 0) -
          (tierFor(a.year_totals, tierYear)?.rank ?? 0) ||
        (b.year_totals[tierYear]?.total ?? 0) - (a.year_totals[tierYear]?.total ?? 0) ||
        a.business_name.localeCompare(b.business_name),
    };
    return [...rows].sort(by[sort]);
  }, [vendors, q, status, segment, year, sort, opportunityOnly, tierFilter, tierYear]);

  const exportCsv = () => {
    const head = [
      "Business Name",
      `Tier (${tierYear})`,
      `Contribution ${tierYear}`,
      `Pelotonia Kids ${tierYear}`,
      "Status",
      "Business Segment",
      "Internal Segment",
      "Relationship Owner",
      "Total Spend",
      "Total Committed",
      "Total Donated",
      "Outstanding",
      "Fulfillment %",
      "Support Rate %",
      "Years With Activity",
      "Last Modified",
      "Last Modified By",
    ];
    const rows = filtered.map((v) => [
      v.business_name,
      tierFor(v.year_totals, tierYear)?.label ?? "",
      v.year_totals[tierYear]?.total ?? 0,
      v.year_totals[tierYear]?.kids ?? 0,
      v.status,
      v.business_segment ?? "",
      v.internal_business_segment ?? "",
      v.relationship_owner ?? "",
      v.rollup.total_spend,
      v.rollup.total_committed,
      v.rollup.total_donated,
      v.rollup.outstanding,
      v.rollup.fulfillment === null ? "" : Math.round(v.rollup.fulfillment * 100),
      v.rollup.support_rate === null ? "" : Math.round(v.rollup.support_rate * 100),
      v.years.map(yearLabel).join(" / "),
      new Date(v.updated_at).toLocaleString(),
      v.updated_by_name ?? "",
    ]);
    const csv = [head, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `vendor-crm-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--brand-dark)]">Vendor CRM</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Team Huntington vendor relationships, spend, and donation commitments.
          </p>
        </div>
        <Button
          asChild
          className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90"
        >
          <Link to="/vendors/new">
            <Plus className="mr-1.5 h-4 w-4" /> New vendor
          </Link>
        </Button>
      </div>

      <ExecutiveSummary
        vendors={vendors}
        year={dashYear}
        setYear={setDashYear}
        onOpportunity={() => setOpportunityOnly(true)}
      />

      <TierSummary
        vendors={vendors}
        year={tierYear}
        setYear={setTierYear}
        active={tierFilter}
        onPick={(key) => {
          setTierFilter((cur) => (cur === key ? "all" : key));
          setSort("tier");
        }}
      />

      <Card className="mt-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[var(--brand)]" /> Vendors
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList>
              <TabsTrigger value="active">Active list</TabsTrigger>
              <TabsTrigger value="archived" disabled={!access?.canArchive}>
                Archived
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative sm:col-span-2">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search business name"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {VENDOR_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={segment} onValueChange={setSegment}>
              <SelectTrigger>
                <SelectValue placeholder="Segment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All segments</SelectItem>
                {BUSINESS_SEGMENTS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger>
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any year</SelectItem>
                {DEFAULT_YEARS.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {yearLabel(y)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tier">Sort: Sponsorship tier ({tierYear})</SelectItem>
                <SelectItem value="name">Sort: Business name</SelectItem>
                <SelectItem value="status">Sort: Status</SelectItem>
                <SelectItem value="segment">Sort: Business segment</SelectItem>
                <SelectItem value="modified">Sort: Last modified</SelectItem>
                <SelectItem value="spend_desc">Sort: Highest Huntington spend</SelectItem>
                <SelectItem value="donated_desc">Sort: Highest donation</SelectItem>
                <SelectItem value="support_desc">Sort: Highest support rate</SelectItem>
                <SelectItem value="support_asc">Sort: Lowest support rate</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-52" aria-label="Filter by tier">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tiers</SelectItem>
                {VENDOR_TIERS.map((t) => (
                  <SelectItem key={t.key} value={t.key}>
                    {t.label}
                  </SelectItem>
                ))}
                <SelectItem value="kids">Pelotonia Kids Supporters</SelectItem>
                <SelectItem value="none">No tier yet</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={opportunityOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setOpportunityOnly((v) => !v)}
            >
              High spend, no donation
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
            </Button>
          </div>

          {isPending ? (
            <p className="text-sm text-muted-foreground">Loading vendors…</p>
          ) : error ? (
            <p className="text-sm text-destructive">{(error as Error).message}</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No vendors match these filters.</p>
          ) : (
            <ul className="divide-y">
              {filtered.map((v) => (
                <li key={v.id} className="py-3">
                  <Link
                    to="/vendors/$id"
                    params={{ id: v.id }}
                    className="block rounded-md px-1 hover:bg-muted/50"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-semibold text-[var(--brand-dark)]">
                            {v.business_name}
                          </span>
                          <VendorTierBadge
                            tier={tierFor(v.year_totals, tierYear)}
                            year={tierYear}
                          />
                          <KidsSupporterBadge
                            show={isKidsSupporter(v.year_totals, tierYear)}
                            year={tierYear}
                          />
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase">
                            {v.status}
                          </span>
                          {isOpportunity(v.rollup) && (
                            <span className="rounded-full bg-[var(--brand)]/20 px-2 py-0.5 text-[10px] font-semibold text-[var(--brand-dark)]">
                              Opportunity
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {v.business_segment || "No segment"} · Owner {v.relationship_owner || "—"}{" "}
                          · Updated {new Date(v.updated_at).toLocaleDateString()}{" "}
                          {v.updated_by_name ? `by ${v.updated_by_name}` : ""}
                        </p>
                      </div>
                      <div className="flex gap-4 text-right text-xs">
                        <div>
                          <div className="text-muted-foreground">Spend</div>
                          <div className="font-semibold">{currency(v.rollup.total_spend)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Donated</div>
                          <div className="font-semibold">{currency(v.rollup.total_donated)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Support</div>
                          <div className="font-semibold">{percent(v.rollup.support_rate)}</div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function ExecutiveSummary({
  vendors,
  year,
  setYear,
  onOpportunity,
}: {
  vendors: VendorListRow[];
  year: string;
  setYear: (v: string) => void;
  onOpportunity: () => void;
}) {
  const scoped = year === "all" ? vendors : vendors.filter((v) => v.years.includes(Number(year)));
  const totals = rollup(
    scoped.map((v) => ({ amount: v.rollup.total_spend })),
    scoped.map((v) => ({
      committed_amount: v.rollup.total_committed,
      actual_donated_amount: v.rollup.total_donated,
    })),
  );
  const activeCount = scoped.filter((v) => v.status === "Active").length;
  const donatingCount = scoped.filter((v) => v.rollup.total_donated > 0).length;
  const opportunities = scoped.filter((v) => isOpportunity(v.rollup)).length;

  const stat = (label: string, value: string) => (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-bold text-[var(--brand-dark)]">{value}</div>
    </div>
  );

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-[var(--brand)]" /> Executive summary
        </CardTitle>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All years</SelectItem>
            {DEFAULT_YEARS.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {yearLabel(y)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {stat("Total vendor spend", currency(totals.total_spend))}
        {stat("Donations received", currency(totals.total_donated))}
        {stat("Total commitments", currency(totals.total_committed))}
        {stat("Outstanding commitments", currency(totals.outstanding))}
        {stat("Donation-to-spend ratio", percent(totals.support_rate))}
        {stat("Active vendors", String(activeCount))}
        {stat("Donating vendors", String(donatingCount))}
        <button
          type="button"
          onClick={onOpportunity}
          className="rounded-lg border bg-card p-3 text-left transition hover:border-[var(--brand)]"
        >
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Spend but no donation
          </div>
          <div className="mt-1 text-lg font-bold text-[var(--brand-dark)]">{opportunities}</div>
          <div className="text-[11px] text-[var(--brand-dark)] underline">
            View opportunity list (spend ≥ {currency(HIGH_SPEND_THRESHOLD)})
          </div>
        </button>
      </CardContent>
    </Card>
  );
}

function TierSummary({
  vendors,
  year,
  setYear,
  active,
  onPick,
}: {
  vendors: VendorListRow[];
  year: number;
  setYear: (y: number) => void;
  active: string;
  onPick: (key: string) => void;
}) {
  const count = (key: string) =>
    vendors.filter((v) =>
      key === "kids"
        ? isKidsSupporter(v.year_totals, year)
        : tierFor(v.year_totals, year)?.key === key,
    ).length;
  const tile = (key: string, label: string, detail: string) => (
    <button
      key={key}
      type="button"
      onClick={() => onPick(key)}
      aria-pressed={active === key}
      className={`rounded-lg border bg-card p-3 text-left transition hover:border-[var(--brand)] ${active === key ? "border-[var(--brand)] ring-1 ring-[var(--brand)]" : ""}`}
    >
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-bold text-[var(--brand-dark)]">{count(key)}</div>
      <div className="text-[11px] text-muted-foreground">{detail}</div>
    </button>
  );
  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Award className="h-4 w-4 text-[var(--brand)]" /> Sponsorship tiers
        </CardTitle>
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-36" aria-label="Tier year">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIER_YEARS.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {VENDOR_TIERS.map((t) =>
          tile(
            t.key,
            t.label,
            `${currency(t.min)}${t.key === "pinnacle" ? "+" : ` to ${currency((VENDOR_TIERS[VENDOR_TIERS.indexOf(t) - 1]?.min ?? 0) - 1)}`}`,
          ),
        )}
        {tile("kids", "Pelotonia Kids", "gave to Pelotonia Kids")}
      </CardContent>
      <p className="px-6 pb-4 text-[11px] text-muted-foreground">
        A vendor's tier is its {year} contribution: the larger of what it committed or gave, plus
        Pelotonia Kids donations. Tap a tier to list those vendors.
      </p>
    </Card>
  );
}
