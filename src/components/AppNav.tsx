import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Menu, User as UserIcon, ShieldCheck, LogOut, LogIn } from "lucide-react";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { useAdmin } from "@/lib/admin-store";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { NotificationCenter } from "@/components/NotificationCenter";
import { toast } from "sonner";
import { useApprovalNotifications } from "@/lib/useApprovalNotifications";

const links = [
  { to: "/", label: "Home" },
  { to: "/dashboard", label: "My Journey" },
  { to: "/register", label: "Register" },
  { to: "/packing", label: "Packing" },
  { to: "/family", label: "Family" },
  { to: "/team", label: "Team" },
  { to: "/events", label: "Events" },
  { to: "/fundraiser-request", label: "Fundraiser Request" },
  { to: "/resources", label: "Resources" },
  { to: "/expenses", label: "Expenses" },
] as const;

export function AppNav() {
  const { user, signOut } = useStore();
  const { state, setState } = useAdmin();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const nav = useNavigate();
  useApprovalNotifications();

  const enterSuperUser = () => {
    setState((s) => ({ ...s, superUser: { ...s.superUser, active: true, previewAs: null, currentEditor: user.name } }));
    toast.success(`Super User Mode enabled`);
    nav({ to: "/admin" });
  };

  const handleSignOut = async () => {
    await signOut();
    setState((s) => ({ ...s, superUser: { ...s.superUser, active: false, previewAs: null } }));
    toast.success("Signed out");
    nav({ to: "/" });
  };

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
              {state.superUser.active && (
                <Link to="/admin" onClick={() => setOpen(false)}
                  className={`rounded-md px-3 py-2 text-sm ${pathname.startsWith("/admin") ? "bg-[var(--brand)] text-[var(--brand-foreground)]" : "hover:bg-white/10"}`}>
                  Super User
                </Link>
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
          {state.superUser.active && (
            <Link to="/admin"
              className={`rounded-md px-3 py-1.5 text-sm inline-flex items-center gap-1 ${pathname.startsWith("/admin") ? "bg-white/10 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"}`}>
              <ShieldCheck className="h-3.5 w-3.5" /> Super User
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          {state.flags.notificationCenter && <NotificationCenter />}
          {user.signedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 gap-2">
                  {user.isAdmin ? <ShieldCheck className="h-4 w-4 text-[var(--brand)]" /> : <UserIcon className="h-4 w-4" />}
                  <span className="hidden sm:inline text-xs">{user.name.split(" ")[0]}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>
                  <div className="font-normal text-xs text-muted-foreground">Signed in as</div>
                  <div className="truncate text-sm">{user.email}</div>
                  {user.isAdmin && <div className="mt-1 inline-flex items-center gap-1 rounded bg-[var(--brand)]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--brand-dark)]"><ShieldCheck className="h-3 w-3" /> ADMIN</div>}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {user.isAdmin && (
                  state.superUser.active ? (
                    <DropdownMenuItem onClick={() => { setState((s) => ({ ...s, superUser: { ...s.superUser, active: false, previewAs: null } })); toast.success("Exited Super User Mode"); nav({ to: "/" }); }}>
                      Exit Super User Mode
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={enterSuperUser}>
                      <ShieldCheck className="mr-2 h-4 w-4 text-[var(--brand)]" /> Enter Super User Mode
                    </DropdownMenuItem>
                  )
                )}
                <DropdownMenuItem asChild><Link to="/profile">Edit profile</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link to="/dashboard">My Journey</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="ghost" size="sm" className="text-white hover:bg-white/10 gap-2">
              <Link to="/signin"><LogIn className="h-4 w-4" /> <span className="hidden sm:inline text-xs">Sign in</span></Link>
            </Button>
          )}
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
