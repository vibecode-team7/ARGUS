import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * @param {{
 *   page: number,
 *   totalPages: number,
 *   total: number,
 *   limit: number,
 *   onPageChange: (page: number) => void
 * }} props
 */
function Pagination({ page, totalPages, total, limit, onPageChange }) {
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  if (total === 0) return null;

  return (
    <nav aria-label="Pagination" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-text-secondary">
      <p>
        Showing <span className="font-medium text-text-primary">{start}–{end}</span> of{" "}
        <span className="font-medium text-text-primary">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg
            border border-border bg-bg-card text-text-secondary
            hover:border-border-hover hover:text-text-primary
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors cursor-pointer"
        >
          <ChevronLeft size={14} />
          Previous
        </button>
        <span className="px-3 py-1.5 text-text-primary font-medium">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg
            border border-border bg-bg-card text-text-secondary
            hover:border-border-hover hover:text-text-primary
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors cursor-pointer"
        >
          Next
          <ChevronRight size={14} />
        </button>
      </div>
    </nav>
  );
}

export default React.memo(Pagination);
