import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { faqs as builtinFaqs } from "@/lib/faq-data";
import { useFaqAdmin } from "@/lib/faq-store";
import { ArrowLeft, LifeBuoy } from "lucide-react";

export const Route = createFileRoute("/resources/$id")({
  head: ({ params }) => {
    const a = builtinFaqs.find((f) => f.id === params.id);
    return { meta: [
      { title: `${a?.title ?? "Article"} — Team Huntington Hub` },
      { name: "description", content: a?.body.slice(0, 150) ?? "Team Huntington resource." },
    ] };
  },
  component: Article,
});

function Article() {
  const { id } = Route.useParams();
  const { merged: faqs } = useFaqAdmin();
  const a = faqs.find((f) => f.id === id);
  if (!a) throw notFound();
  const related = faqs.filter((f) => f.category === a.category && f.id !== a.id).slice(0, 4);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/resources" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> All resources</Link>
      <div className="mt-4">
        <Badge variant="outline">{a.category}</Badge>
        <h1 className="mt-3 text-3xl font-black text-[var(--brand-dark)]">{a.title}</h1>
        <p className="mt-4 text-base leading-relaxed text-foreground/90">{a.body}</p>
      </div>

      <Card className="mt-8 bg-[var(--brand-dark)] text-white border-0">
        <CardContent className="p-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold">Still need help?</p>
            <p className="text-sm text-white/70">Reach the Team Huntington coordinators.</p>
          </div>
          <Button className="bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand)]/90"><LifeBuoy className="mr-1 h-4 w-4" /> Contact Support</Button>
        </CardContent>
      </Card>

      {related.length > 0 && (
        <>
          <h2 className="mt-10 text-lg font-bold text-[var(--brand-dark)]">Related articles</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {related.map((r) => (
              <Link key={r.id} to="/resources/$id" params={{ id: r.id }}>
                <Card className="hover:shadow-md transition-shadow"><CardContent className="p-4">
                  <p className="font-semibold text-sm text-[var(--brand-dark)]">{r.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{r.body}</p>
                </CardContent></Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
