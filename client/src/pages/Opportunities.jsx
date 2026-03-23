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

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6" style={{ "--accent": "5 150 105" }}>
      {/* Header Section */}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1.5">
          <h1 className="font-display text-4xl tracking-tight text-sand md:text-5xl">Opportunities</h1>
          <p className="font-sans text-sm tracking-wide text-mist max-w-lg">
            Connect with career openings, research positions, and high-impact projects within the BridgeAZ network.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowNotifyModal(true)}
            className="flex items-center gap-2 rounded-full border border-border bg-charcoal px-5 py-2.5 font-sans text-[10px] font-bold uppercase tracking-widest text-mist transition-all hover:border-accent/40 hover:text-accent"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Alerts
          </button>
          {canPost && (
            <button
              onClick={() => {
                setShowForm((prev) => !prev);
                if (showForm) setEditingId(null);
              }}
              className={`flex items-center gap-2 rounded-full px-5 py-2.5 font-sans text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg ${
                showForm ? "bg-slate text-sand border border-border" : "bg-accent text-charcoal hover:bg-accent/90"
              }`}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showForm ? "M6 18L18 6M6 6l12 12" : "M12 4v16m8-8H4"} />
              </svg>
              {showForm ? "Close Form" : editingId ? "Edit Posting" : "Post Opportunity"}
            </button>
          )}
        </div>
      </div>

      {notifyFeedback && (
        <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5 border border-accent/20">
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
          <p className="font-sans text-[10px] font-bold uppercase tracking-wider text-accent">{notifyFeedback}</p>
        </div>
      )}

      {/* Post/Edit Form */}
      {showForm && (
        <div className="glass overflow-hidden rounded-2xl border border-border bg-white">
          <div className="border-b border-border bg-charcoal px-6 py-4">
            <h2 className="font-display text-lg text-sand">
              {editingId ? "Edit Opportunity" : "Post a New Opportunity"}
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2 md:col-span-1">
                <label className="font-sans text-[10px] font-bold uppercase tracking-widest text-mist ml-1">Title</label>
                <input
                  className="w-full rounded-xl border border-border bg-charcoal/40 px-4 py-3 font-sans text-sm text-sand placeholder:text-mist/30 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/50"
                  placeholder="e.g. Senior Software Engineer"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-1">
                <label className="font-sans text-[10px] font-bold uppercase tracking-widest text-mist ml-1">Organization</label>
                <input
                  className="w-full rounded-xl border border-border bg-charcoal/40 px-4 py-3 font-sans text-sm text-sand placeholder:text-mist/30 focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/50"
                  placeholder="e.g. AzeSA Global"
                  value={form.orgName}
                  onChange={(e) => setForm((prev) => ({ ...prev, orgName: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="font-sans text-[10px] font-bold uppercase tracking-widest text-mist ml-1">Type</label>
                <select
                  className="w-full appearance-none rounded-xl border border-border bg-charcoal/40 px-4 py-3 font-sans text-sm text-sand focus:border-accent/50 focus:outline-none"
                  value={form.type}
                  onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                >
                  {typeOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="font-sans text-[10px] font-bold uppercase tracking-widest text-mist ml-1">Location Mode</label>
                <select
                  className="w-full appearance-none rounded-xl border border-border bg-charcoal/40 px-4 py-3 font-sans text-sm text-sand focus:border-accent/50 focus:outline-none"
                  value={form.locationMode}
                  onChange={(e) => setForm((prev) => ({ ...prev, locationMode: e.target.value }))}
                >
                  {locationModes.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="font-sans text-[10px] font-bold uppercase tracking-widest text-mist ml-1">Country</label>
                <select
                  className="w-full appearance-none rounded-xl border border-border bg-charcoal/40 px-4 py-3 font-sans text-sm text-sand focus:border-accent/50 focus:outline-none"
                  value={form.country}
                  onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
                >
                  <option value="">Select Country</option>
                  {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="font-sans text-[10px] font-bold uppercase tracking-widest text-mist ml-1">City (Optional)</label>
                <input
                  className="w-full rounded-xl border border-border bg-charcoal/40 px-4 py-3 font-sans text-sm text-sand placeholder:text-mist/30 focus:border-accent/50 focus:outline-none"
                  placeholder="e.g. Baku"
                  value={form.city}
                  onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="font-sans text-[10px] font-bold uppercase tracking-widest text-mist ml-1">Description</label>
                <textarea
                  className="w-full rounded-xl border border-border bg-charcoal/40 px-4 py-3 font-sans text-sm text-sand placeholder:text-mist/30 focus:border-accent/50 focus:outline-none"
                  placeholder="Describe the role, responsibilities, and impact..."
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={5}
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="font-sans text-[10px] font-bold uppercase tracking-widest text-mist ml-1">Requirements (Comma Separated)</label>
                <input
                  className="w-full rounded-xl border border-border bg-charcoal/40 px-4 py-3 font-sans text-sm text-sand placeholder:text-mist/30 focus:border-accent/50 focus:outline-none"
                  placeholder="e.g. React, Node.js, 3+ years experience"
                  value={form.requirements}
                  onChange={(e) => setForm((prev) => ({ ...prev, requirements: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="font-sans text-[10px] font-bold uppercase tracking-widest text-mist ml-1">Apply URL (Optional)</label>
                <input
                  className="w-full rounded-xl border border-border bg-charcoal/40 px-4 py-3 font-sans text-sm text-sand placeholder:text-mist/30 focus:border-accent/50 focus:outline-none"
                  placeholder="https://..."
                  value={form.applyUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, applyUrl: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="font-sans text-[10px] font-bold uppercase tracking-widest text-mist ml-1">Contact Email (Optional)</label>
                <input
                  className="w-full rounded-xl border border-border bg-charcoal/40 px-4 py-3 font-sans text-sm text-sand placeholder:text-mist/30 focus:border-accent/50 focus:outline-none"
                  placeholder="careers@org.com"
                  value={form.contactEmail}
                  onChange={(e) => setForm((prev) => ({ ...prev, contactEmail: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="font-sans text-[10px] font-bold uppercase tracking-widest text-mist ml-1">Visibility Region</label>
                <select
                  className="w-full appearance-none rounded-xl border border-border bg-charcoal/40 px-4 py-3 font-sans text-sm text-sand focus:border-accent/50 focus:outline-none"
                  value={form.visibilityRegion}
                  onChange={(e) => setForm((prev) => ({ ...prev, visibilityRegion: e.target.value }))}
                >
                  {visibilityOptions.map((o) => (
                    <option key={o} value={o}>{o === "LOCAL" ? "Local Only" : o}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="font-sans text-[10px] font-bold uppercase tracking-widest text-mist ml-1">Tags (Comma Separated)</label>
                <input
                  className="w-full rounded-xl border border-border bg-charcoal/40 px-4 py-3 font-sans text-sm text-sand placeholder:text-mist/30 focus:border-accent/50 focus:outline-none"
                  placeholder="engineering, remote, startup"
                  value={form.tags}
                  onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
                />
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <button
                type="submit"
                className="rounded-full bg-accent px-10 py-3 font-sans text-xs font-bold uppercase tracking-widest text-charcoal hover:bg-accent/90 transition-all shadow-lg shadow-accent/10"
              >
                {editingId ? "Update Posting" : "Publish Opportunity"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters Bar */}
      <div className="glass rounded-2xl border border-border bg-white p-2 shadow-inner">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="relative flex-1">
            <svg className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mist/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={filters.search}
              onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
              className="w-full rounded-xl border border-transparent bg-charcoal/40 py-2.5 pl-11 pr-4 font-sans text-sm text-sand placeholder:text-mist/40 focus:border-accent/30 focus:outline-none"
              placeholder="Search by title, organization..."
            />
          </div>
          <div className="grid grid-cols-2 gap-2 md:flex md:items-center">
            <select
              value={filters.region}
              onChange={(e) => setFilters((p) => ({ ...p, region: e.target.value }))}
              className="appearance-none rounded-xl border border-transparent bg-charcoal/40 px-4 py-2.5 font-sans text-[11px] font-bold uppercase tracking-wider text-mist focus:border-accent/30 focus:outline-none"
            >
              <option value="LOCAL">My Region</option>
              <option value="ALL">Global</option>
              {user?.currentRegion && <option value="NETWORK">Network</option>}
            </select>
            <select
              value={filters.type}
              onChange={(e) => setFilters((p) => ({ ...p, type: e.target.value }))}
              className="appearance-none rounded-xl border border-transparent bg-charcoal/40 px-4 py-2.5 font-sans text-[11px] font-bold uppercase tracking-wider text-mist focus:border-accent/30 focus:outline-none"
            >
              <option value="">All Types</option>
              {typeOptions.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <select
              value={filters.country}
              onChange={(e) => setFilters((p) => ({ ...p, country: e.target.value }))}
              className="appearance-none rounded-xl border border-transparent bg-charcoal/40 px-4 py-2.5 font-sans text-[11px] font-bold uppercase tracking-wider text-mist focus:border-accent/30 focus:outline-none"
            >
              <option value="">Location</option>
              {countries.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
              className="appearance-none rounded-xl border border-transparent bg-charcoal/40 px-4 py-2.5 font-sans text-[11px] font-bold uppercase tracking-wider text-mist focus:border-accent/30 focus:outline-none"
            >
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div className="flex items-center gap-1 rounded-xl bg-charcoal/40 p-1 ml-auto">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${viewMode === "grid" ? "bg-surface-alt text-accent" : "text-mist/40 hover:text-mist"}`}
              title="Grid View"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${viewMode === "list" ? "bg-surface-alt text-accent" : "text-mist/40 hover:text-mist"}`}
              title="Split View"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-coral/20 bg-coral/5 px-4 py-3 text-sm text-coral">
          <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-sans font-medium">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="font-sans text-[10px] font-bold uppercase tracking-widest text-mist">Loading opportunities...</p>
        </div>
      ) : opportunities.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border py-20 bg-charcoal">
          <p className="font-display text-xl text-sand/50">No opportunities found</p>
          <p className="mt-1 font-sans text-sm text-mist/40">Try adjusting your filters or search keywords.</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid items-start gap-6 md:grid-cols-2 lg:grid-cols-3">
          {opportunities.map((opportunity) => (
            <OpportunityCard
              key={opportunity._id}
              opportunity={opportunity}
              isOwner={opportunity.postedBy === user?._id}
              onEdit={() => startEdit(opportunity)}
              onClose={() => closeOpportunity(opportunity._id)}
              onDelete={() => deleteOpportunity(opportunity._id)}
              onShare={() => setShareInput(buildOpportunityShareInput(opportunity))}
            />
          ))}
        </div>
      ) : (
        <div className="grid h-[700px] gap-6 lg:grid-cols-[400px_1fr]">
          {/* List Sidebar */}
          <div className="glass flex flex-col overflow-hidden rounded-2xl border border-border bg-white">
            <div className="overflow-y-auto p-2 space-y-2">
              {opportunities.map((opportunity) => (
                <button
                  key={opportunity._id}
                  onClick={() => handleRowSelect(opportunity._id)}
                  className={`group w-full rounded-xl border p-4 text-left transition-all ${
                    selectedOpportunity?._id === opportunity._id
                      ? "border-accent/40 bg-accent/10 shadow-sm shadow-accent/5"
                      : "border-transparent hover:bg-charcoal"
                  }`}
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-sans text-[9px] font-bold uppercase tracking-widest text-accent/70">
                        {opportunity.orgName}
                      </span>
                      <span className="font-sans text-[9px] text-mist/50">
                        {formatRelativeTime(opportunity.createdAt)}
                      </span>
                    </div>
                    <p className={`font-display text-sm leading-tight transition-colors ${
                      selectedOpportunity?._id === opportunity._id ? "text-sand" : "text-sand/80 group-hover:text-sand"
                    }`}>
                      {opportunity.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="font-sans text-[9px] font-medium uppercase tracking-tighter text-mist/60 border border-border rounded px-1">
                        {opportunity.type}
                      </span>
                      <span className="font-sans text-[9px] text-mist/40">
                        {countryLabel(opportunity.country)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Details Pane */}
          <div className="glass flex flex-col overflow-hidden rounded-2xl border border-border bg-white">
            {selectedOpportunityForPane ? (
              <div className="flex-1 overflow-y-auto">
                <div className="sticky top-0 z-10 border-b border-border bg-white backdrop-blur-md px-8 py-6">
                  <div className="flex items-start justify-between gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-sans text-xs font-bold uppercase tracking-[0.2em] text-accent">
                          {selectedOpportunityForPane.orgName || selectedOpportunityForPane.company}
                        </span>
                        {selectedOpportunityForPane.postedBy === user?._id && (
                          <span className="rounded bg-charcoal px-2 py-0.5 font-sans text-[9px] font-bold uppercase tracking-wider text-mist">
                            Your Posting
                          </span>
                        )}
                      </div>
                      <h3 className="font-display text-3xl leading-tight text-sand">
                        {selectedOpportunityForPane.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 pt-2">
                        <div className="flex items-center gap-1.5 font-sans text-[10px] font-bold uppercase tracking-widest text-mist">
                          <svg className="h-3 w-3 text-accent/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {selectedOpportunityForPane.type}
                        </div>
                        <div className="flex items-center gap-1.5 font-sans text-[10px] font-bold uppercase tracking-widest text-mist">
                          <svg className="h-3 w-3 text-accent/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                          {countryLabel(selectedOpportunityForPane.country)}{selectedOpportunityForPane.city ? ` · ${selectedOpportunityForPane.city}` : ""}
                        </div>
                        <div className="flex items-center gap-1.5 font-sans text-[10px] font-bold uppercase tracking-widest text-mist">
                          <svg className="h-3 w-3 text-accent/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {formatRelativeTime(selectedOpportunityForPane.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <div className="flex items-center gap-2">
                        <span className={`h-1.5 w-1.5 rounded-full ${selectedOpportunityForPane.status === "open" ? "bg-accent shadow-[0_0_10px_rgba(45,212,191,0.5)]" : "bg-mist/30"}`} />
                        <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-mist">{selectedOpportunityForPane.status}</span>
                      </div>
                      <button
                        onClick={() => setShareInput(buildOpportunityShareInput(selectedOpportunityForPane))}
                        className="rounded-full border border-border p-2 text-mist transition-all hover:bg-charcoal hover:text-accent"
                        title="Share Opportunity"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 100-2.684 3 3 0 000 2.684zm0 9a3 3 0 100-2.684 3 3 0 000 2.684z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="px-8 py-8 space-y-10">
                  {detailLoadingId === selectedOpportunityForPane._id && (
                    <div className="flex items-center gap-3 animate-pulse">
                      <div className="h-2 w-2 rounded-full bg-accent" />
                      <p className="font-sans text-[10px] font-bold uppercase tracking-widest text-mist">Fetching full details...</p>
                    </div>
                  )}

                  <section className="space-y-4">
                    <h4 className="font-sans text-[11px] font-bold uppercase tracking-[0.25em] text-mist/60 border-b border-border pb-2">Description</h4>
                    <p className="font-sans text-base leading-relaxed text-sand/90 whitespace-pre-wrap">
                      {selectedOpportunityForPane.description}
                    </p>
                  </section>

                  {selectedOpportunityForPane.requirements?.length ? (
                    <section className="space-y-4">
                      <h4 className="font-sans text-[11px] font-bold uppercase tracking-[0.25em] text-mist/60 border-b border-border pb-2">Requirements</h4>
                      <ul className="grid gap-3 md:grid-cols-2">
                        {selectedOpportunityForPane.requirements.map((item) => (
                          <li key={item} className="flex items-start gap-3 rounded-xl border border-border bg-charcoal p-4 transition-all hover:border-accent/20">
                            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-accent" />
                            <span className="font-sans text-sm text-sand/80">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}

                  {selectedOpportunityForPane.tags?.length ? (
                    <section className="space-y-4">
                      <h4 className="font-sans text-[11px] font-bold uppercase tracking-[0.25em] text-mist/60 border-b border-border pb-2">Tags</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedOpportunityForPane.tags.map((tag) => (
                          <span key={tag} className="rounded-lg border border-border bg-charcoal px-3 py-1 font-sans text-[10px] font-bold uppercase tracking-widest text-mist">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </section>
                  ) : null}

                  <div className="sticky bottom-0 mt-12 flex flex-wrap items-center gap-4 border-t border-border bg-white backdrop-blur-md -mx-8 px-8 py-6">
                    {selectedOpportunityForPane.applyUrl && (
                      <a
                        href={selectedOpportunityForPane.applyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full bg-accent px-10 py-3.5 font-sans text-xs font-bold uppercase tracking-widest text-charcoal hover:bg-accent/90 transition-all shadow-lg shadow-accent/20"
                      >
                        Apply Now
                      </a>
                    )}
                    {selectedOpportunityForPane.contactEmail && (
                      <a
                        href={`mailto:${selectedOpportunityForPane.contactEmail}`}
                        className="rounded-full border border-accent/50 bg-accent/5 px-10 py-3.5 font-sans text-xs font-bold uppercase tracking-widest text-accent hover:bg-accent/10 transition-all"
                      >
                        Email Contact
                      </a>
                    )}
                    {!selectedOpportunityForPane.applyUrl && !selectedOpportunityForPane.contactEmail && (
                      <Link
                        to={`/opportunities/${selectedOpportunityForPane._id}`}
                        className="rounded-full bg-accent px-10 py-3.5 font-sans text-xs font-bold uppercase tracking-widest text-charcoal hover:bg-accent/90 transition-all"
                      >
                        View More Details
                      </Link>
                    )}
                    
                    {selectedOpportunityForPane.postedBy === user?._id && (
                      <div className="ml-auto flex items-center gap-2">
                        <button
                          onClick={() => startEdit(selectedOpportunityForPane)}
                          className="rounded-full border border-border px-6 py-3 font-sans text-[10px] font-bold uppercase tracking-widest text-mist hover:bg-charcoal hover:text-sand transition-all"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => closeOpportunity(selectedOpportunityForPane._id)}
                          className="rounded-full border border-border px-6 py-3 font-sans text-[10px] font-bold uppercase tracking-widest text-mist hover:bg-charcoal hover:text-sand transition-all"
                        >
                          Close
                        </button>
                        <button
                          onClick={() => deleteOpportunity(selectedOpportunityForPane._id)}
                          className="rounded-full border border-coral/30 px-6 py-3 font-sans text-[10px] font-bold uppercase tracking-widest text-coral/80 hover:bg-coral/5 hover:text-coral transition-all"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center p-20 text-center">
                <div className="mb-6 rounded-full bg-charcoal p-6">
                  <svg className="h-12 w-12 text-mist/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="font-display text-2xl text-sand/50">Select an opportunity</h3>
                <p className="mt-2 max-w-xs font-sans text-sm text-mist/40">Choose a listing from the sidebar to view full details and application options.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notifications Modal */}
      {showNotifyModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-charcoal/80 backdrop-blur-sm" onClick={() => setShowNotifyModal(false)} />
          <div className="glass relative w-full max-w-xl overflow-hidden rounded-3xl border border-border bg-slate/90 p-0 shadow-2xl">
            <div className="border-b border-border bg-charcoal px-8 py-6">
              <h3 className="font-display text-2xl text-sand">Opportunity Alerts</h3>
              <p className="font-sans text-sm text-mist/60 mt-1">Get notified when new positions match your interests.</p>
            </div>
            <div className="p-8 space-y-8">
              <div className="space-y-4">
                <label className="font-sans text-[11px] font-bold uppercase tracking-widest text-accent">Position Types</label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {notifyTypeOptions.map((type) => (
                    <label key={type} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all ${
                      notifyPrefs.types.includes(type) ? "border-accent/40 bg-accent/10 text-sand" : "border-border bg-charcoal text-mist/60 hover:border-border"
                    }`}>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={notifyPrefs.types.includes(type)}
                        onChange={() => setNotifyPrefs((p) => ({ ...p, types: toggleMultiValue(p.types, type) }))}
                      />
                      <span className={`h-1.5 w-1.5 rounded-full ${notifyPrefs.types.includes(type) ? "bg-accent" : "bg-mist/30"}`} />
                      <span className="font-sans text-[11px] font-bold uppercase tracking-tight">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="font-sans text-[11px] font-bold uppercase tracking-widest text-accent">Location Modes</label>
                <div className="flex flex-wrap gap-3">
                  {notifyLocationModes.map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setNotifyPrefs((p) => ({ ...p, locationModes: toggleMultiValue(p.locationModes, mode) }))}
                      className={`rounded-full border px-5 py-2 font-sans text-[11px] font-bold uppercase tracking-widest transition-all ${
                        notifyPrefs.locationModes.includes(mode) ? "border-accent/40 bg-accent/10 text-accent" : "border-border bg-charcoal text-mist/60 hover:border-border"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="font-sans text-[11px] font-bold uppercase tracking-widest text-accent ml-1">Preferred Location</label>
                  <select
                    value={notifyPrefs.country}
                    onChange={(e) => setNotifyPrefs((p) => ({ ...p, country: e.target.value }))}
                    className="w-full appearance-none rounded-xl border border-border bg-charcoal/60 px-4 py-3 font-sans text-sm text-sand focus:border-accent/40 focus:outline-none"
                  >
                    <option value="">Any Country</option>
                    {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="font-sans text-[11px] font-bold uppercase tracking-widest text-accent ml-1">Keywords</label>
                  <input
                    value={notifyPrefs.keywords}
                    onChange={(e) => setNotifyPrefs((p) => ({ ...p, keywords: e.target.value }))}
                    className="w-full rounded-xl border border-border bg-charcoal/60 px-4 py-3 font-sans text-sm text-sand placeholder:text-mist/30 focus:border-accent/40 focus:outline-none"
                    placeholder="e.g. AI, Backend, Internship"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-border bg-charcoal px-8 py-6">
              <button
                onClick={() => setShowNotifyModal(false)}
                className="font-sans text-[11px] font-bold uppercase tracking-widest text-mist hover:text-sand"
              >
                Discard Changes
              </button>
              <button
                onClick={handleNotifySave}
                className="rounded-full bg-accent px-8 py-3 font-sans text-xs font-bold uppercase tracking-widest text-charcoal shadow-lg shadow-accent/20 hover:bg-accent/90 transition-all"
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
