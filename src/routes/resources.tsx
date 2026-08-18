import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { faqCategories, type FAQCategory } from "@/lib/faq-data";
import { usePublicFaqs } from "@/lib/faq-store";
import { useAdmin } from "@/lib/admin-store";
import { Search, LifeBuoy, ChevronDown, ChevronUp, Mail, Phone } from "lucide-react";


const searchSchema = z.object({
  q: z.string().optional().catch(""),
});

export const Route = createFileRoute("/resources")({
  validateSearch: searchSchema,
  head: () => ({ meta: [
    { title: "Resources — Team Huntington Hub" },
    { name: "description", content: "Search Team Huntington answers for Pelotonia participants." },
  ] }),
  component: Resources,
});

function Resources() {
  const { q: queryFromUrl } = Route.useSearch();
  const [q, setQ] = useState(queryFromUrl ?? "");
  const [cat, setCat] = useState<FAQCategory | "All">("All");
  const { data: faqs = [], isLoading } = usePublicFaqs();

  const filtered = useMemo(() => faqs.filter((a) => {
    const catOk = cat === "All" || a.category === cat;
    if (!q) return catOk;
    const s = q.toLowerCase();
    return catOk && (a.title.toLowerCase().includes(s) || a.body.toLowerCase().includes(s) || a.keywords.some((k) => k.includes(s)));
  }), [q, cat, faqs]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="text-center">
        <h1 className="text-3xl sm:text-4xl font-black text-[var(--brand-dark)]">Resource Center</h1>
        <p className="mt-2 text-muted-foreground">Search Team Huntington answers for Pelotonia.</p>
      </div>

      <div className="relative mt-6">
        <Search className="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search Team Huntington…"
          className="h-14 pl-12 text-base rounded-xl shadow-sm"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant={cat === "All" ? "default" : "outline"} onClick={() => setCat("All")} className={cat === "All" ? "bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90" : ""}>All</Button>
        {faqCategories.map((c) => (
          <Button key={c} size="sm" variant={cat === c ? "default" : "outline"} onClick={() => setCat(c)} className={cat === c ? "bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90" : ""}>{c}</Button>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {isLoading && (
          <div className="sm:col-span-2 py-12 text-center text-muted-foreground">Loading…</div>
        )}
        {!isLoading && filtered.map((a) => (
          <ExpandableTile key={a.id} article={a} />
        ))}
        {!isLoading && filtered.length === 0 && (
          <div className="sm:col-span-2 py-12 text-center text-muted-foreground">
            <LifeBuoy className="mx-auto h-10 w-10 opacity-40" />
            <p className="mt-3">No articles match. Try another search.</p>
          </div>
        )}
      </div>

      <FundraisingResources />

      <ContactDirectory />

    </div>
  );
}

function ContactDirectory() {
  const { state } = useAdmin();
  const contacts = state.contacts.filter((c) => c.active);
  if (contacts.length === 0) return null;

  return (
    <section id="contacts" className="mt-14 scroll-mt-24">
      <h2 className="text-2xl font-black text-[var(--brand-dark)]">Contact directory</h2>
      <p className="mt-2 text-muted-foreground">Reach the Team Huntington coordinators directly.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {contacts.map((c) => (
          <Card key={c.id} className={c.emergency ? "border-[var(--brand)]" : ""}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-[var(--brand-dark)]">{c.name}</h3>
                  <p className="text-sm text-muted-foreground">{c.role}</p>
                </div>
                <Badge variant={c.emergency ? "default" : "outline"} className="text-xs">{c.category}</Badge>
              </div>
              {c.department && <p className="mt-2 text-xs text-muted-foreground">{c.department}{c.region && c.region !== "All" ? ` · ${c.region}` : ""}</p>}
              {c.hours && <p className="mt-1 text-xs text-muted-foreground">{c.hours}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                {c.email && (
                  <a href={`mailto:${c.email}`}>
                    <Button size="sm" variant="outline"><Mail className="mr-1 h-4 w-4" /> Email</Button>
                  </a>
                )}
                {c.phone && (
                  <a href={`tel:${c.phone.replace(/[^0-9+]/g, "")}`}>
                    <Button size="sm" variant="outline"><Phone className="mr-1 h-4 w-4" /> {c.phone}</Button>
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}


function ExpandableTile({ article: a }: { article: { id: string; category: FAQCategory; title: string; body: string } }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => setExpanded((v) => !v)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setExpanded((v) => !v); }}
      className="h-full cursor-pointer hover:shadow-md transition-shadow"
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Badge variant="outline" className="text-xs">{a.category}</Badge>
            <h3 className="mt-2 font-bold text-[var(--brand-dark)]">{a.title}</h3>
          </div>
          {expanded ? <ChevronUp className="h-5 w-5 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />}
        </div>
        <p className={`mt-2 text-sm text-muted-foreground transition-all ${expanded ? "" : "line-clamp-2"}`}>
          {a.body}
        </p>
        {expanded && (
          <div className="mt-4">
            <Link to="/resources/$id" params={{ id: a.id }} onClick={(e) => e.stopPropagation()}>
              <Button size="sm" variant="outline" className="w-full sm:w-auto">View full article</Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
