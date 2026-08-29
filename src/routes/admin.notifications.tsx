import { createFileRoute, Link } from "@tanstack/react-router";
import { AdminShell } from "@/components/AdminShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Megaphone, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/admin/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Super User" },
      { name: "description", content: "Team messaging has moved to the targeted Team Messages composer." },
    ],
  }),
  component: NotificationsAdmin,
});

function NotificationsAdmin() {
  return (
    <AdminShell title="Notifications">
      <Card>
        <CardContent className="flex flex-col items-start gap-4 py-10">
          <Megaphone className="h-8 w-8 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold">Notifications moved to Team Messages</h2>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Announcements are now sent from the Team Messages composer, where you can target riders by role,
              Pelotonia tag, sub-peloton, route or readiness gap, schedule the send, and track who has read it.
            </p>
          </div>
          <Button asChild>
            <Link to="/messages">
              Open Team Messages <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </AdminShell>
  );
}
