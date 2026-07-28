import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, User as UserIcon, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { NotificationCenter } from "@/components/NotificationCenter";

const links = [
  { to: "/", label: "Home" },
  { to: "/dashboard", label: "My Journey" },
  { to: "/register", label: "Register" },
  { to: "/packing", label: "Packing" },
  { to: "/family", label: "Family" },
  { to: "/team", label: "Team" },
  { to: "/resources", label: "Resources" },
  { to: "/expenses", label: "Expenses" },
] as const;

export function AppNav() {
  const { user, setUser } = useStore();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <header className="sticky top-0 z-40 bg-[var(--brand-dark)] text-[var(--brand-dark-foreground)] border-b border-white/10">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open menu" className="md:hidden text-white hover:bg-white/10">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 bg-[var(--brand-dark)] text-white border-r border-white/10">
            <div className="mt-8 flex flex-col gap-1">
              {links.map((l) => (
                <Link key={l.to} to={l.to} onClick={() => setOpen(false)}
                  className={`rounded-md px-3 py-2 text-sm ${pathname === l.to ? "bg-[var(--brand)] text-[var(--brand-foreground)]" : "hover:bg-white/10"}`}>
                  {l.label}
                </Link>
              ))}
              {user.isAdmin && (
                <>
                  <Link to="/admin" onClick={() => setOpen(false)}
                    className={`rounded-md px-3 py-2 text-sm ${pathname === "/admin" ? "bg-[var(--brand)] text-[var(--brand-foreground)]" : "hover:bg-white/10"}`}>
                    Admin
                  </Link>
                  <Link to="/analytics" onClick={() => setOpen(false)}
                    className={`rounded-md px-3 py-2 text-sm ${pathname === "/analytics" ? "bg-[var(--brand)] text-[var(--brand-foreground)]" : "hover:bg-white/10"}`}>
                    Analytics
                  </Link>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>

        <Link to="/" className="flex items-center gap-2 font-black tracking-tight">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-[var(--brand)] text-[var(--brand-foreground)]">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M4 12h12M12 6l6 6-6 6" />
            </svg>
          </div>
          <span className="text-sm sm:text-base">Team Huntington Hub</span>
        </Link>

        <nav className="ml-6 hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link key={l.to} to={l.to}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${pathname === l.to ? "bg-white/10 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"}`}>
              {l.label}
            </Link>
          ))}
          {user.isAdmin && (
            <>
              <Link to="/admin"
                className={`rounded-md px-3 py-1.5 text-sm ${pathname === "/admin" ? "bg-white/10 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"}`}>
                Admin
              </Link>
              <Link to="/analytics"
                className={`rounded-md px-3 py-1.5 text-sm ${pathname === "/analytics" ? "bg-white/10 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"}`}>
                Analytics
              </Link>
            </>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <NotificationCenter />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 gap-2">
                {user.isAdmin ? <ShieldCheck className="h-4 w-4" /> : <UserIcon className="h-4 w-4" />}
                <span className="hidden sm:inline text-xs">{user.signedIn ? user.name.split(" ")[0] : "Guest"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Demo Modes</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={user.signedIn}
                onCheckedChange={(v) => setUser({ signedIn: !!v })}
              >Signed in</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={user.isAdmin}
                onCheckedChange={(v) => setUser({ isAdmin: !!v })}
              >Admin mode</DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link to="/signin">Sign in / Profile</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/profile">Edit profile</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/confirmation">Confirmation preview</Link></DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export function ArrowMotif() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <svg className="absolute -right-20 -top-24 h-[520px] w-[520px] opacity-[0.07]" viewBox="0 0 200 200" fill="none">
        <g stroke="currentColor" strokeWidth="1.2">
          {Array.from({ length: 12 }).map((_, i) => (
            <path key={i} d={`M${10 + i * 8} 180 L${90 + i * 8} 100 L${10 + i * 8} 20`} />
          ))}
        </g>
      </svg>
      <svg className="absolute -left-24 bottom-0 h-[400px] w-[400px] opacity-[0.05]" viewBox="0 0 200 200" fill="none">
        <g stroke="currentColor" strokeWidth="1.2">
          {Array.from({ length: 10 }).map((_, i) => (
            <path key={i} d={`M${10 + i * 10} 20 L${90 + i * 10} 100 L${10 + i * 10} 180`} />
          ))}
        </g>
      </svg>
    </div>
  );
}
