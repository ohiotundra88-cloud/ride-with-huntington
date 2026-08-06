import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/health")({
  head: () => ({
    meta: [
      { title: "Network self-check — Team Huntington Hub" },
      { name: "description", content: "Check which parts of Team Huntington Hub are reachable from your network or VPN." },
      { property: "og:title", content: "Network self-check — Team Huntington Hub" },
      { property: "og:description", content: "Diagnose VPN or corporate-filter issues loading Team Huntington Hub." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HealthPage,
});

type State = "checking" | "ok" | "fail";

interface Check {
  key: string;
  label: string;
  detail: string;
  state: State;
}

const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const DIRECT = import.meta.env.VITE_SUPABASE_URL as string | undefined;

async function timed(url: string, init?: RequestInit) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 6000);
  try {
    const res = await fetch(url, { ...init, signal: ctl.signal, cache: "no-store" });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  } finally {
    clearTimeout(t);
  }
}

function Row({ c }: { c: Check }) {
  const Icon = c.state === "checking" ? Loader2 : c.state === "ok" ? CheckCircle2 : XCircle;
  return (
    <div className="flex items-start gap-3 border-b py-3 last:border-0">
      <Icon
        className={`mt-0.5 h-5 w-5 shrink-0 ${
          c.state === "checking"
            ? "animate-spin text-muted-foreground"
            : c.state === "ok"
              ? "text-[var(--brand-dark)]"
              : "text-destructive"
        }`}
      />
      <div>
        <div className="text-sm font-semibold">{c.label}</div>
        <div className="text-xs text-muted-foreground">{c.detail}</div>
      </div>
    </div>
  );
}

function HealthPage() {
  const [checks, setChecks] = useState<Check[]>([
    { key: "html", label: "Page delivered", detail: "Checking…", state: "checking" },
    { key: "css", label: "Styles loaded", detail: "Checking…", state: "checking" },
    { key: "js", label: "App scripts running", detail: "Checking…", state: "checking" },
    { key: "same", label: "Sign-in & data (this site)", detail: "Checking…", state: "checking" },
    { key: "direct", label: "Direct backend host (informational)", detail: "Checking…", state: "checking" },
  ]);
  const [origin, setOrigin] = useState("");
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setOrigin(window.location.origin);

    const set = (key: string, state: State, detail: string) =>
      !cancelled && setChecks((prev) => prev.map((c) => (c.key === key ? { ...c, state, detail } : c)));

    set("html", "ok", "The HTML for this page reached your browser intact.");
    set("js", "ok", "JavaScript executed and the page is interactive.");

    const styled = getComputedStyle(document.body).getPropertyValue("--brand").trim();
    set(
      "css",
      styled ? "ok" : "fail",
      styled
        ? "Stylesheet loaded and brand theme applied."
        : "The stylesheet was blocked or rewritten by a proxy on this network.",
    );

    (async () => {
      const r = await timed(`${window.location.origin}/api/public/sb/auth/v1/health`, {
        headers: KEY ? { apikey: KEY } : undefined,
      });
      set(
        "same",
        r.ok ? "ok" : "fail",
        r.ok
          ? "Sign-in and data services are reachable through this site's own domain."
          : `Blocked on this network (status ${r.status || "no response"}). Sign-in and saving will not work here — share this page with IT.`,
      );
    })();

    (async () => {
      if (!DIRECT) return set("direct", "fail", "Not configured.");
      const r = await timed(`${DIRECT}/auth/v1/health`, { headers: KEY ? { apikey: KEY } : undefined });
      set(
        "direct",
        r.ok ? "ok" : "fail",
        r.ok
          ? "Also reachable directly (not required — the app no longer depends on this)."
          : "Blocked on this network. That is expected and no longer affects the app, which routes everything through this site's domain.",
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [nonce]);

  const blocked = checks.find((c) => c.key === "same")?.state === "fail";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Network self-check</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Run this page on the machine and network (including VPN) where the Hub isn't loading. It reports
        exactly what your network allows.
      </p>

      <Card className="mt-6">
        <CardHeader className="pb-0">
          <CardTitle className="text-base">Results</CardTitle>
        </CardHeader>
        <CardContent>
          {checks.map((c) => (
            <Row key={c.key} c={c} />
          ))}
          <div className="pt-4">
            <Button variant="outline" size="sm" onClick={() => setNonce((n) => n + 1)}>
              Run again
            </Button>
          </div>
        </CardContent>
      </Card>

      {blocked && (
        <Card className="mt-6 border-destructive/40">
          <CardHeader className="flex-row items-center gap-2 pb-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <CardTitle className="text-base">This network is blocking the Hub</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Pages will still display, but sign-in and saving are unavailable until IT allows this domain.
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Request for IT / Network Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            Copy the details below into a ticket. All traffic for this application is on a single domain.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Allow <code className="font-mono">ridewithhuntington.com</code> and{" "}
              <code className="font-mono">www.ridewithhuntington.com</code> (HTTPS, port 443)
            </li>
            <li>Suggested category: Business / Productivity — internal Huntington Pelotonia team site</li>
            <li>
              Includes the API path <code className="font-mono">/api/public/sb/*</code> on the same domain
              (sign-in and data). No other external hosts are required.
            </li>
            <li>No SSL-inspection exception needed; standard TLS on a public certificate</li>
            <li>
              Current origin under test: <code className="font-mono">{origin || "—"}</code>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
