import React from "react";
import { X } from "lucide-react";

/**
 * @param {{
 *   hostname?: string,
 *   severity?: string,
 *   hostnames?: string[],
 *   onHostnameChange: (v: string) => void,
 *   onSeverityChange: (v: string) => void,
 *   onClear: () => void
 * }} props
 */
function FilterBar({ hostname, severity, hostnames = [], onHostnameChange, onSeverityChange, onClear }) {
  const hasFilters = hostname || severity;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Hostname filter */}
      <div className="flex flex-col gap-1">
        <label htmlFor="filter-hostname" className="text-xs font-medium text-text-secondary">
          Hostname
        </label>
        <select
          id="filter-hostname"
          value={hostname ?? ""}
          onChange={(e) => onHostnameChange(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm
            bg-bg-input border border-border text-text-primary
            hover:border-border-hover focus:border-accent focus:outline-none
            transition-colors cursor-pointer"
        >
          <option value="">All hosts</option>
          {hostnames.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
      </div>

      {/* Severity filter */}
      <div className="flex flex-col gap-1">
        <label htmlFor="filter-severity" className="text-xs font-medium text-text-secondary">
          Severity
        </label>
        <select
          id="filter-severity"
          value={severity ?? ""}
          onChange={(e) => onSeverityChange(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm
            bg-bg-input border border-border text-text-primary
            hover:border-border-hover focus:border-accent focus:outline-none
            transition-colors cursor-pointer"
        >
          <option value="">All severities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Clear */}
      {hasFilters && (
        <button
          onClick={onClear}
          className="inline-flex items-center gap-1 mt-5 px-3 py-1.5 rounded-lg text-xs
            font-medium text-text-secondary border border-border
            hover:text-text-primary hover:border-border-hover
            transition-colors cursor-pointer"
        >
          <X size={12} />
          Clear
        </button>
      )}
    </div>
  );
}

export default React.memo(FilterBar);
