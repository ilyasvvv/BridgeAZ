import { useEffect, useMemo, useState } from "react";
import { apiClient } from "../api/client";
import { useAuth } from "../utils/auth";
import { regionLabel } from "../utils/format";

export default function Admin() {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState("verifications");
  const [users, setUsers] = useState([]);
  const [userFilters, setUserFilters] = useState({
    search: "",
    region: "",
    userType: "",
    verificationStatus: "",
    banned: ""
  });
  const [userMessage, setUserMessage] = useState("");
  const [userLoading, setUserLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [comment, setComment] = useState({});
  const [message, setMessage] = useState("");
  const [banTarget, setBanTarget] = useState(null);
  const [banReason, setBanReason] = useState("");
  const [opportunities, setOpportunities] = useState([]);
  const [opportunityMessage, setOpportunityMessage] = useState("");

  const roles = Array.isArray(user?.roles) ? user.roles : [];
  const canC = user?.isAdmin || roles.includes("staffC") || roles.includes("staffB") || roles.includes("adminA");
  const canB = user?.isAdmin || roles.includes("staffB") || roles.includes("adminA");
  const canA = user?.isAdmin || roles.includes("adminA");

  const tabs = useMemo(
    () =>
      [
        canB && { id: "verifications", label: "Verifications" },
        canC && { id: "jobs", label: "Job Moderation" },
        canA && { id: "users", label: "Users" }
      ].filter(Boolean),
    [canA, canB, canC]
  );

  useEffect(() => {
    if (!tabs.find((tab) => tab.id === activeTab) && tabs.length) {
      setActiveTab(tabs[0].id);
    }
  }, [tabs, activeTab]);

  const loadUsers = async (filters = userFilters) => {
    setUserLoading(true);
    setUserMessage("");
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      if (filters.region) params.set("region", filters.region);
      if (filters.userType) params.set("userType", filters.userType);
      if (filters.verificationStatus) params.set("verificationStatus", filters.verificationStatus);
      if (filters.banned !== "") params.set("banned", filters.banned);
      const data = await apiClient.get(`/admin/users?${params.toString()}`, token);
      setUsers(data);
    } catch (error) {
      setUserMessage(error.message || "Failed to load users");
    } finally {
      setUserLoading(false);
    }
  };

  const loadRequests = async () => {
    try {
      const data = await apiClient.get("/admin/verifications?status=pending", token);
      setRequests(data);
    } catch (error) {
      setMessage(error.message || "Failed to load verification requests");
    }
  };

  const loadOpportunities = async () => {
    setOpportunityMessage("");
    try {
      const data = await apiClient.get("/opportunities?status=open", token);
      setOpportunities(data);
    } catch (error) {
      setOpportunityMessage(error.message || "Failed to load opportunities");
    }
  };

  useEffect(() => {
    if (!token) return;
    if (activeTab === "users") loadUsers();
    if (activeTab === "verifications") loadRequests();
    if (activeTab === "jobs") loadOpportunities();
  }, [activeTab, token]);

  const handleAction = async (id, action) => {
    try {
      await apiClient.patch(`/admin/verifications/${id}/${action}`, {
        adminComment: comment[id] || ""
      }, token);
      setMessage(`Request ${action}d.`);
      loadRequests();
    } catch (error) {
      setMessage(error.message || "Action failed");
    }
  };

  const openBanModal = (user) => {
    setBanTarget(user);
    setBanReason("");
    setUserMessage("");
  };

  const closeBanModal = () => {
    setBanTarget(null);
    setBanReason("");
  };

  const confirmBan = async () => {
    if (!banTarget) return;
    try {
      await apiClient.patch(`/admin/users/${banTarget._id}/ban`, { reason: banReason }, token);
      setUserMessage(`${banTarget.name} has been banned.`);
      closeBanModal();
      loadUsers();
    } catch (error) {
      setUserMessage(error.message || "Failed to ban user");
    }
  };

  const unbanUser = async (user) => {
    try {
      await apiClient.patch(`/admin/users/${user._id}/unban`, {}, token);
      setUserMessage(`${user.name} has been unbanned.`);
      loadUsers();
    } catch (error) {
      setUserMessage(error.message || "Failed to unban user");
    }
  };

  const updateRoles = async (targetId, roles) => {
    try {
      await apiClient.patch(`/admin/users/${targetId}/roles`, { roles }, token);
      setUserMessage("Roles updated.");
      loadUsers();
    } catch (error) {
      setUserMessage(error.message || "Failed to update roles");
    }
  };

  const deleteOpportunity = async (id) => {
    try {
      await apiClient.delete(`/admin/opportunities/${id}`, token);
      setOpportunityMessage("Opportunity removed.");
      setOpportunities((prev) => prev.filter((item) => item._id !== id));
    } catch (error) {
      setOpportunityMessage(error.message || "Failed to delete opportunity");
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl">Admin Control Center</h2>
            <p className="mt-2 text-sm text-mist">
              Review the community, moderate access, and approve verification requests.
            </p>
          </div>
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide ${
                  activeTab === tab.id
                    ? "bg-teal text-charcoal"
                    : "border border-white/10 text-sand hover:border-teal"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === "verifications" && (
        <div className="space-y-4">
          {message && <p className="text-sm text-teal">{message}</p>}
          <div className="grid gap-4 md:grid-cols-2">
            {requests.map((request) => (
              <div key={request._id} className="glass rounded-2xl p-5">
                <p className="text-sm text-mist">{request.user?.name}</p>
                <p className="text-xs uppercase tracking-wide text-teal">
                  {request.requestType}
                </p>
                <p className="mt-2 text-xs text-mist">
                  Region: {regionLabel(request.user?.currentRegion)}
                </p>
                {request.documentUrl && (
                  <a
                    href={request.documentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 block text-xs text-coral"
                  >
                    View document
                  </a>
                )}
                <textarea
                  placeholder="Admin comment"
                  rows={2}
                  value={comment[request._id] || ""}
                  onChange={(event) =>
                    setComment((prev) => ({ ...prev, [request._id]: event.target.value }))
                  }
                  className="mt-3 w-full rounded-xl border border-white/10 bg-slate/40 px-3 py-2 text-xs text-sand"
                />
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => handleAction(request._id, "approve")}
                    className="rounded-full bg-teal px-4 py-2 text-xs font-semibold uppercase tracking-wide text-charcoal"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleAction(request._id, "reject")}
                    className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-wide text-sand hover:border-coral"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "jobs" && (
        <div className="space-y-4">
          {opportunityMessage && <p className="text-sm text-teal">{opportunityMessage}</p>}
          <div className="grid gap-4 md:grid-cols-2">
            {opportunities.map((item) => (
              <div key={item._id} className="glass rounded-2xl p-5">
                <p className="text-sm text-sand">{item.title}</p>
                <p className="text-xs text-mist">{item.orgName || item.company}</p>
                <button
                  onClick={() => deleteOpportunity(item._id)}
                  className="mt-3 rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-wide text-sand hover:border-teal"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "users" && (
        <div className="space-y-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              loadUsers();
            }}
            className="glass rounded-2xl p-5 grid gap-4 md:grid-cols-5"
          >
            <input
              value={userFilters.search}
              onChange={(event) =>
                setUserFilters((prev) => ({ ...prev, search: event.target.value }))
              }
              className="rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sm text-sand md:col-span-2"
              placeholder="Search by name or email"
            />
            <select
              value={userFilters.region}
              onChange={(event) =>
                setUserFilters((prev) => ({ ...prev, region: event.target.value }))
              }
              className="rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sm text-sand"
            >
              <option value="">All regions</option>
              <option value="AZ">Azerbaijan</option>
              <option value="TR">Turkey</option>
              <option value="US">United States</option>
            </select>
            <select
              value={userFilters.userType}
              onChange={(event) =>
                setUserFilters((prev) => ({ ...prev, userType: event.target.value }))
              }
              className="rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sm text-sand"
            >
              <option value="">All types</option>
              <option value="student">Student</option>
              <option value="professional">Professional</option>
            </select>
            <select
              value={userFilters.verificationStatus}
              onChange={(event) =>
                setUserFilters((prev) => ({
                  ...prev,
                  verificationStatus: event.target.value
                }))
              }
              className="rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sm text-sand"
            >
              <option value="">All verification</option>
              <option value="unverified">Unverified</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </select>
            <select
              value={userFilters.banned}
              onChange={(event) =>
                setUserFilters((prev) => ({ ...prev, banned: event.target.value }))
              }
              className="rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sm text-sand"
            >
              <option value="">All status</option>
              <option value="false">Active</option>
              <option value="true">Banned</option>
            </select>
            <div className="md:col-span-5 flex flex-wrap gap-3">
              <button
                type="submit"
                className="rounded-full bg-teal px-4 py-2 text-xs font-semibold uppercase tracking-wide text-charcoal"
              >
                Apply filters
              </button>
              <button
                type="button"
                onClick={() => {
                  const cleared = {
                    search: "",
                    region: "",
                    userType: "",
                    verificationStatus: "",
                    banned: ""
                  };
                  setUserFilters(cleared);
                  loadUsers(cleared);
                }}
                className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-wide text-sand hover:border-teal"
              >
                Clear
              </button>
            </div>
          </form>

          {userMessage && <p className="text-sm text-teal">{userMessage}</p>}
          {userLoading ? (
            <p className="text-sm text-mist">Loading users...</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {users.map((item) => (
                <div key={item._id} className="glass rounded-2xl p-5 space-y-3">
                  <div>
                    <p className="text-lg text-sand">{item.name}</p>
                    <p className="text-xs uppercase tracking-wide text-mist">{item.email}</p>
                  </div>
                  <div className="text-xs text-mist space-y-1">
                    <p>
                      Type: <span className="text-sand">{item.userType}</span>
                    </p>
                    <p>
                      Region: <span className="text-sand">{regionLabel(item.currentRegion)}</span>
                    </p>
                    <p>
                      Verification: <span className="text-sand">{item.verificationStatus}</span>
                    </p>
                    <p>
                      Status:{" "}
                      <span className={item.banned ? "text-coral" : "text-teal"}>
                        {item.banned ? "Banned" : "Active"}
                      </span>
                    </p>
                    {item.bannedReason && (
                      <p className="text-xs text-mist">Reason: {item.bannedReason}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {item.banned ? (
                      <button
                        onClick={() => unbanUser(item)}
                        className="rounded-full bg-teal px-4 py-2 text-xs font-semibold uppercase tracking-wide text-charcoal"
                      >
                        Unban
                      </button>
                    ) : (
                      <button
                        onClick={() => openBanModal(item)}
                        className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-wide text-sand hover:border-coral"
                        disabled={item.isAdmin}
                      >
                        Ban
                      </button>
                    )}
                    <button
                      onClick={() => updateRoles(item._id, ["staffC"])}
                      className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-wide text-sand hover:border-teal"
                    >
                      Set C
                    </button>
                    <button
                      onClick={() => updateRoles(item._id, ["staffB"])}
                      className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-wide text-sand hover:border-teal"
                    >
                      Set B
                    </button>
                    <button
                      onClick={() => updateRoles(item._id, ["adminA"])}
                      className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-wide text-sand hover:border-teal"
                    >
                      Set A
                    </button>
                    <button
                      onClick={() => updateRoles(item._id, [])}
                      className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-wide text-sand hover:border-teal"
                    >
                      Clear roles
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {banTarget && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-charcoal/60 px-4">
          <div className="glass w-full max-w-md rounded-2xl p-6 space-y-4">
            <div>
              <h3 className="font-display text-xl text-sand">Ban {banTarget.name}</h3>
              <p className="text-sm text-mist">
                Add a short reason to keep the moderation log clear.
              </p>
            </div>
            <textarea
              rows={3}
              value={banReason}
              onChange={(event) => setBanReason(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate/40 px-3 py-2 text-sm text-sand"
              placeholder="Reason (optional)"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={closeBanModal}
                className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-wide text-sand hover:border-teal"
              >
                Cancel
              </button>
              <button
                onClick={confirmBan}
                className="rounded-full bg-coral px-4 py-2 text-xs font-semibold uppercase tracking-wide text-charcoal"
              >
                Confirm ban
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
