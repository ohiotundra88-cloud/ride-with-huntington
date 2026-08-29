import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Inbox as InboxIcon, CheckCheck, ExternalLink } from "lucide-react";
import { listMyMessages, updateMyMessageState } from "@/lib/messages.functions";
import type { InboxMessage } from "@/lib/messages.shared";

export const Route = createFileRoute("/inbox")({
  head: () => ({
    meta: [
      { title: "My Inbox — Team Huntington" },
      { name: "description", content: "Team updates, deadlines and reminders sent to you by Team Huntington captains." },
      { property: "og:title", content: "My Inbox — Team Huntington" },
      { property: "og:description", content: "Your Team Huntington updates, deadlines and reminders in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InboxPage,
});

export function priorityBadge(priority: InboxMessage["priority"]) {
  if (priority === "urgent") return <Badge className="bg-red-600 text-white">Urgent</Badge>;
  if (priority === "important") return <Badge className="bg-amber-500 text-black">Important</Badge>;
  return null;
}

function InboxPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"unread" | "all">("all");

  const { data = [], isLoading } = useQuery({ queryKey: ["my-messages"], queryFn: () => listMyMessages(), retry: false });

  const updateState = useServerFn(updateMyMessageState);
  const mark = useMutation({
    mutationFn: (vars: { id: string; read?: boolean; dismissed?: boolean }) => updateState({ data: vars }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-messages"] }),
  });

  const visible = useMemo(
    () => data.filter((m) => !m.dismissedAt && (filter === "all" || !m.readAt)),
    [data, filter],
  );
  const unread = data.filter((m) => !m.readAt && !m.dismissedAt).length;

  return (
    <>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">My inbox</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {unread > 0 ? `${unread} unread update${unread === 1 ? "" : "s"}` : "You're all caught up."}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>All</Button>
            <Button variant={filter === "unread" ? "default" : "outline"} size="sm" onClick={() => setFilter("unread")}>Unread</Button>
          </div>
        </header>

        {isLoading ? (
          <div className="py-16 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : visible.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
              <InboxIcon className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nothing here yet. Team updates will show up on this page.</p>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {visible.map((m) => (
              <li key={m.id}>
                <Card className={m.readAt ? "" : "border-[var(--brand)]/40 bg-[var(--brand)]/5"}>
                  <CardContent className="space-y-3 py-5">
                    <div className="flex flex-wrap items-center gap-2">
                      {priorityBadge(m.priority)}
                      <Badge variant="outline" className="capitalize text-[10px]">{m.category}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {m.sentAt ? new Date(m.sentAt).toLocaleString() : ""}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold leading-snug">{m.title}</h2>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">{m.body}</p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {m.ctaLabel && m.ctaHref && (
                        m.ctaHref.startsWith("http") ? (
                          <Button asChild size="sm">
                            <a href={m.ctaHref} target="_blank" rel="noreferrer">
                              {m.ctaLabel} <ExternalLink className="ml-1 h-3.5 w-3.5" />
                            </a>
                          </Button>
                        ) : (
                          <Button asChild size="sm">
                            <Link to={m.ctaHref as never}>{m.ctaLabel}</Link>
                          </Button>
                        )
                      )}
                      {!m.readAt && (
                        <Button size="sm" variant="outline" onClick={() => mark.mutate({ id: m.id, read: true })}>
                          <CheckCheck className="mr-1 h-3.5 w-3.5" /> Mark read
                        </Button>
                      )}
                      <Button size="sm" variant="ghost"
                        onClick={() => mark.mutate({ id: m.id, read: true, dismissed: true })}>
                        Dismiss
                      </Button>
                      {m.fromEmail && (
                        <span className="ml-auto text-[11px] text-muted-foreground">from {m.fromEmail}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
