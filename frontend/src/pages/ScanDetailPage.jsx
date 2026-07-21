import { useParams, Link } from "react-router";
import { ArrowLeft, ShieldCheck, Monitor, Laptop } from "lucide-react";
import { useScanDetail } from "../hooks/useScanDetail";
import SeverityBadge from "../components/SeverityBadge";
import CategoryBadge from "../components/CategoryBadge";
import { SkeletonCard, SkeletonText } from "../components/Skeleton";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import SeoHead from "../components/SeoHead";
import { formatTimestamp, formatUptime } from "../lib/format";
function getOsIcon(os) {
  if (os === "darwin") return Laptop;
  return Monitor;
}

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };

export default function ScanDetailPage() {
  const { scanId } = useParams();
  const { data: scan, loading, error, refetch } = useScanDetail(scanId);

  if (error) return <ErrorState error={error} onRetry={refetch} />;
  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonText width="w-32" />
        <div className="p-5 rounded-xl bg-bg-card border border-border space-y-3">
          <SkeletonText width="w-48" />
          <SkeletonText width="w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (!scan) {
    return <EmptyState icon={Monitor} title="Scan not found" description={`No scan with ID ${scanId} exists.`} />;
  }

  // Group findings by severity (high → medium → low)
  const grouped = (scan.findings ?? [])
    .slice()
    .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3));

  const OsIcon = getOsIcon(scan.os);

  return (
    <>
      <SeoHead title={`Scan #${scan.id}`} description={`Details from scan #${scan.id} on ${scan.hostname}.`} />
      <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        to="/findings"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Findings
      </Link>

      {/* Scan Header */}
      <div className="p-5 rounded-xl bg-bg-card border border-border">
        <div className="flex flex-wrap items-start gap-4">
          <OsIcon size={32} className="text-text-muted mt-1" />
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-text-primary mb-1">
              Scan #{scan.id}
              <span className="ml-3 text-base font-normal text-text-secondary">{scan.hostname}</span>
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-bg-secondary text-xs font-medium">
                {scan.os} {scan.os_version}
              </span>
              <span>Agent v{scan.agent_version}</span>
              <span>Scanned {formatTimestamp(scan.scanned_at)}</span>
            </div>
          </div>
        </div>

        {/* System info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border">
          {scan.ip_address && (
            <div>
              <p className="text-xs text-text-muted mb-0.5">IP Address</p>
              <p className="text-sm font-mono text-text-primary">{scan.ip_address}</p>
            </div>
          )}
          {scan.kernel && (
            <div>
              <p className="text-xs text-text-muted mb-0.5">Kernel</p>
              <p className="text-sm font-mono text-text-primary">{scan.kernel}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-text-muted mb-0.5">Uptime</p>
            <p className="text-sm text-text-primary">{formatUptime(scan.uptime_seconds)}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted mb-0.5">Received At</p>
            <p className="text-sm text-text-primary">{formatTimestamp(scan.received_at)}</p>
          </div>
        </div>
      </div>

      {/* Findings */}
      {grouped.length === 0 ? (
        <div className="p-5 rounded-xl bg-bg-card border border-border">
          <EmptyState
            icon={ShieldCheck}
            title="No Shadow AI detected"
            description="This endpoint is clean — no forbidden AI tools were found."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {grouped.map((f) => (
            <div
              key={f.id}
              className="p-5 rounded-xl bg-bg-card border border-border hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base font-semibold text-text-primary">{f.name}</span>
                <CategoryBadge category={f.category} />
                <SeverityBadge severity={f.severity} />
              </div>
              <div className="mb-2">
                {f.status === "detected" ? (
                  <span className="text-xs font-medium text-danger">Detected</span>
                ) : (
                  <span className="text-xs font-medium text-text-muted">Not detected</span>
                )}
              </div>
              <p className="text-sm text-text-secondary mb-3">{f.evidence}</p>
              {(f.pid || f.port || f.path || f.user) && (
                <div className="flex flex-wrap gap-3 text-xs text-text-muted pt-2 border-t border-border">
                  {f.pid && <span>PID: {f.pid}</span>}
                  {f.port && <span>Port: {f.port}</span>}
                  {f.path && (
                    <span className="font-mono truncate max-w-xs" title={f.path}>
                      Path: {f.path}
                    </span>
                  )}
                  {f.user && <span>User: {f.user}</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  );
}
