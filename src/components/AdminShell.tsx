import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useAdmin } from "@/lib/admin-store";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  ShieldCheck,
  Eye,
  LogOut,
  LayoutDashboard,
  Megaphone,
  Bell,
  Target,
  ListChecks,
  CalendarDays,
  MessageSquare,
  Users,
  ClipboardList,
  FileText,
  Settings,
  Contact as ContactIcon,
  Home,
} from "lucide-react";
import { toast } from "sonner";

const links = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { to: "/admin/notifications", label: "Notifications", icon: Bell },
  { to: "/admin/goals", label: "Goals", icon: Target },
  { to: "/admin/readiness", label: "Readiness", icon: ClipboardList },
  { to: "/admin/journey", label: "Journey & Schedule", icon: CalendarDays },
  { to: "/admin/packing", label: "Packing List", icon: ListChecks },
  { to: "/admin/family", label: "Family Guide", icon: Users },
  { to: "/admin/concierge", label: "Concierge", icon: MessageSquare },
  { to: "/admin/contacts", label: "Contacts", icon: ContactIcon },
  { to: "/admin/faqs", label: "FAQs", icon: FileText },
  { to: "/admin/participants", label: "Participants", icon: Users },
  { to: "/admin/users", label: "Admins & Super Users", icon: ShieldCheck },
  { to: "/admin/flags", label: "Config & Audit", icon: Settings },
] as const;

export function SuperUserBar() {
  const { state, setState } = useAdmin();
  const { setUser } = useStore();
  const nav = useNavigate();
  const su = state.superUser;

  if (!su.active && !su.previewAs) return null;

  const exit = () => {
    setState((s) => ({ ...s, superUser: { ...s.superUser, active: false, previewAs: null } }));
    setUser({ isAdmin: false });
    toast.success("Exited Super User Mode");
    nav({ to: "/" });
  };

  const startPreview = (as: "participant" | "family" | "standard-admin") => {
    setState((s) => ({ ...s, superUser: { ...s.superUser, previewAs: as } }));
    if (as === "participant") { setUser({ isAdmin: false }); nav({ to: "/dashboard" }); }
    else if (as === "family") { setUser({ isAdmin: false }); nav({ to: "/family" }); }
    else if (as === "standard-admin") { setUser({ isAdmin: true }); nav({ to: "/admin/participants" }); }
  };

  const exitPreview = () => {
    setState((s) => ({ ...s, superUser: { ...s.superUser, previewAs: null } }));
    setUser({ isAdmin: true });
    nav({ to: "/admin" });
  };

  if (su.previewAs) {
    return (
      <div className="sticky top-14 z-30 border-b bg-amber-500/95 text-black">
        <div className="mx-auto max-w-7xl flex items-center gap-3 px-4 py-2 text-sm">
          <Eye className="h-4 w-4" />
          <span className="font-semibold">Previewing as {su.previewAs.replace("-", " ")}</span>
          <span className="hidden sm:inline text-black/70 text-xs">Draft content and preview values only — no changes are saved.</span>
          <Button size="sm" variant="secondary" onClick={exitPreview} className="ml-auto h-7">
            Exit preview
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-14 z-30 bg-[var(--brand)] text-[var(--brand-foreground)] border-b border-black/10">
      <div className="mx-auto max-w-7xl flex flex-wrap items-center gap-3 px-4 py-2 text-sm">
        <span className="inline-flex items-center gap-1.5 font-black">
          <ShieldCheck className="h-4 w-4" /> Super User Mode
        </span>
        <span className="hidden sm:inline rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
          Demo access — production authentication required
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="secondary" className="ml-auto h-7">
              <Eye className="mr-1 h-3.5 w-3.5" /> Preview as…
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>Preview experience</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => startPreview("participant")}>Participant (Rider)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => startPreview("family")}>Family member</DropdownMenuItem>
            <DropdownMenuItem onClick={() => startPreview("standard-admin")}>Standard Admin</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button size="sm" variant="secondary" onClick={exit} className="h-7">
          <LogOut className="mr-1 h-3.5 w-3.5" /> Exit Super User
        </Button>
      </div>
    </div>
  );
}

export function AdminShell({ title, description, actions, children }: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { user } = useStore();
  const { state } = useAdmin();
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  if (!user.isAdmin || !state.superUser.active) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-[var(--brand-dark)]" />
        <h1 className="mt-4 text-2xl font-bold text-[var(--brand-dark)]">Super User access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Open the profile menu and choose "Super User Mode" to enter the administration experience.
          <br />
          Demo access — production authentication required.
        </p>
        <Button asChild className="mt-6"><Link to="/"><Home className="mr-1 h-4 w-4" /> Go home</Link></Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[100rem] px-4 py-6 flex gap-6">
      <aside className="hidden lg:block w-56 shrink-0">
        <nav className="sticky top-32 flex flex-col gap-0.5 text-sm">
          {links.map((l) => {
            const active = pathname === l.to;
            const Ico = l.icon;
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-2 ${active ? "bg-[var(--brand-dark)] text-white" : "text-foreground/80 hover:bg-muted"}`}
              >
                <Ico className="h-4 w-4" /> {l.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Super User</p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-black text-[var(--brand-dark)]">{title}</h1>
            {description && <p className="mt-1 text-sm text-muted-foreground max-w-3xl">{description}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        </div>
        <div className="mt-6 lg:hidden">
          <MobileNav pathname={pathname} />
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  const nav = useNavigate();
  return (
    <select
      value={pathname}
      onChange={(e) => {
        const l = links.find((x) => x.to === e.target.value);
        if (l) nav({ to: l.to });
      }}
      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
      aria-label="Admin section"
    >
      {links.map((l) => (
        <option key={l.to} value={l.to}>{l.label}</option>
      ))}
    </select>
  );
}
