/**
 * Format uptime seconds into human-readable string.
 * @param {number|null} seconds
 * @returns {string} e.g. "3d 5h 12m" or "—"
 */
export function formatUptime(seconds) {
  if (seconds == null) return "—";

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);

  return parts.join(" ");
}

/**
 * Format ISO timestamp to locale string.
 * @param {string} iso
 * @returns {string}
 */
export function formatTimestamp(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

/**
 * Format ISO timestamp to date only.
 * @param {string} iso
 * @returns {string}
 */
export function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString();
}

/**
 * Format a date-only string ("YYYY-MM-DD") without shifting it across
 * timezones — `new Date("YYYY-MM-DD")` parses as UTC midnight, which
 * renders as the previous day in any timezone behind UTC.
 * @param {string} dateOnly
 * @returns {string}
 */
export function formatDayLabel(dateOnly) {
  if (!dateOnly) return "—";
  const [year, month, day] = dateOnly.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString();
}
