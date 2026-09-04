import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MailSearch, RefreshCw } from "lucide-react";
import { AUTH_EMAIL_LABELS, listAuthEmailLog } from "@/lib/auth-email-log.functions";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

/**
 * Super User troubleshooting view: every sign-in / account email the Hub sent,
 * newest first, with the kind of email, who it went to, and when.
 */
export function AuthEmailTimeline() {
  const [search, setSearch] = useState("");
  const [applied, setApplied] = useState("");

  const q = useQuery({
    queryKey: ["auth-email-log", applied],
    queryFn: () => listAuthEmailLog({ data: { email: applied || undefined, limit: 100 } }),
  });

  const rows = q.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MailSearch className="h-4 w-4 text-[var(--brand)]" /> Sign-in email history
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Every code and account email the Hub has sent, newest first. Use this when a colleague says a
          code never arrived.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={search}
            placeholder="Filter by email address…"
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setApplied(search.trim())}
          />
          <Button variant="outline" onClick={() => setApplied(search.trim())}>
            Search
          </Button>
          <Button variant="ghost" size="icon" aria-label="Refresh" onClick={() => q.refetch()}>
            <RefreshCw className={`h-4 w-4 ${q.isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {q.isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No emails recorded yet{applied ? " for that address" : ""}.
          </p>
        ) : (
          <ol className="max-h-96 space-y-2 overflow-y-auto pr-1">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.email}</p>
                  <p className="text-xs text-muted-foreground">{r.subject ?? "—"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{AUTH_EMAIL_LABELS[r.email_type] ?? r.email_type}</Badge>
                  <span className="text-xs text-muted-foreground">{fmt(r.sent_at)}</span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
