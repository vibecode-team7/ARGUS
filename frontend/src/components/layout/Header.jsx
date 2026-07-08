import { useState, useEffect } from "react";
import { useLocation } from "react-router";
import { Menu, Search } from "lucide-react";
import { healthCheck } from "../../lib/api";
import StatusDot from "../StatusDot";

const PAGE_TITLES = {
  "/": "Dashboard",
  "/hosts": "Hosts",
  "/findings": "Findings",
};

export default function Header({ onMenuClick }) {
  const location = useLocation();
  const [connected, setConnected] = useState(null);

  // Determine page title from pathname
  const getPageTitle = () => {
    if (PAGE_TITLES[location.pathname]) return PAGE_TITLES[location.pathname];
    if (location.pathname.startsWith("/hosts/")) return "Host Detail";
    if (location.pathname.startsWith("/findings/")) return "Scan Detail";
    return "ARGUS";
  };

  // Health check on mount + periodically
  useEffect(() => {
    let active = true;
    const check = () => {
      healthCheck()
        .then(() => active && setConnected(true))
        .catch(() => active && setConnected(false));
    };
    check();
    const interval = setInterval(check, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 px-4 py-3
      bg-bg-primary/80 backdrop-blur-sm border-b border-border
      md:px-6">
      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="flex items-center justify-center w-9 h-9 rounded-lg
          text-text-secondary hover:text-text-primary hover:bg-bg-secondary
          md:hidden transition-colors cursor-pointer"
        aria-label="Open navigation menu"
      >
        <Menu size={20} />
      </button>

      {/* Page title */}
      <h2 className="text-lg font-semibold text-text-primary">{getPageTitle()}</h2>

      <div className="flex-1" />

      {/* Search placeholder */}
      <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg
        bg-bg-secondary border border-border text-text-muted text-sm">
        <Search size={14} />
        <span>Search…</span>
      </div>

      {/* Connection status */}
      <div className="flex items-center gap-2">
        <StatusDot
          status={connected === null ? "yellow" : connected ? "green" : "red"}
          pulse={connected === null}
          label={connected === null ? "Checking…" : connected ? "Connected" : "Disconnected"}
        />
      </div>
    </header>
  );
}
