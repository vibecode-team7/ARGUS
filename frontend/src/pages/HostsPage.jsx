import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import { Link } from "react-router";
import { ArrowUpDown, ArrowUp, ArrowDown, Monitor, Laptop, Search, X, Trash2 } from "lucide-react";
import { useHosts } from "../hooks/useHosts";
import { deleteHosts } from "../lib/api";
import StatusDot from "../components/StatusDot";
import SeverityBadge from "../components/SeverityBadge";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import ConfirmDialog from "../components/ConfirmDialog";
import SeoHead from "../components/SeoHead";
import { timeAgo, getAgentStatus } from "../lib/timeAgo";
import { getSeverityColor } from "../lib/severity";

function getOsIcon(os) {
  if (os === "darwin") return Laptop;
  return Monitor;
}

const COLUMNS = [
  { key: "hostname", label: "Hostname" },
  { key: "os", label: "OS" },
  { key: "ip_address", label: "IP Address" },
  { key: "last_seen", label: "Last Seen" },
  { key: "high", label: "High" },
  { key: "medium", label: "Medium" },
  { key: "low", label: "Low" },
  { key: "total_findings", label: "Total" },
  { key: "risk", label: "Risk" },
  { key: "status", label: "Status" },
];

// Weighted so a single High always outranks any number of Medium/Low findings.
function riskScore(host) {
  return host.high * 100 + host.medium * 10 + host.low;
}

export default function HostsPage() {
  const { data: hosts, loading, error, refetch } = useHosts();
  const [sortKey, setSortKey] = useState("last_seen");
  const [sortDir, setSortDir] = useState("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [selectedHostnames, setSelectedHostnames] = useState(new Set());
  const [deleting, setDeleting] = useState(false);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    if (!hosts) return [];
    if (!searchQuery.trim()) return hosts;
    const q = searchQuery.toLowerCase();
    return hosts.filter(
      (h) =>
        h.hostname.toLowerCase().includes(q) ||
        h.os.toLowerCase().includes(q) ||
        (h.ip_address && h.ip_address.toLowerCase().includes(q))
    );
  }, [hosts, searchQuery]);

  const sorted = useMemo(() => {
    if (!filtered) return [];
    return [...filtered].sort((a, b) => {
      let av = a[sortKey];
      let bv = b[sortKey];
      if (sortKey === "last_seen") {
        av = new Date(av).getTime();
        bv = new Date(bv).getTime();
      }
      if (sortKey === "status") {
        const order = { green: 0, yellow: 1, red: 2 };
        av = order[getAgentStatus(av)] ?? 3;
        bv = order[getAgentStatus(bv)] ?? 3;
      }
      if (sortKey === "risk") {
        av = riskScore(a);
        bv = riskScore(b);
      }
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const selectAllRef = useRef(null);

  const allPageSelected =
    sorted.length > 0 && sorted.every((h) => selectedHostnames.has(h.hostname));
  const somePageSelected = sorted.some((h) => selectedHostnames.has(h.hostname));

  // Update indeterminate state on the Select All checkbox
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = somePageSelected && !allPageSelected;
    }
  }, [somePageSelected, allPageSelected]);

  const toggleHostSelection = (hostname) => {
    setSelectedHostnames((prev) => {
      const next = new Set(prev);
      if (next.has(hostname)) next.delete(hostname);
      else next.add(hostname);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const pageSet = new Set(sorted.map((h) => h.hostname));
    setSelectedHostnames((prev) => {
      const allOn = [...pageSet].every((h) => prev.has(h));
      const next = new Set(prev);
      if (allOn) {
        for (const h of pageSet) next.delete(h);
      } else {
        for (const h of pageSet) next.add(h);
      }
      return next;
    });
  };

  const clearSelected = useCallback(async () => {
    setShowClearConfirm(false);
    if (selectedHostnames.size === 0) return;
    setDeleting(true);
    try {
      await deleteHosts([...selectedHostnames]);
      setSelectedHostnames(new Set());
      refetch();
    } catch (err) {
      console.error("Failed to delete hosts:", err);
    } finally {
      setDeleting(false);
    }
  }, [selectedHostnames, refetch]);

  if (error) return <ErrorState error={error} onRetry={refetch} />;

  const SortIcon = ({ colKey }) => {
    if (sortKey !== colKey) return <ArrowUpDown size={12} className="text-text-muted" />;
    return sortDir === "asc"
      ? <ArrowUp size={12} className="text-accent" />
      : <ArrowDown size={12} className="text-accent" />;
  };

  if (!loading && sorted.length === 0 && !searchQuery) {
    return (
      <>
        <SeoHead title="Hosts" description="Monitor all scanned endpoints and their Shadow AI risk levels." />
        <EmptyState icon={Monitor} title="No hosts reporting yet" description="Deploy agents to start monitoring." />
      </>
    );
  }

  return (
    <>
      <SeoHead title="Hosts" description="Monitor all scanned endpoints and their Shadow AI risk levels." />
      <div className="space-y-4">
      {/* Search bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-bg-input text-sm transition-colors focus-within:border-border-hover w-full sm:w-auto">
          <Search size={14} className="text-text-muted shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search hosts by name, OS, or IP…"
            className="bg-transparent outline-none focus-visible:outline-none text-text-primary placeholder:text-text-muted w-full sm:w-48"
            aria-label="Search hosts"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-text-muted hover:text-text-primary cursor-pointer"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
        {searchQuery && (
          <span className="text-xs text-text-muted">
            {sorted.length} host{sorted.length !== 1 ? "s" : ""} match
            {sorted.length !== 1 ? "" : "es"}
          </span>
        )}
        <button
          type="button"
          onClick={() => setShowClearConfirm(true)}
          disabled={loading || selectedHostnames.size === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-bg-card px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:text-danger hover:border-red-400 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
        >
          <Trash2 size={12} />
          {selectedHostnames.size === 0
            ? "Clear History"
            : `Clear (${selectedHostnames.size})`}
        </button>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm" aria-label="Hosts list">
          <thead>
            <tr className="border-b border-border bg-bg-secondary">
              <th className="px-4 py-3 w-10">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={toggleSelectAll}
                  className="accent-accent cursor-pointer"
                  aria-label="Select all hosts on this page"
                />
              </th>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left font-semibold text-text-secondary cursor-pointer select-none hover:text-text-primary transition-colors"
                  onClick={() => toggleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    <SortIcon colKey={col.key} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {COLUMNS.map((col) => (
                    <td key={col.key} className="px-4 py-3"><div className="skeleton h-4 w-full" /></td>
                  ))}
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length + 1}>
                  <EmptyState
                    icon={Search}
                    title="No hosts match your search"
                    description="Try adjusting your search query."
                  />
                </td>
              </tr>
            ) : (
              sorted.map((host) => {
                const OsIcon = getOsIcon(host.os);
                const status = getAgentStatus(host.last_seen);
                return (
                  <tr
                    key={host.hostname}
                    className="border-b border-border last:border-0 hover:bg-bg-secondary transition-colors cursor-pointer"
                    onClick={() => window.location.href = `/hosts/${encodeURIComponent(host.hostname)}`}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedHostnames.has(host.hostname)}
                        onChange={() => toggleHostSelection(host.hostname)}
                        className="accent-accent cursor-pointer"
                        aria-label={`Select host ${host.hostname}`}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-text-primary">{host.hostname}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-text-secondary">
                        <OsIcon size={14} />
                        {host.os}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary font-mono text-xs">{host.ip_address ?? "—"}</td>
                    <td className="px-4 py-3 text-text-secondary">{timeAgo(host.last_seen)}</td>
                    <td className={`px-4 py-3 font-semibold ${getSeverityColor("high")}`}>{host.high}</td>
                    <td className={`px-4 py-3 font-semibold ${getSeverityColor("medium")}`}>{host.medium}</td>
                    <td className={`px-4 py-3 font-semibold ${getSeverityColor("low")}`}>{host.low}</td>
                    <td className="px-4 py-3 font-medium text-text-primary">{host.total_findings}</td>
                    <td className="px-4 py-3 font-semibold text-text-primary">{riskScore(host)}</td>
                    <td className="px-4 py-3">
                      <StatusDot status={status} label={status === "green" ? "Online" : status === "yellow" ? "Idle" : "Stale"} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card layout */}
      <div className="sm:hidden space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 rounded-xl bg-bg-card border border-border">
              <div className="skeleton h-5 w-40 mb-2" />
              <div className="skeleton h-4 w-24" />
            </div>
          ))
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No hosts match your search"
            description="Try adjusting your search query."
          />
        ) : (
          sorted.map((host) => {
            const OsIcon = getOsIcon(host.os);
            const status = getAgentStatus(host.last_seen);
            return (
              <Link
                key={host.hostname}
                to={`/hosts/${encodeURIComponent(host.hostname)}`}
                className="block p-4 rounded-xl bg-bg-card border border-border hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedHostnames.has(host.hostname)}
                      onChange={() => toggleHostSelection(host.hostname)}
                      className="accent-accent cursor-pointer"
                      aria-label={`Select host ${host.hostname}`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <OsIcon size={16} className="text-text-muted" />
                    <span className="font-medium text-text-primary">{host.hostname}</span>
                  </div>
                  <StatusDot status={status} />
                </div>
                <div className="text-xs text-text-muted mb-2">{host.ip_address ?? "—"} · {timeAgo(host.last_seen)}</div>
                <div className="flex items-center gap-2">
                  {host.high > 0 && <SeverityBadge severity="high" />}
                  {host.medium > 0 && <SeverityBadge severity="medium" />}
                  {host.low > 0 && <SeverityBadge severity="low" />}
                  <span className="text-xs text-text-muted ml-auto">{host.total_findings} findings</span>
                </div>
              </div>
              </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Clear History confirmation */}
      <ConfirmDialog
        open={showClearConfirm}
        title="Delete Selected Hosts?"
        message={`This will permanently delete all scan data for ${selectedHostnames.size} host${selectedHostnames.size !== 1 ? "s" : ""} from the database. This action cannot be undone.`}
        confirmLabel={deleting ? "Deleting…" : `Delete ${selectedHostnames.size}`}
        onConfirm={clearSelected}
        onCancel={() => setShowClearConfirm(false)}
        variant="danger"
      />
    </div>
    </>
  );
}
