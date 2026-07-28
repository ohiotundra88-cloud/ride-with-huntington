import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { seedNotifications, type Notification } from "@/lib/mock-data";

export function NotificationCenter() {
  const [items, setItems] = useState<Notification[]>(seedNotifications);
  const [open, setOpen] = useState(false);
  const unread = useMemo(() => items.filter((i) => !i.read).length, [items]);

  const markOne = (id: string) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, read: true } : i)));
  const markAll = () => setItems((prev) => prev.map((i) => ({ ...i, read: true })));

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
            onClick={markAll}
            disabled={unread === 0}
            className="text-xs h-7"
          >
            <CheckCheck className="mr-1 h-3.5 w-3.5" /> Mark all read
          </Button>
        </div>
        <ul className="max-h-80 overflow-y-auto divide-y">
          {items.map((n) => (
            <li key={n.id}>
              <Link
                to={n.href ?? "/dashboard"}
                onClick={() => {
                  markOne(n.id);
                  setOpen(false);
                }}
                className={`block p-3 hover:bg-muted focus-visible:bg-muted outline-none ${
                  n.read ? "" : "bg-[var(--brand)]/5"
                }`}
              >
                <div className="flex items-start gap-2">
                  {!n.read && (
                    <span
                      aria-hidden="true"
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--brand)]"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{n.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {n.time}
                    </p>
                  </div>
                </div>
                <span className="sr-only">{n.read ? "Read" : "Unread"}</span>
              </Link>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
