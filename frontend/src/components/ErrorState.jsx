import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * @param {{ error: { status?: number, detail?: string } | string | null, onRetry?: () => void }} props
 */
function ErrorState({ error, onRetry }) {
  const message =
    typeof error === "string"
      ? error
      : error?.detail ?? error?.status === 401
        ? "Invalid API key. Check VITE_ARGUS_API_KEY in your .env file."
        : error?.status
          ? `Server error (${error.status})`
          : "Cannot connect to the backend. Is it running on :8000?";

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-severity-high-bg mb-4">
        <AlertTriangle size={32} className="text-severity-high" />
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-1">
        Something went wrong
      </h3>
      <p className="text-sm text-text-secondary max-w-md mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg
            bg-accent text-white font-medium text-sm
            hover:bg-accent-hover transition-colors cursor-pointer"
        >
          <RefreshCw size={16} />
          Retry
        </button>
      )}
    </div>
  );
}

export default React.memo(ErrorState);
