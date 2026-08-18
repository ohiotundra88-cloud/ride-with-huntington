import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import {
  listManageableAssets, saveAsset, deleteAsset, uploadAssetFile, removeAssetFile,
} from "@/lib/fundraising.functions";
import {
  ALLOWED_ASSET_TYPES, MAX_ASSET_BYTES, assetCategories, assetFileUrl, type FundraisingAsset,
} from "@/lib/fundraising.shared";
import { ArrowLeft, Plus, Pencil, Trash2, Upload, X, EyeOff } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/fundraising")({
  head: () => ({ meta: [
    { title: "Fundraising resources — Team Huntington Hub" },
    { name: "description", content: "Upload shareable fundraising graphics and copy for Team Huntington colleagues." },
  ] }),
  component: AdminFundraising,
});

function AdminFundraising() {
  const { user } = useStore();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<FundraisingAsset | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["fundraising-assets", "manage"],
    queryFn: () => listManageableAssets(),
    enabled: !!user.signedIn && !!user.isCaptain,
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteAsset({ data: { id } }),
    onSuccess: () => {
      toast.success("Resource removed");
      qc.invalidateQueries({ queryKey: ["fundraising-assets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!user.signedIn || !user.isCaptain) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Captain or admin access required</h1>
        <p className="mt-2 text-muted-foreground">
          Sign in with a captain or admin account to manage fundraising resources.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link to="/resources" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to Resource Center
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-[var(--brand-dark)]">Fundraising resources</h1>
          <p className="mt-2 text-muted-foreground">
            Post graphics, flyers and captions colleagues can share on social media.
          </p>
        </div>
        <Button onClick={() => setCreating(true)} className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90">
          <Plus className="mr-1 h-4 w-4" /> Add resource
        </Button>
      </div>

      <div className="mt-6 space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && assets.length === 0 && (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nothing here yet. Add your first shareable asset.
          </CardContent></Card>
        )}
        {assets.map((a) => (
          <Card key={a.id} className={a.published ? "" : "border-dashed border-amber-500/60"}>
            <CardContent className="flex flex-wrap items-start justify-between gap-3 p-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-xs">{a.category}</Badge>
                  {!a.published && (
                    <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                      <EyeOff className="h-3 w-3" /> DRAFT
                    </span>
                  )}
                </div>
                <h3 className="mt-2 font-bold text-[var(--brand-dark)]">{a.title}</h3>
                {a.description && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{a.description}</p>}
                {a.file_name && (
                  <a href={assetFileUrl(a.id)} target="_blank" rel="noreferrer" className="mt-2 inline-block truncate text-xs underline">
                    {a.file_name}
                  </a>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setEditing(a)} aria-label={`Edit ${a.title}`}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => del.mutate(a.id)}
                  aria-label={`Delete ${a.title}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(creating || editing) && (
        <AssetDialog
          key={editing?.id ?? "new"}
          asset={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

function AssetDialog({ asset, onClose }: { asset: FundraisingAsset | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(asset?.title ?? "");
  const [description, setDescription] = useState(asset?.description ?? "");
  const [category, setCategory] = useState(asset?.category ?? assetCategories[0]);
  const [caption, setCaption] = useState(asset?.suggested_caption ?? "");
  const [linkUrl, setLinkUrl] = useState(asset?.link_url ?? "");
  const [published, setPublished] = useState(asset?.published ?? true);
  const [sortOrder, setSortOrder] = useState(String(asset?.sort_order ?? 0));
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ["fundraising-assets"] });

  const submit = async () => {
    if (title.trim().length < 2) { toast.error("Add a title."); return; }
    if (file && file.size > MAX_ASSET_BYTES) { toast.error("File must be 15 MB or smaller."); return; }
    setSaving(true);
    try {
      const row = await saveAsset({
        data: {
          id: asset?.id,
          title,
          description,
          category,
          suggested_caption: caption,
          link_url: linkUrl,
          published,
          sort_order: Number(sortOrder) || 0,
        },
      });

      if (file) {
        const buf = await file.arrayBuffer();
        let binary = "";
        const bytes = new Uint8Array(buf);
        for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
        await uploadAssetFile({
          data: {
            id: row.id,
            fileName: file.name,
            contentType: file.type as (typeof ALLOWED_ASSET_TYPES)[number],
            base64: btoa(binary),
          },
        });
      }

      toast.success(asset ? "Resource updated" : "Resource posted");
      refresh();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save the resource");
    } finally {
      setSaving(false);
    }
  };

  const dropFile = async () => {
    if (!asset) return;
    try {
      await removeAssetFile({ data: { id: asset.id } });
      toast.success("Attachment removed");
      refresh();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove the attachment");
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{asset ? "Edit resource" : "Add fundraising resource"}</DialogTitle>
          <DialogDescription>
            Attach an image, PDF or short video colleagues can post, plus a ready-to-use caption.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="fr-title">Title</Label>
            <Input id="fr-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Instagram story graphic" />
          </div>

          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {assetCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="fr-desc">Description</Label>
            <Textarea id="fr-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="How and where to use this asset." />
          </div>

          <div>
            <Label htmlFor="fr-caption">Suggested caption</Label>
            <Textarea id="fr-caption" rows={4} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="I'm riding with Team Huntington in Pelotonia 2027…" />
          </div>

          <div>
            <Label htmlFor="fr-link">Optional link</Label>
            <Input id="fr-link" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" />
          </div>

          <div>
            <Label htmlFor="fr-file">Attachment (PNG, JPG, WEBP, GIF, PDF, MP4 · max 15 MB)</Label>
            <Input
              id="fr-file"
              type="file"
              accept={ALLOWED_ASSET_TYPES.join(",")}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {asset?.file_name && !file && (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-muted/60 px-3 py-2 text-xs">
                <span className="truncate">{asset.file_name}</span>
                <Button variant="ghost" size="sm" onClick={dropFile}><X className="h-3.5 w-3.5" /></Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="fr-order">Sort order</Label>
              <Input id="fr-order" inputMode="numeric" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
            </div>
            <div className="flex items-end gap-2 pb-2">
              <Switch id="fr-pub" checked={published} onCheckedChange={setPublished} />
              <Label htmlFor="fr-pub">Published</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving} className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90">
            <Upload className="mr-1 h-4 w-4" /> {saving ? "Saving…" : "Save resource"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
