import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";

/**
 * @param {{
 *   open: boolean,
 *   title: string,
 *   message: string,
 *   confirmLabel?: string,
 *   cancelLabel?: string,
 *   onConfirm: () => void,
 *   onCancel: () => void,
 *   variant?: "danger" | "default"
 * }} props
 */
export default function ConfirmDialog({ open, title, message, confirmLabel = "Clear", cancelLabel = "Cancel", onConfirm, onCancel, variant = "default" }) {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (open) {
      confirmRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape" && open) onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full ${variant === "danger" ? "bg-red-100 dark:bg-red-900/30" : "bg-accent-light"}`}>
            <AlertTriangle size={20} className={variant === "danger" ? "text-red-600 dark:text-red-400" : "text-accent"} />
          </div>
          <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
        </div>
        <p className="text-sm text-text-secondary">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-secondary cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            ref={confirmRef}
            onClick={onConfirm}
            className={`rounded-lg px-3 py-2 text-sm font-medium text-white transition-colors cursor-pointer
              ${variant === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-accent hover:opacity-90"}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
