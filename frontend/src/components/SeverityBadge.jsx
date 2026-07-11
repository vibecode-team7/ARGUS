import React from "react";
import { getSeverityLabel, getSeverityBg, getSeverityTextColor } from "../lib/severity";

/**
 * @param {{ severity: string }} props
 */
function SeverityBadge({ severity }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold
        ${getSeverityBg(severity)} ${getSeverityTextColor(severity)}`}
    >
      {getSeverityLabel(severity)}
    </span>
  );
}

export default React.memo(SeverityBadge);
