import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  listRoleMembers, grantRoleByEmail, revokeRoleFromUser, type RoleMemberRow,
} from "@/lib/roles-manage.functions";
import type { ManageableRole } from "@/lib/roles.shared";

export function RoleMembersCard({
  role,
  title,
  description,
  icon,
}: {
  role: ManageableRole;
  title: string;
  description: string;
  icon?: React.ReactNode;
}) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");

  const { data: members = [], isLoading, error } = useQuery<RoleMemberRow[]>({
    queryKey: ["role-members", role],
    queryFn: () => listRoleMembers({ data: { role } }),
  });

  const grant = useMutation({
    mutationFn: (e: string) => grantRoleByEmail({ data: { role, email: e } }),
    onSuccess: (res) => {
      toast.success(`${res.email} added to ${title}`);
      setEmail("");
      qc.invalidateQueries({ queryKey: ["role-members", role] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: (user_id: string) => revokeRoleFromUser({ data: { role, user_id } }),
    onSuccess: () => {
      toast.success("Designation removed");
      qc.invalidateQueries({ queryKey: ["role-members", role] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">{icon} {title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
        <form
          onSubmit={(ev) => {
            ev.preventDefault();
            const v = email.trim();
            if (v) grant.mutate(v);
          }}
          className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
        >
          <div className="space-y-1.5">
            <Label htmlFor={`role-email-${role}`}>Huntington email</Label>
            <Input
              id={`role-email-${role}`}
              type="email"
              placeholder="colleague@huntington.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={grant.isPending} className="bg-[var(--brand-dark)] hover:bg-[var(--brand-dark)]/90 text-white">
            {grant.isPending ? "Adding…" : "Add"}
          </Button>
        </form>

        <div className="mt-5">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : error ? (
            <p className="text-sm text-destructive">{(error as Error).message}</p>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nobody appointed yet.</p>
          ) : (
            <ul className="divide-y">
              {members.map((m) => (
                <li key={m.user_id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{m.full_name || m.email}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {m.email}
                      {m.is_self && (
                        <span className="ml-2 rounded bg-[var(--brand)]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--brand-dark)]">YOU</span>
                      )}
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        disabled={revoke.isPending || (role === "superuser" && m.is_self)}
                        aria-label={`Remove ${title} from ${m.email}`}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove this designation?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {m.full_name || m.email} will no longer act as {title}. Their participant account stays intact.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => revoke.mutate(m.user_id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
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
