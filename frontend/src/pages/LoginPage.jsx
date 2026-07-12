import { useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { Shield, KeyRound, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { verifyApiKey } from "../lib/api";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [key, setKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const from = location.state?.from ?? "/";

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = key.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError(null);
    try {
      const valid = await verifyApiKey(trimmed);
      if (!valid) {
        setError("Invalid API key.");
        return;
      }
      login(trimmed);
      navigate(from, { replace: true });
    } catch {
      setError("Cannot reach the backend. Is it running?");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-accent mb-3">
            <Shield size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">ARGUS</h1>
          <p className="text-xs uppercase tracking-widest text-text-muted">Shadow AI Scanner</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-bg-card border border-border rounded-xl p-6 space-y-4"
        >
          <div className="space-y-1.5">
            <label htmlFor="api-key" className="text-sm font-medium text-text-primary">
              Dashboard API key
            </label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-bg-input focus-within:border-accent focus-within:ring-1 focus-within:ring-accent transition-colors">
              <KeyRound size={16} className="text-text-muted shrink-0" />
              <input
                id="api-key"
                type="password"
                autoFocus
                autoComplete="off"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Enter your read key"
                className="flex-1 bg-transparent outline-none text-sm text-text-primary placeholder:text-text-muted"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="text-sm text-severity-high">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !key.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
              bg-accent text-white font-medium text-sm
              hover:bg-accent-hover transition-colors cursor-pointer
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
            {submitting ? "Verifying…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
