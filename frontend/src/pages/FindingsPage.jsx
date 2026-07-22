import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { CheckCircle, XCircle, ArrowUpDown, ArrowUp, ArrowDown, Download, Trash2 } from "lucide-react";
import { useFindings } from "../hooks/useFindings";
import { useHosts } from "../hooks/useHosts";
import { deleteScans } from "../lib/api";
import FilterBar from "../components/FilterBar";
import SeverityBadge from "../components/SeverityBadge";
import CategoryBadge from "../components/CategoryBadge";
import Pagination from "../components/Pagination";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import ConfirmDialog from "../components/ConfirmDialog";
import SeoHead from "../components/SeoHead";
import { formatTimestamp } from "../lib/format";

const PAGE_SIZE_OPTIONS = [25, 50, 100];

function escapeCsvValue(value) {
  const stringValue = String(value ?? "");
  return /[",\n]/.test(stringValue) ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
}

export default function FindingsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Derive all state from URL search params (single source of truth)
  const hostnameFilter = searchParams.get("hostname") ?? "";
  const severityFilter = searchParams.get("severity") ?? "";
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = parseInt(searchParams.get("limit") ?? "50", 10);

  const [sortKey, setSortKey] = useState("detected_at");
  const [sortDir, setSortDir] = useState("desc");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [selectedScanIds, setSelectedScanIds] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const selectAllRef = useRef(null);

  const offset = (page - 1) * limit;

  const { data, loading, error, refetch } = useFindings({
    hostname: hostnameFilter || undefined,
    severity: severityFilter || undefined,
    limit,
    offset,
  });

  const { data: hosts } = useHosts();
  const hostnames = useMemo(() => (hosts ?? []).map((h) => h.hostname).sort(), [hosts]);

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Flatten findings from scans for display.
  // The API can return the same scan more than once when filtering by
  // severity (it fans out on the findings join), so dedupe by scan id first.
  const allFindings = useMemo(() => {
    const scans = data?.scans ?? [];
    const seenScans = new Set();
    const uniqueScans = scans.filter((scan) => {
      if (seenScans.has(scan.id)) return false;
      seenScans.add(scan.id);
      return true;
    });
    return uniqueScans.flatMap((scan) =>
      scan.findings.map((f) => ({ ...f, scan }))
    );
  }, [data?.scans]);

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

  // Unique scan IDs on the current page (after sort)
  const pageScanIds = useMemo(
    () => [...new Set(sorted.map((f) => f.scan.id))],
    [sorted]
  );

  const allPageSelected =
    pageScanIds.length > 0 && pageScanIds.every((id) => selectedScanIds.has(id));
  const somePageSelected = pageScanIds.some((id) => selectedScanIds.has(id));

  // Update indeterminate state on the Select All checkbox
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = somePageSelected && !allPageSelected;
    }
  }, [somePageSelected, allPageSelected]);

  const toggleScanSelection = useCallback((scanId) => {
    setSelectedScanIds((prev) => {
      const next = new Set(prev);
      if (next.has(scanId)) next.delete(scanId);
      else next.add(scanId);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    const pageSet = new Set(pageScanIds);
    setSelectedScanIds((prev) => {
      const allOn = [...pageSet].every((id) => prev.has(id));
      const next = new Set(prev);
      if (allOn) {
        for (const id of pageSet) next.delete(id);
      } else {
        for (const id of pageSet) next.add(id);
      }
      return next;
    });
  }, [pageScanIds]);

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

  const handleExportCsv = useCallback(() => {
    const rows = sorted.map((finding) => ({
      host: finding.scan.hostname,
      finding: finding.name,
      risk_level: finding.severity,
      date: formatTimestamp(finding.detected_at),
      status: finding.status === "detected" ? "Detected" : "Not detected",
    }));

    const headers = ["host", "finding", "risk_level", "date", "status"];
    const csvLines = [headers.join(",")];

    rows.forEach((row) => {
      csvLines.push(
        [row.host, row.finding, row.risk_level, row.date, row.status]
          .map((value) => escapeCsvValue(value))
          .join(",")
      );
    });

    const blob = new Blob([csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `argus-findings-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [sorted]);

  // Helper to update URL params and reset to page 1 on filter change
  const updateFilters = useCallback((updates) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(updates)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      // Reset to page 1 when filters change (unless page is being explicitly set)
      if (!("page" in updates)) {
        next.set("page", "1");
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const handlePageChange = useCallback((newPage) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", String(newPage));
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const handleLimitChange = useCallback((newLimit) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("limit", String(newLimit));
      next.set("page", "1");
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const handleClearFilters = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const clearSelected = useCallback(async () => {
    setShowClearConfirm(false);
    if (selectedScanIds.size === 0) return;
    setDeleting(true);
    try {
      await deleteScans([...selectedScanIds]);
      setSelectedScanIds(new Set());
      refetch();
    } catch (err) {
      console.error("Failed to delete scans:", err);
    } finally {
      setDeleting(false);
    }
  }, [selectedScanIds, refetch]);

  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <>
      <SeoHead title="Findings" description="Browse and filter detected Shadow AI tools across all endpoints." />
      <div className="space-y-4">
      <h1 className="text-2xl font-bold text-text-primary mb-1">Findings</h1>
      {/* Filter Bar */}
      <FilterBar
        hostname={hostnameFilter}
        severity={severityFilter}
        hostnames={hostnames}
        onHostnameChange={(v) => updateFilters({ hostname: v })}
        onSeverityChange={(v) => updateFilters({ severity: v })}
        onClear={handleClearFilters}
      />

      {/* Page size selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-text-secondary">
          {loading
            ? "Loading…"
            : `${allFindings.length} finding${allFindings.length !== 1 ? "s" : ""} from ${total} scan${total !== 1 ? "s" : ""}`}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={loading || sorted.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download size={16} />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            disabled={loading || selectedScanIds.size === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-danger hover:border-red-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 size={16} />
            {selectedScanIds.size === 0
              ? "Clear History"
              : `Clear (${selectedScanIds.size})`}
          </button>
          <label htmlFor="page-size" className="text-xs text-text-muted">Scans per page:</label>
          <select
            id="page-size"
            value={limit}
            onChange={(e) => handleLimitChange(Number(e.target.value))}
            className="px-2 py-1 rounded-lg text-xs
              bg-bg-input border border-border text-text-primary
              hover:border-border-hover focus:border-border-hover focus:outline-none focus-visible:outline-none
              transition-colors cursor-pointer"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm" aria-label="Findings list">
          <thead>
            <tr className="border-b border-border bg-bg-secondary">
              <th className="px-4 py-3 w-10">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={toggleSelectAll}
                  className="accent-accent cursor-pointer"
                  aria-label="Select all scans on this page"
                />
              </th>
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
                <td colSpan={9}>
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
                  onClick={() => navigate(`/findings/${f.scan.id}`)}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedScanIds.has(f.scan.id)}
                      onChange={() => toggleScanSelection(f.scan.id)}
                      className="accent-accent cursor-pointer"
                      aria-label={`Select scan #${f.scan.id}`}
                    />
                  </td>
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
            icon={XCircle}
            title="No findings match your filters"
            description="Try adjusting your filters or clearing them."
          />
        ) : (
          sorted.map((f) => (
            <div
              key={`${f.scan.id}-${f.id}`}
              onClick={() => navigate(`/findings/${f.scan.id}`)}
              className="p-4 rounded-xl bg-bg-card border border-border cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedScanIds.has(f.scan.id)}
                    onChange={() => toggleScanSelection(f.scan.id)}
                    className="accent-accent cursor-pointer"
                    aria-label={`Select scan #${f.scan.id}`}
                  />
                </div>
                <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-text-primary truncate">{f.name}</span>
                  <CategoryBadge category={f.category} />
                </div>
                <SeverityBadge severity={f.severity} />
              </div>
              <p className="text-xs text-text-muted mb-2">
                {f.scan.hostname} · Scan #{f.scan.id}
              </p>
              <p className="text-xs text-text-secondary mb-2 truncate" title={f.evidence}>
                {f.evidence}
              </p>
              <div className="flex items-center justify-between text-xs text-text-muted">
                {f.status === "detected" ? (
                  <span className="inline-flex items-center gap-1 text-success font-medium">
                    <CheckCircle size={12} /> Detected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-text-muted font-medium">
                    <XCircle size={12} /> Not detected
                  </span>
                )}
                  <span>{formatTimestamp(f.detected_at)}</span>
                </div>
              </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Clear History confirmation */}
      <ConfirmDialog
        open={showClearConfirm}
        title="Delete Selected Scans?"
        message={`This will permanently delete ${selectedScanIds.size} scan${selectedScanIds.size !== 1 ? "s" : ""} and all associated findings from the database. This action cannot be undone.`}
        confirmLabel={deleting ? "Deleting…" : `Delete ${selectedScanIds.size}`}
        onConfirm={clearSelected}
        onCancel={() => setShowClearConfirm(false)}
        variant="danger"
      />

      {/* Pagination */}
      {!loading && total > 0 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={handlePageChange}
        />
      )}
    </div>
    </>
  );
}
