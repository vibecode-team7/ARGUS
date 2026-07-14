import { NavLink, useNavigate } from "react-router";
import { LayoutDashboard, Server, FileWarning, Shield, TrendingUp, LogOut } from "lucide-react";
import ThemeToggle from "../ThemeToggle";
import { useAuth } from "../../context/AuthContext";

const NAV_ITEMS = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/hosts", icon: Server, label: "Hosts" },
  { to: "/findings", icon: FileWarning, label: "Findings" },
  { to: "/trends", icon: TrendingUp, label: "Trends" },
];

export default function Sidebar({ open, onClose }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    onClose?.();
    navigate("/login", { replace: true });
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-bg-sidebar border-r border-border
          flex flex-col
          transition-transform duration-200 ease-in-out
          md:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
        aria-label="Main navigation"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-text-primary tracking-tight">ARGUS</h1>
            <p className="text-[10px] uppercase tracking-widest text-text-muted">Shadow AI Scanner</p>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${
                  isActive
                    ? "bg-accent text-white"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
                }`
              }
              aria-current={({ isActive }) => (isActive ? "page" : undefined)}
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Theme toggle + logout at bottom */}
        <div className="px-3 py-4 border-t border-border space-y-1">
          <div className="flex items-center justify-between px-2 pb-3">
            <span className="text-xs text-text-muted">Theme</span>
            <ThemeToggle />
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium
              text-text-secondary hover:text-text-primary hover:bg-bg-secondary
              transition-colors cursor-pointer"
          >
            <LogOut size={18} />
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
