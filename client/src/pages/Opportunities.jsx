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
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="glass rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-display text-3xl">Opportunities</h1>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowNotifyModal(true)}
              className="rounded-full border border-white/10 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-sand hover:border-teal"
            >
              Get notified
            </button>
            {canPost && (
              <button
                onClick={() => {
                  setShowForm((prev) => !prev);
                  if (showForm) {
                    setEditingId(null);
                  }
                }}
                className="rounded-full bg-coral px-5 py-2 text-xs font-semibold uppercase tracking-wide text-charcoal"
              >
                {showForm ? "Close form" : editingId ? "Edit opportunity" : "Post an opportunity"}
              </button>
            )}
          </div>
        </div>
        {notifyFeedback && <p className="mt-3 text-xs text-teal">{notifyFeedback}</p>}

        {showForm && (
          <form onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
            <input
              className="rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sand"
              placeholder="Title"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              required
            />
            <input
              className="rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sand"
              placeholder="Organization"
              value={form.orgName}
              onChange={(event) => setForm((prev) => ({ ...prev, orgName: event.target.value }))}
              required
            />
            <select
              className="rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sand"
              value={form.type}
              onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
            >
              {typeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              className="rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sand"
              value={form.locationMode}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, locationMode: event.target.value }))
              }
            >
              {locationModes.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <select
              className="w-full rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sand"
              value={form.country}
              onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value }))}
            >
              <option value="">All countries</option>
              {countries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
            <input
              className="rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sand"
              placeholder="City (optional)"
              value={form.city}
              onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
            />
            <textarea
              className="rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sand md:col-span-2"
              placeholder="Opportunity description"
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
              rows={4}
              required
            />
            <input
              className="rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sand md:col-span-2"
              placeholder="Requirements (comma separated)"
              value={form.requirements}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, requirements: event.target.value }))
              }
            />
            <div className="grid gap-4 md:grid-cols-2 md:col-span-2">
              <input
                className="rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sand"
                placeholder="Apply URL (optional)"
                value={form.applyUrl}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, applyUrl: event.target.value }))
                }
              />
              <input
                className="rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sand"
                placeholder="Contact email (optional)"
                value={form.contactEmail}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, contactEmail: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2 md:col-span-2">
              <select
                className="rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sand"
                value={form.visibilityRegion}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, visibilityRegion: event.target.value }))
                }
              >
                {visibilityOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === "LOCAL" ? "LOCAL (my region)" : option}
                  </option>
                ))}
              </select>
              <input
                className="rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sand"
                placeholder="Tags (comma separated)"
                value={form.tags}
                onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
              />
            </div>
            <button
              type="submit"
              className="md:col-span-2 rounded-full bg-teal px-6 py-2 text-xs font-semibold uppercase tracking-wide text-charcoal"
            >
              Publish opportunity
            </button>
          </form>
        )}
      </div>

      <div className="glass rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl">Filters</h2>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide">
            <button
              onClick={() => setViewMode("grid")}
              className={`rounded-full border px-3 py-1 ${
                viewMode === "grid"
                  ? "border-teal bg-teal/10 text-teal"
                  : "border-white/10 text-mist hover:border-teal"
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`rounded-full border px-3 py-1 ${
                viewMode === "list"
                  ? "border-teal bg-teal/10 text-teal"
                  : "border-white/10 text-mist hover:border-teal"
              }`}
            >
              List
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-6">
          <input
            value={filters.search}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, search: event.target.value }))
            }
            className="rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sm text-sand md:col-span-2"
            placeholder="Search by title, org, or description"
          />
          <select
            value={filters.region}
            onChange={(event) => setFilters((prev) => ({ ...prev, region: event.target.value }))}
            className="rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sm text-sand"
          >
            <option value="LOCAL">My region</option>
            <option value="ALL">All regions</option>
            {user?.currentRegion ? (
              <option value="NETWORK">Network ({user.currentRegion})</option>
            ) : null}
          </select>
          <select
            value={filters.type}
            onChange={(event) => setFilters((prev) => ({ ...prev, type: event.target.value }))}
            className="rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sm text-sand"
          >
            <option value="">All types</option>
            {typeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select
            value={filters.country}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, country: event.target.value }))
            }
            className="rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sm text-sand"
          >
            <option value="">All locations</option>
            {countries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
            className="rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sm text-sand"
          >
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="">All status</option>
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-coral">{error}</p>}

      {loading ? (
        <p className="text-sm text-mist">Loading opportunities...</p>
      ) : opportunities.length === 0 ? (
        <p className="text-sm text-mist">No opportunities match these filters.</p>
      ) : viewMode === "grid" ? (
        <div className="grid items-start gap-4 md:grid-cols-2">
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
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="glass rounded-2xl p-3 space-y-2">
            {opportunities.map((opportunity) => (
              <button
                key={opportunity._id}
                onClick={() => handleRowSelect(opportunity._id)}
                className={`w-full rounded-xl border p-3 text-left ${
                  selectedOpportunity?._id === opportunity._id
                    ? "border-teal bg-teal/10"
                    : "border-white/10 bg-white/5 hover:border-teal"
                }`}
              >
                <p className="text-sm text-sand">{opportunity.title}</p>
                <p className="text-xs text-mist">{opportunity.orgName}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-mist">
                  <StatusBadge label={opportunity.type} tone="slate" />
                  <span>{opportunity.locationMode}</span>
                  <span>{countryLabel(opportunity.country)}</span>
                  <span>{formatRelativeTime(opportunity.createdAt)}</span>
                </div>
              </button>
            ))}
          </div>

          {selectedOpportunityForPane ? (
            <div className="glass rounded-2xl p-5 space-y-4">
              {detailLoadingId === selectedOpportunityForPane._id && (
                <p className="text-xs text-mist">Loading full details...</p>
              )}
              {detailError && detailLoadingId !== selectedOpportunityForPane._id && (
                <p className="text-xs text-coral">{detailError}</p>
              )}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-mist">
                    {selectedOpportunityForPane.orgName || selectedOpportunityForPane.company}
                  </p>
                  <h3 className="mt-1 text-2xl text-sand">{selectedOpportunityForPane.title}</h3>
                </div>
                <StatusBadge label={selectedOpportunityForPane.type} tone="slate" />
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-mist">
                <span>{selectedOpportunityForPane.locationMode}</span>
                <span>
                  {countryLabel(selectedOpportunityForPane.country)}
                  {selectedOpportunityForPane.city ? ` · ${selectedOpportunityForPane.city}` : ""}
                </span>
                <span>{formatRelativeTime(selectedOpportunityForPane.createdAt)}</span>
                <span className="uppercase tracking-wide">{selectedOpportunityForPane.status}</span>
                {selectedOpportunityForPane.visibilityRegion && (
                  <span>Visibility: {selectedOpportunityForPane.visibilityRegion}</span>
                )}
                {selectedOpportunityForPane.postedBy === user?._id && <span>Posted by you</span>}
              </div>
              <p className="text-sm text-mist whitespace-pre-wrap">
                {selectedOpportunityForPane.description}
              </p>
              {selectedOpportunityForPane.requirements?.length ? (
                <div>
                  <p className="text-xs uppercase tracking-wide text-mist">Requirements</p>
                  <ul className="mt-2 space-y-1 text-sm text-sand">
                    {selectedOpportunityForPane.requirements.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {selectedOpportunityForPane.tags?.length ? (
                <div className="flex flex-wrap gap-2">
                  {selectedOpportunityForPane.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-white/10 px-3 py-1 text-xs text-mist"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShareInput(buildOpportunityShareInput(selectedOpportunityForPane))}
                  className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-wide text-sand hover:border-teal"
                >
                  Share
                </button>
                {selectedOpportunityForPane.applyUrl ? (
                  <a
                    href={selectedOpportunityForPane.applyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full bg-teal px-4 py-2 text-xs font-semibold uppercase tracking-wide text-charcoal"
                  >
                    Apply
                  </a>
                ) : null}
                {selectedOpportunityForPane.link ? (
                  <a
                    href={selectedOpportunityForPane.link}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full bg-teal px-4 py-2 text-xs font-semibold uppercase tracking-wide text-charcoal"
                  >
                    Contact
                  </a>
                ) : null}
                {selectedOpportunityForPane.contactEmail ? (
                  <a
                    href={`mailto:${selectedOpportunityForPane.contactEmail}`}
                    className="rounded-full bg-teal px-4 py-2 text-xs font-semibold uppercase tracking-wide text-charcoal"
                  >
                    Email
                  </a>
                ) : null}
                {!selectedOpportunityForPane.applyUrl &&
                  !selectedOpportunityForPane.link &&
                  !selectedOpportunityForPane.contactEmail && (
                    <>
                      <Link
                        to={`/opportunities/${selectedOpportunityForPane._id}`}
                        className="rounded-full bg-teal px-4 py-2 text-xs font-semibold uppercase tracking-wide text-charcoal"
                      >
                        Open details
                      </Link>
                      <p className="self-center text-xs text-mist">No application link provided.</p>
                    </>
                  )}
                <Link
                  to={`/opportunities/${selectedOpportunityForPane._id}`}
                  className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-wide text-sand hover:border-teal"
                >
                  View details
                </Link>
                {selectedOpportunityForPane.postedBy === user?._id && (
                  <>
                    <button
                      onClick={() => startEdit(selectedOpportunityForPane)}
                      className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-wide text-sand hover:border-teal"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => closeOpportunity(selectedOpportunityForPane._id)}
                      className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-wide text-sand hover:border-teal"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => deleteOpportunity(selectedOpportunityForPane._id)}
                      className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-wide text-sand hover:border-teal"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {showNotifyModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-charcoal/60 px-4">
          <div className="glass w-full max-w-lg rounded-2xl p-6 space-y-4">
            <div>
              <h3 className="font-display text-xl text-sand">Get notified</h3>
              <p className="text-sm text-mist">Choose your opportunity notification preferences.</p>
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-mist">Opportunity type</p>
              <div className="flex flex-wrap gap-2">
                {notifyTypeOptions.map((type) => (
                  <label key={type} className="flex items-center gap-2 text-xs text-sand">
                    <input
                      type="checkbox"
                      checked={notifyPrefs.types.includes(type)}
                      onChange={() =>
                        setNotifyPrefs((prev) => ({
                          ...prev,
                          types: toggleMultiValue(prev.types, type)
                        }))
                      }
                    />
                    {type}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-mist">Location mode</p>
              <div className="flex flex-wrap gap-2">
                {notifyLocationModes.map((mode) => (
                  <label key={mode} className="flex items-center gap-2 text-xs text-sand">
                    <input
                      type="checkbox"
                      checked={notifyPrefs.locationModes.includes(mode)}
                      onChange={() =>
                        setNotifyPrefs((prev) => ({
                          ...prev,
                          locationModes: toggleMultiValue(prev.locationModes, mode)
                        }))
                      }
                    />
                    {mode}
                  </label>
                ))}
              </div>
            </div>

            <select
              value={notifyPrefs.country}
              onChange={(event) =>
                setNotifyPrefs((prev) => ({ ...prev, country: event.target.value }))
              }
              className="w-full rounded-xl border border-white/10 bg-slate/40 px-3 py-2 text-sm text-sand"
            >
              <option value="">Region/Country (optional)</option>
              {countries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>

            <input
              value={notifyPrefs.keywords}
              onChange={(event) =>
                setNotifyPrefs((prev) => ({ ...prev, keywords: event.target.value }))
              }
              className="w-full rounded-xl border border-white/10 bg-slate/40 px-3 py-2 text-sm text-sand"
              placeholder="Keyword include (optional)"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowNotifyModal(false)}
                className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-wide text-sand hover:border-teal"
              >
                Cancel
              </button>
              <button
                onClick={handleNotifySave}
                className="rounded-full bg-teal px-4 py-2 text-xs font-semibold uppercase tracking-wide text-charcoal"
              >
                Save preferences
              </button>
            </div>
          </div>
        </div>
      )}
      <ShareSheet open={!!shareInput} onClose={() => setShareInput(null)} shareInput={shareInput} />
    </div>
  );
}
