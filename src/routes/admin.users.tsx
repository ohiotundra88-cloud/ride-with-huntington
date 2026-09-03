import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/AdminShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ShieldCheck, Trash2, UserPlus } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { listAdmins, grantAdminByEmail, revokeAdmin, type AdminUserRow } from "@/lib/admins.functions";
import { listCaptains, grantCaptainByEmail, revokeCaptain, type CaptainRow } from "@/lib/captains.functions";
import { Flag, Scale, ShieldAlert, BadgeCheck, Megaphone, Crown, Briefcase } from "lucide-react";
import { RoleMembersCard } from "@/components/RoleMembersCard";
import { UserSearchPicker } from "@/components/UserSearchPicker";
import { VendorAccessCard } from "@/components/VendorAccessCard";


export const Route = createFileRoute("/admin/users")({
  component: AdminUsersPage,
  head: () => ({
    meta: [
      { title: "Admins, Super Users & Captains — Team Huntington Hub" },
      { name: "description", content: "Grant or revoke admin access and Captain designations for Team Huntington colleagues." },
    ],
  }),
});

function AdminUsersPage() {
  const qc = useQueryClient();

  const { data: admins = [], isLoading, error } = useQuery<AdminUserRow[]>({
    queryKey: ["admins"],
    queryFn: () => listAdmins(),
  });

  const grant = useMutation({
    mutationFn: (e: string) => grantAdminByEmail({ data: { email: e } }),
    onSuccess: (res) => {
      toast.success(`Granted admin to ${res.email}`);
      qc.invalidateQueries({ queryKey: ["admins"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: (user_id: string) => revokeAdmin({ data: { user_id } }),
    onSuccess: () => {
      toast.success("Admin access revoked");
      qc.invalidateQueries({ queryKey: ["admins"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminShell title="Admins & Super Users" description="Anyone listed here can enter Super User Mode and manage Team Huntington content.">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><UserPlus className="h-4 w-4" /> Grant admin access</CardTitle>
        </CardHeader>
        <CardContent>
          <UserSearchPicker
            id="grant-email"
            label="Add a colleague"
            placeholder="Search by name or email…"
            disabled={grant.isPending}
            onSelect={(u) => grant.mutate(u.email)}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Start typing to search registered colleagues, then click their name to grant admin. New admins can enter Super User Mode from their profile menu.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[var(--brand)]" /> Current admins</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : error ? (
            <p className="text-sm text-destructive">{(error as Error).message}</p>
          ) : admins.length === 0 ? (
            <p className="text-sm text-muted-foreground">No admins yet.</p>
          ) : (
            <ul className="divide-y">
              {admins.map((a) => (
                <li key={a.user_id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{a.full_name || a.email}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {a.email}
                      {a.is_self && <span className="ml-2 rounded bg-[var(--brand)]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--brand-dark)]">YOU</span>}
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        disabled={a.is_self || revoke.isPending}
                        aria-label={`Revoke admin from ${a.email}`}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Revoke
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Revoke admin access?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {a.full_name || a.email} will lose Super User Mode and admin content controls. They will still be able to sign in as a participant.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => revoke.mutate(a.user_id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Revoke
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <CaptainsCard />

      <RoleMembersCard
        role="vendor_captain"
        title="Vendor Captains"
        description="Vendor Captains manage the Vendor CRM: they can view and edit every vendor record, but cannot archive or delete. Each one also needs the vendor dashboard switch turned on below."
        icon={<Briefcase className="h-4 w-4 text-[var(--brand)]" />}
      />

      <VendorAccessCard />

      <ActivationCard />


      <RoleMembersCard
        role="superuser"
        title="Super users"
        description="Super users manage the permanent roster, appoint every review role, and run the end-of-season reset. Manually added colleagues can only be removed by a super user."
        icon={<ShieldCheck className="h-4 w-4 text-[var(--brand)]" />}
      />


      <div className="grid gap-6 lg:grid-cols-2">
        <RoleMembersCard role="legal" title="Legal reviewers" description="Approve the legal stage of fundraiser requests." icon={<Scale className="h-4 w-4 text-[var(--brand)]" />} />
        <RoleMembersCard role="risk" title="Risk reviewers" description="Approve the risk stage of fundraiser requests." icon={<ShieldAlert className="h-4 w-4 text-[var(--brand)]" />} />
        <RoleMembersCard role="compliance" title="Compliance reviewers" description="Approve the compliance stage of fundraiser requests." icon={<BadgeCheck className="h-4 w-4 text-[var(--brand)]" />} />
        <RoleMembersCard role="marketing" title="Marketing reviewers" description="Approve the marketing stage of fundraiser requests." icon={<Megaphone className="h-4 w-4 text-[var(--brand)]" />} />
        <RoleMembersCard role="cochair" title="Co-chairs" description="Final sign-off. Once a co-chair approves, the event publishes to the fundraising calendar." icon={<Crown className="h-4 w-4 text-[var(--brand)]" />} />
      </div>
    </AdminShell>
  );
}

function CaptainsCard() {
  const qc = useQueryClient();

  const { data: captains = [], isLoading, error } = useQuery<CaptainRow[]>({
    queryKey: ["captains"],
    queryFn: () => listCaptains(),
  });

  const grant = useMutation({
    mutationFn: (e: string) => grantCaptainByEmail({ data: { email: e } }),
    onSuccess: (res) => {
      toast.success(`${res.email} can now post fundraising events`);
      qc.invalidateQueries({ queryKey: ["captains"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: (user_id: string) => revokeCaptain({ data: { user_id } }),
    onSuccess: () => {
      toast.success("Captain designation removed");
      qc.invalidateQueries({ queryKey: ["captains"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Flag className="h-4 w-4 text-[var(--brand)]" /> Team Captains
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Captains can post and manage fundraising events on the Events calendar. They can only edit the events they create.
        </p>
        <div className="mt-4">
          <UserSearchPicker
            id="captain-email"
            label="Add a captain"
            placeholder="Search by name or email…"
            disabled={grant.isPending}
            onSelect={(u) => grant.mutate(u.email)}
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Start typing to search registered colleagues, then click their name to make them a captain.
          </p>
        </div>

        <div className="mt-5">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : error ? (
            <p className="text-sm text-destructive">{(error as Error).message}</p>
          ) : captains.length === 0 ? (
            <p className="text-sm text-muted-foreground">No captains designated yet.</p>
          ) : (
            <ul className="divide-y">
              {captains.map((c) => (
                <li key={c.user_id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{c.full_name || c.email}</div>
                    <div className="truncate text-xs text-muted-foreground">{c.email}</div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        disabled={revoke.isPending}
                        aria-label={`Remove captain designation from ${c.email}`}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove captain designation?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {c.full_name || c.email} will no longer be able to post fundraising events. Existing events stay on the calendar.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => revoke.mutate(c.user_id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Remove
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
