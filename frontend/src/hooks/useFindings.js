import { useState, useEffect, useCallback, useRef } from "react";
import { fetchFindings } from "../lib/api";

export function useFindings({ hostname, severity, limit = 50, offset = 0 } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const load = useCallback(
    (signal) => {
      if (abortRef.current) abortRef.current.abort();
      const ctrl = signal ?? new AbortController();
      if (!signal) abortRef.current = ctrl;

      setLoading(true);
      setError(null);
      fetchFindings({ hostname, severity, limit, offset, signal: ctrl.signal })
        .then(setData)
        .catch((err) => {
          if (err?.name !== "AbortError") setError(err);
        })
        .finally(() => setLoading(false));
    },
    [hostname, severity, limit, offset]
  );

  useEffect(() => {
    load();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [load]);

  const refetch = useCallback(() => load(), [load]);

  return { data, loading, error, refetch };
}
