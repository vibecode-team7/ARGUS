import { useMemo } from "react";
import { Link } from "react-router";
import { Server, FileWarning, AlertTriangle, AlertCircle, Info, ArrowRight, Monitor, Laptop } from "lucide-react";
import { useStats } from "../hooks/useStats";
import { useHosts } from "../hooks/useHosts";
import { useFindings } from "../hooks/useFindings";
import StatCard from "../components/StatCard";
import SeverityBar from "../components/SeverityBar";
import SeverityBadge from "../components/SeverityBadge";
import CategoryBadge from "../components/CategoryBadge";
import StatusDot from "../components/StatusDot";
import { SkeletonCard, SkeletonTable, SkeletonBar } from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import SeoHead from "../components/SeoHead";
import { timeAgo, getAgentStatus } from "../lib/timeAgo";
import { getSeverityColor } from "../lib/severity";

function getOsIcon(os) {
  if (os === "darwin") return Laptop;
  return Monitor;
}

export default function DashboardPage() {
  const { data: stats, loading: statsLoading, error: statsError, refetch: refetchStats } = useStats();
  const { data: hosts, loading: hostsLoading, error: hostsError, refetch: refetchHosts } = useHosts();
  const { data: findings, loading: findingsLoading, error: findingsError, refetch: refetchFindings } = useFindings({ limit: 10 });

  const recentHosts = useMemo(() => (hosts ?? []).slice(0, 5), [hosts]);
  const recentFindings = useMemo(() => {
    const seenScans = new Set();
    const uniqueScans = (findings?.scans ?? []).filter((scan) => {
      if (seenScans.has(scan.id)) return false;
      seenScans.add(scan.id);
      return true;
    });
    return uniqueScans
      .flatMap((scan) => scan.findings.map((f) => ({ ...f, scan })))
      .slice(0, 5);
  }, [findings]);

  if (statsError || hostsError || findingsError) {
    return <ErrorState error={statsError ?? hostsError ?? findingsError} onRetry={() => { refetchStats(); refetchHosts(); refetchFindings(); }} />;
  }

  return (
    <>
      <SeoHead title="Dashboard" description="Overview of Shadow AI monitoring stats, recent hosts, and latest findings." />
      <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary mb-1">Dashboard</h1>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {statsLoading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard icon={Server} label="Total Hosts" value={stats?.total_hosts} to="/hosts" />
            <StatCard icon={FileWarning} label="Total Findings" value={stats?.total_findings} to="/findings" />
            <StatCard icon={AlertTriangle} label="High Risk" value={stats?.high_risk} accent="red" to="/findings?severity=high" />
            <StatCard icon={AlertCircle} label="Medium Risk" value={stats?.medium_risk} accent="amber" to="/findings?severity=medium" />
            <StatCard icon={Info} label="Low Risk" value={stats?.low_risk} accent="green" to="/findings?severity=low" />
          </>
        )}
      </div>

      {/* Severity Bar */}
      {statsLoading ? (
        <div className="p-5 rounded-xl bg-bg-card border border-border">
          <div className="skeleton h-4 w-36 mb-4" />
          <SkeletonBar rows={3} />
        </div>
      ) : stats && (
        <div className="p-5 rounded-xl bg-bg-card border border-border">
          <h2 className="text-sm font-semibold text-text-primary mb-3">Severity Distribution</h2>
          <SeverityBar high={stats.high_risk} medium={stats.medium_risk} low={stats.low_risk} />
        </div>
      )}

      {/* Two columns: Recent Hosts + Latest Findings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Hosts */}
        <div className="rounded-xl bg-bg-card border border-border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-text-primary">Recent Hosts</h2>
            <Link to="/hosts" className="text-xs font-medium text-accent hover:text-accent-hover transition-colors">
              View All <ArrowRight size={12} className="inline" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {hostsLoading ? (
              <div className="p-5"><SkeletonTable rows={3} /></div>
            ) : recentHosts.length === 0 ? (
              <EmptyState icon={Server} title="No hosts reporting yet" description="Deploy agents to start monitoring." />
            ) : (
              recentHosts.map((host) => {
                const OsIcon = getOsIcon(host.os);
                return (
                  <Link
                    key={host.hostname}
                    to={`/hosts/${encodeURIComponent(host.hostname)}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-bg-secondary transition-colors"
                  >
                    <OsIcon size={18} className="text-text-muted shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{host.hostname}</p>
                      <p className="text-xs text-text-muted">{timeAgo(host.last_seen)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {host.high > 0 && (
                        <span className={`text-xs font-semibold ${getSeverityColor("high")}`}>{host.high}H</span>
                      )}
                      {host.medium > 0 && (
                        <span className={`text-xs font-semibold ${getSeverityColor("medium")}`}>{host.medium}M</span>
                      )}
                      {host.low > 0 && (
                        <span className={`text-xs font-semibold ${getSeverityColor("low")}`}>{host.low}L</span>
                      )}
                      <StatusDot status={getAgentStatus(host.last_seen)} />
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Latest Findings */}
        <div className="rounded-xl bg-bg-card border border-border overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="text-sm font-semibold text-text-primary">Latest Findings</h2>
            <Link to="/findings" className="text-xs font-medium text-accent hover:text-accent-hover transition-colors">
              View All <ArrowRight size={12} className="inline" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {findingsLoading ? (
              <div className="p-5"><SkeletonTable rows={5} /></div>
            ) : recentFindings.length === 0 ? (
              <EmptyState icon={FileWarning} title="No findings yet" description="No Shadow AI detected. All clear!" />
            ) : (
              recentFindings.map((f) => (
                <Link
                  key={`${f.scan.id}-${f.id}`}
                  to={`/findings/${f.scan.id}`}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-bg-secondary transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-text-primary truncate">{f.name}</span>
                      <CategoryBadge category={f.category} />
                    </div>
                    <p className="text-xs text-text-muted truncate">
                      {f.scan.hostname} — {f.evidence}
                    </p>
                  </div>
                  <SeverityBadge severity={f.severity} />
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
