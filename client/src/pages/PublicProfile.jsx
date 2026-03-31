import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../utils/auth";
import RegionPill from "../components/RegionPill";
import StatusBadge from "../components/StatusBadge";
import UserChip, { USER_CHIP_SIZES } from "../components/UserChip";
import Avatar from "../components/Avatar";
import ShareSheet from "../components/ShareSheet";
import { buildSharePayload } from "../utils/share";

const AVAILABILITY_CONFIG = {
  available: { label: "Available for mentorship", dot: "bg-emerald-400", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  busy: { label: "Limited availability", dot: "bg-amber-400", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  off: { label: "Not taking mentees", dot: "bg-gray-300", bg: "bg-gray-50", text: "text-gray-500", border: "border-gray-200" },
};

function resolveAvatar(u) {
  return u?.avatarUrl || u?.photoUrl || u?.profilePhoto || u?.profilePhotoUrl || u?.profilePictureUrl || null;
}

export default function PublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [relationship, setRelationship] = useState(null);
  const [error, setError] = useState("");
  const [messageLoading, setMessageLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [mentorshipMessage, setMentorshipMessage] = useState("");
  const [showMentorshipModal, setShowMentorshipModal] = useState(false);

  const isOwnProfile = user?._id && profile?._id && String(user._id) === String(profile._id);

  const loadRelationship = useCallback(async () => {
    if (!token || !id || isOwnProfile) return;
    try {
      const data = await apiClient.get(`/users/${id}/relationship`, token);
      setRelationship(data);
    } catch {
      // relationship endpoint may not exist yet — non-critical
    }
  }, [token, id, isOwnProfile]);

  useEffect(() => {
    const loadProfile = async () => {
      setError("");
      try {
        const data = await apiClient.get(`/users/${id}/public`, token);
        setProfile(data);
      } catch (err) {
        setError(err.message || "Failed to load profile");
      }
    };
    if (token && id) {
      loadProfile();
    }
  }, [token, id]);

  useEffect(() => {
    if (profile) loadRelationship();
  }, [profile, loadRelationship]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center">
        <h2 className="text-2xl font-bold text-sand">Oops!</h2>
        <p className="mt-2 text-mist">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="apple-button-secondary mt-6"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-4xl animate-pulse space-y-6 py-12">
        <div className="h-48 rounded-lg bg-border" />
        <div className="h-96 rounded-lg bg-border" />
      </div>
    );
  }

  const links = [
    profile.socialLinks?.linkedin && { label: "LinkedIn", url: profile.socialLinks.linkedin, icon: "🔗" },
    profile.socialLinks?.github && { label: "GitHub", url: profile.socialLinks.github, icon: "💻" },
    profile.socialLinks?.website && { label: "Website", url: profile.socialLinks.website, icon: "🌐" }
  ].filter(Boolean);

  const handleMessage = async () => {
    if (!profile?._id || isOwnProfile) return;
    setMessageLoading(true);
    try {
      const thread = await apiClient.post("/chats/threads", { userId: profile._id }, token);
      navigate(`/chats?thread=${thread._id}`);
    } catch (err) {
      setError(err.message || "Failed to start chat");
    } finally {
      setMessageLoading(false);
    }
  };

  const handleBridge = async () => {
    setActionLoading("bridge");
    try {
      await apiClient.post("/connections/request", { recipientId: profile._id }, token);
      await loadRelationship();
    } catch (err) {
      setError(err.message || "Failed to send bridge request");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAcceptBridge = async () => {
    if (!relationship?.connectionId) return;
    setActionLoading("accept");
    try {
      await apiClient.post(`/connections/${relationship.connectionId}/accept`, {}, token);
      await loadRelationship();
    } catch (err) {
      setError(err.message || "Failed to accept");
    } finally {
      setActionLoading(null);
    }
  };

  const handleFollow = async () => {
    setActionLoading("follow");
    try {
      if (relationship?.following) {
        await apiClient.delete(`/users/${profile._id}/follow`, token);
      } else {
        await apiClient.post(`/users/${profile._id}/follow`, {}, token);
      }
      await loadRelationship();
    } catch (err) {
      setError(err.message || "Failed to update follow");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRequestMentorship = async (e) => {
    e?.preventDefault();
    setActionLoading("mentorship");
    try {
      await apiClient.post("/mentorship-requests", {
        toMentor: profile._id,
        message: mentorshipMessage
      }, token);
      setShowMentorshipModal(false);
      setMentorshipMessage("");
      await loadRelationship();
    } catch (err) {
      setError(err.message || "Failed to send mentorship request");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRespondMentorship = async (status) => {
    if (!relationship?.mentorshipRequestId) return;
    setActionLoading("mentorship-respond");
    try {
      await apiClient.post(`/mentorship-requests/${relationship.mentorshipRequestId}/respond`, { status }, token);
      await loadRelationship();
    } catch (err) {
      setError(err.message || "Failed to respond");
    } finally {
      setActionLoading(null);
    }
  };

  // Determine avatar relationship glow
  const avatarRelationship = relationship?.isMentor
    ? "mentor"
    : relationship?.isMentee
      ? "mentee"
      : relationship?.bridged
        ? "bridge"
        : relationship?.following
          ? "follow"
          : null;

  // Header gradient based on relationship
  const headerGradient = relationship?.bridged
    ? "from-brand/20 to-brand/5"
    : relationship?.isMentor
      ? "from-coral/20 to-coral/5"
      : relationship?.isMentee
        ? "from-emerald-400/20 to-emerald-400/5"
        : "from-accent/20 to-accent/5";

  const availability = profile.isMentor && profile.mentorVerified
    ? AVAILABILITY_CONFIG[profile.mentorshipAvailability] || AVAILABILITY_CONFIG.available
    : null;

  const canRequestMentorship =
    user?.userType === "student" &&
    profile.isMentor &&
    profile.mentorVerified &&
    !relationship?.isMentor &&
    !relationship?.isMentee &&
    !relationship?.mentorshipRequestPending &&
    profile.mentorshipAvailability !== "off";

  return (
    <div className="mx-auto max-w-5xl space-y-8 py-6">
      {/* Header Card */}
      <div className="apple-card overflow-hidden">
        <div className={`h-32 bg-gradient-to-r ${headerGradient} md:h-48`} />
        <div className="relative px-6 pb-8 md:px-10">
          <div className="relative -mt-12 flex flex-col items-start justify-between gap-6 md:-mt-16 md:flex-row md:items-end">
            <div className="flex flex-col items-start gap-4 md:flex-row md:items-end">
              <div className="rounded-full border-4 border-slate shadow-card">
                <Avatar
                  url={resolveAvatar(profile)}
                  alt={`${profile.name} avatar`}
                  size={128}
                  relationship={avatarRelationship}
                />
              </div>
              <div className="mb-2">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-extrabold text-sand">{profile.name}</h1>
                  {/* Relationship badge */}
                  {relationship?.bridged && (
                    <span className="flex items-center gap-1 rounded-full bg-brand/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-brand">
                      <span className="h-1.5 w-1.5 rounded-full bg-brand shadow-[0_0_4px_rgba(21,101,163,0.4)]" />
                      Bridged
                    </span>
                  )}
                  {relationship?.isMentor && (
                    <span className="flex items-center gap-1 rounded-full bg-coral/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-coral">
                      <span className="h-1.5 w-1.5 rounded-full bg-coral shadow-[0_0_4px_rgba(212,118,60,0.4)]" />
                      Your Mentor
                    </span>
                  )}
                  {relationship?.isMentee && (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(16,185,129,0.4)]" />
                      Your Mentee
                    </span>
                  )}
                </div>
                <p className="text-lg font-medium text-mist">{profile.headline || "BridgeAZ Member"}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <RegionPill region={profile.currentRegion} />
                  <StatusBadge label={profile.userType} tone={profile.userType === "professional" ? "blue" : "slate"} />
                  {profile.mentorVerified && <StatusBadge label="Verified Mentor" tone="success" />}
                  {profile.studentVerified && <StatusBadge label="Verified Student" tone="success" />}
                  {/* Mentor availability */}
                  {availability && (
                    <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${availability.bg} ${availability.text} ${availability.border}`}>
                      <span className={`h-2 w-2 rounded-full ${availability.dot} ${availability.dot === "bg-emerald-400" ? "animate-pulse" : ""}`} />
                      {availability.label}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mb-2 flex flex-wrap gap-2">
              {!isOwnProfile && (
                <>
                  {/* Bridge button */}
                  {!relationship?.bridged && !relationship?.bridgePending && (
                    <button
                      onClick={handleBridge}
                      disabled={actionLoading === "bridge"}
                      className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 font-sans text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand/90 active:scale-[0.98] disabled:opacity-50"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      {actionLoading === "bridge" ? "Sending..." : "Bridge"}
                    </button>
                  )}
                  {relationship?.bridgePending && relationship?.bridgeDirection === "sent" && (
                    <span className="inline-flex items-center gap-2 rounded-xl border border-brand/20 bg-brand/5 px-5 py-2.5 font-sans text-sm font-medium text-brand/70">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Bridge Pending
                    </span>
                  )}
                  {relationship?.bridgePending && relationship?.bridgeDirection === "received" && (
                    <button
                      onClick={handleAcceptBridge}
                      disabled={actionLoading === "accept"}
                      className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 font-sans text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand/90 active:scale-[0.98] disabled:opacity-50"
                    >
                      {actionLoading === "accept" ? "Accepting..." : "Accept Bridge"}
                    </button>
                  )}
                  {relationship?.bridged && (
                    <span className="inline-flex items-center gap-2 rounded-xl border border-brand/20 bg-brand/5 px-5 py-2.5 font-sans text-sm font-medium text-brand">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Bridged
                    </span>
                  )}

                  {/* Follow button */}
                  <button
                    onClick={handleFollow}
                    disabled={actionLoading === "follow"}
                    className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 font-sans text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-50 ${
                      relationship?.following
                        ? "border-sand/15 bg-sand/5 text-sand hover:bg-sand/10"
                        : "border-border bg-white text-mist hover:border-sand/30 hover:text-sand"
                    }`}
                  >
                    <svg className="h-4 w-4" fill={relationship?.following ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    {actionLoading === "follow" ? "..." : relationship?.following ? "Following" : "Follow"}
                  </button>

                  {/* Message button */}
                  <button
                    onClick={handleMessage}
                    disabled={messageLoading}
                    className="apple-button-secondary"
                  >
                    {messageLoading ? "..." : "Message"}
                  </button>

                  {/* Request Mentorship */}
                  {canRequestMentorship && (
                    <button
                      onClick={() => setShowMentorshipModal(true)}
                      className="inline-flex items-center gap-2 rounded-xl border border-coral/25 bg-coral/5 px-4 py-2.5 font-sans text-sm font-medium text-coral transition-all hover:bg-coral/10 active:scale-[0.98]"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      Request Mentorship
                    </button>
                  )}
                  {relationship?.mentorshipRequestPending && relationship?.mentorshipRequestDirection === "sent" && (
                    <span className="inline-flex items-center gap-2 rounded-xl border border-coral/15 bg-coral/5 px-4 py-2.5 font-sans text-sm font-medium text-coral/60">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Mentorship Pending
                    </span>
                  )}
                  {/* Incoming mentorship request — mentor can accept/decline */}
                  {relationship?.mentorshipRequestPending && relationship?.mentorshipRequestDirection === "received" && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleRespondMentorship("accepted")}
                        disabled={actionLoading === "mentorship-respond"}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-coral px-4 py-2.5 font-sans text-sm font-semibold text-white shadow-sm transition-all hover:bg-coral/90 active:scale-[0.98] disabled:opacity-50"
                      >
                        Accept Mentee
                      </button>
                      <button
                        onClick={() => handleRespondMentorship("declined")}
                        disabled={actionLoading === "mentorship-respond"}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-coral/20 px-4 py-2.5 font-sans text-sm font-medium text-coral/70 transition-all hover:bg-coral/5 active:scale-[0.98] disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </>
              )}
              <button
                type="button"
                onClick={() => setShowShareSheet(true)}
                className="apple-button-secondary"
              >
                Share
              </button>
              {isOwnProfile && (
                <Link to={`/profile/${profile._id}/edit`} className="apple-button-secondary">
                  Edit Profile
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-[1fr_320px]">
        {/* Main Content */}
        <div className="space-y-8">
          {/* Bio Section */}
          <section className="apple-card p-8">
            <h2 className="text-xl font-bold">About</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-mist">
              {profile.bio || `${profile.name} hasn't shared a bio yet.`}
            </p>
            {profile.skills?.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-bold uppercase tracking-tight text-mist opacity-70">Skills</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {profile.skills.map((skill) => (
                    <span key={skill} className="rounded-md bg-charcoal px-3 py-1.5 text-xs font-semibold text-sand border border-border">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Experience Section */}
          <section className="apple-card p-8">
            <h2 className="text-xl font-bold">Experience</h2>
            {profile.experience?.length > 0 ? (
              <div className="mt-6 space-y-8">
                {profile.experience.map((exp, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-charcoal text-xl border border-border">
                      🏢
                    </div>
                    <div>
                      <h3 className="font-bold text-sand">{exp.role || exp.title}</h3>
                      <p className="text-sm font-medium text-mist">{exp.company || exp.org}</p>
                      {exp.description && (
                        <p className="mt-3 text-sm text-mist leading-relaxed">
                          {exp.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-mist italic">No experience entries listed.</p>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Links Section */}
          <section className="apple-card p-6">
            <h2 className="text-sm font-bold uppercase tracking-tight text-mist opacity-70">Links</h2>
            <div className="mt-4 space-y-4">
              {links.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 text-sm font-medium text-sand hover:text-accent transition-colors"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-charcoal text-sm border border-border">
                    {link.icon}
                  </span>
                  {link.label}
                </a>
              ))}
              {links.length === 0 && <p className="text-sm text-mist italic">No social links.</p>}
            </div>
            {profile.resumeUrl && (
              <div className="mt-6 border-t border-border pt-6">
                <a
                  href={profile.resumeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="apple-button-secondary w-full justify-center text-center inline-flex"
                >
                  View Resume
                </a>
              </div>
            )}
          </section>

          {/* Community Section */}
          <section className="apple-card p-6">
            <h2 className="text-sm font-bold uppercase tracking-tight text-mist opacity-70">Community</h2>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-mist">Member Since</span>
                <span className="font-semibold text-sand">{new Date(profile.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-mist">Region</span>
                <span className="font-semibold text-sand">{profile.currentRegion || '—'}</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Mentorship Request Modal */}
      {showMentorshipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-sand/15 backdrop-blur-sm"
            style={{ animation: "fyp-overlay-in 0.2s ease-out both" }}
            onClick={() => setShowMentorshipModal(false)}
          />
          <form
            onSubmit={handleRequestMentorship}
            className="relative w-full max-w-md space-y-5 rounded-2xl border border-border bg-white p-6 shadow-floating"
            style={{ animation: "fyp-modal-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) both" }}
          >
            <div>
              <h3 className="font-display text-xl text-sand">Request Mentorship</h3>
              <p className="mt-1 text-sm text-mist">
                Send a mentorship request to {profile.name}. Include a brief message about what you're hoping to learn.
              </p>
            </div>
            <textarea
              value={mentorshipMessage}
              onChange={(e) => setMentorshipMessage(e.target.value)}
              rows={4}
              className="w-full resize-none rounded-xl border border-border bg-charcoal/30 px-4 py-3 text-sm text-sand transition-colors focus:border-sand/30 focus:outline-none placeholder:text-mist/50"
              placeholder="Hi! I'm studying... and I'd love your guidance on..."
              autoFocus
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowMentorshipModal(false)}
                className="rounded-lg px-4 py-2 text-sm text-mist hover:text-sand transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading === "mentorship"}
                className="rounded-full bg-coral px-5 py-2 text-sm font-semibold text-white hover:bg-coral/90 active:scale-[0.97] transition-all disabled:opacity-50"
              >
                {actionLoading === "mentorship" ? "Sending..." : "Send Request"}
              </button>
            </div>
          </form>
        </div>
      )}

      <ShareSheet
        open={showShareSheet}
        onClose={() => setShowShareSheet(false)}
        shareInput={buildSharePayload({
          entityType: "profile",
          entityId: id,
          url: `/profile/${id}`,
          title: profile.name || "Profile",
          subtitle: profile.headline || "BridgeAZ member",
          imageUrl:
            profile.avatarUrl || profile.profilePhotoUrl || profile.profilePictureUrl || "",
          meta: { profileId: id }
        })}
      />
    </div>
  );
}
