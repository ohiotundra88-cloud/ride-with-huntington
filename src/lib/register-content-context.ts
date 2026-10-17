import { createContext, useContext } from "react";
import {
  DEFAULT_REGISTER_CONTENT,
  type RegisterContent,
  type RegisterOption,
} from "@/lib/register-content.shared";

export interface EditCtx {
  content: RegisterContent;
  editing: boolean;
  setContent: (next: RegisterContent) => void;
}

export const RegisterContentCtx = createContext<EditCtx | null>(null);

export function useRegisterContent() {
  const c = useContext(RegisterContentCtx);
  if (!c) throw new Error("useRegisterContent must be used inside RegisterContentProvider");
  const { content, editing, setContent } = c;

  const t = (key: string) => content.text[key] ?? DEFAULT_REGISTER_CONTENT.text[key] ?? "";
  const field = (key: string) =>
    content.fields[key] ??
    DEFAULT_REGISTER_CONTENT.fields[key] ?? { label: key, visible: true, required: false };
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

  return {
    content,
    editing,
    setContent,
    t,
    field,
    list,
    link,
    setText,
    setField,
    setList,
    setLink,
  };
}
