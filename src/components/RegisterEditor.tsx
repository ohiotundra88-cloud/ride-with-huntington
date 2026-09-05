import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Settings2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { InlineEditText } from "@/components/InlineEditText";
import {
  DEFAULT_REGISTER_CONTENT,
  type RegisterContent,
  type RegisterOption,
} from "@/lib/register-content.shared";

interface EditCtx {
  content: RegisterContent;
  editing: boolean;
  setContent: (next: RegisterContent) => void;
}

const Ctx = createContext<EditCtx | null>(null);

export function RegisterContentProvider({
  content,
  editing,
  setContent,
  children,
}: EditCtx & { children: ReactNode }) {
  const value = useMemo(() => ({ content, editing, setContent }), [content, editing, setContent]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRegisterContent() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useRegisterContent must be used inside RegisterContentProvider");
  const { content, editing, setContent } = c;

  const t = (key: string) => content.text[key] ?? DEFAULT_REGISTER_CONTENT.text[key] ?? "";
  const field = (key: string) =>
    content.fields[key] ?? DEFAULT_REGISTER_CONTENT.fields[key] ?? { label: key, visible: true, required: false };
  const list = (key: string) => content.lists[key] ?? DEFAULT_REGISTER_CONTENT.lists[key] ?? [];
  const link = (key: string) =>
    content.links[key] ?? DEFAULT_REGISTER_CONTENT.links[key] ?? { label: key, url: "about:blank" };

  const setText = (key: string, next: string) =>
    setContent({ ...content, text: { ...content.text, [key]: next } });
  const setField = (key: string, patch: Partial<RegisterContent["fields"][string]>) =>
    setContent({ ...content, fields: { ...content.fields, [key]: { ...field(key), ...patch } } });
  const setList = (key: string, next: RegisterOption[]) =>
    setContent({ ...content, lists: { ...content.lists, [key]: next } });
  const setLink = (key: string, patch: Partial<RegisterContent["links"][string]>) =>
    setContent({ ...content, links: { ...content.links, [key]: { ...link(key), ...patch } } });

  return { content, editing, setContent, t, field, list, link, setText, setField, setList, setLink };
}

/** Editable piece of copy. Renders plain text for everyone else. */
export function Copy({
  k,
  className,
  as = "span",
  multiline = false,
}: {
  k: string;
  className?: string;
  as?: "span" | "p" | "div";
  multiline?: boolean;
}) {
  const { t, editing, setText } = useRegisterContent();
  const As = as;
  if (!editing) return <As className={className}>{t(k)}</As>;
  return (
    <InlineEditText
      value={t(k)}
      editing
      as={as}
      multiline={multiline}
      className={className}
      onCommit={(next) => setText(k, next)}
    />
  );
}

/** Field label plus (for Super Users) a gear with visibility / required / options. */
export function FieldLabel({
  name,
  listKey,
  className,
}: {
  name: string;
  listKey?: string;
  className?: string;
}) {
  const { field, editing, setField } = useRegisterContent();
  const f = field(name);
  return (
    <span className={`inline-flex items-center gap-1.5 ${className ?? ""}`}>
      {editing ? (
        <InlineEditText value={f.label} editing onCommit={(next) => setField(name, { label: next })} />
      ) : (
        <span>{f.label}</span>
      )}
      {f.required && <span className="text-red-500">*</span>}
      {editing && <FieldSettings name={name} listKey={listKey} />}
    </span>
  );
}

function FieldSettings({ name, listKey }: { name: string; listKey?: string }) {
  const { field, setField, list, setList } = useRegisterContent();
  const f = field(name);
  const options = listKey ? list(listKey) : [];

  const move = (i: number, dir: -1 | 1) => {
    const next = [...options];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setList(listKey!, next);
  };
  const rename = (i: number, label: string) => {
    const next = options.map((o, idx) => (idx === i ? { ...o, label } : o));
    setList(listKey!, next);
  };
  const remove = (i: number) => {
    if (options.length <= 1) return;
    setList(listKey!, options.filter((_, idx) => idx !== i));
  };
  const add = () => {
    const value = `option-${Date.now().toString(36)}`;
    setList(listKey!, [...options, { value, label: "New option" }]);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-[var(--brand-dark)]" title="Field settings">
          <Settings2 className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-xs">
            {f.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />} Visible
          </Label>
          <Switch checked={f.visible} onCheckedChange={(v) => setField(name, { visible: v })} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-xs">Required</Label>
          <Switch checked={f.required} onCheckedChange={(v) => setField(name, { required: v })} />
        </div>
        {listKey && (
          <div className="space-y-2 border-t pt-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Choices</p>
            {options.map((o, i) => (
              <div key={o.value} className="flex items-center gap-1">
                <Input
                  value={o.label}
                  onChange={(e) => rename(i, e.target.value)}
                  className="h-8 text-xs"
                />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(i, -1)} title="Move up">
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(i, 1)} title="Move down">
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-500"
                  onClick={() => remove(i)}
                  title="Remove"
                  disabled={options.length <= 1}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full" onClick={add}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add choice
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Standalone editor for a choice list that isn't tied to a single labelled field. */
export function ListSettings({ listKey, title, withDesc = false }: { listKey: string; title: string; withDesc?: boolean }) {
  const { editing, list, setList } = useRegisterContent();
  if (!editing) return null;
  const options = list(listKey);
  const patch = (i: number, p: Partial<RegisterOption>) =>
    setList(listKey, options.map((o, idx) => (idx === i ? { ...o, ...p } : o)));
  const move = (i: number, dir: -1 | 1) => {
    const next = [...options];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setList(listKey, next);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Settings2 className="h-3.5 w-3.5" /> {title}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-96 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
        {options.map((o, i) => (
          <div key={o.value} className="flex items-center gap-1">
            <Input value={o.label} onChange={(e) => patch(i, { label: e.target.value })} className="h-8 text-xs" />
            {withDesc && (
              <Input
                value={o.desc ?? ""}
                onChange={(e) => patch(i, { desc: e.target.value })}
                className="h-8 text-xs"
                placeholder="Description"
              />
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(i, -1)} title="Move up">
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => move(i, 1)} title="Move down">
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-500"
              onClick={() => options.length > 1 && setList(listKey, options.filter((_, idx) => idx !== i))}
              title="Remove"
              disabled={options.length <= 1}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setList(listKey, [...options, { value: `option-${Date.now().toString(36)}`, label: "New option" }])}
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Add choice
        </Button>
      </PopoverContent>
    </Popover>
  );
}

/** Editable label + web address for one of the outbound buttons. */
export function LinkSettings({ linkKey }: { linkKey: string }) {
  const { editing, link, setLink } = useRegisterContent();
  const [draft, setDraft] = useState<string | null>(null);
  if (!editing) return null;
  const l = link(linkKey);
  return (
    <Popover onOpenChange={(o) => setDraft(o ? l.url : null)}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Settings2 className="h-3.5 w-3.5" /> Button & link
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 space-y-2">
        <Label className="text-xs">Button label</Label>
        <Input value={l.label} onChange={(e) => setLink(linkKey, { label: e.target.value })} className="h-8 text-xs" />
        <Label className="text-xs">Web address</Label>
        <Input
          value={draft ?? l.url}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => draft !== null && setLink(linkKey, { url: draft.trim() })}
          className="h-8 text-xs"
          placeholder="https://…"
        />
      </PopoverContent>
    </Popover>
  );
}
