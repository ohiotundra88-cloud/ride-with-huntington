import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/**
 * Copies the public, sign-in-free fundraiser URL so supporters who don't have
 * a hub account can open the page and give.
 */
export function ShareFundraiserButton({
  slug,
  title,
  variant = "outline",
  className,
}: {
  slug: string;
  title?: string;
  variant?: "outline" | "secondary" | "ghost" | "default";
  className?: string;
}) {
  const share = async () => {
    const url = `${window.location.origin}/fundraisers/${slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: title || "Team Huntington fundraiser", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied", { description: url });
    } catch {
      toast.error("Couldn't copy the link", { description: url });
    }
  };

  return (
    <Button type="button" size="sm" variant={variant} className={className} onClick={share}>
      <Share2 className="mr-1.5 h-4 w-4" /> Share link
    </Button>
  );
}
