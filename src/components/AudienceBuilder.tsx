import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Search, X } from "lucide-react";
import {
  LEADERSHIP_ONLY_ROLES,
  PARTICIPATION_OPTIONS,
  PELOTONIA_FLAGS,
  READINESS_GAPS,
  ROLE_LABELS,
  TARGETABLE_ROLES,
  type AudienceRules,
} from "@/lib/messages.shared";
import { getAudienceOptions, listRosterPeople } from "@/lib/messages.functions";
import { REGIONS } from "@/lib/regions.shared";

function ChipGroup({
  options,
  selected,
  onToggle,
  disabledOptions = [],
}: {
  options: { key: string; label: string }[];
  selected: string[];
  onToggle: (key: string) => void;
  disabledOptions?: string[];
}) {
  if (!options.length) return <p className="text-xs text-muted-foreground">No options available.</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = selected.includes(o.key);
        const disabled = disabledOptions.includes(o.key);
        return (
          <button
            key={o.key}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(o.key)}
            className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
              on
                ? "border-[var(--brand)] bg-[var(--brand)] text-[var(--brand-foreground)]"
                : disabled
                  ? "cursor-not-allowed border-dashed text-muted-foreground/50"
                  : "hover:border-[var(--brand)] hover:text-[var(--brand-dark)]"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The shared role / tag / readiness targeting controls used by team messaging
 * and team events, so both surfaces resolve audiences identically.
 */
export function AudienceBuilder({
  value,
  onChange,
  canTargetLeadership,
  enabled = true,
}: {
  value: AudienceRules;
  onChange: (next: AudienceRules) => void;
  canTargetLeadership: boolean;
  enabled?: boolean;
}) {
  const [personQuery, setPersonQuery] = useState("");

  const options = useQuery({
    queryKey: ["audience-options"],
    queryFn: () => getAudienceOptions(),
    enabled,
    staleTime: 5 * 60_000,
  });
  const roster = useQuery({
    queryKey: ["roster-people"],
    queryFn: () => listRosterPeople(),
    enabled,
    staleTime: 5 * 60_000,
  });

  const toggle = (facet: keyof AudienceRules, key: string) => {
    const list = value[facet] as string[];
    onChange({
      ...value,
      [facet]: list.includes(key) ? list.filter((x) => x !== key) : [...list, key],
    });
  };

  const matchingPeople = useMemo(() => {
    const needle = personQuery.trim().toLowerCase();
    if (!needle) return [];
    return (roster.data ?? [])
      .filter((p) => p.name.toLowerCase().includes(needle) || p.email.toLowerCase().includes(needle))
      .slice(0, 8);
  }, [roster.data, personQuery]);

  const nameFor = (userId: string) =>
    (roster.data ?? []).find((p) => p.userId === userId)?.name ?? userId.slice(0, 8);

  const allOn = value.allParticipants;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="space-y-0.5">
          <Label htmlFor="all-participants" className="text-sm font-medium">
            All Team Huntington Participants
          </Label>
          <p className="text-xs text-muted-foreground">
            Invite everyone on the roster. Turn off to target by role, region, participation, and more.
          </p>
        </div>
        <Switch
          id="all-participants"
          checked={allOn}
          onCheckedChange={(checked) =>
            onChange({
              ...value,
              allParticipants: checked,
              ...(checked ? {
                  roles: [],
                  regions: [],
                  participation: [],
                  tags: [],
                  subPelotons: [],
                  routes: [],
                  flags: [],
                  gaps: [],
                  raisedBelow: null,
                }
                : {}),
            })
          }
        />
      </div>

      <div className={allOn ? "pointer-events-none opacity-50" : ""}>
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">App roles</Label>
          <ChipGroup
            options={TARGETABLE_ROLES.map((r) => ({ key: r, label: ROLE_LABELS[r] ?? r }))}
            selected={value.roles}
            onToggle={(k) => toggle("roles", k)}
            disabledOptions={canTargetLeadership ? [] : LEADERSHIP_ONLY_ROLES}
          />
          {!canTargetLeadership && (
            <p className="text-xs text-muted-foreground">
              Leadership roles can only be targeted by co-chairs and super users.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Regions</Label>
          <ChipGroup
            options={REGIONS.map((r) => ({ key: r, label: r }))}
            selected={value.regions}
            onToggle={(k) => toggle("regions", k)}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Participation</Label>
          <ChipGroup
            options={PARTICIPATION_OPTIONS.map((p) => ({ key: p, label: p }))}
            selected={value.participation}
            onToggle={(k) => toggle("participation", k)}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Pelotonia status</Label>
          <ChipGroup
            options={PELOTONIA_FLAGS.map((f) => ({ key: f.key, label: f.label }))}
            selected={value.flags}
            onToggle={(k) => toggle("flags", k)}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Rider tags</Label>
          <ChipGroup
            options={(options.data?.tags ?? []).map((t) => ({ key: t, label: t }))}
            selected={value.tags}
            onToggle={(k) => toggle("tags", k)}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Sub-peloton</Label>
            <ChipGroup
              options={(options.data?.subPelotons ?? []).map((t) => ({ key: t, label: t }))}
              selected={value.subPelotons}
              onToggle={(k) => toggle("subPelotons", k)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Ride route</Label>
            <ChipGroup
              options={(options.data?.routes ?? []).map((t) => ({ key: t, label: t }))}
              selected={value.routes}
              onToggle={(k) => toggle("routes", k)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Readiness gaps</Label>
          <ChipGroup
            options={READINESS_GAPS.map((g) => ({ key: g.key, label: g.label }))}
            selected={value.gaps}
            onToggle={(k) => toggle("gaps", k)}
          />
          {value.gaps.includes("below_goal") && (
            <div className="flex items-center gap-2 pt-1">
              <Label htmlFor="a-below" className="text-xs">Raised less than</Label>
              <Input
                id="a-below"
                type="number"
                min={0}
                className="h-8 w-32"
                value={value.raisedBelow ?? ""}
                onChange={(e) =>
                  onChange({
                    ...value,
                    raisedBelow: e.target.value === "" ? null : Math.max(0, Number(e.target.value)),
                  })
                }
              />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2 border-t pt-4">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Individuals</Label>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search a name or email to add or exclude"
            value={personQuery}
            onChange={(e) => setPersonQuery(e.target.value)}
          />
        </div>
        {matchingPeople.length > 0 && (
          <div className="divide-y rounded-md border">
            {matchingPeople.map((p) => (
              <div key={p.userId} className="flex items-center justify-between gap-2 p-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.email}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => {
                      toggle("includeUserIds", p.userId);
                      setPersonQuery("");
                    }}
                  >
                    Always include
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => {
                      toggle("excludeUserIds", p.userId);
                      setPersonQuery("");
                    }}
                  >
                    Exclude
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        {(value.includeUserIds.length > 0 || value.excludeUserIds.length > 0) && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {value.includeUserIds.map((id) => (
              <Badge key={`i-${id}`} className="gap-1 bg-emerald-100 text-emerald-900">
                +{nameFor(id)}
                <button type="button" onClick={() => toggle("includeUserIds", id)} aria-label="Remove">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {value.excludeUserIds.map((id) => (
              <Badge key={`e-${id}`} variant="outline" className="gap-1">
                −{nameFor(id)}
                <button type="button" onClick={() => toggle("excludeUserIds", id)} aria-label="Remove">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
