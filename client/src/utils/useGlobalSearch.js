import { useState, useRef, useCallback, useEffect } from "react";
import { apiClient } from "../api/client";
import { useAuth } from "./auth";

const EMPTY = { users: [], opportunities: [], posts: [] };
const EMPTY_COUNTS = { users: 0, opportunities: 0, posts: 0 };

export default function useGlobalSearch({ debounceMs = 300 } = {}) {
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [countries, setCountries] = useState([]);
  const [types, setTypes] = useState(["users", "opportunities", "posts"]);
  const [results, setResults] = useState(EMPTY);
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [loading, setLoading] = useState(false);

  const abortRef = useRef(null);
  const timerRef = useRef(null);

  const doSearch = useCallback(
    async (q, c, t) => {
      if (abortRef.current) abortRef.current.abort();

      if (q.trim().length < 2) {
        setResults(EMPTY);
        setCounts(EMPTY_COUNTS);
        setLoading(false);
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);

      try {
        const params = new URLSearchParams({ q: q.trim(), limit: "5" });
        if (t.length && t.length < 3) params.set("types", t.join(","));
        if (c.length) params.set("countries", c.join(","));

        const data = await apiClient.get(`/search?${params}`, token, { signal: controller.signal });
        if (!controller.signal.aborted) {
          setResults({ users: data.users, opportunities: data.opportunities, posts: data.posts });
          setCounts(data.counts);
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          setResults(EMPTY);
          setCounts(EMPTY_COUNTS);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [token]
  );

  // Debounced query search
  const setQueryDebounced = useCallback(
    (q) => {
      setQuery(q);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => doSearch(q, countries, types), debounceMs);
    },
    [doSearch, countries, types, debounceMs]
  );

  // Immediate search on filter changes
  useEffect(() => {
    if (query.trim().length >= 2) {
      doSearch(query, countries, types);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countries, types]);

  const clear = useCallback(() => {
    clearTimeout(timerRef.current);
    if (abortRef.current) abortRef.current.abort();
    setQuery("");
    setResults(EMPTY);
    setCounts(EMPTY_COUNTS);
    setLoading(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return {
    query,
    setQuery: setQueryDebounced,
    countries,
    setCountries,
    types,
    setTypes,
    results,
    counts,
    loading,
    clear
  };
}
