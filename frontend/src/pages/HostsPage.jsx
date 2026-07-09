import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowUpDown, ArrowUp, ArrowDown, Monitor, Laptop } from "lucide-react";
import { useHosts } from "../hooks/useHosts";
import StatusDot from "../components/StatusDot";
import SeverityBadge from "../components/SeverityBadge";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
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

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(() => {
    if (!hosts) return [];
    return [...hosts].sort((a, b) => {
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
  }, [hosts, sortKey, sortDir]);

  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (!loading && sorted.length === 0) {
    return <EmptyState icon={Monitor} title="No hosts reporting yet" description="Deploy agents to start monitoring." />;
  }

  const SortIcon = ({ colKey }) => {
    if (sortKey !== colKey) return <ArrowUpDown size={12} className="text-text-muted" />;
    return sortDir === "asc"
      ? <ArrowUp size={12} className="text-accent" />
      : <ArrowDown size={12} className="text-accent" />;
  };

  return (
    <div className="space-y-4">
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm" aria-label="Hosts list">
          <thead>
            <tr className="border-b border-border bg-bg-secondary">
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
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
