/**
 * Severity helpers for consistent color/label mapping.
 */

const SEVERITY_CONFIG = {
  high: {
    label: "High",
    colorClass: "text-severity-high",
    bgClass: "bg-severity-high-bg",
    textColorClass: "text-white",
  },
  medium: {
    label: "Medium",
    colorClass: "text-severity-medium",
    bgClass: "bg-severity-medium-bg",
    textColorClass: "text-white",
  },
  low: {
    label: "Low",
    colorClass: "text-severity-low",
    bgClass: "bg-severity-low-bg",
    textColorClass: "text-white",
  },
};

/**
 * @param {string} severity
 * @returns {string} Display label
 */
export function getSeverityLabel(severity) {
  return SEVERITY_CONFIG[severity]?.label ?? severity;
}

/**
 * @param {string} severity
 * @returns {string} Tailwind text color class
 */
export function getSeverityColor(severity) {
  return SEVERITY_CONFIG[severity]?.colorClass ?? "text-text-muted";
}

/**
 * @param {string} severity
 * @returns {string} Tailwind bg class for badge background
 */
export function getSeverityBg(severity) {
  return SEVERITY_CONFIG[severity]?.bgClass ?? "bg-bg-secondary";
}

/**
 * @param {string} severity
 * @returns {string} Tailwind text class for badge text (white on colored bg)
 */
export function getSeverityTextColor(severity) {
  return SEVERITY_CONFIG[severity]?.textColorClass ?? "text-text-primary";
}
