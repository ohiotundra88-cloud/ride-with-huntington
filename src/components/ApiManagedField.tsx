import { Lock } from "lucide-react";
import { useAdmin } from "@/lib/admin-store";

/**
 * Renders a read-only field that shows source + last sync. Editors use this
 * where a value would otherwise be editable so admins cannot overwrite
 * data owned by an external system.
 */
export function ApiManagedField({ fieldKey, value, label }: { fieldKey: string; value: React.ReactNode; label?: string }) {
  const { isApiManaged } = useAdmin();
  const meta = isApiManaged(fieldKey);
  if (!meta) return <>{value}</>;
  return (
    <div className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/30 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Lock className="h-3 w-3" /> Managed by API
      </div>
      {label && <p className="mt-1 text-xs text-muted-foreground">{label}</p>}
      <div className="mt-1 text-sm text-foreground">{value}</div>
      <p className="mt-1 text-[10px] text-muted-foreground">
        {meta.source} · last sync {meta.lastSync}
      </p>
    </div>
  );
}
