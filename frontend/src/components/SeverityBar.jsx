import React from "react";

/**
 * Horizontal stacked bar chart showing severity distribution.
 * @param {{ high: number, medium: number, low: number }} props
 */
function SeverityBar({ high = 0, medium = 0, low = 0 }) {
  const total = high + medium + low;

  if (total === 0) {
    return (
      <div className="w-full h-3 rounded-full bg-bg-secondary border border-border" />
    );
  }

  const highPct = (high / total) * 100;
  const mediumPct = (medium / total) * 100;
  const lowPct = (low / total) * 100;

  return (
    <div>
      <div className="flex w-full h-3 rounded-full overflow-hidden bg-bg-secondary border border-border">
        {high > 0 && (
          <div
            className="bg-severity-high transition-all duration-500"
            style={{ width: `${highPct}%` }}
            title={`High: ${high} (${Math.round(highPct)}%)`}
          />
        )}
        {medium > 0 && (
          <div
            className="bg-severity-medium transition-all duration-500"
            style={{ width: `${mediumPct}%` }}
            title={`Medium: ${medium} (${Math.round(mediumPct)}%)`}
          />
        )}
        {low > 0 && (
          <div
            className="bg-severity-low transition-all duration-500"
            style={{ width: `${lowPct}%` }}
            title={`Low: ${low} (${Math.round(lowPct)}%)`}
          />
        )}
      </div>
      <div className="flex items-center gap-4 mt-2 text-xs text-text-secondary">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-severity-high" />
          High ({high})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-severity-medium" />
          Medium ({medium})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-severity-low" />
          Low ({low})
        </span>
      </div>
    </div>
  );
}

export default React.memo(SeverityBar);
