import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, RotateCcw, Plus, ListChecks } from "lucide-react";
import { useAdmin } from "@/lib/admin-store";

export const Route = createFileRoute("/packing")({
  head: () => ({
    meta: [
      { title: "Packing List — Team Huntington Hub" },
      { name: "description", content: "Smart Ride Weekend packing list for riders and volunteers." },
      { property: "og:title", content: "Ride Weekend packing list" },
      { property: "og:description", content: "Check off Ride Weekend essentials for riders and volunteers." },
    ],
  }),
  component: PackingPage,
});

interface Item { id: string; label: string; category: string; checked: boolean; custom?: boolean; required?: boolean; }

function PackingPage() {
  const { state } = useAdmin();
  const [preset, setPreset] = useState<"rider" | "volunteer">("rider");

  const defaults = useMemo<Item[]>(
    () => state.packing.items
      .filter((i) => i.active && i.preset === preset)
      .sort((a, b) => a.order - b.order)
      .map((i) => ({ id: i.id, label: i.label, category: i.category, checked: false, required: i.required })),
    [state.packing.items, preset]
  );

  const [items, setItems] = useState<Item[]>(defaults);
  // Sync when defaults change (preset switch or admin edits)
  useEffect(() => { setItems(defaults); }, [defaults]);

  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [newItem, setNewItem] = useState("");
  const [newCategory, setNewCategory] = useState<string>("");

  const categories = state.packing.categories[preset];

  if (!state.flags.packingList) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Packing list is turned off</h1>
        <p className="mt-2 text-sm text-muted-foreground">A Super User has hidden this section.</p>
        <Button asChild className="mt-6"><Link to="/">Go home</Link></Button>
      </div>
    );
  }

  const toggle = (id: string) => setItems((prev) => prev.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)));
  const remove = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));
  const addCustom = () => {
    const label = newItem.trim();
    const cat = newCategory || categories[0];
    if (!label) return;
    setItems((prev) => [...prev, { id: `c-${crypto.randomUUID()}`, label, category: cat, checked: false, custom: true }]);
    setNewItem("");
  };
  const reset = () => setItems(defaults);

  const total = items.length;
  const done = items.filter((i) => i.checked).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const visible = useMemo(() => items.filter((i) => {
    if (showIncompleteOnly && i.checked) return false;
    if (categoryFilter !== "all" && i.category !== categoryFilter) return false;
    return true;
  }), [items, showIncompleteOnly, categoryFilter]);

  const grouped = useMemo(() => {
    const g: Record<string, Item[]> = {};
    visible.forEach((i) => { (g[i.category] ||= []).push(i); });
    return g;
  }, [visible]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Ride Weekend</p>
          <h1 className="mt-1 text-3xl font-black text-[var(--brand-dark)] flex items-center gap-2">
            <ListChecks className="h-7 w-7 text-[var(--brand)]" /> Smart packing list
          </h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-xl">
            Toggle items as you pack. Add your own. Default items are managed by Team Huntington admins.
          </p>
        </div>
        <Tabs value={preset} onValueChange={(v) => setPreset(v as "rider" | "volunteer")}>
          <TabsList>
            <TabsTrigger value="rider">Rider</TabsTrigger>
            <TabsTrigger value="volunteer">Volunteer</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card className="mt-6">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-[220px] flex-1">
              <p className="text-sm font-semibold text-[var(--brand-dark)]">{done} of {total} packed · {pct}%</p>
              <Progress value={pct} className="mt-2 h-2 [&>div]:bg-[var(--brand)]" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={showIncompleteOnly} onCheckedChange={(v) => setShowIncompleteOnly(!!v)} />
                Incomplete only
              </label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={reset}>
                <RotateCcw className="mr-1 h-4 w-4" /> Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {categories.map((cat) => {
          const list = grouped[cat] ?? [];
          if (list.length === 0) return null;
          return (
            <Card key={cat}>
              <CardHeader className="pb-2"><CardTitle className="text-base">{cat}</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {list.map((item) => {
                    const id = `pack-${item.id}`;
                    return (
                      <li key={item.id} className="flex items-center gap-2">
                        <Checkbox id={id} checked={item.checked} onCheckedChange={() => toggle(item.id)} />
                        <label htmlFor={id} className={`flex-1 cursor-pointer text-sm ${item.checked ? "line-through text-muted-foreground" : ""}`}>
                          {item.label}
                          {item.required && <span className="ml-2 text-[10px] uppercase tracking-wide text-[var(--brand-dark)]/70">required</span>}
                          {item.custom && <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">custom</span>}
                        </label>
                        {item.custom && (
                          <Button variant="ghost" size="icon" aria-label={`Remove ${item.label}`} onClick={() => remove(item.id)} className="h-8 w-8">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardHeader className="pb-2"><CardTitle className="text-base">Add a custom item</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); addCustom(); }} className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="new-item" className="text-xs font-semibold">Item</label>
              <Input id="new-item" value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder="e.g. Sunglasses" />
            </div>
            <div className="min-w-[180px]">
              <label htmlFor="new-cat" className="text-xs font-semibold">Category</label>
              <Select value={newCategory || categories[0]} onValueChange={setNewCategory}>
                <SelectTrigger id="new-cat"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90">
              <Plus className="mr-1 h-4 w-4" /> Add item
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
