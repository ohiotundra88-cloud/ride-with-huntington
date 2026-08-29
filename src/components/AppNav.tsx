import { useBranding } from "@/lib/useBranding";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Menu, User as UserIcon, ShieldCheck, LogOut, LogIn, ChevronDown } from "lucide-react";
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
import { useVendorAccess } from "@/components/VendorGate";
import { useQuery } from "@tanstack/react-query";
import { getRiderProgressAccess } from "@/lib/rider-progress.functions";
import { getMessagingAccess } from "@/lib/messages.functions";


type NavItem = { to: any; label: string; show?: (c: NavCtx) => boolean };
type NavGroup = { label: string; items: NavItem[] };
type NavCtx = { signedIn: boolean; isReviewer: boolean; vendorAccess: boolean; riderProgress: boolean; messaging: boolean };

const topLinks: NavItem[] = [
  { to: "/", label: "Home" },
  { to: "/dashboard", label: "My Journey" },
];

const groups: NavGroup[] = [
  {
    label: "Team",
    items: [
      { to: "/team", label: "Team" },
      { to: "/family", label: "Family" },
      { to: "/events", label: "Events" },
      { to: "/packing", label: "Packing" },
      { to: "/rider-progress", label: "Rider Progress", show: (c) => c.riderProgress },
      { to: "/inbox", label: "My Inbox", show: (c) => c.signedIn },
      { to: "/messages", label: "Team Messages", show: (c) => c.messaging },
    ],
  },
  {
    label: "Fundraising",
    items: [
      { to: "/fundraisers", label: "Fundraisers" },
      { to: "/fundraiser-request", label: "Fundraiser Request" },
      { to: "/my-fundraisers", label: "My Fundraisers", show: (c) => c.signedIn },
      { to: "/captains-lounge", label: "Captains Lounge", show: (c) => c.signedIn && c.isReviewer },
      { to: "/vendors", label: "Vendor CRM", show: (c) => c.vendorAccess },
    ],
  },
  {
    label: "Resources",
    items: [
      { to: "/register", label: "Register" },
      { to: "/resources", label: "Resources" },
      { to: "/expenses", label: "Expenses" },
    ],
  },
];


export function AppNav() {
  const { user, signOut } = useStore();
  const { state, setState } = useAdmin();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const nav = useNavigate();
  useApprovalNotifications();

  const { data: vendorAccess } = useVendorAccess();
  const { data: riderProgress } = useQuery({
    queryKey: ["rider-progress-access"],
    queryFn: () => getRiderProgressAccess(),
    enabled: user.signedIn,
    retry: false,
    staleTime: 60_000,
  });

  const { data: messaging } = useQuery({
    queryKey: ["messaging-access"],
    queryFn: () => getMessagingAccess(),
    enabled: user.signedIn,
    retry: false,
    staleTime: 60_000,
  });

  const ctx: NavCtx = {
    signedIn: user.signedIn,
    isReviewer: !!user.isReviewer,
    vendorAccess: !!vendorAccess?.allowed,
    riderProgress: !!riderProgress?.allowed,
    messaging: !!messaging?.allowed,
  };
  // Signed-out visitors only see genuinely public destinations.
  const PUBLIC_TO = ["/family", "/fundraisers"];
  const visibleTop = ctx.signedIn ? topLinks : topLinks.filter((l) => l.to === "/");
  const visibleGroups = groups
    .map((g) => ({
      ...g,
      items: g.items.filter(
        (i) => (!i.show || i.show(ctx)) && (ctx.signedIn || PUBLIC_TO.includes(i.to)),
      ),
    }))
    .filter((g) => g.items.length > 0);



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
          <SheetContent side="left" className="w-72 overflow-y-auto bg-[var(--brand-dark)] text-white border-r border-white/10">
            <div className="mt-8 flex flex-col gap-1">
              {visibleTop.map((l) => (
                <Link key={l.to} to={l.to} onClick={() => setOpen(false)}
                  className={`rounded-md px-3 py-2 text-sm ${pathname === l.to ? "bg-[var(--brand)] text-[var(--brand-foreground)]" : "hover:bg-white/10"}`}>
                  {l.label}
                </Link>
              ))}
              {visibleGroups.map((g) => (
                <div key={g.label} className="mt-3">
                  <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-white/50">{g.label}</div>
                  {g.items.map((l) => (
                    <Link key={l.to} to={l.to} onClick={() => setOpen(false)}
                      className={`block rounded-md px-3 py-2 text-sm ${pathname === l.to ? "bg-[var(--brand)] text-[var(--brand-foreground)]" : "hover:bg-white/10"}`}>
                      {l.label}
                    </Link>
                  ))}
                </div>
              ))}
              {state.superUser.active && (
                <Link to="/admin" onClick={() => setOpen(false)}
                  className={`mt-3 rounded-md px-3 py-2 text-sm ${pathname.startsWith("/admin") ? "bg-[var(--brand)] text-[var(--brand-foreground)]" : "hover:bg-white/10"}`}>
                  Super User
                </Link>
              )}
            </div>
          </SheetContent>
        </Sheet>

        <Link to="/" className="flex shrink-0 items-center gap-2 font-black tracking-tight">
          <BrandMark />
          <span className="whitespace-nowrap text-sm sm:text-base">
            Team Huntington<span className="hidden xl:inline"> Hub</span>
          </span>
        </Link>

        <nav className="ml-4 hidden items-center gap-0.5 md:flex">
          {visibleTop.map((l) => (
            <Link key={l.to} to={l.to}
              className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs xl:text-sm transition-colors ${pathname === l.to ? "bg-white/10 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"}`}>
              {l.label}
            </Link>
          ))}

          {visibleGroups.map((g) => {
            const active = g.items.some((i) => pathname === i.to || pathname.startsWith(`${i.to}/`));
            return (
              <DropdownMenu key={g.label}>
                <DropdownMenuTrigger
                  className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs outline-none transition-colors xl:text-sm ${active ? "bg-white/10 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"}`}>
                  {g.label}
                  <ChevronDown className="h-3.5 w-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {g.items.map((l) => (
                    <DropdownMenuItem key={l.to} asChild>
                      <Link to={l.to} className={pathname === l.to ? "font-semibold" : ""}>{l.label}</Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}

          {state.superUser.active && (
            <Link to="/admin"
              className={`ml-1 inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs xl:text-sm ${pathname.startsWith("/admin") ? "bg-[var(--brand)] text-[var(--brand-foreground)]" : "text-white/80 hover:bg-white/10 hover:text-white"}`}>
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

/** Header icon — a super-user uploaded logo, or the default arrow mark. */
export function BrandMark() {
  const { logoUrl } = useBranding();
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt="Team Huntington Hub logo"
        className="h-8 w-8 rounded-md object-cover bg-white/10"
      />
    );
  }
  return (
    <div className="grid h-8 w-8 place-items-center rounded-md bg-[var(--brand)] text-[var(--brand-foreground)]">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3">
        <path d="M4 12h12M12 6l6 6-6 6" />
      </svg>
    </div>
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
