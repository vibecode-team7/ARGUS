/**
 * API client for the ARGUS backend.
 * All endpoints require X-API-Key header with read role.
 *
 * @typedef {Object} Stats
 * @property {number} total_hosts
 * @property {number} total_findings
 * @property {number} high_risk
 * @property {number} medium_risk
 * @property {number} low_risk
 *
 * @typedef {Object} Host
 * @property {string} hostname
 * @property {string} os
 * @property {string|null} ip_address
 * @property {string} last_seen
 * @property {number} high
 * @property {number} medium
 * @property {number} low
 * @property {number} total_findings
 *
 * @typedef {Object} Finding
 * @property {number} id
 * @property {string} category
 * @property {string} name
 * @property {string} severity
 * @property {string} status
 * @property {string} evidence
 * @property {number|null} pid
 * @property {number|null} port
 * @property {string|null} path
 * @property {string|null} user
 * @property {string} detected_at
 *
 * @typedef {Object} Scan
 * @property {number} id
 * @property {string} hostname
 * @property {string} os
 * @property {string} os_version
 * @property {string|null} kernel
 * @property {string} agent_version
 * @property {string} scanned_at
 * @property {number|null} uptime_seconds
 * @property {string|null} ip_address
 * @property {string} received_at
 * @property {Finding[]} findings
 *
 * @typedef {Object} FindingsResponse
 * @property {number} total
 * @property {number} offset
 * @property {number} limit
 * @property {Scan[]} scans
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? "";
const API_KEY = import.meta.env.VITE_ARGUS_API_KEY ?? "";

/**
 * Core fetch wrapper. Attaches API key, parses JSON, throws on error.
 */
async function request(path, { signal } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "X-API-Key": API_KEY,
    },
    signal,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      /* non-JSON error */
    }
    throw { status: res.status, detail };
  }

  return res.json();
}

/**
 * Health check — no auth required.
 * @returns {Promise<{status: string}>}
 */
export function healthCheck() {
  return fetch(`${BASE_URL}/health`).then((r) => r.json());
}

/**
 * GET /api/stats
 * @param {{ signal?: AbortSignal }} opts
 * @returns {Promise<Stats>}
 */
export function fetchStats({ signal } = {}) {
  return request("/api/stats", { signal });
}

/**
 * GET /api/hosts
 * @param {{ signal?: AbortSignal }} opts
 * @returns {Promise<Host[]>}
 */
export function fetchHosts({ signal } = {}) {
  return request("/api/hosts", { signal });
}

/**
 * GET /api/findings
 * @param {{ hostname?: string, severity?: string, limit?: number, offset?: number, signal?: AbortSignal }} opts
 * @returns {Promise<FindingsResponse>}
 */
export function fetchFindings({
  hostname,
  severity,
  limit = 50,
  offset = 0,
  signal,
} = {}) {
  const params = new URLSearchParams();
  if (hostname) params.set("hostname", hostname);
  if (severity) params.set("severity", severity);
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  return request(`/api/findings?${params}`, { signal });
}

/**
 * GET /api/findings/:scanId
 * @param {number} scanId
 * @param {{ signal?: AbortSignal }} opts
 * @returns {Promise<Scan>}
 */
export function fetchScanDetail(scanId, { signal } = {}) {
  return request(`/api/findings/${scanId}`, { signal });
}

/**
 * @typedef {Object} TrendsResponse
 * @property {number} days
 * @property {Array<{date: string, high: number, medium: number, low: number}>} findings
 * @property {Array<{date: string, new_hosts: number}>} new_hosts
 */

/**
 * GET /api/trends
 * @param {{ days?: number, signal?: AbortSignal }} opts
 * @returns {Promise<TrendsResponse>}
 */
export function fetchTrends({ days = 30, signal } = {}) {
  const params = new URLSearchParams();
  params.set("days", String(days));
  return request(`/api/trends?${params}`, { signal });
}
