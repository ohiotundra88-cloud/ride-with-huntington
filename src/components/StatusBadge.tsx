import { Badge } from "@/components/ui/badge";
import type { StepStatus } from "@/lib/store";

const map: Record<StepStatus, { label: string; className: string }> = {
  not_started: { label: "Not Started", className: "bg-muted text-muted-foreground border-transparent" },
  pending: { label: "Pending", className: "bg-amber-100 text-amber-900 border-amber-200" },
  complete: { label: "Complete", className: "bg-[var(--brand)] text-[var(--brand-foreground)] border-transparent" },
};

export function StatusBadge({ status }: { status: StepStatus }) {
  const s = map[status];
  return <Badge className={s.className} variant="outline">{s.label}</Badge>;
}
