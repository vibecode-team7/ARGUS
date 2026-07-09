import { useMemo, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router";
import { CheckCircle, XCircle, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useFindings } from "../hooks/useFindings";
import { useHosts } from "../hooks/useHosts";
import FilterBar from "../components/FilterBar";
import SeverityBadge from "../components/SeverityBadge";
import CategoryBadge from "../components/CategoryBadge";
import Pagination from "../components/Pagination";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import { formatTimestamp } from "../lib/format";

const PAGE_SIZE_OPTIONS = [25, 50, 100];

export default function FindingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read filters from URL
  const hostnameFilter = searchParams.get("hostname") ?? "";
  const severityFilter = searchParams.get("severity") ?? "";
  const pageParam = parseInt(searchParams.get("page") ?? "1", 10);
  const limitParam = parseInt(searchParams.get("limit") ?? "50", 10);

  const [page, setPage] = useState(pageParam);
  const [limit, setLimit] = useState(limitParam);
  const [sortKey, setSortKey] = useState("detected_at");
  const [sortDir, setSortDir] = useState("desc");

  // Sync URL params
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (hostnameFilter) params.set("hostname", hostnameFilter);
    else params.delete("hostname");
    if (severityFilter) params.set("severity", severityFilter);
    else params.delete("severity");
    params.set("page", String(page));
    params.set("limit", String(limit));
    setSearchParams(params, { replace: true });
  }, [hostnameFilter, severityFilter, page, limit, setSearchParams, searchParams]);

  const offset = (page - 1) * limit;

  const { data, loading, error, refetch } = useFindings({
    hostname: hostnameFilter || undefined,
    severity: severityFilter || undefined,
    limit,
    offset,
  });

  const { data: hosts } = useHosts();
  const hostnames = useMemo(() => (hosts ?? []).map((h) => h.hostname).sort(), [hosts]);

  const scans = data?.scans ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Flatten findings from scans for display.
  // The API can return the same scan more than once when filtering by
  // severity (it fans out on the findings join), so dedupe by scan id first.
  const allFindings = useMemo(() => {
    const seenScans = new Set();
    const uniqueScans = scans.filter((scan) => {
      if (seenScans.has(scan.id)) return false;
      seenScans.add(scan.id);
      return true;
    });
    return uniqueScans.flatMap((scan) =>
      scan.findings.map((f) => ({ ...f, scan }))
    );
  }, [scans]);

  // Sort
  const sorted = useMemo(() => {
    return [...allFindings].sort((a, b) => {
      let av = a[sortKey] ?? "";
      let bv = b[sortKey] ?? "";
      if (sortKey === "hostname") {
        av = a.scan.hostname;
        bv = b.scan.hostname;
      }
      if (sortKey === "scan_id") {
        av = a.scan.id;
        bv = b.scan.id;
      }
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [allFindings, sortKey, sortDir]);

  const toggleSort = useCallback((key) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir("asc");
      return key;
    });
  }, []);

  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <FilterBar
        hostname={hostnameFilter}
        severity={severityFilter}
        hostnames={hostnames}
        onHostnameChange={(v) => {
          setPage(1);
          setSearchParams((p) => {
            if (v) p.set("hostname", v);
            else p.delete("hostname");
            return p;
          });
        }}
        onSeverityChange={(v) => {
          setPage(1);
          setSearchParams((p) => {
            if (v) p.set("severity", v);
            else p.delete("severity");
            return p;
          });
        }}
        onClear={() => {
          setPage(1);
          setSearchParams({});
        }}
      />

      {/* Page size selector */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          {loading
            ? "Loading…"
            : `${allFindings.length} finding${allFindings.length !== 1 ? "s" : ""} from ${total} scan${total !== 1 ? "s" : ""}`}
        </p>
        <div className="flex items-center gap-2">
          <label htmlFor="page-size" className="text-xs text-text-muted">Scans per page:</label>
          <select
            id="page-size"
            value={limit}
            onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
            className="px-2 py-1 rounded-lg text-xs
              bg-bg-input border border-border text-text-primary
              hover:border-border-hover focus:border-accent focus:outline-none
              transition-colors cursor-pointer"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm" aria-label="Findings list">
          <thead>
            <tr className="border-b border-border bg-bg-secondary">
              {[
                { key: "scan_id", label: "Scan ID" },
                { key: "hostname", label: "Hostname" },
                { key: "name", label: "Tool" },
                { key: "category", label: "Category" },
                { key: "severity", label: "Severity" },
                { key: "status", label: "Status" },
                { key: "evidence", label: "Evidence" },
                { key: "detected_at", label: "Detected At" },
              ].map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left font-semibold text-text-secondary cursor-pointer select-none hover:text-text-primary transition-colors"
                  onClick={() => toggleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key ? (
                      sortDir === "asc" ? <ArrowUp size={12} className="text-accent" /> : <ArrowDown size={12} className="text-accent" />
                    ) : (
                      <ArrowUpDown size={12} className="text-text-muted" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="skeleton h-4 w-full" /></td>
                  ))}
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <EmptyState
                    icon={XCircle}
                    title="No findings match your filters"
                    description="Try adjusting your filters or clearing them."
                  />
                </td>
              </tr>
            ) : (
              sorted.map((f) => (
                <tr
                  key={`${f.scan.id}-${f.id}`}
                  className="border-b border-border last:border-0 hover:bg-bg-secondary transition-colors cursor-pointer"
                  onClick={() => window.location.href = `/findings/${f.scan.id}`}
                >
                  <td className="px-4 py-3 font-mono text-xs text-text-secondary">#{f.scan.id}</td>
                  <td className="px-4 py-3 font-medium text-text-primary">{f.scan.hostname}</td>
                  <td className="px-4 py-3 font-medium text-text-primary">{f.name}</td>
                  <td className="px-4 py-3"><CategoryBadge category={f.category} /></td>
                  <td className="px-4 py-3"><SeverityBadge severity={f.severity} /></td>
                  <td className="px-4 py-3">
                    {f.status === "detected" ? (
                      <span className="inline-flex items-center gap-1 text-success text-xs font-medium">
                        <CheckCircle size={12} /> Detected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-text-muted text-xs font-medium">
                        <XCircle size={12} /> Not detected
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs max-w-xs truncate" title={f.evidence}>
                    {f.evidence}
                  </td>
                  <td className="px-4 py-3 text-text-secondary text-xs whitespace-nowrap">
                    {formatTimestamp(f.detected_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
