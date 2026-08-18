import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Lock, ShieldCheck, Pin, Paperclip, Plus, Pencil, Trash2, EyeOff, Upload, X, Download, Search, UserCircle2,
} from "lucide-react";
import {
  listLoungePosts, saveLoungePost, deleteLoungePost, uploadLoungeFile, removeLoungeFile, getLoungeFile,
} from "@/lib/captain-lounge.functions";
import {
  ALLOWED_DOC_TYPES, MAX_DOC_BYTES, formatPostDate, postCategories, type CaptainPost,
} from "@/lib/captain-lounge.shared";

export const Route = createFileRoute("/captains-lounge")({
  component: CaptainsLoungePage,
  head: () => ({
    meta: [
      { title: "Captains Lounge — Team Huntington Hub" },
      {
        name: "description",
        content:
          "Private hub for Team Huntington captains and leadership: updates, playbooks, meeting notes and shared documents.",
      },
      { property: "og:title", content: "Captains Lounge — Team Huntington Hub" },
      { property: "og:description", content: "Leadership-only updates, playbooks and documents for Team Huntington captains." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const ROLE_LABELS: Record<string, string> = {
  captain: "Team Captain",
  admin: "Admin",
  superuser: "Super User",
  legal: "Legal",
  risk: "Risk",
  compliance: "Compliance",
  marketing: "Marketing",
  cochair: "Co-Chair",
};

function CaptainsLoungePage() {
  const { user } = useStore();
  const allowed = user.signedIn && user.isReviewer;

  if (!user.signedIn) return <Gate title="Sign in required" body="The Captains Lounge is a private space for Team Huntington leadership. Sign in with your Huntington email to continue." cta />;
  if (!allowed) return <Gate title="Leadership access only" body="This space is limited to colleagues with a Team Captain, Admin, Super User, Legal, Risk, Compliance, Marketing or Co-Chair role. If you should have access, ask an admin to add your role." />;

  return <Lounge />;
}

function Gate({ title, body, cta }: { title: string; body: string; cta?: boolean }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <Card className="border-[var(--brand-dark)]/10">
        <CardHeader>
          <div className="mb-2 grid h-11 w-11 place-items-center rounded-xl bg-[var(--brand-dark)] text-white">
            <Lock className="h-5 w-5" />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{body}</p>
          <div className="flex gap-2">
            {cta && (
              <Button asChild className="bg-[var(--brand)] text-[var(--brand-foreground)] hover:brightness-95">
                <Link to="/signin">Sign in</Link>
              </Button>
            )}
            <Button asChild variant="outline"><Link to="/dashboard">Back to My Journey</Link></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Lounge() {
  const { user } = useStore();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");

  const { data: posts = [], isLoading, error } = useQuery<CaptainPost[]>({
    queryKey: ["lounge-posts"],
    queryFn: () => listLoungePosts(),
  });

  const canManage = user.isCaptain; // captain, admin or super user
  const visible = canManage ? posts : posts.filter((p) => p.published);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return visible.filter((p) => {
      if (cat !== "all" && p.category !== cat) return false;
      if (!needle) return true;
      return `${p.title} ${p.body} ${p.category} ${p.file_name ?? ""}`.toLowerCase().includes(needle);
    });
  }, [visible, q, cat]);

  const myRoles = user.roles.filter((r) => ROLE_LABELS[r]).map((r) => ROLE_LABELS[r]);
  const categories = ["all", ...Array.from(new Set(visible.map((p) => p.category)))];

  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden bg-[var(--brand-dark)] text-white">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--brand)]" /> Private · leadership only
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Captains Lounge</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/75">
            Updates, playbooks, meeting notes and shared documents for the colleagues leading Team Huntington.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-white/60">Your access:</span>
            {myRoles.length ? myRoles.map((r) => (
              <Badge key={r} className="bg-[var(--brand)] text-[var(--brand-foreground)] hover:bg-[var(--brand)]">{r}</Badge>
            )) : <Badge variant="secondary">Leadership</Badge>}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-5 px-4 py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search updates and documents" className="pl-9" />
          </div>
          {canManage && <PostDialog onSaved={() => qc.invalidateQueries({ queryKey: ["lounge-posts"] })} />}
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                cat === c
                  ? "border-[var(--brand-dark)] bg-[var(--brand-dark)] text-white"
                  : "border-border bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              {c === "all" ? "All" : c}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading the lounge…</p>
        ) : error ? (
          <p className="text-sm text-destructive">{(error as Error).message}</p>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nothing posted yet. {canManage && "Use “New post” to share the first update."}
          </CardContent></Card>
        ) : (
          <div className="space-y-4">
            {filtered.map((p) => <PostCard key={p.id} post={p} canManage={canManage} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function PostCard({ post, canManage }: { post: CaptainPost; canManage: boolean }) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["lounge-posts"] });

  const del = useMutation({
    mutationFn: () => deleteLoungePost({ data: { id: post.id } }),
    onSuccess: () => { toast.success("Post removed"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const download = useMutation({
    mutationFn: () => getLoungeFile({ data: { id: post.id } }),
    onSuccess: (res) => {
      const bytes = Uint8Array.from(atob(res.base64), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: res.contentType }));
      const a = document.createElement("a");
      a.href = url;
      a.download = res.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className={post.pinned ? "border-[var(--brand)]/60 shadow-sm" : undefined}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">{post.category}</Badge>
              {post.pinned && <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--brand-dark)]"><Pin className="h-3 w-3" /> Pinned</span>}
              {!post.published && <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600"><EyeOff className="h-3 w-3" /> Draft</span>}
            </div>
            <CardTitle className="text-lg leading-snug">{post.title}</CardTitle>
            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
              <UserCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium text-foreground">
                {post.author_name || post.author_email || "Team leadership"}
              </span>
              {post.author_name && post.author_email && (
                <span className="hidden sm:inline">({post.author_email})</span>
              )}
              <span aria-hidden>·</span>
              <span>Posted {formatPostDate(post.created_at)}</span>
            </p>
          </div>
          {canManage && (
            <div className="flex items-center gap-1">
              <PostDialog post={post} onSaved={invalidate} />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Delete post"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this post?</AlertDialogTitle>
                    <AlertDialogDescription>“{post.title}” and any attached document will be removed for all leaders.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => del.mutate()}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {post.body && <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{post.body}</p>}
        {post.file_path && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 p-3">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-sm">{post.file_name}</span>
            <Button size="sm" variant="outline" onClick={() => download.mutate()} disabled={download.isPending}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> {download.isPending ? "Preparing…" : "Download"}
            </Button>
          </div>
        )}
        {canManage && <FileControls post={post} onChanged={invalidate} />}
      </CardContent>
    </Card>
  );
}

function FileControls({ post, onChanged }: { post: CaptainPost; onChanged: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > MAX_DOC_BYTES) throw new Error("File must be 15 MB or smaller.");
      if (!(ALLOWED_DOC_TYPES as readonly string[]).includes(file.type)) {
        throw new Error("Use a PDF, image, Office document, CSV or text file.");
      }
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
        reader.onerror = () => reject(new Error("Could not read that file."));
        reader.readAsDataURL(file);
      });
      return uploadLoungeFile({ data: { id: post.id, fileName: file.name, contentType: file.type as any, base64 } });
    },
    onSuccess: () => { toast.success("Document attached"); onChanged(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: () => removeLoungeFile({ data: { id: post.id } }),
    onSuccess: () => { toast.success("Document removed"); onChanged(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={ALLOWED_DOC_TYPES.join(",")}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ""; }}
      />
      <Button size="sm" variant="ghost" onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
        <Upload className="mr-1.5 h-3.5 w-3.5" /> {post.file_path ? "Replace document" : "Attach document"}
      </Button>
      {post.file_path && (
        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove.mutate()} disabled={remove.isPending}>
          <X className="mr-1.5 h-3.5 w-3.5" /> Remove document
        </Button>
      )}
    </div>
  );
}

function PostDialog({ post, onSaved }: { post?: CaptainPost; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: post?.title ?? "",
    body: post?.body ?? "",
    category: post?.category ?? "Update",
    pinned: post?.pinned ?? false,
    published: post?.published ?? true,
  });

  const save = useMutation({
    mutationFn: () =>
      saveLoungePost({ data: { ...(post ? { id: post.id } : {}), ...form } }),
    onSuccess: () => { toast.success(post ? "Post updated" : "Post published"); setOpen(false); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {post ? (
          <Button variant="ghost" size="icon" aria-label="Edit post"><Pencil className="h-4 w-4" /></Button>
        ) : (
          <Button className="bg-[var(--brand)] text-[var(--brand-foreground)] hover:brightness-95">
            <Plus className="mr-1.5 h-4 w-4" /> New post
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{post ? "Edit post" : "New lounge post"}</DialogTitle>
          <DialogDescription>Visible only to captains and team leadership roles.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="lp-title">Title</Label>
            <Input id="lp-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Captain huddle recap — August" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lp-cat">Category</Label>
            <select
              id="lp-cat"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {postCategories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lp-body">Message</Label>
            <Textarea id="lp-body" rows={7} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Share the update, key dates, and what captains need to do next." />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="text-sm font-medium">Pin to top</div>
              <div className="text-xs text-muted-foreground">Keep this above other posts.</div>
            </div>
            <Switch checked={form.pinned} onCheckedChange={(v) => setForm({ ...form, pinned: v })} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <div className="text-sm font-medium">Published</div>
              <div className="text-xs text-muted-foreground">Off keeps it a draft only managers see.</div>
            </div>
            <Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            className="bg-[var(--brand)] text-[var(--brand-foreground)] hover:brightness-95"
            disabled={form.title.trim().length < 2 || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? "Saving…" : post ? "Save changes" : "Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
