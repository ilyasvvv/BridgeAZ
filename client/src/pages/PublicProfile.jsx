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
      <div className="mx-auto max-w-3xl py-12 text-center">
        <h2 className="text-2xl font-bold text-text-main">Oops!</h2>
        <p className="mt-2 text-text-secondary">{error}</p>
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
        <div className="h-48 rounded-apple-lg bg-gray-200" />
        <div className="h-96 rounded-apple-lg bg-gray-200" />
      </div>
    );
  }

  const isOwnProfile = user?._id && profile?._id && String(user._id) === String(profile._id);

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

  return (
    <div className="mx-auto max-w-5xl space-y-8 py-6">
      {/* Header Card */}
      <div className="apple-card overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-brand-blue/20 to-brand-blue/5 md:h-48" />
        <div className="relative px-6 pb-8 md:px-10">
          <div className="relative -mt-12 flex flex-col items-start justify-between gap-6 md:-mt-16 md:flex-row md:items-end">
            <div className="flex flex-col items-start gap-4 md:flex-row md:items-end">
              <div className="rounded-full border-4 border-white shadow-apple">
                <UserChip
                  user={profile}
                  size={128}
                  className="!gap-0"
                  nameClassName="hidden"
                />
              </div>
              <div className="mb-2">
                <h1 className="text-3xl font-extrabold text-text-main">{profile.name}</h1>
                <p className="text-lg font-medium text-text-secondary">{profile.headline || "BridgeAZ Member"}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <RegionPill region={profile.currentRegion} />
                  <StatusBadge label={profile.userType} tone={profile.userType === "professional" ? "blue" : "slate"} />
                  {profile.mentorVerified && <StatusBadge label="Verified Mentor" tone="success" />}
                  {profile.studentVerified && <StatusBadge label="Verified Student" tone="success" />}
                </div>
              </div>
            </div>
            <div className="mb-2 flex gap-3">
              {!isOwnProfile && (
                <button
                  onClick={handleMessage}
                  disabled={messageLoading}
                  className="apple-button-primary"
                >
                  {messageLoading ? "Connecting..." : "Message"}
                </button>
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
            <p className="mt-4 text-[15px] leading-relaxed text-text-secondary">
              {profile.bio || `${profile.name} hasn't shared a bio yet.`}
            </p>
            {profile.skills?.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-bold uppercase tracking-tight text-text-muted">Skills</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {profile.skills.map((skill) => (
                    <span key={skill} className="rounded-apple bg-bg-app px-3 py-1.5 text-xs font-semibold text-text-main border border-black/[0.03]">
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
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-apple bg-bg-app text-xl">
                      🏢
                    </div>
                    <div>
                      <h3 className="font-bold text-text-main">{exp.role || exp.title}</h3>
                      <p className="text-sm font-medium text-text-secondary">{exp.company || exp.org}</p>
                      {exp.description && (
                        <p className="mt-3 text-sm text-text-secondary leading-relaxed">
                          {exp.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-text-secondary italic">No experience entries listed.</p>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Links Section */}
          <section className="apple-card p-6">
            <h2 className="text-sm font-bold uppercase tracking-tight text-text-muted">Connect</h2>
            <div className="mt-4 space-y-4">
              {links.map((link) => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 text-sm font-medium text-text-main hover:text-brand-blue transition-colors"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-apple bg-bg-app text-sm">
                    {link.icon}
                  </span>
                  {link.label}
                </a>
              ))}
              {links.length === 0 && <p className="text-sm text-text-secondary italic">No social links.</p>}
            </div>
            {profile.resumeUrl && (
              <div className="mt-6 border-t border-black/[0.05] pt-6">
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

          {/* Activity/Stats Section */}
          <section className="apple-card p-6">
            <h2 className="text-sm font-bold uppercase tracking-tight text-text-muted">Community</h2>
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Member Since</span>
                <span className="font-semibold text-text-main">{new Date(profile.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Region</span>
                <span className="font-semibold text-text-main">{profile.currentRegion || '—'}</span>
              </div>
            </div>
          </section>
        </div>
      </div>

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
