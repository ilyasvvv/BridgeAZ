import { useEffect, useMemo, useState } from "react";
import { apiClient } from "../api/client";
import { useAuth } from "../utils/auth";
import OpportunityCard from "../components/OpportunityCard";

const typeOptions = [
  "Internship",
  "Full-time",
  "Part-time",
  "Research",
  "Contract",
  "Volunteer"
];

const locationModes = ["On-site", "Hybrid", "Remote"];

export default function Opportunities() {
  const { user, token } = useAuth();
  const [opportunities, setOpportunities] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    region: "",
    type: "",
    country: "",
    status: "open"
  });
  const [showForm, setShowForm] = useState(false);
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

  const loadOpportunities = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      if (filters.region) params.set("region", filters.region);
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
  }, [filters, token]);

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
        .filter(Boolean)
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

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="glass rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl">Jobs & opportunities</h1>
            <p className="mt-2 text-sm text-mist">
              A calm board for internships, roles, and collaborations shared by the community.
            </p>
          </div>
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
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-mist">Location</p>
              <input
                className="w-full rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sand"
                placeholder="e.g., Remote / Paris, France"
                value={form.country}
                onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value }))}
              />
            </div>
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
              <input
                className="rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sand"
                value={form.visibilityRegion}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, visibilityRegion: event.target.value }))
                }
                placeholder="Visibility token (use ALL for global)"
              />
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
        <h2 className="font-display text-2xl">Filters</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-5">
          <input
            value={filters.search}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, search: event.target.value }))
            }
            className="rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sm text-sand md:col-span-2"
            placeholder="Search by title, org, or description"
          />
          <input
            value={filters.region}
            onChange={(event) => setFilters((prev) => ({ ...prev, region: event.target.value }))}
            className="rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sm text-sand"
            placeholder="Visibility token (ALL or custom)"
          />
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
          <input
            value={filters.country}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, country: event.target.value }))
            }
            className="rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sm text-sand"
            placeholder="Location filter"
          />
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
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {opportunities.map((opportunity) => (
            <OpportunityCard
              key={opportunity._id}
              opportunity={opportunity}
              isOwner={opportunity.postedBy === user?._id}
              onEdit={() => startEdit(opportunity)}
              onClose={() => closeOpportunity(opportunity._id)}
              onDelete={() => deleteOpportunity(opportunity._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
