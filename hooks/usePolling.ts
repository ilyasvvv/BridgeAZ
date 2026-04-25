"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Polls the given async function on an interval. Pauses while the document
 * is hidden so we don't burn the free Render dyno. Resumes on visibility.
 */
export function usePolling<T>(
  fn: () => Promise<T>,
  intervalMs: number,
  deps: ReadonlyArray<unknown> = []
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const cancelled = useRef(false);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const tick = useCallback(async () => {
    try {
      const next = await fnRef.current();
      if (cancelled.current) return;
      setData(next);
      setError(null);
    } catch (err) {
      if (cancelled.current) return;
      setError(err as Error);
    } finally {
      if (!cancelled.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    cancelled.current = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer) return;
      tick();
      timer = setInterval(tick, intervalMs);
    };
    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const onVis = () => {
      if (document.hidden) stop();
      else start();
    };

    start();
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled.current = true;
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, tick, ...deps]);

  return { data, error, loading, refetch: tick, setData };
}
