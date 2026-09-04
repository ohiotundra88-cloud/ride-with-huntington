import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { WifiOff } from "lucide-react";

const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/**
 * Silent connectivity probe. If this network (VPN / web filter) blocks the
 * same-origin backend path, show a slim inline notice instead of letting
 * pages appear broken or empty.
 */
export function NetworkNotice() {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timedOut = false;
    const ctl = new AbortController();
    const t = setTimeout(() => {
      timedOut = true;
      ctl.abort();
    }, 6000);

    fetch(`${window.location.origin}/api/public/sb/auth/v1/health`, {
      headers: KEY ? { apikey: KEY } : undefined,
      cache: "no-store",
      signal: ctl.signal,
    })
      .then((res) => {
        if (!cancelled && !res.ok) setBlocked(true);
      })
      .catch((err: unknown) => {
        // A hung request (timeout) means the network really is blocking us. An
        // abort from our own unmount cleanup says nothing, so never flag that.
        const aborted = err instanceof DOMException && err.name === "AbortError";
        if (!cancelled && (!aborted || timedOut)) setBlocked(true);
      })
      .finally(() => clearTimeout(t));

    return () => {
      cancelled = true;
      clearTimeout(t);
      ctl.abort();
    };
  }, []);


  if (!blocked) return null;

  return (
    <div className="bg-destructive/10 border-b border-destructive/30 px-4 py-2 text-center text-xs text-foreground">
      <span className="inline-flex flex-wrap items-center justify-center gap-1.5">
        <WifiOff className="h-3.5 w-3.5 text-destructive" />
        Sign-in and saving are blocked on this network. You can still browse all guides.
        <Link to="/health" className="font-semibold underline">
          Run the network check
        </Link>
      </span>
    </div>
  );
}
