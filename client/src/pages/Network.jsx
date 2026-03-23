import { useEffect, useState, useRef, useLayoutEffect, useCallback } from "react";
import { apiClient } from "../api/client";
import { useAuth } from "../utils/auth";
import ProfileCard from "../components/ProfileCard";

const TABS = ["Explore", "Connections", "Mentorships"];

export default function Network() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState("Explore");
  const [connections, setConnections] = useState([]);
  const [mentorships, setMentorships] = useState([]);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ region: "", userType: "", isMentor: false });
  const [error, setError] = useState("");
  const tabBarRef = useRef(null);
  const tabRefs = useRef({});
  const [tabPill, setTabPill] = useState({ left: 0, width: 0 });

  const measureTab = useCallback(() => {
    const bar = tabBarRef.current;
    const btn = tabRefs.current[activeTab];
    if (!bar || !btn) return;
    const barRect = bar.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    setTabPill({ left: btnRect.left - barRect.left, width: btnRect.width });
  }, [activeTab]);

  useLayoutEffect(() => { measureTab(); }, [measureTab]);

  useEffect(() => {
    window.addEventListener("resize", measureTab);
    return () => window.removeEventListener("resize", measureTab);
  }, [measureTab]);

  const loadNetwork = async () => {
    setError("");
    try {
      const [connectionsData, mentorshipData] = await Promise.all([
        apiClient.get("/me/connections", token),
        apiClient.get("/me/mentorships", token)
      ]);
      setConnections(connectionsData);
      setMentorships(mentorshipData);
    } catch (err) {
      setError(err.message || "Failed to load network");
    }
  };

  const loadUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.region) params.set("region", filters.region);
      if (filters.userType) params.set("userType", filters.userType);
      if (filters.isMentor) params.set("isMentor", "true");
      const data = await apiClient.get(`/users?${params.toString()}`, token);
      setUsers(data);
    } catch (err) {
      setError(err.message || "Failed to load users");
    }
  };

  useEffect(() => {
    if (token) loadNetwork();
  }, [token]);

  useEffect(() => {
    if (token) loadUsers();
  }, [filters, token]);

  const handleAccept = async (id) => {
    try {
      await apiClient.post(`/connections/${id}/accept`, {}, token);
      loadNetwork();
    } catch (err) {
      setError(err.message || "Failed to accept");
    }
  };

  const handleEnd = async (id) => {
    try {
      await apiClient.post(`/mentorships/${id}/end`, {}, token);
      loadNetwork();
    } catch (err) {
      setError(err.message || "Failed to end mentorship");
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="font-display text-3xl">Network</h1>

      {/* Tab nav with sliding pill */}
      <div ref={tabBarRef} className="relative flex items-center gap-1 rounded-xl bg-white p-1.5 shadow-sm border border-border">
        {TABS.map((tab) => (
          <button
            key={tab}
            ref={(el) => { tabRefs.current[tab] = el; }}
            onClick={() => setActiveTab(tab)}
            className={`relative z-10 rounded-lg px-5 py-2.5 text-sm font-medium tracking-wide transition-colors duration-200 ${
              activeTab === tab ? "text-brand font-semibold" : "text-mist hover:text-sand"
            }`}
          >
            {tab}
          </button>
        ))}
        {/* Sliding pill */}
        <span
          className="pointer-events-none absolute rounded-lg bg-brand/10"
          style={{
            left: tabPill.left,
            width: tabPill.width,
            top: 6,
            bottom: 6,
            transition: "left 0.35s cubic-bezier(0.34,1.56,0.64,1), width 0.35s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        />
      </div>

      {error && <p className="text-sm text-coral">{error}</p>}

      {/* Explore tab */}
      {activeTab === "Explore" && (
        <>
          <div className="glass rounded-2xl p-5">
            <h2 className="font-display text-xl">Explore members</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <input
                value={filters.region}
                onChange={(e) => setFilters((prev) => ({ ...prev, region: e.target.value }))}
                className="rounded-xl border border-border bg-white px-4 py-2 text-sm text-sand"
                placeholder="Based in (country/city)"
              />
              <select
                value={filters.userType}
                onChange={(e) => setFilters((prev) => ({ ...prev, userType: e.target.value }))}
                className="rounded-xl border border-border bg-white px-4 py-2 text-sm text-sand"
              >
                <option value="">All Types</option>
                <option value="student">Student</option>
                <option value="professional">Professional</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-mist">
                <input
                  type="checkbox"
                  checked={filters.isMentor}
                  onChange={(e) => setFilters((prev) => ({ ...prev, isMentor: e.target.checked }))}
                  className="h-4 w-4 rounded border-border bg-white"
                />
                Mentor only
              </label>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {users.map((member) => (
              <ProfileCard key={member._id} user={member} />
            ))}
          </div>
        </>
      )}

      {/* Connections tab */}
      {activeTab === "Connections" && (
        <section className="glass rounded-2xl p-6 space-y-3">
          <h2 className="font-display text-xl">Connections</h2>
          {connections.length === 0 ? (
            <p className="text-sm text-mist">No connections yet.</p>
          ) : (
            connections.map((conn) => {
              const isPending = conn.status === "pending";
              return (
                <div key={conn._id} className="flex items-center justify-between rounded-xl border border-border px-4 py-2 text-sm text-sand">
                  <span>{conn.requesterId?.name || conn.addresseeId?.name}</span>
                  {isPending && (
                    <button
                      onClick={() => handleAccept(conn._id)}
                      className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-wide text-mist hover:border-teal"
                    >
                      Accept
                    </button>
                  )}
                </div>
              );
            })
          )}
        </section>
      )}

      {/* Mentorships tab */}
      {activeTab === "Mentorships" && (
        <section className="glass rounded-2xl p-6 space-y-3">
          <h2 className="font-display text-xl">Mentorships</h2>
          {mentorships.length === 0 ? (
            <p className="text-sm text-mist">No mentorships yet.</p>
          ) : (
            mentorships.map((item) => (
              <div key={item._id} className="flex items-center justify-between rounded-xl border border-border px-4 py-2 text-sm text-sand">
                <span>
                  Mentor: {item.mentorId?.name || "Mentor"} / Mentee: {item.menteeId?.name || "Mentee"}
                </span>
                <button
                  onClick={() => handleEnd(item._id)}
                  className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-wide text-mist hover:border-teal"
                >
                  End
                </button>
              </div>
            ))
          )}
        </section>
      )}
    </div>
  );
}
