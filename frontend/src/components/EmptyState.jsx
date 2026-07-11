import React from "react";

/**
 * @param {{ icon: import("lucide-react").LucideIcon, title: string, description?: string }} props
 */
function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-bg-secondary mb-4">
        <Icon size={32} className="text-text-muted" />
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-text-secondary max-w-md">{description}</p>
      )}
    </div>
  );
}

export default React.memo(EmptyState);
