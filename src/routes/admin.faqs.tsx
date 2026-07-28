import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdminFaqs, faqCategories, type FAQArticle, type FAQCategory } from "@/lib/faq-store";
import { useStore } from "@/lib/store";
import { Plus, Pencil, Trash2, EyeOff, Eye, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/faqs")({
  head: () => ({ meta: [
    { title: "FAQ management — Team Huntington Hub" },
    { name: "description", content: "Create and edit Team Huntington Hub FAQ articles." },
  ] }),
  component: AdminFaqs,
});

const blank = (): FAQArticle => ({
  id: "",
  title: "",
  category: "Registration",
  keywords: [],
  body: "",
});

function AdminFaqs() {
  const { user } = useStore();
  const { data: articles = [], isLoading, upsert, toggleHidden, remove } = useAdminFaqs();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<FAQCategory | "All">("All");
  const [editing, setEditing] = useState<FAQArticle | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [keywordsInput, setKeywordsInput] = useState("");

  if (!user.isAdmin) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Admin access required</h1>
        <p className="mt-2 text-muted-foreground">Sign in with an admin account to manage FAQs.</p>
      </div>
    );
  }

  const filtered = articles.filter((a) => {
    const catOk = cat === "All" || a.category === cat;
    if (!q) return catOk;
    const s = q.toLowerCase();
    return catOk && (a.title.toLowerCase().includes(s) || a.body.toLowerCase().includes(s));
  });

  const openNew = () => {
    setEditing(blank());
    setKeywordsInput("");
    setIsNew(true);
  };

  const openEdit = (a: FAQArticle) => {
    setEditing({ ...a });
    setKeywordsInput(a.keywords.join(", "));
    setIsNew(false);
  };

  const save = () => {
    if (!editing) return;
    if (!editing.title.trim() || !editing.body.trim()) {
      toast.error("Title and body are required");
      return;
    }
    const payload = {
      id: editing.id || undefined,
      title: editing.title.trim(),
      body: editing.body.trim(),
      category: editing.category,
      keywords: keywordsInput.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean),
    };
    upsert.mutate(payload, {
      onSuccess: () => {
        toast.success(isNew ? "FAQ created" : "FAQ updated");
        setEditing(null);
      },
      onError: (e: any) => toast.error("Save failed", { description: e.message }),
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Admin dashboard
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--brand-dark)]">FAQ management</h1>
          <p className="mt-1 text-sm text-muted-foreground">Create, edit, or hide articles shown in the Resource Center. Backed by Lovable Cloud.</p>
        </div>
        <Button onClick={openNew} className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90">
          <Plus className="mr-1 h-4 w-4" /> New FAQ
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Input placeholder="Search FAQs…" value={q} onChange={(e) => setQ(e.target.value)} className="w-64" />
        <Select value={cat} onValueChange={(v) => setCat(v as FAQCategory | "All")}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All categories</SelectItem>
            {faqCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filtered.length} article{filtered.length === 1 ? "" : "s"}</span>
      </div>

      {isLoading ? (
        <div className="mt-8 text-center text-muted-foreground">Loading…</div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {filtered.map((a) => (
            <Card key={a.id} className={a.hidden ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-xs">{a.category}</Badge>
                      {a.is_builtin && <Badge variant="secondary" className="text-xs">Built-in</Badge>}
                      {!a.is_builtin && <Badge className="bg-[var(--brand)] text-[var(--brand-foreground)] text-xs">Custom</Badge>}
                      {a.hidden && <Badge variant="outline" className="text-xs">Hidden</Badge>}
                    </div>
                    <h3 className="mt-2 font-bold text-[var(--brand-dark)] truncate">{a.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{a.body}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(a)}>
                    <Pencil className="mr-1 h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleHidden.mutate({ id: a.id, hidden: !a.hidden })}
                  >
                    {a.hidden ? <><Eye className="mr-1 h-3.5 w-3.5" /> Show</> : <><EyeOff className="mr-1 h-3.5 w-3.5" /> Hide</>}
                  </Button>
                  {!a.is_builtin && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => {
                        if (!confirm("Delete this FAQ permanently?")) return;
                        remove.mutate(a.id, {
                          onSuccess: () => toast.success("Deleted"),
                          onError: (e: any) => toast.error("Delete failed", { description: e.message }),
                        });
                      }}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="sm:col-span-2 py-12 text-center text-muted-foreground">No FAQs match.</div>
          )}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isNew ? "New FAQ" : "Edit FAQ"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  placeholder="How do I…?"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Category</label>
                <Select value={editing.category} onValueChange={(v) => setEditing({ ...editing, category: v as FAQCategory })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {faqCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Keywords (comma-separated)</label>
                <Input
                  value={keywordsInput}
                  onChange={(e) => setKeywordsInput(e.target.value)}
                  placeholder="register, sign up, team"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Body</label>
                <Textarea
                  value={editing.body}
                  onChange={(e) => setEditing({ ...editing, body: e.target.value })}
                  rows={6}
                  placeholder="Answer text…"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button
              onClick={save}
              disabled={upsert.isPending}
              className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90"
            >
              {upsert.isPending ? "Saving…" : isNew ? "Create" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
