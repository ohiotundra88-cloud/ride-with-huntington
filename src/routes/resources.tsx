import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { faqs, faqCategories, type FAQCategory } from "@/lib/faq-data";
import { Search, LifeBuoy } from "lucide-react";

export const Route = createFileRoute("/resources")({
  head: () => ({ meta: [
    { title: "Resources — Team Huntington Hub" },
    { name: "description", content: "Search 25+ answers for Team Huntington Pelotonia participants." },
  ] }),
  component: Resources,
});

function Resources() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<FAQCategory | "All">("All");

  const filtered = useMemo(() => faqs.filter((a) => {
    const catOk = cat === "All" || a.category === cat;
    if (!q) return catOk;
    const s = q.toLowerCase();
    return catOk && (a.title.toLowerCase().includes(s) || a.body.toLowerCase().includes(s) || a.keywords.some((k) => k.includes(s)));
  }), [q, cat]);

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
        {filtered.map((a) => (
          <Link key={a.id} to="/resources/$id" params={{ id: a.id }}>
            <Card className="h-full hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <Badge variant="outline" className="text-xs">{a.category}</Badge>
                <h3 className="mt-2 font-bold text-[var(--brand-dark)]">{a.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{a.body}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="sm:col-span-2 py-12 text-center text-muted-foreground">
            <LifeBuoy className="mx-auto h-10 w-10 opacity-40" />
            <p className="mt-3">No articles match. Try another search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
