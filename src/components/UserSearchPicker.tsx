import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { searchRegisteredUsers, type RegisteredUserRow } from "@/lib/roles-manage.functions";

/**
 * Search-as-you-type picker over registered colleagues (admin-only search).
 * Selecting a person hands their email to `onSelect` for the parent form to act on.
 */
export function UserSearchPicker({
  id,
  label = "Find a colleague",
  placeholder = "Type a name or email…",
  onSelect,
  disabled,
}: {
  id: string;
  label?: string;
  placeholder?: string;
  onSelect: (user: RegisteredUserRow) => void;
  disabled?: boolean;
}) {
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term.trim()), 250);
    return () => clearTimeout(t);
  }, [term]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const { data: results = [], isFetching } = useQuery<RegisteredUserRow[]>({
    queryKey: ["registered-user-search", debounced],
    queryFn: () => searchRegisteredUsers({ data: { query: debounced } }),
    enabled: debounced.length >= 2,
  });

  return (
    <div className="space-y-1.5" ref={boxRef}>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          placeholder={placeholder}
          value={term}
          disabled={disabled}
          autoComplete="off"
          onChange={(e) => {
            setTerm(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        {isFetching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
        {open && debounced.length >= 2 && !isFetching && (
          <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
            {results.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                No registered colleague matches “{debounced}”. They need to sign in once first.
              </p>
            ) : (
              <ul>
                {results.map((u) => (
                  <li key={u.user_id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-accent"
                      onClick={() => {
                        onSelect(u);
                        setTerm("");
                        setDebounced("");
                        setOpen(false);
                      }}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{u.full_name || u.email}</span>
                        <span className="block truncate text-xs text-muted-foreground">{u.email}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
