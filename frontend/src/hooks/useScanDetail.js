import { useState, useEffect, useCallback } from "react";
import { fetchScanDetail } from "../lib/api";

export function useScanDetail(scanId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(
    (signal) => {
      if (!scanId) return;
      setLoading(true);
      setError(null);
      fetchScanDetail(scanId, { signal })
        .then(setData)
        .catch((err) => {
          if (err?.name !== "AbortError") setError(err);
        })
        .finally(() => setLoading(false));
    },
    [scanId]
  );

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
