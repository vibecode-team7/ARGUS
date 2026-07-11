import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { useTrends } from "../hooks/useTrends";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import { formatDayLabel } from "../lib/format";

const RANGE_OPTIONS = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
];

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-bg-card px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-text-primary mb-1">{formatDayLabel(label)}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-1.5 text-text-secondary">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="font-medium text-text-primary">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

export default function TrendsPage() {
  const [days, setDays] = useState(30);
  const { data, loading, error, refetch } = useTrends({ days });

  const hasData = useMemo(() => {
    if (!data) return false;
    const findingsTotal = data.findings.reduce((sum, d) => sum + d.high + d.medium + d.low, 0);
    const hostsTotal = data.new_hosts.reduce((sum, d) => sum + d.new_hosts, 0);
    return findingsTotal > 0 || hostsTotal > 0;
  }, [data]);

  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      {/* Date range filter */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">
          {loading ? "Loading…" : `Last ${days} days`}
        </p>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-bg-secondary border border-border">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDays(opt.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer
                ${
                  days === opt.value
                    ? "bg-accent text-white"
                    : "text-text-secondary hover:text-text-primary"
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-6">
          <div className="h-80 rounded-xl bg-bg-card border border-border skeleton" />
          <div className="h-64 rounded-xl bg-bg-card border border-border skeleton" />
        </div>
      ) : !hasData ? (
        <EmptyState
          icon={TrendingUp}
          title="No trend data yet"
          description="Findings and host activity will appear here once agents start reporting scans."
        />
      ) : (
        <>
          {/* Findings by severity */}
          <div className="p-5 rounded-xl bg-bg-card border border-border">
            <h3 className="text-sm font-semibold text-text-primary mb-1">Findings Over Time</h3>
            <p className="text-xs text-text-muted mb-4">Detected findings by severity, per day</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.findings} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDayLabel}
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area
                    type="monotone"
                    dataKey="high"
                    name="High"
                    stackId="severity"
                    stroke="var(--severity-high)"
                    fill="var(--severity-high)"
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="medium"
                    name="Medium"
                    stackId="severity"
                    stroke="var(--severity-medium)"
                    fill="var(--severity-medium)"
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="low"
                    name="Low"
                    stackId="severity"
                    stroke="var(--severity-low)"
                    fill="var(--severity-low)"
                    fillOpacity={0.25}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* New hosts */}
          <div className="p-5 rounded-xl bg-bg-card border border-border">
            <h3 className="text-sm font-semibold text-text-primary mb-1">New Hosts Over Time</h3>
            <p className="text-xs text-text-muted mb-4">First-seen agent check-ins, per day</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.new_hosts} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDayLabel}
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="new_hosts" name="New hosts" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
