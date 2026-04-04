// Qovshaq Phase 2A — Hook that syncs filter state to URL params and API calls
import { useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useQFilterContext } from "../context/QFilterContext";

export function useQFilters() {
  const { filters, dispatch } = useQFilterContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialized = useRef(false);

  // Sync URL → filter state on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const country = searchParams.get("country");
    const city = searchParams.get("city");
    const categories = searchParams.get("category");
    const tags = searchParams.get("tags");
    const search = searchParams.get("search");
    const sort = searchParams.get("sort");
    const timeRange = searchParams.get("timeRange");

    if (country || city) {
      dispatch({
        type: "SET_LOCATION",
        payload: {
          country: country || "",
          city: city || "",
          countryCode: searchParams.get("countryCode") || "",
          region: "",
        },
      });
    }
    if (categories) dispatch({ type: "SET_CATEGORIES", payload: categories.split(",") });
    if (tags) dispatch({ type: "SET_TAGS", payload: tags.split(",") });
    if (search) dispatch({ type: "SET_SEARCH", payload: search });
    if (sort) dispatch({ type: "SET_SORT", payload: sort });
    if (timeRange) dispatch({ type: "SET_TIME_RANGE", payload: timeRange });
  }, []);

  // Sync filter state → URL
  useEffect(() => {
    if (!initialized.current) return;
    const params = new URLSearchParams();
    if (filters.location.country) params.set("country", filters.location.country);
    if (filters.location.city) params.set("city", filters.location.city);
    if (filters.location.countryCode) params.set("countryCode", filters.location.countryCode);
    if (filters.categories.length) params.set("category", filters.categories.join(","));
    if (filters.tags.length) params.set("tags", filters.tags.join(","));
    if (filters.search) params.set("search", filters.search);
    if (filters.sortBy !== "recent") params.set("sort", filters.sortBy);
    if (filters.timeRange !== "all") params.set("timeRange", filters.timeRange);
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  // Build API params from filter state
  const getApiParams = useCallback(
    (page = 1) => ({
      country: filters.location.country || undefined,
      city: filters.location.city || undefined,
      category: filters.categories.length ? filters.categories : undefined,
      tags: filters.tags.length ? filters.tags : undefined,
      search: filters.search || undefined,
      sort: filters.sortBy,
      timeRange: filters.timeRange !== "all" ? filters.timeRange : undefined,
      page,
      limit: 20,
    }),
    [filters]
  );

  return { filters, dispatch, getApiParams };
}
