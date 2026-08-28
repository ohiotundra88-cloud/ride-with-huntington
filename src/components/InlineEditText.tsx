import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Pencil } from "lucide-react";

/**
 * Presentation-only inline editor. When `editing` is false it simply renders
 * the text (or a fallback), so pages look unchanged for non-editors.
 */
export function InlineEditText({
  value,
  onCommit,
  editing,
  multiline = false,
  placeholder = "Add text",
  className,
  as: As = "span",
}: {
  value: string;
  onCommit: (next: string) => void;
  editing: boolean;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
  as?: "span" | "p" | "div";
}) {
  const [active, setActive] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (active) ref.current?.focus();
  }, [active]);

  if (!editing) {
    if (!value) return null;
    return <As className={className}>{value}</As>;
  }

  const commit = () => {
    setActive(false);
    const next = draft.trim();
    if (next !== value) onCommit(next);
  };

  if (active) {
    const shared = {
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
      onBlur: commit,
      placeholder,
      className: "text-sm",
      onClick: (e: React.MouseEvent) => e.stopPropagation(),
    };
    return multiline ? (
      <Textarea
        {...shared}
        rows={3}
        ref={ref as React.Ref<HTMLTextAreaElement>}
        onKeyDown={(e) => {
          if (e.key === "Escape") { setDraft(value); setActive(false); }
        }}
      />
    ) : (
      <Input
        {...shared}
        ref={ref as React.Ref<HTMLInputElement>}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          if (e.key === "Escape") { setDraft(value); setActive(false); }
        }}
      />
    );
  }

  return (
    <As
      className={`${className ?? ""} cursor-text rounded border border-dashed border-[var(--brand)]/60 bg-[var(--brand)]/5 px-1 -mx-1 inline-flex items-baseline gap-1 hover:bg-[var(--brand)]/15`}
      role="button"
      tabIndex={0}
      onClick={(e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setActive(true); }}
      onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); setActive(true); } }}
      title="Click to edit"
    >
      {value || <span className="italic text-muted-foreground">{placeholder}</span>}
      <Pencil className="h-3 w-3 shrink-0 opacity-50" />
    </As>
  );
}
