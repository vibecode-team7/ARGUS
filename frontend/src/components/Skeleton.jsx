import React from "react";

export function SkeletonRow() {
  return (
    <tr>
      <td className="p-4"><div className="skeleton h-4 w-32" /></td>
      <td className="p-4"><div className="skeleton h-4 w-16" /></td>
      <td className="p-4"><div className="skeleton h-4 w-24" /></td>
      <td className="p-4"><div className="skeleton h-4 w-20" /></td>
      <td className="p-4"><div className="skeleton h-4 w-12" /></td>
    </tr>
  );
}

export function SkeletonCard() {
  return (
    <div className="p-5 rounded-xl bg-bg-card border border-border">
      <div className="flex items-center gap-4">
        <div className="skeleton w-12 h-12 rounded-lg" />
        <div className="space-y-2">
          <div className="skeleton h-3 w-20" />
          <div className="skeleton h-6 w-12" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full" aria-label="Loading">
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SkeletonText({ width = "w-full" }) {
  return <div className={`skeleton h-4 ${width}`} />;
}

export function SkeletonBar({ rows = 3 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-3 w-full rounded-full" />
      ))}
    </div>
  );
}
