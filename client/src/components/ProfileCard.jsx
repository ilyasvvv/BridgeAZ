import { useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../utils/auth";
import RegionPill from "./RegionPill";
import StatusBadge from "./StatusBadge";
import Avatar from "./Avatar";

const AVAILABILITY_CONFIG = {
  available: { label: "Available", dot: "bg-emerald-400", text: "text-emerald-600" },
  busy: { label: "Busy", dot: "bg-amber-400", text: "text-amber-600" },
  off: { label: "Unavailable", dot: "bg-gray-300", text: "text-mist/50" },
};

function resolveAvatar(user) {
  return user?.avatarUrl || user?.photoUrl || user?.profilePhoto || user?.profilePhotoUrl || user?.profilePictureUrl || null;
}

export default function ProfileCard({ user, style, relationship, onRelationshipChange }) {
  const { token, user: currentUser } = useAuth();
  const [actionLoading, setActionLoading] = useState(null);

  const isOwn = currentUser?._id && String(currentUser._id) === String(user._id);

  const handleBridge = async () => {
    setActionLoading("bridge");
    try {
      await apiClient.post("/connections/request", { recipientId: user._id }, token);
      onRelationshipChange?.();
    } catch (err) {
      // silently handle — likely already exists
    } finally {
      setActionLoading(null);
    }
  };

  const handleFollow = async () => {
    setActionLoading("follow");
    try {
      if (relationship?.following) {
        await apiClient.delete(`/users/${user._id}/follow`, token);
      } else {
        await apiClient.post(`/users/${user._id}/follow`, {}, token);
      }
      onRelationshipChange?.();
    } catch (err) {
      // silently handle
    } finally {
      setActionLoading(null);
    }
  };

  // Determine avatar glow based on relationship
  const avatarRelationship = relationship?.isMentor
    ? "mentor"
    : relationship?.isMentee
      ? "mentee"
      : relationship?.bridged
        ? "bridge"
        : relationship?.following
          ? "follow"
          : null;

  // Card border accent based on relationship
  const cardBorderClass = relationship?.bridged
    ? "border-brand/20"
    : relationship?.isMentor
      ? "border-coral/20"
      : relationship?.isMentee
        ? "border-emerald-400/20"
        : "border-border";

  // Accent bar color
  const accentBarClass = relationship?.bridged
    ? "from-transparent via-brand to-transparent"
    : relationship?.isMentor
      ? "from-transparent via-coral to-transparent"
      : relationship?.isMentee
        ? "from-transparent via-emerald-400 to-transparent"
        : "from-transparent via-sand to-transparent";

  const availability = user.isMentor && user.mentorVerified
    ? AVAILABILITY_CONFIG[user.mentorshipAvailability] || AVAILABILITY_CONFIG.available
    : null;

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border bg-white shadow-card transition-all duration-300 hover:shadow-elevated hover:-translate-y-0.5 ${cardBorderClass}`}
      style={style}
    >
      {/* Top accent bar */}
      <div className={`h-[3px] bg-gradient-to-r ${accentBarClass} ${relationship?.bridged || relationship?.isMentor || relationship?.isMentee ? "opacity-60" : "opacity-0"} transition-opacity duration-300 group-hover:opacity-100`} />

      <div className="flex flex-col gap-4 p-5">
        {/* Header: avatar + name */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar
              url={resolveAvatar(user)}
              alt={`${user.name} avatar`}
              size={56}
              relationship={avatarRelationship}
            />
            <div className="min-w-0">
              <Link
                to={`/profile/${user._id}`}
                className="block truncate text-base font-semibold text-sand hover:text-accent transition-colors"
              >
                {user.name || "Member"}
              </Link>
              <p className="mt-0.5 font-sans text-[13px] leading-relaxed text-mist/80 line-clamp-1">
                {user.headline || "Bizim Circle member"}
              </p>
            </div>
          </div>
          {/* Relationship badge */}
          {relationship?.bridged && (
            <span className="shrink-0 flex items-center gap-1 rounded-full bg-brand/8 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-brand">
              <span className="h-1.5 w-1.5 rounded-full bg-brand shadow-[0_0_4px_rgba(21,101,163,0.4)]" />
              Bridged
            </span>
          )}
          {relationship?.isMentor && (
            <span className="shrink-0 flex items-center gap-1 rounded-full bg-coral/8 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-coral">
              <span className="h-1.5 w-1.5 rounded-full bg-coral shadow-[0_0_4px_rgba(212,118,60,0.4)]" />
              Mentor
            </span>
          )}
          {relationship?.isMentee && (
            <span className="shrink-0 flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(16,185,129,0.4)]" />
              Mentee
            </span>
          )}
        </div>

        {/* Badges + region row */}
        <div className="flex flex-wrap items-center gap-2">
          <RegionPill region={user.currentRegion} />
          {user.studentVerified && <StatusBadge label="Student Verified" tone="teal" />}
          {user.mentorVerified && <StatusBadge label="Mentor Verified" tone="coral" />}
          {user.isMentor && !user.mentorVerified && <StatusBadge label="Mentor Pending" tone="ember" />}
          {user.userType && (
            <span className="rounded-md bg-surface-alt px-2 py-0.5 font-sans text-[10px] font-medium capitalize text-mist/60">
              {user.userType}
            </span>
          )}
          {/* Mentor availability */}
          {availability && (
            <span className={`flex items-center gap-1 rounded-full bg-white border border-border/60 px-2 py-0.5 text-[10px] font-medium ${availability.text}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${availability.dot}`} />
              {availability.label}
            </span>
          )}
        </div>

        {/* Footer: actions */}
        <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-3">
          {!isOwn && (
            <div className="flex items-center gap-1.5">
              {/* Bridge button */}
              {!relationship?.bridged && !relationship?.bridgePending && (
                <button
                  onClick={handleBridge}
                  disabled={actionLoading === "bridge"}
                  className="inline-flex items-center gap-1.5 rounded-full bg-brand/8 px-3 py-1.5 font-sans text-[11px] font-semibold text-brand transition-all duration-200 hover:bg-brand hover:text-white hover:shadow-sm disabled:opacity-50"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  {actionLoading === "bridge" ? "..." : "Bridge"}
                </button>
              )}
              {relationship?.bridgePending && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sand/5 px-3 py-1.5 font-sans text-[11px] font-medium text-mist/60">
                  {relationship.bridgeDirection === "sent" ? "Request Sent" : "Pending"}
                </span>
              )}
              {/* Follow button */}
              <button
                onClick={handleFollow}
                disabled={actionLoading === "follow"}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-sans text-[11px] font-semibold transition-all duration-200 disabled:opacity-50 ${
                  relationship?.following
                    ? "bg-mist/8 text-mist hover:bg-mist/15"
                    : "bg-sand/5 text-sand/70 hover:bg-sand/10 hover:text-sand"
                }`}
              >
                <svg className="h-3 w-3" fill={relationship?.following ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {actionLoading === "follow" ? "..." : relationship?.following ? "Following" : "Follow"}
              </button>
            </div>
          )}
          <Link
            to={`/profile/${user._id}`}
            className="group/btn ml-auto inline-flex items-center gap-1.5 rounded-full bg-sand/5 px-4 py-1.5 font-sans text-[11px] font-semibold text-sand transition-all duration-200 hover:bg-sand hover:text-white hover:shadow-sm"
          >
            View Profile
            <svg className="h-3 w-3 transition-transform duration-200 group-hover/btn:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
