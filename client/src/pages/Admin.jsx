import { useEffect, useMemo, useState } from "react";
import { apiClient, API_ORIGIN } from "../api/client";
import { useAuth } from "../utils/auth";
import { regionLabel } from "../utils/format";

export default function Admin() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState("users");
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

  const tabs = useMemo(
    () => [
      { id: "users", label: "Users" },
      { id: "verification", label: "Verification" }
    ],
    []
  );

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
      const data = await apiClient.get("/admin/verification-requests?status=pending", token);
      setRequests(data);
    } catch (error) {
      setMessage(error.message || "Failed to load verification requests");
    }
  };

  useEffect(() => {
    if (!token) return;
    if (activeTab === "users") {
      loadUsers();
    } else {
      loadRequests();
    }
  }, [activeTab, token]);

  const handleAction = async (id, action) => {
    try {
      await apiClient.post(`/admin/verification-requests/${id}/${action}`, {
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
      await apiClient.post(`/admin/users/${banTarget._id}/ban`, { reason: banReason }, token);
      setUserMessage(`${banTarget.name} has been banned.`);
      closeBanModal();
      loadUsers();
    } catch (error) {
      setUserMessage(error.message || "Failed to ban user");
    }
  };

  const unbanUser = async (user) => {
    try {
      await apiClient.post(`/admin/users/${user._id}/unban`, {}, token);
      setUserMessage(`${user.name} has been unbanned.`);
      loadUsers();
    } catch (error) {
      setUserMessage(error.message || "Failed to unban user");
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

      {activeTab === "users" ? (
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
              {users.map((user) => (
                <div key={user._id} className="glass rounded-2xl p-5 space-y-3">
                  <div>
                    <p className="text-lg text-sand">{user.name}</p>
                    <p className="text-xs uppercase tracking-wide text-mist">{user.email}</p>
                  </div>
                  <div className="text-xs text-mist space-y-1">
                    <p>
                      Type: <span className="text-sand">{user.userType}</span>
                    </p>
                    <p>
                      Region: <span className="text-sand">{regionLabel(user.currentRegion)}</span>
                    </p>
                    <p>
                      Verification:{" "}
                      <span className="text-sand">{user.verificationStatus}</span>
                    </p>
                    <p>
                      Status:{" "}
                      <span className={user.banned ? "text-coral" : "text-teal"}>
                        {user.banned ? "Banned" : "Active"}
                      </span>
                    </p>
                    {user.isAdmin && <p className="text-teal">Admin account</p>}
                    {user.bannedReason && (
                      <p className="text-xs text-mist">Reason: {user.bannedReason}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {user.banned ? (
                      <button
                        onClick={() => unbanUser(user)}
                        className="rounded-full bg-teal px-4 py-2 text-xs font-semibold uppercase tracking-wide text-charcoal"
                      >
                        Unban
                      </button>
                    ) : (
                      <button
                        onClick={() => openBanModal(user)}
                        className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-wide text-sand hover:border-coral"
                        disabled={user.isAdmin}
                      >
                        Ban
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
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
                    href={`${API_ORIGIN}${request.documentUrl}`}
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
