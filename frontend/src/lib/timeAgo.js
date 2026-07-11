/**
 * Convert an ISO timestamp to a relative time string.
 * @param {string} isoString
 * @returns {string} e.g. "2h ago", "3d ago", "just now"
 */
export function timeAgo(isoString) {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return "just now";

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

/**
 * Get agent status color based on last_seen.
 * @param {string} lastSeen ISO timestamp
 * @returns {"green" | "yellow" | "red"}
 */
export function getAgentStatus(lastSeen) {
  const diffMs = Date.now() - new Date(lastSeen).getTime();
  const hours = diffMs / (1000 * 60 * 60);
  if (hours < 1) return "green";
  if (hours < 24) return "yellow";
  return "red";
}
