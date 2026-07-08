import React from "react";

const COLOR_MAP = {
  green: "bg-success",
  yellow: "bg-warning",
  red: "bg-danger",
};

/**
 * @param {{ status: "green" | "yellow" | "red", pulse?: boolean, label?: string }} props
 */
function StatusDot({ status, pulse = false, label }) {
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={label}>
      <span
        className={`inline-block w-2.5 h-2.5 rounded-full ${COLOR_MAP[status] ?? "bg-text-muted"}
          ${pulse ? "pulse-dot" : ""}`}
      />
      {label && <span className="text-xs text-text-secondary">{label}</span>}
    </span>
  );
}

export default React.memo(StatusDot);
