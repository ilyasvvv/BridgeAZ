import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../utils/auth";
import OpportunityCard from "../components/OpportunityCard";
import StatusBadge from "../components/StatusBadge";
import ShareSheet from "../components/ShareSheet";
import { countries } from "../utils/countries";
import { countryLabel, formatRelativeTime } from "../utils/format";
import { buildSharePayload } from "../utils/share";

const typeOptions = [
  "Internship",
  "Full-time",
  "Part-time",
  "Research",
  "Contract",
  "Volunteer"
];

const locationModes = ["On-site", "Hybrid", "Remote"];
const visibilityOptions = ["ALL", "LOCAL", "NETWORK"];
const notifyTypeOptions = ["internship", "full-time", "contract", "collaboration", "other"];
const notifyLocationModes = ["remote", "hybrid", "onsite"];
const OPP_VIEW_MODE_KEY = "oppViewMode:v1";
const OPP_NOTIFY_PREFS_KEY = "oppNotifyPrefs:v1";

const defaultNotifyPrefs = {
  types: [],
  locationModes: [],
  country: "",
  keywords: ""
};

const getInitialViewMode = () => {
  if (typeof window === "undefined") return "grid";
  const saved = window.localStorage.getItem(OPP_VIEW_MODE_KEY);
  return saved === "list" ? "list" : "grid";
};

const getInitialNotifyPrefs = () => {
  if (typeof window === "undefined") return defaultNotifyPrefs;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(OPP_NOTIFY_PREFS_KEY) || "{}");
    return {
      types: Array.isArray(parsed.types) ? parsed.types : [],
      locationModes: Array.isArray(parsed.locationModes) ? parsed.locationModes : [],
      country: typeof parsed.country === "string" ? parsed.country : "",
      keywords:
        typeof parsed.keywords === "string"
          ? parsed.keywords
          : typeof parsed.keyword === "string"
            ? parsed.keyword
            : ""
    };
  } catch (error) {
    return defaultNotifyPrefs;
  }
};

const toggleMultiValue = (values, nextValue) =>
  values.includes(nextValue) ? values.filter((item) => item !== nextValue) : [...values, nextValue];

const resolveRegionFilter = (region, userRegion) => {
  if (!region || region === "LOCAL") return "";
  if (region === "NETWORK") return userRegion || "";
  return region;
};

/* ───────────────────────── type chip icons ───────────────────────── */
const typeIcons = {
  Internship: (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  "Full-time": (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  "Part-time": (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Research: (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  Contract: (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Volunteer: (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  )
};

export default function Opportunities() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [opportunities, setOpportunities] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    region: "LOCAL",
    type: "",
    country: "",
    status: "open"
  });
  const [showForm, setShowForm] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifyPrefs, setNotifyPrefs] = useState(getInitialNotifyPrefs);
  const [notifyFeedback, setNotifyFeedback] = useState("");
  const [viewMode, setViewMode] = useState(getInitialViewMode);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState(null);
  const [opportunityDetailCache, setOpportunityDetailCache] = useState({});
  const [detailLoadingId, setDetailLoadingId] = useState("");
  const [detailError, setDetailError] = useState("");
  const [shareInput, setShareInput] = useState(null);
  const [form, setForm] = useState({
    title: "",
    orgName: "",
    type: "Internship",
    locationMode: "Remote",
    country: "",
    city: "",
    description: "",
    requirements: "",
    applyUrl: "",
    contactEmail: "",
    visibilityRegion: "ALL",
    tags: ""
  });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const canPost = useMemo(
    () => user?.isAdmin || user?.userType === "professional",
    [user]
  );

  const selectedOpportunity = useMemo(
    () => opportunities.find((item) => item._id === selectedOpportunityId) || opportunities[0] || null,
    [opportunities, selectedOpportunityId]
  );
  const selectedOpportunityDetail = selectedOpportunity?._id
    ? opportunityDetailCache[selectedOpportunity._id] || null
    : null;
  const selectedOpportunityForPane = selectedOpportunityDetail || selectedOpportunity;

  /* ─── persistence ─── */
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(OPP_VIEW_MODE_KEY, viewMode);
    }
  }, [viewMode]);

  useEffect(() => {
    if (!selectedOpportunityId && opportunities.length) {
      setSelectedOpportunityId(opportunities[0]._id);
      return;
    }
    if (selectedOpportunityId && !opportunities.some((item) => item._id === selectedOpportunityId)) {
      setSelectedOpportunityId(opportunities[0]?._id || null);
    }
  }, [opportunities, selectedOpportunityId]);

  useEffect(() => {
    if (!token || viewMode !== "list" || !selectedOpportunity?._id) return;
    if (opportunityDetailCache[selectedOpportunity._id]) return;
    let cancelled = false;

    const loadOpportunityDetail = async () => {
      setDetailError("");
      setDetailLoadingId(selectedOpportunity._id);
      try {
        const detail = await apiClient.get(`/opportunities/${selectedOpportunity._id}`, token);
        if (cancelled) return;
        setOpportunityDetailCache((prev) => ({ ...prev, [selectedOpportunity._id]: detail }));
      } catch (detailLoadError) {
        if (cancelled) return;
        setDetailError(detailLoadError.message || "Failed to load full details");
      } finally {
        if (!cancelled) {
          setDetailLoadingId("");
        }
      }
    };

    loadOpportunityDetail();
    return () => {
      cancelled = true;
    };
  }, [token, viewMode, selectedOpportunity?._id, opportunityDetailCache]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const loadNotifyPrefs = async () => {
      try {
        const data = await apiClient.get("/opportunities/notify-prefs", token);
        if (cancelled) return;
        const normalized = {
          types: Array.isArray(data?.types) ? data.types : [],
          locationModes: Array.isArray(data?.locationModes) ? data.locationModes : [],
          country: typeof data?.country === "string" ? data.country : "",
          keywords:
            typeof data?.keywords === "string"
              ? data.keywords
              : typeof data?.keyword === "string"
                ? data.keyword
                : ""
        };
        setNotifyPrefs(normalized);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(OPP_NOTIFY_PREFS_KEY, JSON.stringify(normalized));
        }
      } catch (loadError) {
        // Keep local fallback prefs on network/API failure.
      }
    };

    loadNotifyPrefs();
    return () => {
      cancelled = true;
    };
  }, [token]);

  /* ─── data loading ─── */
  const loadOpportunities = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      const region = resolveRegionFilter(filters.region, user?.currentRegion);
      if (region) params.set("region", region);
      if (filters.type) params.set("type", filters.type);
      if (filters.country) params.set("country", filters.country);
      if (filters.status) params.set("status", filters.status);

      const data = await apiClient.get(`/opportunities?${params.toString()}`, token);
      setOpportunities(data);
    } catch (err) {
      setError(err.message || "Failed to load opportunities");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadOpportunities();
    }
  }, [filters, token, user?.currentRegion]);

  /* ─── CRUD handlers ─── */
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.title || !form.orgName || !form.description) {
      setError("Title, organization, and description are required.");
      return;
    }

    const payload = {
      ...form,
      requirements: form.requirements
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      tags: form.tags
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      visibilityRegion:
        form.visibilityRegion === "LOCAL" ? user?.currentRegion || "ALL" : form.visibilityRegion
    };

    try {
      if (editingId) {
        const updated = await apiClient.patch(`/opportunities/${editingId}`, payload, token);
        setOpportunities((prev) =>
          prev.map((item) => (item._id === editingId ? updated : item))
        );
      } else {
        const created = await apiClient.post("/opportunities", payload, token);
        setOpportunities((prev) => [created, ...prev]);
      }
      setForm((prev) => ({
        ...prev,
        title: "",
        orgName: "",
        city: "",
        description: "",
        requirements: "",
        applyUrl: "",
        contactEmail: "",
        tags: ""
      }));
      setEditingId(null);
      setShowForm(false);
    } catch (err) {
      setError(err.message || "Failed to post opportunity");
    }
  };

  const startEdit = (opportunity) => {
    setEditingId(opportunity._id);
    setForm({
      title: opportunity.title || "",
      orgName: opportunity.orgName || "",
      type: opportunity.type || "Internship",
      locationMode: opportunity.locationMode || "Remote",
      country: opportunity.country || "",
      city: opportunity.city || "",
      description: opportunity.description || "",
      requirements: (opportunity.requirements || []).join(", "),
      applyUrl: opportunity.applyUrl || "",
      contactEmail: opportunity.contactEmail || "",
      visibilityRegion: opportunity.visibilityRegion || "ALL",
      tags: (opportunity.tags || []).join(", ")
    });
    setShowForm(true);
  };

  const closeOpportunity = async (id) => {
    try {
      const updated = await apiClient.patch(`/opportunities/${id}/close`, {}, token);
      setOpportunities((prev) => prev.map((item) => (item._id === id ? updated : item)));
    } catch (err) {
      setError(err.message || "Failed to close opportunity");
    }
  };

  const deleteOpportunity = async (id) => {
    try {
      await apiClient.delete(`/opportunities/${id}`, token);
      setOpportunities((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      setError(err.message || "Failed to delete opportunity");
    }
  };

  const handleNotifySave = async () => {
    const payload = {
      types: notifyPrefs.types,
      locationModes: notifyPrefs.locationModes,
      country: notifyPrefs.country,
      keywords: notifyPrefs.keywords
    };

    try {
      const saved = await apiClient.put("/opportunities/notify-prefs", payload, token);
      const normalized = {
        types: Array.isArray(saved?.types) ? saved.types : payload.types,
        locationModes: Array.isArray(saved?.locationModes)
          ? saved.locationModes
          : payload.locationModes,
        country: typeof saved?.country === "string" ? saved.country : payload.country,
        keywords: typeof saved?.keywords === "string" ? saved.keywords : payload.keywords
      };
      setNotifyPrefs(normalized);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(OPP_NOTIFY_PREFS_KEY, JSON.stringify(normalized));
      }
      setNotifyFeedback("Saved");
    } catch (saveError) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(OPP_NOTIFY_PREFS_KEY, JSON.stringify(payload));
      }
      setNotifyFeedback("Saved locally");
    }

    setShowNotifyModal(false);
    setTimeout(() => setNotifyFeedback(""), 1600);
  };

  const handleRowSelect = (opportunityId) => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      navigate(`/opportunities/${opportunityId}`);
      return;
    }
    setSelectedOpportunityId(opportunityId);
  };

  const buildOpportunityShareInput = (opportunity) =>
    buildSharePayload({
      entityType: "opportunity",
      entityId: opportunity?._id,
      url: `/opportunities/${opportunity?._id}`,
      title: opportunity?.title || "Opportunity",
      subtitle: opportunity?.orgName
        ? `${opportunity.orgName} · ${opportunity.locationMode || "Opportunity"}`
        : "Opportunity",
      meta: { opportunityId: opportunity?._id }
    });

  /* ─── helpers ─── */
  const activeFilterCount = [filters.type, filters.country, filters.region !== "LOCAL" ? filters.region : ""].filter(Boolean).length;

  const inputClass =
    "w-full rounded-xl border border-border bg-surface-alt/50 px-4 py-3 font-sans text-sm text-sand placeholder:text-mist/35 focus:border-sand/30 focus:outline-none focus:ring-2 focus:ring-sand/5 transition-all";
  const labelClass = "font-sans text-[10px] font-bold uppercase tracking-widest text-mist/70 ml-0.5";

  /* ═══════════════════════════════════ JSX ═══════════════════════════════════ */
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6">

      {/* ─────────────── Header ─────────────── */}
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1.5">
          <h1 className="font-display text-4xl tracking-tight text-sand md:text-5xl">Opportunities</h1>
          <p className="max-w-md font-sans text-sm tracking-wide text-mist">
            Career openings, research positions, and high-impact projects within the Bizim Circle network.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Alerts button */}
          <button
            onClick={() => setShowNotifyModal(true)}
            className="group/alert flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 font-sans text-xs font-semibold text-mist shadow-card transition-all hover:border-sand/30 hover:text-sand hover:shadow-elevated"
          >
            <svg className="h-4 w-4 transition-transform group-hover/alert:rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Alerts
          </button>
          {/* Post button */}
          {canPost && (
            <button
              onClick={() => {
                setShowForm((prev) => !prev);
                if (showForm) setEditingId(null);
              }}
              className="flex items-center gap-2 rounded-xl bg-sand px-5 py-2.5 font-sans text-xs font-bold text-white shadow-card transition-all hover:opacity-90 hover:shadow-elevated active:scale-[0.98]"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={showForm ? "M6 18L18 6M6 6l12 12" : "M12 4v16m8-8H4"} />
              </svg>
              {showForm ? "Cancel" : editingId ? "Edit Posting" : "Post Opportunity"}
            </button>
          )}
        </div>
      </div>

      {/* Notify feedback toast */}
      {notifyFeedback && (
        <div
          className="inline-flex items-center gap-2 rounded-xl bg-sand/5 px-4 py-2 border border-sand/15"
          style={{ animation: "opp-card-in 0.3s ease-out" }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-sand animate-pulse" />
          <p className="font-sans text-xs font-semibold text-sand">{notifyFeedback}</p>
        </div>
      )}

      {/* ─────────────── Search + Filters ─────────────── */}
      <div className="space-y-3">
        {/* Search bar */}
        <div className="relative">
          <svg className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mist/35" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={filters.search}
            onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
            className="w-full rounded-2xl border border-border bg-white py-3.5 pl-12 pr-4 font-sans text-sm text-sand shadow-card placeholder:text-mist/40 focus:border-sand/30 focus:outline-none focus:ring-2 focus:ring-sand/5 transition-all"
            placeholder="Search by title, organization, keyword..."
          />
        </div>

        {/* Type filter chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setFilters((p) => ({ ...p, type: "" }))}
            className={`shrink-0 rounded-xl border px-4 py-2 font-sans text-xs font-semibold transition-all ${
              !filters.type
                ? "border-sand/30 bg-sand/5 text-sand shadow-sm"
                : "border-border bg-white text-mist hover:border-sand/30 hover:text-sand"
            }`}
          >
            All Types
          </button>
          {typeOptions.map((type) => (
            <button
              key={type}
              onClick={() => setFilters((p) => ({ ...p, type: p.type === type ? "" : type }))}
              className={`shrink-0 flex items-center gap-1.5 rounded-xl border px-3.5 py-2 font-sans text-xs font-semibold transition-all ${
                filters.type === type
                  ? "border-sand/30 bg-sand/5 text-sand shadow-sm"
                  : "border-border bg-white text-mist hover:border-sand/30 hover:text-sand"
              }`}
            >
              {typeIcons[type]}
              {type}
            </button>
          ))}
        </div>

        {/* Secondary filters row */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {/* Region */}
            <select
              value={filters.region}
              onChange={(e) => setFilters((p) => ({ ...p, region: e.target.value }))}
              className="appearance-none rounded-xl border border-border bg-white px-3.5 py-2 font-sans text-xs font-semibold text-mist shadow-card transition-all hover:border-mist/30 focus:border-sand/30 focus:outline-none"
            >
              <option value="LOCAL">My Region</option>
              <option value="ALL">Global</option>
              {user?.currentRegion && <option value="NETWORK">Network</option>}
            </select>

            {/* Country */}
            <select
              value={filters.country}
              onChange={(e) => setFilters((p) => ({ ...p, country: e.target.value }))}
              className="appearance-none rounded-xl border border-border bg-white px-3.5 py-2 font-sans text-xs font-semibold text-mist shadow-card transition-all hover:border-mist/30 focus:border-sand/30 focus:outline-none"
            >
              <option value="">All Locations</option>
              {countries.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>

            {/* Status toggle pills */}
            <div className="flex rounded-xl border border-border bg-white p-0.5 shadow-card">
              <button
                onClick={() => setFilters((p) => ({ ...p, status: "open" }))}
                className={`rounded-lg px-3.5 py-1.5 font-sans text-xs font-semibold transition-all ${
                  filters.status === "open"
                    ? "bg-sand/5 text-sand shadow-sm"
                    : "text-mist/50 hover:text-mist"
                }`}
              >
                Open
              </button>
              <button
                onClick={() => setFilters((p) => ({ ...p, status: "closed" }))}
                className={`rounded-lg px-3.5 py-1.5 font-sans text-xs font-semibold transition-all ${
                  filters.status === "closed"
                    ? "bg-sand/5 text-sand shadow-sm"
                    : "text-mist/50 hover:text-mist"
                }`}
              >
                Closed
              </button>
            </div>

            {/* Active filter count badge */}
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-sand/5 px-2.5 py-1 font-sans text-[10px] font-bold text-sand border border-sand/10">
                {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Results count */}
            {!loading && (
              <span className="font-sans text-xs text-mist/50">
                {opportunities.length} result{opportunities.length !== 1 ? "s" : ""}
              </span>
            )}

            {/* View mode toggle */}
            <div className="flex rounded-xl border border-border bg-white p-0.5 shadow-card">
              <button
                onClick={() => setViewMode("grid")}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                  viewMode === "grid" ? "bg-sand/5 text-sand shadow-sm" : "text-mist/35 hover:text-mist"
                }`}
                title="Grid View"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                  viewMode === "list" ? "bg-sand/5 text-sand shadow-sm" : "text-mist/35 hover:text-mist"
                }`}
                title="Split View"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────── Error ─────────────── */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-coral/20 bg-coral/5 px-4 py-3 text-sm text-coral">
          <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-sans font-medium">{error}</p>
        </div>
      )}

      {/* ─────────────── Content ─────────────── */}
      {loading ? (
        /* Loading skeleton */
        <div className="grid items-start gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-white p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="opp-skeleton h-3 w-24" />
                <div className="opp-skeleton h-3 w-12" />
              </div>
              <div className="opp-skeleton h-5 w-3/4" />
              <div className="flex gap-2">
                <div className="opp-skeleton h-6 w-16 rounded-full" />
                <div className="opp-skeleton h-6 w-20 rounded-full" />
              </div>
              <div className="space-y-2">
                <div className="opp-skeleton h-3 w-full" />
                <div className="opp-skeleton h-3 w-2/3" />
              </div>
              <div className="border-t border-border pt-3 flex justify-between">
                <div className="opp-skeleton h-8 w-8 rounded-lg" />
                <div className="opp-skeleton h-8 w-24 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : opportunities.length === 0 ? (
        /* Empty state */
        <div
          className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-white/50 py-24"
          style={{ animation: "opp-card-in 0.5s ease-out" }}
        >
          <h3 className="font-display text-2xl text-sand/60">No opportunities found</h3>
          <p className="mt-2 max-w-xs text-center font-sans text-sm text-mist/50">
            Try adjusting your filters or search keywords to discover more.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        /* Grid view with staggered entrance */
        <div className="grid items-start gap-6 md:grid-cols-2 lg:grid-cols-3">
          {opportunities.map((opportunity, i) => (
            <OpportunityCard
              key={opportunity._id}
              opportunity={opportunity}
              isOwner={opportunity.postedBy === user?._id}
              onEdit={() => startEdit(opportunity)}
              onClose={() => closeOpportunity(opportunity._id)}
              onDelete={() => deleteOpportunity(opportunity._id)}
              onShare={() => setShareInput(buildOpportunityShareInput(opportunity))}
              style={{
                animation: `opp-card-in 0.45s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.06}s both`
              }}
            />
          ))}
        </div>
      ) : (
        /* Split / list view */
        <div className="grid h-[700px] gap-5 lg:grid-cols-[380px_1fr]">
          {/* Left sidebar list */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-card">
            <div className="overflow-y-auto p-2 space-y-1">
              {opportunities.map((opportunity) => (
                <button
                  key={opportunity._id}
                  onClick={() => handleRowSelect(opportunity._id)}
                  className={`group w-full rounded-xl p-3.5 text-left transition-all duration-200 ${
                    selectedOpportunity?._id === opportunity._id
                      ? "bg-sand/5 border-l-[3px] border-sand"
                      : "border-l-[3px] border-transparent hover:bg-surface-alt"
                  }`}
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-accent">
                        {opportunity.orgName}
                      </span>
                      <span className="font-sans text-[9px] text-mist/40">
                        {formatRelativeTime(opportunity.createdAt)}
                      </span>
                    </div>
                    <p className={`font-display text-sm leading-snug transition-colors ${
                      selectedOpportunity?._id === opportunity._id ? "text-sand" : "text-sand/70 group-hover:text-sand"
                    }`}>
                      {opportunity.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <span className="inline-flex items-center gap-1 rounded-md bg-surface-alt px-1.5 py-0.5 font-sans text-[9px] font-semibold text-mist/60">
                        {opportunity.type}
                      </span>
                      <span className="font-sans text-[9px] text-mist/35">
                        {countryLabel(opportunity.country)}
                      </span>
                      <span className={`ml-auto h-1.5 w-1.5 rounded-full ${opportunity.status === "open" ? "bg-accent" : "bg-mist/20"}`} />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right detail pane */}
          <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-card">
            {selectedOpportunityForPane ? (
              <div className="flex-1 overflow-y-auto">
                {/* Pane header */}
                <div className="sticky top-0 z-10 border-b border-border bg-white/95 backdrop-blur-md px-7 py-5">
                  <div className="flex items-start justify-between gap-5">
                    <div className="space-y-2 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-sans text-xs font-bold uppercase tracking-[0.2em] text-accent">
                          {selectedOpportunityForPane.orgName || selectedOpportunityForPane.company}
                        </span>
                        {selectedOpportunityForPane.postedBy === user?._id && (
                          <span className="rounded-md bg-sand/5 px-2 py-0.5 font-sans text-[9px] font-bold uppercase tracking-wider text-sand border border-sand/10">
                            Your Posting
                          </span>
                        )}
                      </div>
                      <h3 className="font-display text-2xl leading-tight text-sand lg:text-3xl">
                        {selectedOpportunityForPane.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <div className="flex items-center gap-1.5 font-sans text-[10px] font-semibold uppercase tracking-widest text-mist/60">
                          <svg className="h-3 w-3 text-accent-soft/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {selectedOpportunityForPane.type}
                        </div>
                        <div className="flex items-center gap-1.5 font-sans text-[10px] font-semibold uppercase tracking-widest text-mist/60">
                          <svg className="h-3 w-3 text-accent-soft/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                          {countryLabel(selectedOpportunityForPane.country)}{selectedOpportunityForPane.city ? ` · ${selectedOpportunityForPane.city}` : ""}
                        </div>
                        <div className="flex items-center gap-1.5 font-sans text-[10px] font-semibold uppercase tracking-widest text-mist/60">
                          <svg className="h-3 w-3 text-accent-soft/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {formatRelativeTime(selectedOpportunityForPane.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1.5 rounded-lg bg-surface-alt px-2.5 py-1">
                        <span className={`h-1.5 w-1.5 rounded-full ${selectedOpportunityForPane.status === "open" ? "bg-accent shadow-[0_0_8px_rgb(var(--accent)/0.3)]" : "bg-mist/25"}`} />
                        <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-mist">{selectedOpportunityForPane.status}</span>
                      </div>
                      <button
                        onClick={() => setShareInput(buildOpportunityShareInput(selectedOpportunityForPane))}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-mist transition-all hover:border-sand/30 hover:text-sand"
                        title="Share Opportunity"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 100-2.684 3 3 0 000 2.684zm0 9a3 3 0 100-2.684 3 3 0 000 2.684z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Pane body */}
                <div className="px-7 py-7 space-y-8">
                  {detailLoadingId === selectedOpportunityForPane._id && (
                    <div className="flex items-center gap-3 animate-pulse">
                      <div className="h-2 w-2 rounded-full bg-sand" />
                      <p className="font-sans text-[10px] font-bold uppercase tracking-widest text-mist">Fetching full details...</p>
                    </div>
                  )}

                  <section className="space-y-3">
                    <h4 className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-mist/50">Description</h4>
                    <p className="font-sans text-[15px] leading-relaxed text-sand/85 whitespace-pre-wrap">
                      {selectedOpportunityForPane.description}
                    </p>
                  </section>

                  {selectedOpportunityForPane.requirements?.length ? (
                    <section className="space-y-3">
                      <h4 className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-mist/50">Requirements</h4>
                      <div className="grid gap-2 md:grid-cols-2">
                        {selectedOpportunityForPane.requirements.map((item) => (
                          <div key={item} className="flex items-start gap-2.5 rounded-xl bg-surface-alt/60 p-3.5">
                            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-sand" />
                            <span className="font-sans text-sm text-sand/80">{item}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {selectedOpportunityForPane.tags?.length ? (
                    <section className="space-y-3">
                      <h4 className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-mist/50">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedOpportunityForPane.tags.map((tag) => (
                          <span key={tag} className="rounded-lg bg-surface-alt px-3 py-1 font-sans text-[11px] font-medium text-mist">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </section>
                  ) : null}

                  {/* CTA bar */}
                  <div className="sticky bottom-0 mt-6 flex flex-wrap items-center gap-3 border-t border-border bg-white/95 backdrop-blur-md -mx-7 px-7 py-5">
                    {selectedOpportunityForPane.applyUrl && (
                      <a
                        href={selectedOpportunityForPane.applyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl bg-sand px-8 py-3 font-sans text-xs font-bold text-white shadow-card transition-all hover:opacity-90 hover:shadow-elevated active:scale-[0.98]"
                      >
                        Apply Now
                      </a>
                    )}
                    {selectedOpportunityForPane.contactEmail && (
                      <a
                        href={`mailto:${selectedOpportunityForPane.contactEmail}`}
                        className="rounded-xl border border-coral/30 bg-coral/8 px-8 py-3 font-sans text-xs font-bold text-coral/90 transition-all hover:bg-coral/12"
                      >
                        Email Contact
                      </a>
                    )}
                    {!selectedOpportunityForPane.applyUrl && !selectedOpportunityForPane.contactEmail && (
                      <Link
                        to={`/opportunities/${selectedOpportunityForPane._id}`}
                        className="rounded-xl bg-sand px-8 py-3 font-sans text-xs font-bold text-white shadow-card transition-all hover:opacity-90 hover:shadow-elevated"
                      >
                        View More Details
                      </Link>
                    )}

                    {selectedOpportunityForPane.postedBy === user?._id && (
                      <div className="ml-auto flex items-center gap-2">
                        <button
                          onClick={() => startEdit(selectedOpportunityForPane)}
                          className="rounded-xl border border-border px-5 py-2.5 font-sans text-xs font-semibold text-mist transition-all hover:border-mist/30 hover:text-sand"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => closeOpportunity(selectedOpportunityForPane._id)}
                          className="rounded-xl border border-border px-5 py-2.5 font-sans text-xs font-semibold text-mist transition-all hover:border-mist/30 hover:text-sand"
                        >
                          Close
                        </button>
                        <button
                          onClick={() => deleteOpportunity(selectedOpportunityForPane._id)}
                          className="rounded-xl border border-coral/25 px-5 py-2.5 font-sans text-xs font-semibold text-coral/70 transition-all hover:bg-coral/5 hover:text-coral"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center p-16 text-center">
                <h3 className="font-display text-xl text-sand/40">Select an opportunity</h3>
                <p className="mt-2 max-w-xs font-sans text-sm text-mist/35">
                  Choose a listing from the sidebar to view full details and application options.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────── Post / Edit Form Modal ─────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 pt-[5vh]">
          <div
            className="absolute inset-0 bg-sand/30 backdrop-blur-sm"
            style={{ animation: "opp-overlay-in 0.2s ease-out" }}
            onClick={() => { setShowForm(false); setEditingId(null); }}
          />
          <div
            className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-white shadow-floating"
            style={{ animation: "opp-modal-in 0.35s cubic-bezier(0.16, 1, 0.3, 1)" }}
          >
            {/* Form header */}
            <div className="flex items-center justify-between border-b border-border px-7 py-5">
              <div>
                <h2 className="font-display text-xl text-sand">
                  {editingId ? "Edit Opportunity" : "Post a New Opportunity"}
                </h2>
                <p className="mt-0.5 font-sans text-xs text-mist/50">
                  {editingId ? "Update your opportunity details below." : "Share an opening with the Bizim Circle community."}
                </p>
              </div>
              <button
                onClick={() => { setShowForm(false); setEditingId(null); }}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-mist transition-all hover:bg-surface-alt hover:text-sand"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form body */}
            <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto p-7">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-1">
                  <label className={labelClass}>Title</label>
                  <input
                    className={inputClass}
                    placeholder="e.g. Senior Software Engineer"
                    value={form.title}
                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5 md:col-span-1">
                  <label className={labelClass}>Organization</label>
                  <input
                    className={inputClass}
                    placeholder="e.g. AzeSA Global"
                    value={form.orgName}
                    onChange={(e) => setForm((prev) => ({ ...prev, orgName: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Type</label>
                  <select
                    className={inputClass + " appearance-none"}
                    value={form.type}
                    onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                  >
                    {typeOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Location Mode</label>
                  <select
                    className={inputClass + " appearance-none"}
                    value={form.locationMode}
                    onChange={(e) => setForm((prev) => ({ ...prev, locationMode: e.target.value }))}
                  >
                    {locationModes.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Country</label>
                  <select
                    className={inputClass + " appearance-none"}
                    value={form.country}
                    onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
                  >
                    <option value="">Select Country</option>
                    {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>City <span className="text-mist/30 normal-case tracking-normal">(optional)</span></label>
                  <input
                    className={inputClass}
                    placeholder="e.g. Baku"
                    value={form.city}
                    onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className={labelClass}>Description</label>
                  <textarea
                    className={inputClass + " resize-none"}
                    placeholder="Describe the role, responsibilities, and impact..."
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    required
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className={labelClass}>Requirements <span className="text-mist/30 normal-case tracking-normal">(comma separated)</span></label>
                  <input
                    className={inputClass}
                    placeholder="e.g. React, Node.js, 3+ years experience"
                    value={form.requirements}
                    onChange={(e) => setForm((prev) => ({ ...prev, requirements: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Apply URL <span className="text-mist/30 normal-case tracking-normal">(optional)</span></label>
                  <input
                    className={inputClass}
                    placeholder="https://..."
                    value={form.applyUrl}
                    onChange={(e) => setForm((prev) => ({ ...prev, applyUrl: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Contact Email <span className="text-mist/30 normal-case tracking-normal">(optional)</span></label>
                  <input
                    className={inputClass}
                    placeholder="careers@org.com"
                    value={form.contactEmail}
                    onChange={(e) => setForm((prev) => ({ ...prev, contactEmail: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Visibility Region</label>
                  <select
                    className={inputClass + " appearance-none"}
                    value={form.visibilityRegion}
                    onChange={(e) => setForm((prev) => ({ ...prev, visibilityRegion: e.target.value }))}
                  >
                    {visibilityOptions.map((o) => (
                      <option key={o} value={o}>{o === "LOCAL" ? "Local Only" : o}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className={labelClass}>Tags <span className="text-mist/30 normal-case tracking-normal">(comma separated)</span></label>
                  <input
                    className={inputClass}
                    placeholder="engineering, remote, startup"
                    value={form.tags}
                    onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
                  />
                </div>
              </div>

              {/* Error inside form */}
              {error && (
                <div className="mt-4 rounded-xl border border-coral/20 bg-coral/5 px-4 py-2.5 font-sans text-xs font-medium text-coral">
                  {error}
                </div>
              )}

              <div className="mt-7 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingId(null); }}
                  className="rounded-xl px-5 py-2.5 font-sans text-xs font-semibold text-mist transition-all hover:text-sand"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-sand px-8 py-3 font-sans text-xs font-bold text-white shadow-card transition-all hover:opacity-90 hover:shadow-elevated active:scale-[0.98]"
                >
                  {editingId ? "Update Posting" : "Publish Opportunity"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────── Notifications Modal ─────────────── */}
      {showNotifyModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-sand/30 backdrop-blur-sm"
            style={{ animation: "opp-overlay-in 0.2s ease-out" }}
            onClick={() => setShowNotifyModal(false)}
          />
          <div
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-white shadow-floating"
            style={{ animation: "opp-modal-in 0.35s cubic-bezier(0.16, 1, 0.3, 1)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-7 py-5">
              <div>
                <h3 className="font-display text-xl text-sand">Opportunity Alerts</h3>
                <p className="mt-0.5 font-sans text-xs text-mist/50">Get notified when new positions match your interests.</p>
              </div>
              <button
                onClick={() => setShowNotifyModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-mist transition-all hover:bg-surface-alt hover:text-sand"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-7 space-y-7">
              <div className="space-y-3">
                <label className="font-sans text-[11px] font-bold uppercase tracking-widest text-sand">Position Types</label>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {notifyTypeOptions.map((type) => (
                    <label key={type} className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 transition-all ${
                      notifyPrefs.types.includes(type)
                        ? "border-sand/30 bg-sand/5 text-sand"
                        : "border-border bg-surface-alt/40 text-mist/50 hover:border-mist/30"
                    }`}>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={notifyPrefs.types.includes(type)}
                        onChange={() => setNotifyPrefs((p) => ({ ...p, types: toggleMultiValue(p.types, type) }))}
                      />
                      <span className={`h-1.5 w-1.5 rounded-full transition-colors ${notifyPrefs.types.includes(type) ? "bg-sand" : "bg-mist/25"}`} />
                      <span className="font-sans text-[11px] font-semibold uppercase tracking-tight">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="font-sans text-[11px] font-bold uppercase tracking-widest text-sand">Location Modes</label>
                <div className="flex flex-wrap gap-2.5">
                  {notifyLocationModes.map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setNotifyPrefs((p) => ({ ...p, locationModes: toggleMultiValue(p.locationModes, mode) }))}
                      className={`rounded-xl border px-5 py-2 font-sans text-[11px] font-semibold uppercase tracking-wider transition-all ${
                        notifyPrefs.locationModes.includes(mode)
                          ? "border-sand/30 bg-sand/5 text-sand"
                          : "border-border bg-surface-alt/40 text-mist/50 hover:border-mist/30"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="font-sans text-[11px] font-bold uppercase tracking-widest text-sand ml-0.5">Preferred Location</label>
                  <select
                    value={notifyPrefs.country}
                    onChange={(e) => setNotifyPrefs((p) => ({ ...p, country: e.target.value }))}
                    className={inputClass + " appearance-none"}
                  >
                    <option value="">Any Country</option>
                    {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="font-sans text-[11px] font-bold uppercase tracking-widest text-sand ml-0.5">Keywords</label>
                  <input
                    value={notifyPrefs.keywords}
                    onChange={(e) => setNotifyPrefs((p) => ({ ...p, keywords: e.target.value }))}
                    className={inputClass}
                    placeholder="e.g. AI, Backend, Internship"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-border px-7 py-5">
              <button
                onClick={() => setShowNotifyModal(false)}
                className="font-sans text-xs font-semibold text-mist transition-all hover:text-sand"
              >
                Discard
              </button>
              <button
                onClick={handleNotifySave}
                className="rounded-xl bg-sand px-7 py-2.5 font-sans text-xs font-bold text-white shadow-card transition-all hover:opacity-90 hover:shadow-elevated active:scale-[0.98]"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      <ShareSheet open={!!shareInput} onClose={() => setShareInput(null)} shareInput={shareInput} />
    </div>
  );
}
