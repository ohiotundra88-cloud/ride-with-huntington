import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdmin, type FeatureFlags } from "@/lib/admin-store";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { RotateCcw, Lock, ShieldAlert, Globe } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { setFundraiserPagesEnabled } from "@/lib/site-settings.functions";
import { useSiteSettings, SITE_SETTINGS_KEY } from "@/lib/useSiteSettings";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/flags")({
  head: () => ({ meta: [{ title: "Feature flags & audit — Super User" }, { name: "description", content: "Toggle features and review the audit log." }] }),
  component: FlagsAdmin,
});

const flagDescriptions: Record<keyof FeatureFlags, { label: string; desc: string }> = {
  familyMode: { label: "Family mode", desc: "Family segmented view and family guide." },
  concierge: { label: "Concierge", desc: "Floating help drawer." },
  packingList: { label: "Packing list", desc: "Smart packing list page." },
  teamMetrics: { label: "Team metrics", desc: "Team snapshot page." },
  executiveAnalytics: { label: "Executive analytics", desc: "Admin analytics dashboard." },
  fundraisingProgress: { label: "Fundraising progress", desc: "Progress bars shown to participants." },
  announcements: { label: "Announcements", desc: "Announcement banners." },
  notificationCenter: { label: "Notification center", desc: "Bell menu in nav." },
  dashboardReadiness: { label: "Dashboard readiness", desc: "Readiness ring/cards." },
  dashboardTimeline: { label: "Dashboard timeline", desc: "Journey timeline on dashboard." },
  dashboardQuickActions: { label: "Quick actions", desc: "Dashboard action tiles." },
};

function FlagsAdmin() {
  const { state, setState, audit, resetAll, resetSection } = useAdmin();
  const [q, setQ] = useState("");

  const filteredAudit = useMemo(() => state.audit.filter((a) => !q || [a.entity, a.action, a.detail, a.user].join(" ").toLowerCase().includes(q.toLowerCase())), [state.audit, q]);

  return (
    <AdminShell title="Feature flags · API-managed · Audit"
      description="Toggle features, review API-owned fields, and audit content changes."
    >
      <Tabs defaultValue="flags">
        <TabsList>
          <TabsTrigger value="flags">Feature flags</TabsTrigger>
          <TabsTrigger value="api">API-managed</TabsTrigger>
          <TabsTrigger value="audit">Audit log</TabsTrigger>
          <TabsTrigger value="danger">Danger zone</TabsTrigger>
        </TabsList>

        <TabsContent value="flags" className="mt-4 space-y-4">
          <SiteSwitchesCard />
          <Card><CardContent className="p-4 grid gap-2 sm:grid-cols-2">

            {(Object.keys(state.flags) as (keyof FeatureFlags)[]).map((k) => (
              <label key={k} className="flex items-start justify-between gap-3 rounded-md border p-3">
                <div>
                  <p className="font-semibold text-[var(--brand-dark)]">{flagDescriptions[k].label}</p>
                  <p className="text-xs text-muted-foreground">{flagDescriptions[k].desc}</p>
                </div>
                <Switch checked={state.flags[k]} onCheckedChange={(v) => { setState((s) => ({ ...s, flags: { ...s.flags, [k]: v } })); audit({ action: "toggle", entity: "FeatureFlag", entityId: k, detail: `${k}=${v}` }); }} />
              </label>
            ))}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="api" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Lock className="h-4 w-4" /> Fields owned by external systems</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Key</TableHead><TableHead>Label</TableHead><TableHead>Source</TableHead><TableHead>Last sync</TableHead></TableRow></TableHeader>
                <TableBody>
                  {state.apiManaged.map((f) => (
                    <TableRow key={f.key}>
                      <TableCell className="font-mono text-xs">{f.key}</TableCell>
                      <TableCell>{f.label}</TableCell>
                      <TableCell><Badge variant="outline">{f.source}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{f.lastSync}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-4 space-y-3">
          <Input placeholder="Search audit log…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>When</TableHead><TableHead>User</TableHead><TableHead>Action</TableHead><TableHead>Entity</TableHead><TableHead>Detail</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredAudit.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No entries</TableCell></TableRow>}
                {filteredAudit.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs whitespace-nowrap">{new Date(a.at).toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{a.user}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] uppercase">{a.action}</Badge></TableCell>
                    <TableCell className="text-xs">{a.entity}{a.entityId ? ` · ${a.entityId}` : ""}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-md truncate">{a.detail}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="danger" className="mt-4">
          <Card className="border-red-300">
            <CardHeader><CardTitle className="flex items-center gap-2 text-base text-red-700"><ShieldAlert className="h-4 w-4" /> Danger zone</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><p className="font-semibold">Reset all admin content</p><p className="text-xs text-muted-foreground">Restores every content section to seed defaults. Feature flags reset too.</p></div>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="destructive"><RotateCcw className="mr-1 h-4 w-4" /> Reset all</Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Reset all content?</AlertDialogTitle><AlertDialogDescription>Every edited announcement, goal, timeline, notification, etc. is wiped. This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => { resetAll(); toast.success("All content reset"); }} className="bg-red-600 hover:bg-red-700">Reset everything</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><p className="font-semibold">Clear audit log</p><p className="text-xs text-muted-foreground">Removes the entire change history.</p></div>
                <Button variant="outline" onClick={() => { resetSection("audit"); toast.success("Audit log cleared"); }}>Clear log</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminShell>
  );
}

/**
 * Server-side site switch: pauses the public fundraiser donate/sign-up pages
 * for everyone. Fundraiser requests and the approval flow are unaffected.
 */
function SiteSwitchesCard() {
  const { audit } = useAdmin();
  const qc = useQueryClient();
  const { settings, isPending } = useSiteSettings();
  const save = useMutation({
    mutationFn: (enabled: boolean) => setFundraiserPagesEnabled({ data: { enabled } }),
    onSuccess: (res) => {
      qc.setQueryData(SITE_SETTINGS_KEY, res);
      qc.invalidateQueries({ queryKey: SITE_SETTINGS_KEY });
      audit({
        action: "toggle",
        entity: "SiteSwitch",
        entityId: "fundraiserPages",
        detail: `fundraiserPages=${res.fundraiserPagesEnabled}`,
      });
      toast.success(res.fundraiserPagesEnabled ? "Fundraiser pages are live" : "Fundraiser pages paused");
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not change that switch"),
  });

  const saveVendor = useMutation({
    mutationFn: (enabled: boolean) => setVendorCrmEnabled({ data: { enabled } }),
    onSuccess: (res) => {
      qc.setQueryData(SITE_SETTINGS_KEY, res);
      qc.invalidateQueries({ queryKey: SITE_SETTINGS_KEY });
      qc.invalidateQueries({ queryKey: ["vendor-access"] });
      audit({
        action: "toggle",
        entity: "SiteSwitch",
        entityId: "vendorCrm",
        detail: `vendorCrm=${res.vendorCrmEnabled}`,
      });
      toast.success(res.vendorCrmEnabled ? "Vendor CRM is live" : "Vendor CRM paused");
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not change that switch"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Globe className="h-4 w-4" /> Site switches (apply to everyone)
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 p-4 pt-0">
        <label className="flex items-start justify-between gap-3 rounded-md border p-3">
          <div>
            <p className="font-semibold text-[var(--brand-dark)]">Fundraiser pages</p>
            <p className="text-xs text-muted-foreground">
              Public donate and sign-up pages, plus My Fundraisers. Switching this off pauses donations
              site-wide and hides the pages — fundraiser requests and the approval flow keep working, and
              no pages or history are deleted.
            </p>
          </div>
          <Switch
            checked={settings.fundraiserPagesEnabled}
            disabled={isPending || save.isPending}
            onCheckedChange={(v) => save.mutate(v)}
          />
        </label>

        <label className="flex items-start justify-between gap-3 rounded-md border p-3">
          <div>
            <p className="font-semibold text-[var(--brand-dark)]">Vendor CRM</p>
            <p className="text-xs text-muted-foreground">
              Vendor relationship tracking, spend, and donations. Switching this off hides the tool from
              everyone except Super Users; no vendor records are deleted.
            </p>
          </div>
          <Switch
            checked={settings.vendorCrmEnabled}
            disabled={isPending || saveVendor.isPending}
            onCheckedChange={(v) => saveVendor.mutate(v)}
          />
        </label>
      </CardContent>
    </Card>

  );
}
