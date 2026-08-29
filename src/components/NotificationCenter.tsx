import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useStore } from "@/lib/store";
import { listMyMessages, updateMyMessageState } from "@/lib/messages.functions";

export function NotificationCenter() {
  const { user } = useStore();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data = [] } = useQuery({
    queryKey: ["my-messages"],
    queryFn: () => listMyMessages(),
    enabled: user.signedIn,
    retry: false,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });

  const items = useMemo(() => data.filter((m) => !m.dismissedAt).slice(0, 20), [data]);
  const unread = useMemo(() => items.filter((m) => !m.readAt).length, [items]);

  const updateState = useServerFn(updateMyMessageState);
  const mark = useMutation({
    mutationFn: (id: string) => updateState({ data: { id, read: true } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-messages"] }),
  });
  const markAll = useMutation({
    mutationFn: async () => {
      for (const m of items.filter((i) => !i.readAt)) {
        await updateState({ data: { id: m.id, read: true } });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-messages"] }),
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
          className="relative text-white hover:bg-white/10"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span
              aria-hidden="true"
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-[var(--brand)] text-[var(--brand-foreground)] text-[10px] font-bold grid place-items-center px-1"
            >
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b p-3">
          <p className="text-sm font-semibold">Notifications</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAll.mutate()}
            disabled={unread === 0 || markAll.isPending}
            className="text-xs h-7"
          >
            <CheckCheck className="mr-1 h-3.5 w-3.5" /> Mark all read
          </Button>
        </div>
        <ul className="max-h-80 overflow-y-auto divide-y">
          {items.length === 0 && (
            <li className="p-4 text-center text-sm text-muted-foreground">No notifications.</li>
          )}
          {items.map((n) => (
            <li key={n.id}>
              <Link
                to="/inbox"
                onClick={() => { if (!n.readAt) mark.mutate(n.id); setOpen(false); }}
                className={`block p-3 hover:bg-muted focus-visible:bg-muted outline-none ${n.readAt ? "" : "bg-[var(--brand)]/5"}`}
              >
                <div className="flex items-start gap-2">
                  {!n.readAt && <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--brand)]" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate flex items-center gap-1">
                      {n.priority === "urgent" && <span className="rounded bg-red-600 text-white text-[9px] font-bold uppercase px-1 py-0.5">Urgent</span>}
                      {n.priority === "important" && <span className="rounded bg-amber-500 text-black text-[9px] font-bold uppercase px-1 py-0.5">Important</span>}
                      {n.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{n.category}</p>
                  </div>
                </div>
                <span className="sr-only">{n.readAt ? "Read" : "Unread"}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="border-t p-2">
          <Button asChild variant="ghost" size="sm" className="w-full text-xs" onClick={() => setOpen(false)}>
            <Link to="/inbox">View all messages</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
