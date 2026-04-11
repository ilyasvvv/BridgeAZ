import { useEffect, useState, useRef, useLayoutEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../utils/auth";
import ProfileCard from "../components/ProfileCard";
import Avatar from "../components/Avatar";

const TABS = [
  {
    key: "Explore",
    label: "Explore",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    key: "Connections",
    label: "Bridges",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    key: "Mentorships",
    label: "Mentorships",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
];

const USER_TYPE_OPTIONS = [
  { key: "", label: "Everyone" },
  { key: "student", label: "Students" },
  { key: "professional", label: "Professionals" },
];

function resolveAvatar(u) {
  return u?.avatarUrl || u?.photoUrl || u?.profilePhoto || u?.profilePhotoUrl || u?.profilePictureUrl || null;
}

export default function Network() {
  const { token, user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("Explore");
  const [connections, setConnections] = useState([]);
  const [mentorships, setMentorships] = useState([]);
  const [users, setUsers] = useState([]);
  const [relationships, setRelationships] = useState({});
  const [filters, setFilters] = useState({ region: "", userType: "", isMentor: false });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
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
    setLoading(true);
    try {
      const [connectionsData, mentorshipData] = await Promise.all([
        apiClient.get("/me/connections", token),
        apiClient.get("/me/mentorships", token),
      ]);
      setConnections(connectionsData);
      setMentorships(mentorshipData);
    } catch (err) {
      setError(err.message || "Failed to load network");
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.region) params.set("region", filters.region);
      if (filters.userType) params.set("userType", filters.userType);
      if (filters.isMentor) params.set("isMentor", "true");
      const data = await apiClient.get(`/users?${params.toString()}`, token);
      setUsers(data);
    } catch (err) {
      setError(err.message || "Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  };

  // Build a relationship map from connections + mentorships for ProfileCards
  useEffect(() => {
    if (!currentUser?._id) return;
    const map = {};
    const myId = String(currentUser._id);

    connections.forEach((conn) => {
      const otherId = String(conn.requesterId?._id || conn.requesterId) === myId
        ? String(conn.addresseeId?._id || conn.addresseeId)
        : String(conn.requesterId?._id || conn.requesterId);
      if (!map[otherId]) map[otherId] = {};
      if (conn.status === "accepted") {
        map[otherId].bridged = true;
      } else if (conn.status === "pending") {
        map[otherId].bridgePending = true;
        map[otherId].bridgeDirection = String(conn.requesterId?._id || conn.requesterId) === myId ? "sent" : "received";
        map[otherId].connectionId = conn._id;
      }
    });

    mentorships.forEach((m) => {
      const mentorId = String(m.mentorId?._id || m.mentorId);
      const menteeId = String(m.menteeId?._id || m.menteeId);
      if (mentorId === myId) {
        if (!map[menteeId]) map[menteeId] = {};
        map[menteeId].isMentee = true;
      } else {
        if (!map[mentorId]) map[mentorId] = {};
        map[mentorId].isMentor = true;
      }
    });

    setRelationships(map);
  }, [connections, mentorships, currentUser]);

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

  const handleReject = async (id) => {
    try {
      await apiClient.post(`/connections/${id}/reject`, {}, token);
      loadNetwork();
    } catch (err) {
      setError(err.message || "Failed to reject");
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

  const handleRemoveBridge = async (id) => {
    try {
      await apiClient.delete(`/connections/${id}`, token);
      loadNetwork();
    } catch (err) {
      setError(err.message || "Failed to remove bridge");
    }
  };

  const pendingConnections = useMemo(
    () => connections.filter((c) => c.status === "pending" &&
      String(c.addresseeId?._id || c.addresseeId) === String(currentUser?._id)),
    [connections, currentUser]
  );
  const acceptedConnections = useMemo(
    () => connections.filter((c) => c.status === "accepted"),
    [connections]
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.region) count++;
    if (filters.userType) count++;
    if (filters.isMentor) count++;
    return count;
  }, [filters]);

  return (
    <div
      className="mx-auto max-w-6xl space-y-6 px-4"
      style={{ animation: "opp-card-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)" }}
    >
      {/* Page header */}
      <div className="space-y-1">
        <h1 className="font-display text-3xl text-sand">Network</h1>
        <p className="font-sans text-sm text-mist/60">
          Bridge with members, find mentors, and grow your community.
        </p>
      </div>

      {/* Tab nav with sliding pill */}
      <div
        ref={tabBarRef}
        className="relative flex items-center gap-1 rounded-2xl border border-border bg-white p-1.5 shadow-card"
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            ref={(el) => { tabRefs.current[tab.key] = el; }}
            onClick={() => setActiveTab(tab.key)}
            className={`relative z-10 flex items-center gap-2 rounded-xl px-5 py-2.5 font-sans text-sm font-medium tracking-wide transition-colors duration-200 ${
              activeTab === tab.key
                ? "text-sand font-semibold"
                : "text-mist/60 hover:text-sand"
            }`}
          >
            <span className={`transition-colors duration-200 ${activeTab === tab.key ? "text-sand" : "text-mist/40"}`}>
              {tab.icon}
            </span>
            {tab.label}
            {tab.key === "Connections" && acceptedConnections.length > 0 && (
              <span className="rounded-full bg-surface-alt px-1.5 py-0.5 font-sans text-[10px] font-bold text-mist/60">
                {acceptedConnections.length}
              </span>
            )}
            {tab.key === "Connections" && pendingConnections.length > 0 && (
              <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-coral/15 px-1 font-sans text-[9px] font-bold text-coral">
                {pendingConnections.length}
              </span>
            )}
            {tab.key === "Mentorships" && mentorships.length > 0 && (
              <span className="rounded-full bg-surface-alt px-1.5 py-0.5 font-sans text-[10px] font-bold text-mist/60">
                {mentorships.length}
              </span>
            )}
          </button>
        ))}
        <span
          className="pointer-events-none absolute rounded-xl border border-sand/8 bg-sand/5"
          style={{
            left: tabPill.left,
            width: tabPill.width,
            top: 6,
            bottom: 6,
            transition: "left 0.35s cubic-bezier(0.34,1.56,0.64,1), width 0.35s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-coral/20 bg-coral/5 px-4 py-3">
          <svg className="h-4 w-4 shrink-0 text-coral/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-sans text-sm text-coral">{error}</p>
        </div>
      )}

      {/* ─── Explore tab ─── */}
      {activeTab === "Explore" && (
        <div className="space-y-5">
          {/* Filter bar */}
          <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-card">
            <div className="h-[2px] bg-gradient-to-r from-transparent via-sand/20 to-transparent" />
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-mist/50">
                  Find Members
                </h2>
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => setFilters({ region: "", userType: "", isMentor: false })}
                    className="flex items-center gap-1.5 font-sans text-[11px] font-semibold text-coral/70 transition-colors hover:text-coral"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Clear filters
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mist/35" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <input
                    value={filters.region}
                    onChange={(e) => setFilters((prev) => ({ ...prev, region: e.target.value }))}
                    className="w-full rounded-xl border border-border bg-charcoal/50 py-2.5 pl-10 pr-4 font-sans text-sm text-sand placeholder:text-mist/40 transition-colors focus:border-sand/30 focus:outline-none focus:ring-1 focus:ring-sand/10"
                    placeholder="Based in (country or city)..."
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  {USER_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setFilters((prev) => ({ ...prev, userType: opt.key }))}
                      className={`rounded-full px-3.5 py-1.5 font-sans text-xs font-medium transition-all duration-200 ${
                        filters.userType === opt.key
                          ? "border border-sand/30 bg-sand/5 text-sand shadow-sm"
                          : "border border-transparent text-mist/50 hover:text-mist"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setFilters((prev) => ({ ...prev, isMentor: !prev.isMentor }))}
                  className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 font-sans text-xs font-medium transition-all duration-200 ${
                    filters.isMentor
                      ? "border border-coral/30 bg-coral/8 text-coral/90"
                      : "border border-border text-mist/50 hover:border-mist/30 hover:text-mist"
                  }`}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Mentors only
                </button>
              </div>
            </div>
          </div>

          {!usersLoading && (
            <div className="flex items-center gap-2">
              <span className="font-sans text-xs text-mist/50">
                {users.length} member{users.length !== 1 ? "s" : ""} found
              </span>
              {activeFilterCount > 0 && (
                <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-sand/10 px-1 font-sans text-[9px] font-bold text-sand">
                  {activeFilterCount} filter{activeFilterCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          )}

          {usersLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-2xl border border-border bg-white p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="opp-skeleton h-14 w-14 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="opp-skeleton h-3.5 w-28" />
                      <div className="opp-skeleton h-3 w-40" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="opp-skeleton h-5 w-20 rounded-full" />
                    <div className="opp-skeleton h-5 w-24 rounded-full" />
                  </div>
                  <div className="opp-skeleton h-8 w-24 rounded-full" />
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="mb-4 rounded-2xl bg-surface-alt p-4">
                <svg className="h-8 w-8 text-mist/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="font-sans text-sm font-medium text-sand/80">No members found</p>
              <p className="mt-1 font-sans text-xs text-mist/50">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {users.map((member, i) => (
                <ProfileCard
                  key={member._id}
                  user={member}
                  relationship={relationships[String(member._id)]}
                  onRelationshipChange={loadNetwork}
                  style={{ animation: `opp-card-in 0.45s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.06}s both` }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Bridges tab ─── */}
      {activeTab === "Connections" && (
        <div className="space-y-5">
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 rounded-2xl border border-border bg-white p-4">
                  <div className="opp-skeleton h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="opp-skeleton h-3.5 w-32" />
                    <div className="opp-skeleton h-3 w-20" />
                  </div>
                  <div className="opp-skeleton h-8 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Pending requests */}
              {pendingConnections.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h2 className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-mist/50">
                      Incoming Bridge Requests
                    </h2>
                    <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-coral/15 px-1 font-sans text-[9px] font-bold text-coral">
                      {pendingConnections.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {pendingConnections.map((conn, i) => {
                      const person = conn.requesterId;
                      return (
                        <div
                          key={conn._id}
                          className="flex items-center justify-between gap-4 rounded-2xl border border-brand/15 bg-white p-4 transition-all hover:shadow-card"
                          style={{ animation: `opp-card-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.06}s both` }}
                        >
                          <Link to={`/profile/${person?._id}`} className="flex items-center gap-3 min-w-0 group">
                            <Avatar url={resolveAvatar(person)} alt={person?.name} size={40} />
                            <div className="min-w-0">
                              <p className="truncate font-sans text-sm font-semibold text-sand group-hover:text-accent transition-colors">
                                {person?.name || "Member"}
                              </p>
                              <p className="truncate font-sans text-xs text-mist/50">
                                {person?.headline || "Wants to bridge"}
                              </p>
                              {conn.message && (
                                <p className="mt-1 truncate font-sans text-xs text-mist/70 italic">
                                  "{conn.message}"
                                </p>
                              )}
                            </div>
                          </Link>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleAccept(conn._id)}
                              className="rounded-xl bg-brand px-5 py-2 font-sans text-xs font-bold text-white shadow-sm transition-all hover:opacity-90 active:scale-[0.98]"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleReject(conn._id)}
                              className="rounded-xl border border-border px-4 py-2 font-sans text-xs font-medium text-mist transition-all hover:border-coral/30 hover:text-coral active:scale-[0.98]"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Accepted bridges */}
              <section className="space-y-3">
                <h2 className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-mist/50">
                  Your Bridges
                  {acceptedConnections.length > 0 && (
                    <span className="ml-2 font-normal text-mist/40">
                      ({acceptedConnections.length})
                    </span>
                  )}
                </h2>
                {acceptedConnections.length === 0 && pendingConnections.length === 0 ? (
                  <div className="flex flex-col items-center py-16 text-center">
                    <div className="mb-4 rounded-2xl bg-surface-alt p-4">
                      <svg className="h-8 w-8 text-mist/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                    <p className="font-sans text-sm font-medium text-sand/80">No bridges yet</p>
                    <p className="mt-1 font-sans text-xs text-mist/50">
                      Explore members and send bridge requests
                    </p>
                    <button
                      onClick={() => setActiveTab("Explore")}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand/5 px-4 py-2 font-sans text-xs font-semibold text-brand transition-all hover:bg-brand hover:text-white"
                    >
                      Explore Members
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {acceptedConnections.map((conn, i) => {
                      const myId = String(currentUser?._id);
                      const person = String(conn.requesterId?._id) === myId ? conn.addresseeId : conn.requesterId;
                      const mentorshipForPerson = mentorships.find(m =>
                        String(m.mentorId?._id) === String(person?._id) || String(m.menteeId?._id) === String(person?._id)
                      );
                      const isMentorOf = mentorshipForPerson && String(mentorshipForPerson.mentorId?._id) === String(person?._id);
                      const isMenteeOf = mentorshipForPerson && String(mentorshipForPerson.menteeId?._id) === String(person?._id);
                      const avatarRel = isMentorOf ? "mentor" : isMenteeOf ? "mentee" : "bridge";

                      return (
                        <div
                          key={conn._id}
                          className="flex items-center justify-between gap-4 rounded-2xl border border-brand/10 bg-white p-4 transition-all hover:shadow-card"
                          style={{ animation: `opp-card-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.06}s both` }}
                        >
                          <Link to={`/profile/${person?._id}`} className="flex items-center gap-3 min-w-0 group">
                            <Avatar url={resolveAvatar(person)} alt={person?.name} size={40} relationship={avatarRel} />
                            <div className="min-w-0">
                              <p className="truncate font-sans text-sm font-semibold text-sand group-hover:text-accent transition-colors">
                                {person?.name || "Member"}
                              </p>
                              <p className="truncate font-sans text-xs text-mist/50">
                                {person?.headline || "Bizim Circle member"}
                              </p>
                            </div>
                          </Link>
                          <div className="flex items-center gap-3 shrink-0">
                            {isMentorOf && (
                              <span className="flex items-center gap-1 rounded-full bg-coral/8 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-coral">
                                <span className="h-1.5 w-1.5 rounded-full bg-coral" />
                                Mentor
                              </span>
                            )}
                            {isMenteeOf && (
                              <span className="flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-emerald-600">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                Mentee
                              </span>
                            )}
                            <span className="flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-brand shadow-[0_0_6px_rgba(21,101,163,0.25)]" />
                              <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-brand/60">
                                Bridged
                              </span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      )}

      {/* ─── Mentorships tab ─── */}
      {activeTab === "Mentorships" && (
        <div className="space-y-5">
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 rounded-2xl border border-border bg-white p-5">
                  <div className="opp-skeleton h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="opp-skeleton h-3.5 w-40" />
                    <div className="opp-skeleton h-3 w-24" />
                  </div>
                  <div className="opp-skeleton h-8 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : mentorships.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="mb-4 rounded-2xl bg-surface-alt p-4">
                <svg className="h-8 w-8 text-mist/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <p className="font-sans text-sm font-medium text-sand/80">No mentorships yet</p>
              <p className="mt-1 font-sans text-xs text-mist/50">
                Find mentors in the Explore tab to get started
              </p>
              <button
                onClick={() => setActiveTab("Explore")}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-sand/5 px-4 py-2 font-sans text-xs font-semibold text-sand transition-all hover:bg-sand hover:text-white"
              >
                Find Mentors
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <h2 className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-mist/50">
                Active Mentorships
                <span className="ml-2 font-normal text-mist/40">({mentorships.length})</span>
              </h2>
              {mentorships.map((item, i) => {
                const mentor = item.mentorId;
                const mentee = item.menteeId;
                const iAmMentor = String(mentor?._id) === String(currentUser?._id);
                return (
                  <div
                    key={item._id}
                    className="overflow-hidden rounded-2xl border border-border bg-white transition-all hover:shadow-card"
                    style={{ animation: `opp-card-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.06}s both` }}
                  >
                    <div className="h-[2px] bg-gradient-to-r from-transparent via-coral/30 to-transparent" />
                    <div className="flex items-center justify-between gap-4 p-5">
                      <div className="flex items-center gap-4 min-w-0">
                        {/* Mentor */}
                        <Link to={`/profile/${mentor?._id}`} className="flex items-center gap-2.5 min-w-0 group">
                          <Avatar url={resolveAvatar(mentor)} alt={mentor?.name} size={40} relationship="mentor" />
                          <div className="min-w-0">
                            <p className="truncate font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-coral/60">Mentor</p>
                            <p className="truncate font-sans text-sm font-semibold text-sand group-hover:text-accent transition-colors">
                              {mentor?.name || "Mentor"}
                            </p>
                          </div>
                        </Link>

                        <svg className="h-4 w-4 shrink-0 text-mist/25" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>

                        {/* Mentee */}
                        <Link to={`/profile/${mentee?._id}`} className="flex items-center gap-2.5 min-w-0 group">
                          <Avatar url={resolveAvatar(mentee)} alt={mentee?.name} size={40} relationship="mentee" />
                          <div className="min-w-0">
                            <p className="truncate font-sans text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-500/60">Mentee</p>
                            <p className="truncate font-sans text-sm font-semibold text-sand group-hover:text-accent transition-colors">
                              {mentee?.name || "Mentee"}
                            </p>
                          </div>
                        </Link>
                      </div>

                      <button
                        onClick={() => handleEnd(item._id)}
                        className="shrink-0 rounded-xl border border-coral/30 bg-coral/8 px-4 py-2 font-sans text-xs font-bold text-coral/90 transition-all hover:bg-coral/12 active:scale-[0.98]"
                      >
                        End
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
