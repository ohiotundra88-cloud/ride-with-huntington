import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MessageSquare, Send, X, Sparkles as SparkIcon } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  conciergeFallback,
  conciergeResponses,
  conciergeStarters,
  type ConciergeResponse,
} from "@/lib/mock-data";

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  text: string;
  links?: { label: string; href: string }[];
}

function matchResponse(input: string): ConciergeResponse {
  const q = input.toLowerCase();
  for (const r of conciergeResponses) {
    if (r.keywords.some((k) => q.includes(k))) return r;
  }
  return conciergeFallback;
}

const welcome: ChatMsg = {
  id: "welcome",
  role: "assistant",
  text:
    "Hi Chris — I'm the Team Huntington Demo Concierge. Ask me about parking, packet pickup, the Team tent, expenses, or anything Ride Weekend. This is a demonstration and not a live AI service.",
};

export function Concierge({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([welcome]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = (text: string) => {
    const q = text.trim();
    if (!q) return;
    const r = matchResponse(q);
    const userMsg: ChatMsg = { id: crypto.randomUUID(), role: "user", text: q };
    const botMsg: ChatMsg = {
      id: crypto.randomUUID(),
      role: "assistant",
      text: `${r.title}\n\n${r.body}`,
      links: r.links,
    };
    setMessages((m) => [...m, userMsg, botMsg]);
    setInput("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="border-b bg-[var(--brand-dark)] text-white p-4">
          <SheetTitle className="text-white flex items-center gap-2">
            <SparkIcon className="h-4 w-4 text-[var(--brand)]" /> Demo Concierge
          </SheetTitle>
          <SheetDescription className="text-white/70 text-xs">
            Demonstration only — keyword-matched responses, no live AI.
          </SheetDescription>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3" aria-live="polite">
          {messages.map((m) => (
            <div
              key={m.id}
              className={
                m.role === "user"
                  ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[var(--brand-dark)] text-white px-3 py-2 text-sm"
                  : "max-w-[90%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm"
              }
            >
              <p className="whitespace-pre-wrap">{m.text}</p>
              {m.links && m.links.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {m.links.map((l) => (
                    <li key={l.href}>
                      <Link
                        to={l.href}
                        onClick={() => onOpenChange(false)}
                        className="inline-block rounded-full bg-[var(--brand)]/20 px-2.5 py-1 text-xs font-semibold text-[var(--brand-dark)] hover:bg-[var(--brand)]/30"
                      >
                        {l.label} →
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        {messages.length <= 1 && (
          <div className="px-4 pb-2">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Try asking</p>
            <div className="flex flex-wrap gap-1.5">
              {conciergeStarters.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-input bg-background px-2.5 py-1 text-xs hover:bg-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="border-t p-3 flex gap-2"
        >
          <label htmlFor="concierge-input" className="sr-only">Ask a question</label>
          <Input
            ref={inputRef}
            id="concierge-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about parking, packing, tent…"
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Send message"
            className="bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export function ConciergeLauncher() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-concierge", handler);
    return () => window.removeEventListener("open-concierge", handler);
  }, []);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open Demo Concierge"
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-[var(--brand-dark)] px-4 py-3 text-sm font-semibold text-white shadow-lg ring-1 ring-black/10 hover:bg-[var(--brand-dark)]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
      >
        {open ? <X className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
        <span className="hidden sm:inline">Ask the Concierge</span>
      </button>
      <Concierge open={open} onOpenChange={setOpen} />
    </>
  );
}

export function openConcierge() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("open-concierge"));
  }
}
