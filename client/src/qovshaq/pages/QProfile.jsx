// Qovshaq Phase 3A — Community profile page
import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../utils/auth";
import { qApi } from "../utils/qApi";
import { categoryMap } from "../utils/categories";
import { formatLocation } from "../utils/locations";
import QCard from "../components/QCard";
import QAvatar from "../components/QAvatar";
import QBadge from "../components/QBadge";
import QButton from "../components/QButton";
import QModal from "../components/QModal";

export default function QProfile() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");

  const isMe = user?._id === id;

  useEffect(() => {
    const load = async () => {
      try {
        const [profileData, postsData] = await Promise.all([
          qApi.getQProfile(id, token),
          qApi.getPosts({ author: id, limit: 20 }, token),
        ]);
        setProfile(profileData);
        setPosts(Array.isArray(postsData) ? postsData : postsData.posts || []);
      } catch {
        // Profile may not exist
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, token]);

  const handleBlock = async () => {
    if (!confirm("Block this user? Their posts will be hidden from your feed.")) return;
    try {
      await qApi.blockUser(id, token);
      setProfile((p) => ({ ...p, isBlocked: true }));
    } catch {}
  };

  const handleUnblock = async () => {
    try {
      await qApi.unblockUser(id, token);
      setProfile((p) => ({ ...p, isBlocked: false }));
    } catch {}
  };

  const handleReport = async () => {
    if (!reportReason) return;
    try {
      await qApi.reportContent({ targetType: "user", targetId: id, reason: reportReason }, token);
      setReportOpen(false);
      setReportReason("");
    } catch {}
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <QCard className="p-8">
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-full q-skeleton mb-4" />
            <div className="h-5 w-40 q-skeleton mb-2" />
            <div className="h-4 w-28 q-skeleton" />
          </div>
        </QCard>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3">{"\u{1F50D}"}</div>
        <h3 className="font-q-display text-xl text-q-text mb-2">Profile not found</h3>
        <QButton variant="ghost" onClick={() => navigate("/q")}>Back to feed</QButton>
      </div>
    );
  }

  const loc = formatLocation(profile.qLocation);

  return (
    <div className="space-y-4">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-q-text-muted hover:text-q-text transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </button>

      {/* Profile card */}
      <QCard className="p-8">
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            <QAvatar user={profile} size="xl" />
          </motion.div>

          <h1 className="font-q-display text-2xl text-q-text mt-4 mb-1">
            {profile.name}
          </h1>

          {profile.headline && (
            <p className="text-sm text-q-text-muted mb-2">{profile.headline}</p>
          )}

          {loc && (
            <p className="text-sm text-q-text-muted mb-3">{loc}</p>
          )}

          {profile.bio && (
            <p className="text-sm text-q-text leading-relaxed max-w-md mb-4">
              {profile.bio}
            </p>
          )}

          {/* Interests */}
          {profile.qInterests?.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5 mb-5">
              {profile.qInterests.map((interest) => {
                const cat = categoryMap[interest];
                return (
                  <QBadge key={interest} color={cat?.color || "default"} icon={cat?.icon}>
                    {cat?.label || interest}
                  </QBadge>
                );
              })}
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-6 mb-5">
            <div className="text-center">
              <div className="text-lg font-semibold text-q-text">{profile.postCount || 0}</div>
              <div className="text-xs text-q-text-muted">Posts</div>
            </div>
          </div>

          {/* Actions */}
          {!isMe && (
            <div className="flex items-center gap-2">
              {profile.isBlocked ? (
                <QButton variant="outline" onClick={handleUnblock}>Unblock</QButton>
              ) : (
                <>
                  <QButton variant="ghost" size="sm" onClick={handleBlock}>Block</QButton>
                  <QButton variant="ghost" size="sm" onClick={() => setReportOpen(true)}>Report</QButton>
                </>
              )}
            </div>
          )}

          {isMe && (
            <QButton variant="outline" onClick={() => navigate("/q/settings")}>
              Edit Settings
            </QButton>
          )}
        </div>
      </QCard>

      {/* Posts by this person */}
      {posts.length > 0 && (
        <div>
          <h2 className="font-q-display text-lg text-q-text mb-3">Posts</h2>
          <div className="space-y-3">
            {posts.map((post) => {
              const cat = categoryMap[post.category];
              return (
                <QCard key={post._id} hover onClick={() => navigate(`/q/post/${post._id}`)} className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {cat && <QBadge color={cat.color} icon={cat.icon}>{cat.label}</QBadge>}
                    <span className="text-xs text-q-text-muted">
                      {new Date(post.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <p className="text-sm text-q-text line-clamp-3">{post.content}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-q-text-muted">
                    <span>{post.likeCount || 0} likes</span>
                    <span>{post.commentCount || 0} comments</span>
                  </div>
                </QCard>
              );
            })}
          </div>
        </div>
      )}

      {/* Report modal */}
      <QModal isOpen={reportOpen} onClose={() => setReportOpen(false)} title="Report User">
        <div className="space-y-3">
          {["Harassment", "Spam", "Fake profile", "Inappropriate behavior", "Other"].map((reason) => (
            <button
              key={reason}
              onClick={() => setReportReason(reason)}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                reportReason === reason
                  ? "border-q-danger bg-red-50 text-q-danger"
                  : "border-q-border hover:bg-q-surface-alt text-q-text"
              }`}
            >
              {reason}
            </button>
          ))}
          <QButton variant="danger" onClick={handleReport} disabled={!reportReason} className="w-full mt-4">
            Submit Report
          </QButton>
        </div>
      </QModal>
    </div>
  );
}
