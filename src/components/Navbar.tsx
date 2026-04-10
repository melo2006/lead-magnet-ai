import { Link, useLocation } from "react-router-dom";
import { Home, Users, Monitor, Menu, X, Search, Radar, LayoutGrid, PhoneIncoming, FolderInput, FileText, Megaphone } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/campaigns", label: "Campaigns", icon: Users },
  { to: "/landing", label: "Landing Page", icon: Monitor },
];

const crmItems = [
  { to: "/prospects", label: "Prospects", icon: Search },
  { to: "/intent-leads", label: "Intent Leads", icon: Radar },
  { to: "/pipeline", label: "Pipeline", icon: LayoutGrid },
  { to: "/calls", label: "Call History", icon: PhoneIncoming },
  { to: "/imported", label: "Imported Lists", icon: FolderInput },
  { to: "/templates", label: "Templates", icon: FileText },
];

const Navbar = () => {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-[90] bg-background/80 backdrop-blur-xl border-b border-border">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/logo.png" alt="AI Hidden Leads" className="w-9 h-9" />
          <span className="text-lg font-extrabold tracking-tight text-foreground">
            AI <span className="text-primary">Hidden</span> Leads
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden sm:flex items-center gap-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                pathname === to
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="sm:hidden p-2 text-muted-foreground hover:text-foreground"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu - full navigation */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-border bg-background/95 backdrop-blur-xl px-4 py-2 max-h-[calc(100vh-3.5rem)] overflow-y-auto">
          <div className="space-y-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  pathname === to
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>

          <div className="my-2 border-t border-border" />
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground px-3 py-1">CRM</p>
          <div className="space-y-1">
            {crmItems.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  pathname.startsWith(to)
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
