import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../utils/auth";
import RegionPill from "../components/RegionPill";
import StatusBadge from "../components/StatusBadge";
import UserChip, { USER_CHIP_SIZES } from "../components/UserChip";
import ShareSheet from "../components/ShareSheet";
import { buildSharePayload } from "../utils/share";

export default function PublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [messageLoading, setMessageLoading] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);

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

  if (error) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <p className="text-sm text-coral">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-wide text-sand hover:border-teal"
        >
          Back
        </button>
      </div>
    );
  }

  if (!profile) {
    return <p className="text-sm text-mist">Loading profile...</p>;
  }

  const isOwnProfile = user?._id && profile?._id && String(user._id) === String(profile._id);

  const links = [
    profile.socialLinks?.linkedin && { label: "LinkedIn", url: profile.socialLinks.linkedin },
    profile.socialLinks?.github && { label: "GitHub", url: profile.socialLinks.github },
    profile.socialLinks?.website && { label: "Website", url: profile.socialLinks.website }
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

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-wide text-sand hover:border-teal"
      >
        Back
      </button>
      <div className="glass rounded-3xl p-6 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <UserChip
              user={profile}
              size={USER_CHIP_SIZES.PROFILE_HEADER}
              nameClassName="text-2xl text-sand"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <RegionPill region={profile.currentRegion} />
              <StatusBadge label={profile.userType || "member"} tone="slate" />
            </div>
          </div>
          {!isOwnProfile && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleMessage}
                disabled={messageLoading}
                className="self-start rounded-full bg-teal px-4 py-2 text-xs font-semibold uppercase tracking-wide text-charcoal disabled:opacity-60"
              >
                {messageLoading ? "Messaging..." : "Message"}
              </button>
              <button
                type="button"
                onClick={() => setShowShareSheet(true)}
                className="self-start rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-wide text-sand hover:border-teal"
              >
                Share
              </button>
            </div>
          )}
          {isOwnProfile && (
            <button
              type="button"
              onClick={() => setShowShareSheet(true)}
              className="self-start rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-wide text-sand hover:border-teal"
            >
              Share
            </button>
          )}
        </div>
        {profile.headline && <p className="text-sm text-mist">{profile.headline}</p>}
        {profile.bio && <p className="text-sm text-mist">{profile.bio}</p>}
        {links.length > 0 && (
          <div className="flex flex-wrap gap-3 text-xs text-mist">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="text-teal underline"
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
        {profile.skills?.length ? (
          <div>
            <p className="text-xs uppercase tracking-wide text-mist">Skills</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <span key={skill} className="rounded-full bg-white/10 px-3 py-1 text-xs">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <div className="text-xs text-mist">
        Member since {new Date(profile.createdAt).toLocaleDateString()}
      </div>
      <Link to="/fyp" className="text-xs text-teal underline">
        Back to feed
      </Link>
      <ShareSheet
        open={showShareSheet}
        onClose={() => setShowShareSheet(false)}
        shareInput={buildSharePayload({
          entityType: "profile",
          entityId: profile._id,
          url: `/profile/${profile._id}`,
          title: profile.name || "Profile",
          subtitle: profile.headline || "BridgeAZ member",
          imageUrl:
            profile.avatarUrl || profile.profilePhotoUrl || profile.profilePictureUrl || "",
          meta: { profileId: profile._id }
        })}
      />
    </div>
  );
}
