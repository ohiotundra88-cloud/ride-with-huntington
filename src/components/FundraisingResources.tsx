import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { listPublicAssets } from "@/lib/fundraising.functions";
import { assetFileUrl, isImageAsset, type FundraisingAsset } from "@/lib/fundraising.shared";
import { Download, ExternalLink, Copy, Megaphone, Share2, Settings } from "lucide-react";
import { toast } from "sonner";

export function FundraisingResources() {
  const { user } = useStore();
  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["fundraising-assets", "public"],
    queryFn: () => listPublicAssets(),
    staleTime: 60_000,
  });

  const canManage = user.signedIn && user.isCaptain;

  return (
    <section id="fundraising" className="mt-14 scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-[var(--brand-dark)]">Fundraising resources</h2>
          <p className="mt-2 text-muted-foreground">
            Download graphics, flyers and copy you can post to your social media pages.
          </p>
        </div>
        {canManage && (
          <Link to="/admin/fundraising">
            <Button size="sm" variant="outline">
              <Settings className="mr-1 h-4 w-4" /> Manage resources
            </Button>
          </Link>
        )}
      </div>

      {isLoading ? (
        <p className="mt-5 text-sm text-muted-foreground">Loading resources…</p>
      ) : assets.length === 0 ? (
        <Card className="mt-5">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            <Megaphone className="mx-auto h-10 w-10 opacity-40" />
            <p className="mt-3">No shareable assets posted yet. Check back soon.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {assets.map((a) => (
            <AssetCard key={a.id} asset={a} />
          ))}
        </div>
      )}
    </section>
  );
}

function AssetCard({ asset: a }: { asset: FundraisingAsset }) {
  const fileHref = a.file_path ? assetFileUrl(a.id) : null;

  const copyCaption = async () => {
    if (!a.suggested_caption) return;
    try {
      await navigator.clipboard.writeText(a.suggested_caption);
      toast.success("Caption copied — paste it into your post.");
    } catch {
      toast.error("Copy failed. Select the text manually.");
    }
  };

  return (
    <Card className="h-full overflow-hidden">
      {fileHref && isImageAsset(a) && (
        <img
          src={fileHref}
          alt={a.title}
          loading="lazy"
          className="h-40 w-full bg-muted object-cover"
        />
      )}
      <CardContent className="p-5">
        <Badge variant="outline" className="text-xs">{a.category}</Badge>
        <h3 className="mt-2 font-bold text-[var(--brand-dark)]">{a.title}</h3>
        {a.description && <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>}

        {a.suggested_caption && (
          <div className="mt-3 rounded-lg bg-muted/60 p-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Suggested caption</p>
            <p className="mt-1 whitespace-pre-wrap">{a.suggested_caption}</p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {fileHref && (
            <>
              <a href={fileHref} download={a.file_name ?? undefined}>
                <Button size="sm" className="bg-[var(--brand-dark)] text-white hover:bg-[var(--brand-dark)]/90">
                  <Download className="mr-1 h-4 w-4" /> Download
                </Button>
              </a>
              <a href={fileHref} target="_blank" rel="noreferrer">
                <Button size="sm" variant="outline"><Share2 className="mr-1 h-4 w-4" /> Preview</Button>
              </a>
            </>
          )}
          {a.link_url && (
            <a href={a.link_url} target="_blank" rel="noreferrer">
              <Button size="sm" variant="outline"><ExternalLink className="mr-1 h-4 w-4" /> Open link</Button>
            </a>
          )}
          {a.suggested_caption && (
            <Button size="sm" variant="outline" onClick={copyCaption}>
              <Copy className="mr-1 h-4 w-4" /> Copy caption
            </Button>
          )}
        </div>
        {a.file_name && (
          <p className="mt-3 truncate text-xs text-muted-foreground">{a.file_name}</p>
        )}
      </CardContent>
    </Card>
  );
}
