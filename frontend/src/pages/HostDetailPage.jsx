import { useMemo, useState } from "react";
import { useParams, Link } from "react-router";
import { ArrowLeft, Monitor, Laptop, ChevronDown, ChevronRight } from "lucide-react";
import { useFindings } from "../hooks/useFindings";
import SeverityBadge from "../components/SeverityBadge";
import CategoryBadge from "../components/CategoryBadge";
import { SkeletonText } from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import { getAgentStatus } from "../lib/timeAgo";
import { formatTimestamp, formatUptime } from "../lib/format";
import StatusDot from "../components/StatusDot";

function getOsIcon(os) {
  if (os === "darwin") return Laptop;
  return Monitor;
}

export default function HostDetailPage() {
  const { hostname } = useParams();
  const decodedHostname = decodeURIComponent(hostname);
  const { data, loading, error, refetch } = useFindings({ hostname: decodedHostname, limit: 50 });
  const [expandedScan, setExpandedScan] = useState(null);

  const rawScans = data?.scans ?? [];

  // Sort by received_at descending — API order (by id) doesn't track chronology,
  // since scans can be ingested out of scanned_at order.
  const scans = useMemo(
    () => [...rawScans].sort((a, b) => new Date(b.received_at) - new Date(a.received_at)),
    [rawScans]
  );

  // Get host info from the most recently received scan
  const hostInfo = scans[0] ?? null;

  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        to="/hosts"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Hosts
      </Link>

      {/* Host Header */}
      {loading ? (
        <div className="p-5 rounded-xl bg-bg-card border border-border space-y-3">
          <SkeletonText width="w-48" />
          <SkeletonText width="w-32" />
        </div>
      ) : hostInfo ? (
        <div className="p-5 rounded-xl bg-bg-card border border-border">
          <div className="flex flex-wrap items-start gap-4">
            {(() => {
              const OsIcon = getOsIcon(hostInfo.os);
              return <OsIcon size={32} className="text-text-muted mt-1" />;
            })()}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-text-primary mb-1">{decodedHostname}</h2>
              <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-bg-secondary text-xs font-medium">
                  {hostInfo.os} {hostInfo.os_version}
                </span>
                {hostInfo.ip_address && (
                  <span className="font-mono text-xs">{hostInfo.ip_address}</span>
                )}
                <span>v{hostInfo.agent_version}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {hostInfo.uptime_seconds != null && (
                <div className="text-right">
                  <p className="text-xs text-text-muted">Uptime</p>
                  <p className="text-sm font-medium text-text-primary">{formatUptime(hostInfo.uptime_seconds)}</p>
                </div>
              )}
              <StatusDot
                status={getAgentStatus(hostInfo.received_at)}
                label={getAgentStatus(hostInfo.received_at) === "green" ? "Online" : "Stale"}
              />
            </div>
          </div>
        </div>
      ) : (
        <EmptyState icon={Monitor} title="No data for this host" description="This hostname has no scan records." />
      )}

      {/* Scan Timeline */}
      {!loading && scans.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-text-primary">Scan History ({scans.length})</h3>
          <div className="space-y-3">
            {scans.map((scan) => {
              const isExpanded = expandedScan === scan.id;
              return (
                <div
                  key={scan.id}
                  className="rounded-xl bg-bg-card border border-border overflow-hidden"
                >
                  {/* Scan header row */}
                  <button
                    onClick={() => setExpandedScan(isExpanded ? null : scan.id)}
                    className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-bg-secondary transition-colors cursor-pointer"
                  >
                    {isExpanded ? <ChevronDown size={16} className="text-text-muted shrink-0" /> : <ChevronRight size={16} className="text-text-muted shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-text-primary">
                          Scan #{scan.id}
                        </span>
                        <span className="text-xs text-text-muted">
                          {formatTimestamp(scan.scanned_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {scan.findings.length > 0 ? (
                          scan.findings.map((f) => (
                            <SeverityBadge key={f.id} severity={f.severity} />
                          ))
                        ) : (
                          <span className="text-xs text-success font-medium">No findings</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-text-muted shrink-0">
                      {scan.findings.length} finding{scan.findings.length !== 1 ? "s" : ""}
                    </span>
                  </button>

                  {/* Expanded findings */}
                  {isExpanded && scan.findings.length > 0 && (
                    <div className="border-t border-border divide-y divide-border">
                      {scan.findings.map((f) => (
                        <div key={f.id} className="px-5 py-3 pl-12">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-text-primary">{f.name}</span>
                            <CategoryBadge category={f.category} />
                            <SeverityBadge severity={f.severity} />
                          </div>
                          <p className="text-xs text-text-secondary mb-1">{f.evidence}</p>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
                            {f.pid && <span>PID: {f.pid}</span>}
                            {f.port && <span>Port: {f.port}</span>}
                            {f.path && <span className="font-mono truncate max-w-xs" title={f.path}>{f.path}</span>}
                            {f.user && <span>User: {f.user}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
