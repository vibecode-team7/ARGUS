import React from "react";
import { Link } from "react-router";

/**
 * @param {{ icon: import("lucide-react").LucideIcon, label: string, value: number|string, accent?: string, to?: string }} props
 */
function StatCard({ icon: Icon, label, value, accent, to }) {
  const accentColors = {
    red: "text-severity-high",
    amber: "text-severity-medium",
    green: "text-severity-low",
    default: "text-accent",
  };

  const colorClass = accentColors[accent] ?? accentColors.default;
  const Component = to ? Link : "div";

  return (
    <Component
      to={to}
      className={`flex items-center gap-4 p-5 rounded-xl
        bg-bg-card border border-border
        shadow-sm hover:shadow-md transition-shadow
        ${to ? "cursor-pointer" : ""}`}
    >
      <div
        className={`flex items-center justify-center w-12 h-12 rounded-lg
          bg-bg-secondary ${colorClass}`}
      >
        <Icon size={24} />
      </div>
      <div>
        <p className="text-sm font-medium text-text-secondary">{label}</p>
        <p className={`text-2xl font-bold ${colorClass}`}>{value ?? "—"}</p>
      </div>
    </Component>
  );
}

export default React.memo(StatCard);
