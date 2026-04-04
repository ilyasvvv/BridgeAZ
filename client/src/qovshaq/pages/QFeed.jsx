// Qovshaq Phase 1/2 — Unified feed (home page)
import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../utils/auth";
import { qApi } from "../utils/qApi";
import { categoryMap } from "../utils/categories";
import { formatLocation } from "../utils/locations";
import { QFilterProvider } from "../context/QFilterContext";
import { useQFilters } from "../hooks/useQFilters";
import QFilterBar from "../components/QFilterBar";
import QCard from "../components/QCard";
import QBadge from "../components/QBadge";
import QAvatar from "../components/QAvatar";

function FeedContent() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { filters, getApiParams } = useQFilters();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Check onboarding
  useEffect(() => {
    if (user && !user.qOnboarded) {
      navigate("/q/onboard", { replace: true });
    }
  }, [user, navigate]);

  const fetchPosts = useCallback(
    async (pageNum = 1, append = false) => {
      if (!token) return;
      try {
        setLoading(true);
        const params = getApiParams(pageNum);
        const data = await qApi.getPosts(params, token);
        const items = Array.isArray(data) ? data : data.posts || [];
        setPosts((prev) => (append ? [...prev, ...items] : items));
        setHasMore(items.length >= 20);
      } catch {
        if (!append) setPosts([]);
      } finally {
        setLoading(false);
      }
    },
    [token, getApiParams]
  );

  useEffect(() => {
    setPage(1);
    fetchPosts(1);
  }, [filters]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchPosts(next, true);
  };

  const handleLike = async (postId) => {
    const post = posts.find((p) => p._id === postId);
    if (!post) return;
    const liked = post.likedByMe;

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p._id === postId
          ? { ...p, likedByMe: !liked, likeCount: (p.likeCount || 0) + (liked ? -1 : 1) }
          : p
      )
    );

    try {
      if (liked) await qApi.unlikePost(postId, token);
      else await qApi.likePost(postId, token);
    } catch {
      // Revert
      setPosts((prev) =>
        prev.map((p) =>
          p._id === postId
            ? { ...p, likedByMe: liked, likeCount: (p.likeCount || 0) + (liked ? 0 : -1) }
            : p
        )
      );
    }
  };

  const handleBookmark = async (postId) => {
    const post = posts.find((p) => p._id === postId);
    if (!post) return;
    const bookmarked = post.bookmarkedByMe;

    setPosts((prev) =>
      prev.map((p) =>
        p._id === postId ? { ...p, bookmarkedByMe: !bookmarked } : p
      )
    );

    try {
      if (bookmarked) await qApi.unbookmarkPost(postId, token);
      else await qApi.bookmarkPost(postId, token);
    } catch {
      setPosts((prev) =>
        prev.map((p) =>
          p._id === postId ? { ...p, bookmarkedByMe: bookmarked } : p
        )
      );
    }
  };

  return (
    <>
      <QFilterBar />

      {/* Posts */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {posts.map((post, i) => (
            <PostCard
              key={post._id}
              post={post}
              index={i}
              onLike={handleLike}
              onBookmark={handleBookmark}
            />
          ))}
        </AnimatePresence>

        {loading && (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-q-surface rounded-xl border border-q-border/50 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full q-skeleton" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-32 q-skeleton" />
                    <div className="h-3 w-20 q-skeleton" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-full q-skeleton" />
                  <div className="h-4 w-3/4 q-skeleton" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">{"\u{1F331}"}</div>
            <h3 className="font-q-display text-xl text-q-text mb-2">No posts yet</h3>
            <p className="text-q-text-muted text-sm mb-6">
              Be the first to share something with your community!
            </p>
            <Link
              to="/q/compose"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-q-primary text-white rounded-lg text-sm font-medium shadow-q-card hover:shadow-q-elevated transition-shadow"
            >
              Create a post
            </Link>
          </div>
        )}

        {!loading && hasMore && posts.length > 0 && (
          <button
            onClick={loadMore}
            className="w-full py-3 text-sm text-q-primary font-medium hover:bg-q-primary-light rounded-xl transition-colors"
          >
            Load more
          </button>
        )}
      </div>
    </>
  );
}

function PostCard({ post, index, onLike, onBookmark }) {
  const cat = categoryMap[post.category];
  const loc = formatLocation(post.location);
  const date = new Date(post.createdAt);
  const ago = timeAgo(date);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay: index * 0.04, type: "spring", stiffness: 400, damping: 30 }}
    >
      <QCard className="p-5" hover>
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <Link to={`/q/profile/${post.author?._id}`}>
            <QAvatar user={post.author} size="md" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Link
                to={`/q/profile/${post.author?._id}`}
                className="font-semibold text-sm text-q-text hover:underline truncate"
              >
                {post.author?.name || "Unknown"}
              </Link>
              {cat && (
                <QBadge color={cat.color} icon={cat.icon}>
                  {cat.label}
                </QBadge>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-q-text-muted">
              {loc && <span>{loc}</span>}
              {loc && <span>·</span>}
              <span>{ago}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <Link to={`/q/post/${post._id}`}>
          <p className="text-sm text-q-text leading-relaxed whitespace-pre-wrap mb-3">
            {post.content}
          </p>

          {/* Template data preview */}
          {post.templateData?.eventDate && (
            <div className="flex items-center gap-2 px-3 py-2 bg-q-accent-light rounded-lg text-sm mb-3">
              <span>{"\u{1F4C5}"}</span>
              <span className="text-q-text font-medium">
                {new Date(post.templateData.eventDate).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
              {post.templateData.eventLocation && (
                <>
                  <span className="text-q-text-muted">at</span>
                  <span className="text-q-text">{post.templateData.eventLocation}</span>
                </>
              )}
            </div>
          )}

          {post.templateData?.oppCompany && (
            <div className="flex items-center gap-2 px-3 py-2 bg-q-secondary-light rounded-lg text-sm mb-3">
              <span>{"\u{1F3E2}"}</span>
              <span className="text-q-text font-medium">{post.templateData.oppCompany}</span>
              {post.templateData.oppType && (
                <span className="text-q-text-muted">· {post.templateData.oppType}</span>
              )}
              {post.templateData.oppLocationMode && (
                <span className="text-q-text-muted">· {post.templateData.oppLocationMode}</span>
              )}
            </div>
          )}

          {/* Tags */}
          {post.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {post.tags.map((tag) => (
                <span key={tag} className="text-xs text-q-primary bg-q-primary-light/50 px-2 py-0.5 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Attachments preview */}
          {post.attachments?.length > 0 && (
            <div className="flex gap-2 mb-3 overflow-x-auto">
              {post.attachments
                .filter((a) => a.kind === "image")
                .slice(0, 3)
                .map((att, i) => (
                  <img
                    key={i}
                    src={att.url}
                    alt=""
                    className="h-40 rounded-lg object-cover border border-q-border/50"
                  />
                ))}
            </div>
          )}
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-1 pt-2 border-t border-q-border/50">
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => onLike(post._id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              post.likedByMe
                ? "text-q-danger bg-red-50"
                : "text-q-text-muted hover:bg-q-surface-alt"
            }`}
          >
            <motion.svg
              className="w-4.5 h-4.5"
              viewBox="0 0 24 24"
              fill={post.likedByMe ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              animate={post.likedByMe ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
            </motion.svg>
            <span>{post.likeCount || ""}</span>
          </motion.button>

          <Link
            to={`/q/post/${post._id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-q-text-muted hover:bg-q-surface-alt transition-colors"
          >
            <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
            </svg>
            <span>{post.commentCount || ""}</span>
          </Link>

          {post.category === "event" && (
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                post.interestedByMe
                  ? "text-q-accent bg-q-accent-light"
                  : "text-q-text-muted hover:bg-q-surface-alt"
              }`}
            >
              <span>{"\u2B50"}</span>
              <span>{post.interestedCount ? `${post.interestedCount} interested` : "Interested"}</span>
            </button>
          )}

          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => onBookmark(post._id)}
            className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              post.bookmarkedByMe
                ? "text-q-accent"
                : "text-q-text-muted hover:bg-q-surface-alt"
            }`}
          >
            <svg
              className="w-4.5 h-4.5"
              viewBox="0 0 24 24"
              fill={post.bookmarkedByMe ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" />
            </svg>
          </motion.button>
        </div>
      </QCard>
    </motion.div>
  );
}

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function QFeed() {
  return (
    <QFilterProvider>
      <FeedContent />
    </QFilterProvider>
  );
}
