import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router";
import { Menu, Search, X, ArrowRight } from "lucide-react";
import { healthCheck, fetchHosts } from "../../lib/api";
import StatusDot from "../StatusDot";

const PAGE_TITLES = {
  "/dashboard": "Dashboard",
  "/hosts": "Hosts",
  "/findings": "Findings",
  "/trends": "Trends",
};

export default function Header({ onMenuClick }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [connected, setConnected] = useState(null);

  // Search state
  const [query, setQuery] = useState("");
  const [hosts, setHosts] = useState([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

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

  // Fetch hosts on mount for search suggestions
  useEffect(() => {
    const ctrl = new AbortController();
    fetchHosts({ signal: ctrl.signal })
      .then(setHosts)
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  // Filter hosts by query
  const matches = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return hosts
      .filter(
        (h) =>
          h.hostname.toLowerCase().includes(q) ||
          h.os.toLowerCase().includes(q) ||
          (h.ip_address && h.ip_address.includes(q))
      )
      .slice(0, 8);
  }, [query, hosts]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close on route change
  useEffect(() => {
    setOpen(false);
    setQuery("");
  }, [location.pathname]);

  const selectHost = (hostname) => {
    setOpen(false);
    setQuery("");
    navigate(`/hosts/${encodeURIComponent(hostname)}`);
  };

  const submitSearch = () => {
    const q = query.trim();
    if (!q) return;

    // Exact hostname match → go to host detail
    const exact = hosts.find((h) => h.hostname.toLowerCase() === q.toLowerCase());
    if (exact) {
      selectHost(exact.hostname);
      return;
    }

    // Otherwise → findings page filtered by hostname query
    setOpen(false);
    setQuery("");
    navigate(`/findings?hostname=${encodeURIComponent(q)}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx >= 0 && matches[activeIdx]) {
        selectHost(matches[activeIdx].hostname);
      } else {
        submitSearch();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-4 px-4 py-3
        bg-bg-primary/80 backdrop-blur-sm border-b border-border
        md:px-6"
    >
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

      {/* Search */}
      <div className="relative hidden md:block" ref={dropdownRef}>
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm
            transition-colors ${
              open
                ? "bg-bg-input border-accent shadow-[0_0_0_2px_rgba(99,102,241,0.2)]"
                : "bg-bg-input border-border text-text-muted hover:border-border-hover"
            }`}
        >
          <Search size={14} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIdx(-1);
              setOpen(true);
            }}
            onFocus={() => query.trim() && setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search hosts…"
            className="bg-transparent outline-none focus-visible:outline-none focus:outline-none focus:ring-0 text-text-primary placeholder:text-text-muted w-44 lg:w-56"
            aria-label="Search hosts by name, OS, or IP"
            aria-expanded={open && matches.length > 0}
            aria-controls="search-results"
            role="combobox"
            aria-autocomplete="list"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setOpen(false);
                inputRef.current?.focus();
              }}
              className="text-text-muted hover:text-text-primary cursor-pointer"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Dropdown */}
        {open && matches.length > 0 && (
          <ul
            id="search-results"
            role="listbox"
            className="absolute right-0 top-full mt-1 w-80 max-h-72 overflow-auto
              rounded-xl bg-bg-card border border-border shadow-lg z-50"
          >
            {matches.map((h, idx) => (
              <li
                key={h.hostname}
                role="option"
                aria-selected={idx === activeIdx}
                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer text-sm
                  transition-colors ${
                    idx === activeIdx
                      ? "bg-accent-light text-accent"
                      : "hover:bg-bg-secondary text-text-primary"
                  }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectHost(h.hostname)}
                onMouseEnter={() => setActiveIdx(idx)}
              >
                <Search size={14} className="text-text-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{h.hostname}</p>
                  <p className="text-xs text-text-muted">
                    {h.os} {h.ip_address && `· ${h.ip_address}`}
                  </p>
                </div>
                <ArrowRight size={12} className="text-text-muted shrink-0" />
              </li>
            ))}
            {/* "Search for …" option */}
            {query.trim() && !hosts.some((h) => h.hostname.toLowerCase() === query.trim().toLowerCase()) && (
              <li
                role="option"
                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer text-sm
                  border-t border-border transition-colors ${
                    activeIdx === matches.length
                      ? "bg-accent-light text-accent"
                      : "hover:bg-bg-secondary text-text-secondary"
                  }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={submitSearch}
                onMouseEnter={() => setActiveIdx(matches.length)}
              >
                <Search size={14} className="text-text-muted shrink-0" />
                <span>
                  Search findings for "<span className="font-medium text-text-primary">{query.trim()}</span>"
                </span>
              </li>
            )}
          </ul>
        )}
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
