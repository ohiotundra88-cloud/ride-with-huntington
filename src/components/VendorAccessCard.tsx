import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Briefcase, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { listVendorCaptainAccess, setVendorDashboardAccess, type VendorCaptainRow } from "@/lib/vendors.functions";

/**
 * Super-user-only control for the `has_vendor_dashboard_access` flag on
 * Vendor Captain profiles. The server function re-checks super user status,
 * so a non-super-user seeing this card still cannot change anything.
 */
export function VendorAccessCard() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const { data: rows = [], isPending, error } = useQuery<VendorCaptainRow[]>({
    queryKey: ["vendor-captain-access"],
    queryFn: () => listVendorCaptainAccess(),
    retry: false,
  });

  const toggle = useMutation({
    mutationFn: (p: { user_id: string; value: boolean }) => setVendorDashboardAccess({ data: p }),
    onSuccess: (_r, p) => {
      toast.success(p.value ? "Vendor dashboard access granted" : "Vendor dashboard access removed");
      qc.invalidateQueries({ queryKey: ["vendor-captain-access"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(
    () =>
      rows.filter((r) =>
        !q ? true : `${r.full_name ?? ""} ${r.email}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [rows, q],
  );

  if (error) return null;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-[var(--brand)]" /> Vendor dashboard access
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Vendor Captains only reach the Vendor CRM when this switch is on. Co-chairs and super users
          always have access. Only super users can change these switches.
        </p>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search vendor captains" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        {isPending ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No vendor captains found. Add the Vendor Captain designation below first.
          </p>
        ) : (
          <ul className="divide-y">
            {filtered.map((r) => (
              <li key={r.user_id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{r.full_name || r.email}</div>
                  <div className="truncate text-xs text-muted-foreground">{r.email}</div>
                </div>
                <Switch
                  checked={r.has_access}
                  disabled={toggle.isPending}
                  aria-label={`Toggle vendor dashboard access for ${r.email}`}
                  onCheckedChange={(v) => toggle.mutate({ user_id: r.user_id, value: v })}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
