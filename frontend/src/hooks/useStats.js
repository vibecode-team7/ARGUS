import { useState, useEffect, useCallback } from "react";
import { fetchStats } from "../lib/api";

export function useStats() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback((signal) => {
    setLoading(true);
    setError(null);
    fetchStats({ signal })
      .then(setData)
      .catch((err) => {
        if (err?.name !== "AbortError") setError(err);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  const refetch = useCallback(() => {
    const ctrl = new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  return { data, loading, error, refetch };
}
