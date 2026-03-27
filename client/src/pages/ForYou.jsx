import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient, uploadViaPresign } from "../api/client";
import { useAuth } from "../utils/auth";
import CommunityPostCard from "../components/CommunityPostCard";
import UserChip, { USER_CHIP_SIZES } from "../components/UserChip";
import ShareSheet from "../components/ShareSheet";
import { buildSharePayload } from "../utils/share";
import Avatar from "../components/Avatar";

const progressKeywords = [
  "applied",
  "application",
  "interview",
  "semester",
  "thesis",
  "capstone",
  "proposal",
  "research",
  "grant",
  "internship"
];

const FEED_VIEWS = [
  { key: "latest", label: "Latest" },
  { key: "trending", label: "Trending" },
  { key: "discussed", label: "Discussed" },
  { key: "progress", label: "Progress" }
];

const resolveAvatarUrl = (u) =>
  u?.avatarUrl ||
  u?.photoUrl ||
  u?.profilePhoto ||
  u?.profilePhotoUrl ||
  u?.profilePictureUrl ||
  null;

export default function ForYou() {
  const { user, token } = useAuth();
  const fileInputRef = useRef(null);
  const composeRef = useRef(null);
  const [posts, setPosts] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [requests, setRequests] = useState([]);
  const [feedView, setFeedView] = useState("latest");
  const [filters, setFilters] = useState({
    visibility: "all",
    contentTextOnly: false,
    contentImage: false,
    contentVideo: false,
    region: "all"
  });
  const [savedPosts, setSavedPosts] = useState(new Set());
  const [activePostId, setActivePostId] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [editingPostId, setEditingPostId] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  const [shareInput, setShareInput] = useState(null);
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostAttachment, setNewPostAttachment] = useState(null);
  const [newPostAttachmentPreviewUrl, setNewPostAttachmentPreviewUrl] = useState("");
  const [newPostVisibility, setNewPostVisibility] = useState("public");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [composeExpanded, setComposeExpanded] = useState(false);
  const allowedTypes = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "video/mp4",
    "video/webm",
    "video/quicktime"
  ];
  const maxSizeBytes = 100 * 1024 * 1024;

  useEffect(() => {
    if (!newPostAttachment) {
      setNewPostAttachmentPreviewUrl("");
      return undefined;
    }
    const type = newPostAttachment.type || "";
    if (type.startsWith("video/") || type.startsWith("image/")) {
      const objectUrl = URL.createObjectURL(newPostAttachment);
      setNewPostAttachmentPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
    setNewPostAttachmentPreviewUrl("");
    return undefined;
  }, [newPostAttachment]);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [postsData, opportunitiesData] = await Promise.all([
        apiClient.get("/posts", token),
        apiClient.get("/opportunities?status=open", token)
      ]);
      setPosts(postsData);
      setOpportunities(opportunitiesData);

      if (user?.userType === "student") {
        const mentorParams = new URLSearchParams({
          userType: "professional",
          isMentor: "true"
        });
        if (user.currentRegion) {
          mentorParams.set("region", user.currentRegion);
        }
        const mentorsData = await apiClient.get(
          `/users?${mentorParams.toString()}`,
          token
        );
        setMentors(mentorsData.filter((mentor) => mentor.mentorVerified));
      } else if (user?.isMentor) {
        const mentorshipRequests = await apiClient.get("/mentorship-requests", token);
        setRequests(mentorshipRequests);
      }
    } catch (err) {
      setError(err.message || "Failed to load your feed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token, user]);

  const progressPosts = useMemo(() => {
    return posts.filter((post) =>
      progressKeywords.some((keyword) =>
        post.content?.toLowerCase().includes(keyword)
      )
    );
  }, [posts]);

  const filteredPosts = useMemo(() => {
    const myRegion = (user?.currentRegion || "").trim();
    let next = feedView === "progress" ? [...progressPosts] : [...posts];

    if (filters.visibility !== "all") {
      next = next.filter((post) => {
        const visibilityToken = String(post.visibilityRegion || "").toLowerCase();
        if (filters.visibility === "public") {
          return visibilityToken === "all" || visibilityToken === "public";
        }
        return visibilityToken === "connections";
      });
    }

    const hasContentFilter =
      filters.contentTextOnly || filters.contentImage || filters.contentVideo;
    if (hasContentFilter) {
      next = next.filter((post) => {
        const contentType = String(post.attachmentContentType || "").toLowerCase();
        const hasAttachment = !!post.attachmentUrl;
        const matchesText = filters.contentTextOnly && !hasAttachment;
        const matchesImage = filters.contentImage && contentType.startsWith("image/");
        const matchesVideo = filters.contentVideo && contentType.startsWith("video/");
        return matchesText || matchesImage || matchesVideo;
      });
    }

    if (filters.region === "my" && myRegion) {
      next = next.filter((post) => String(post.visibilityRegion || "").trim() === myRegion);
    } else if (filters.region === "global" && myRegion) {
      next = next.filter((post) => String(post.visibilityRegion || "").trim() !== myRegion);
    }

    if (feedView === "trending") {
      next.sort((a, b) => {
        const likesA = a.likesCount ?? a.likes?.length ?? 0;
        const likesB = b.likesCount ?? b.likes?.length ?? 0;
        return likesB - likesA;
      });
    } else if (feedView === "discussed") {
      next.sort((a, b) => {
        const repliesA = a.comments?.length ?? 0;
        const repliesB = b.comments?.length ?? 0;
        return repliesB - repliesA;
      });
    } else {
      next.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return next;
  }, [posts, progressPosts, filters, feedView, user]);

  const hasActiveFilters =
    filters.visibility !== "all" ||
    filters.contentTextOnly ||
    filters.contentImage ||
    filters.contentVideo ||
    filters.region !== "all";

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      visibility: "all",
      contentTextOnly: false,
      contentImage: false,
      contentVideo: false,
      region: "all"
    });
  };

  const handleToggleSave = (postId) => {
    setSavedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      return next;
    });
  };

  const handleFollow = (postId) => {
    void postId;
  };

  const handleLike = async (postId) => {
    try {
      const response = await apiClient.post(`/posts/${postId}/like`, {}, token);
      setPosts((prev) =>
        prev.map((post) =>
          post._id === postId
            ? { ...post, likesCount: response.likesCount, likedByMe: response.likedByMe }
            : post
        )
      );
    } catch (err) {
      setError(err.message || "Failed to like");
    }
  };

  const handleEdit = (post) => {
    setEditingPostId(post._id);
    setEditDraft(post.content || "");
  };

  const handleEditSave = async (postId) => {
    try {
      const updated = await apiClient.patch(`/posts/${postId}`, { content: editDraft }, token);
      setPosts((prev) => prev.map((post) => (post._id === postId ? updated : post)));
      setEditingPostId(null);
      setEditDraft("");
    } catch (err) {
      setError(err.message || "Failed to update post");
    }
  };

  const handleDelete = async (postId) => {
    try {
      await apiClient.delete(`/posts/${postId}`, token);
      setPosts((prev) => prev.filter((post) => post._id !== postId));
    } catch (err) {
      setError(err.message || "Failed to delete post");
    }
  };

  const handleViewReplies = async (postId) => {
    try {
      const comments = await apiClient.get(`/posts/${postId}/comments`, token);
      return comments;
    } catch (err) {
      setError(err.message || "Failed to load replies");
      return [];
    }
  };

  const handleReplySubmit = async (postId, event) => {
    event.preventDefault();
    const content = commentDrafts[postId];
    if (!content) return;

    try {
      const updated = await apiClient.post(
        `/posts/${postId}/comments`,
        { content },
        token
      );
      setPosts((prev) => prev.map((post) => (post._id === postId ? updated : post)));
      setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
      setActivePostId(null);
    } catch (err) {
      setError(err.message || "Failed to send response");
    }
  };

  const handleCreatePost = async (event) => {
    if (event?.preventDefault) event.preventDefault();
    setError("");
    try {
      let attachmentUrl;
      let attachmentContentType;
      if (newPostAttachment) {
        if (!allowedTypes.includes(newPostAttachment.type)) {
          setError("Unsupported file type");
          return;
        }
        if (newPostAttachment.size > maxSizeBytes) {
          setError("File must be 100MB or less");
          return;
        }

        const upload = await uploadViaPresign(
          { file: newPostAttachment, purpose: "attachment" },
          token
        );
        attachmentUrl = upload.documentUrl;
        attachmentContentType = newPostAttachment.type || "application/octet-stream";
      }

      await apiClient.post(
        "/posts",
        {
          content: newPostContent,
          attachmentUrl,
          attachmentContentType,
          visibilityRegion: newPostVisibility === "public" ? "ALL" : newPostVisibility
        },
        token
      );

      setNewPostContent("");
      setNewPostAttachment(null);
      setNewPostAttachmentPreviewUrl("");
      setNewPostVisibility("public");
      setComposeExpanded(false);
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to create post");
    }
  };

  const opportunityPreview = opportunities.slice(0, 5);

  return (
    <div className="mx-auto max-w-6xl pb-12">
      {error && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-coral/20 bg-coral/8 px-4 py-3 text-sm text-coral fyp-card-in">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            className="ml-3 text-coral/50 hover:text-coral transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {user && (
        <section className="mb-8 fyp-card-in" style={{ animationDelay: "0s" }}>
          {!composeExpanded ? (
            <button
              type="button"
              onClick={() => {
                setComposeExpanded(true);
                requestAnimationFrame(() => composeRef.current?.focus());
              }}
              className="w-full rounded-2xl bg-white border border-border/60 shadow-card p-4 flex items-center gap-3.5 text-left group hover:shadow-elevated transition-all duration-300"
            >
              <Avatar url={resolveAvatarUrl(user)} alt="Your avatar" size={40} />
              <span className="text-sm text-mist group-hover:text-sand/60 transition-colors">
                What are you working on?
              </span>
            </button>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreatePost(e);
              }}
              className="rounded-2xl bg-white border border-border/60 shadow-card p-5"
              style={{ animation: "fyp-modal-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) both" }}
            >
              <div className="flex items-start gap-3.5">
                <Avatar url={resolveAvatarUrl(user)} alt="Your avatar" size={40} className="mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-sand">{user.name}</p>
                  <textarea
                    ref={composeRef}
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    rows={3}
                    className="mt-2 w-full resize-none rounded-xl border-0 bg-transparent px-0 py-0 text-[15px] leading-relaxed text-sand placeholder:text-mist/50 focus:outline-none focus:ring-0"
                    placeholder="Share what you're working on, a milestone, or a question..."
                    required
                  />
                </div>
              </div>

              {newPostAttachment && (
                <div className="ml-[52px] mt-3 rounded-xl border border-border/60 bg-charcoal/40 p-3 text-xs text-mist relative overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      setNewPostAttachment(null);
                      setNewPostAttachmentPreviewUrl("");
                    }}
                    className="absolute top-2 right-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-sand/80 text-white text-xs hover:bg-sand transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                  {newPostAttachmentPreviewUrl && newPostAttachment.type?.startsWith("image/") ? (
                    <img
                      src={newPostAttachmentPreviewUrl}
                      alt="Preview"
                      className="w-full max-h-48 rounded-lg object-contain"
                    />
                  ) : newPostAttachmentPreviewUrl && newPostAttachment.type?.startsWith("video/") ? (
                    <video
                      controls
                      preload="metadata"
                      className="w-full max-h-48 rounded-lg"
                      src={newPostAttachmentPreviewUrl}
                    />
                  ) : (
                    <p className="truncate pr-8">
                      {newPostAttachment.name} &middot;{" "}
                      {(newPostAttachment.size / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  )}
                </div>
              )}

              <div className="ml-[52px] mt-4 flex items-center justify-between gap-3 border-t border-border/40 pt-3">
                <div className="flex items-center gap-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="application/pdf,image/png,image/jpeg,video/mp4,video/webm,video/quicktime,.mov"
                    onChange={(e) => setNewPostAttachment(e.target.files?.[0] || null)}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-mist hover:bg-charcoal/60 hover:text-sand transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                    </svg>
                    Attach
                  </button>
                  <div className="mx-1 h-4 w-px bg-border/40" />
                  <select
                    value={newPostVisibility}
                    onChange={(e) => setNewPostVisibility(e.target.value)}
                    className="appearance-none cursor-pointer rounded-lg border-0 bg-transparent px-2.5 py-1.5 text-xs text-mist hover:bg-charcoal/60 hover:text-sand transition-colors focus:outline-none focus:ring-0"
                  >
                    <option value="public">Everyone</option>
                    <option value="connections">Connections only</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewPostContent("");
                      setNewPostAttachment(null);
                      setNewPostAttachmentPreviewUrl("");
                      setNewPostVisibility("public");
                      setComposeExpanded(false);
                    }}
                    className="rounded-lg px-3 py-1.5 text-xs text-mist hover:text-sand transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-full bg-sand px-5 py-1.5 text-xs font-semibold text-white hover:bg-sand/90 active:scale-[0.97] transition-all"
                  >
                    Post
                  </button>
                </div>
              </div>
            </form>
          )}
        </section>
      )}

      <div className="mb-6 space-y-3 fyp-card-in" style={{ animationDelay: "0.05s" }}>
        <div className="flex items-center gap-1 border-b border-border/50">
          {FEED_VIEWS.map((view) => (
            <button
              key={view.key}
              type="button"
              onClick={() => setFeedView(view.key)}
              className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
                feedView === view.key ? "text-sand" : "text-mist hover:text-sand/70"
              }`}
            >
              {view.label}
              {view.key === "progress" && progressPosts.length > 0 && (
                <span className="ml-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-coral/12 px-1 text-[10px] font-bold text-coral">
                  {progressPosts.length}
                </span>
              )}
              {feedView === view.key && (
                <span className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-sand" />
              )}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filters.visibility}
            onChange={(e) => updateFilter("visibility", e.target.value)}
            className={`appearance-none cursor-pointer rounded-full border px-3 py-1 pr-7 text-xs transition-all focus:outline-none focus:ring-0 ${
              filters.visibility !== "all"
                ? "border-sand/25 bg-sand/5 font-medium text-sand"
                : "border-border bg-white text-mist hover:border-sand/20"
            }`}
          >
            <option value="all">All posts</option>
            <option value="public">Public</option>
            <option value="connections">Connections</option>
          </select>

          <div className="h-4 w-px bg-border/40" />

          {[
            { key: "contentTextOnly", label: "Text" },
            { key: "contentImage", label: "Photos" },
            { key: "contentVideo", label: "Videos" }
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => updateFilter(key, !filters[key])}
              className={`rounded-full border px-3 py-1 text-xs transition-all ${
                filters[key]
                  ? "border-sand/25 bg-sand text-white font-medium"
                  : "border-border bg-white text-mist hover:border-sand/20"
              }`}
            >
              {label}
            </button>
          ))}

          <div className="h-4 w-px bg-border/40" />

          <select
            value={filters.region}
            onChange={(e) => updateFilter("region", e.target.value)}
            className={`appearance-none cursor-pointer rounded-full border px-3 py-1 pr-7 text-xs transition-all focus:outline-none focus:ring-0 ${
              filters.region !== "all"
                ? "border-sand/25 bg-sand/5 font-medium text-sand"
                : "border-border bg-white text-mist hover:border-sand/20"
            }`}
          >
            <option value="all">All regions</option>
            <option value="my">My region</option>
            <option value="global">Global</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-full px-2.5 py-1 text-xs text-mist hover:text-coral transition-colors"
            >
              Clear all &times;
            </button>
          )}
        </div>
      </div>

      {feedView !== "progress" && progressPosts.length > 0 && (
        <button
          type="button"
          onClick={() => setFeedView("progress")}
          className="mb-6 w-full rounded-2xl border border-coral/10 bg-gradient-to-r from-coral/[0.06] via-coral/[0.03] to-transparent px-5 py-3.5 text-left group hover:border-coral/20 transition-all fyp-card-in"
          style={{ animationDelay: "0.08s" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display text-base text-sand">Progress, not performance</p>
              <p className="mt-0.5 text-xs text-mist">
                {progressPosts.length} update{progressPosts.length !== 1 ? "s" : ""} about
                milestones, applications &amp; research
              </p>
            </div>
            <span className="text-xs font-medium text-coral group-hover:translate-x-0.5 transition-transform">
              View &rarr;
            </span>
          </div>
        </button>
      )}

      {feedView === "progress" && (
        <div
          className="mb-6 rounded-2xl border border-coral/15 bg-gradient-to-r from-coral/[0.08] via-coral/[0.04] to-transparent px-5 py-4 fyp-card-in"
          style={{ animationDelay: "0.08s" }}
        >
          <h2 className="font-display text-xl text-sand">Progress, not performance</h2>
          <p className="mt-1 text-sm text-mist">
            Celebrating milestones, applications, and research breakthroughs.
          </p>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-5">
          {loading ? (
            <div className="space-y-5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border/40 bg-white/50 p-5 space-y-3 fyp-card-in"
                  style={{ animationDelay: `${0.1 + i * 0.06}s` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full opp-skeleton" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-28 opp-skeleton" />
                      <div className="h-2.5 w-20 opp-skeleton" />
                    </div>
                  </div>
                  <div className="h-3 w-full opp-skeleton" />
                  <div className="h-3 w-3/4 opp-skeleton" />
                </div>
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="py-16 text-center fyp-card-in" style={{ animationDelay: "0.1s" }}>
              <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full border border-border bg-charcoal">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-mist"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <p className="font-display text-lg text-sand">
                {feedView === "progress" ? "No progress updates yet" : "No posts yet"}
              </p>
              <p className="mt-1 text-sm text-mist">
                {feedView === "progress"
                  ? "The next small win is enough. Share yours."
                  : hasActiveFilters
                    ? "Try adjusting your filters."
                    : "Start a steady conversation."}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {filteredPosts.map((post, i) => (
                <div
                  key={post._id}
                  className="fyp-card-in"
                  style={{ animationDelay: `${0.1 + Math.min(i, 8) * 0.04}s` }}
                >
                  <CommunityPostCard
                    post={post}
                    onRespond={() =>
                      setActivePostId((prev) => (prev === post._id ? null : post._id))
                    }
                    onSave={() => handleToggleSave(post._id)}
                    onFollow={() => handleFollow(post._id)}
                    onLike={() => handleLike(post._id)}
                    onEdit={() => handleEdit(post)}
                    onDelete={() => handleDelete(post._id)}
                    onViewReplies={() => handleViewReplies(post._id)}
                    isOwner={post.author?._id === user?._id}
                    isSaved={savedPosts.has(post._id)}
                    showReply={activePostId === post._id}
                    replyValue={commentDrafts[post._id] || ""}
                    onReplyChange={(event) =>
                      setCommentDrafts((prev) => ({
                        ...prev,
                        [post._id]: event.target.value
                      }))
                    }
                    onReplySubmit={(event) => handleReplySubmit(post._id, event)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <section
            className="overflow-hidden rounded-2xl border border-border/60 bg-white shadow-card fyp-card-in"
            style={{ animationDelay: "0.12s" }}
          >
            <div className="px-5 pb-3 pt-5">
              <h3 className="font-display text-lg text-sand">Mentorship</h3>
            </div>
            <div className="px-5 pb-5">
              {user?.userType === "student" ? (
                mentors.length ? (
                  <div className="space-y-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-mist">
                      Available in your region
                    </p>
                    {mentors.slice(0, 4).map((mentor) => (
                      <Link
                        key={mentor._id}
                        to={`/profile/${mentor._id}`}
                        className="-mx-2.5 flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-charcoal/50 group"
                      >
                        <Avatar url={resolveAvatarUrl(mentor)} alt={mentor.name} size={36} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-sand group-hover:text-accent transition-colors">
                            {mentor.name}
                          </p>
                          <p className="truncate text-xs text-mist">
                            {mentor.headline || "Mentor"}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-mist">
                    No verified mentors nearby yet. Check Explore for wider reach.
                  </p>
                )
              ) : user?.isMentor ? (
                requests.length ? (
                  <div className="space-y-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-mist">
                      Pending requests
                    </p>
                    {requests.slice(0, 4).map((request) => (
                      <div
                        key={request._id}
                        className="rounded-xl bg-charcoal/40 p-3"
                      >
                        <UserChip
                          user={request.fromStudent}
                          size={USER_CHIP_SIZES.FEED}
                          nameClassName="text-sm text-sand"
                        />
                        <p className="mt-1.5 text-xs text-mist line-clamp-2">
                          {request.message}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-mist">No mentorship requests yet.</p>
                )
              ) : (
                <p className="text-sm text-mist">
                  Opt in to mentorship on your dashboard to receive requests.
                </p>
              )}
            </div>
          </section>

          <section
            className="overflow-hidden rounded-2xl border border-border/60 bg-white shadow-card fyp-card-in"
            style={{ animationDelay: "0.16s" }}
          >
            <div className="flex items-center justify-between px-5 pb-3 pt-5">
              <h3 className="font-display text-lg text-sand">Opportunities</h3>
              <Link
                to="/opportunities"
                className="text-xs font-medium text-brand hover:text-brand/80 transition-colors"
              >
                View all &rarr;
              </Link>
            </div>
            <div className="px-5 pb-5">
              {opportunityPreview.length ? (
                <div className="space-y-1">
                  {opportunityPreview.map((opportunity) => (
                    <Link
                      key={opportunity._id}
                      to={`/opportunities/${opportunity._id}`}
                      className="-mx-2.5 block rounded-xl p-2.5 transition-colors hover:bg-charcoal/50 group"
                    >
                      <p className="text-sm font-medium text-sand group-hover:text-accent transition-colors">
                        {opportunity.title}
                      </p>
                      <p className="mt-0.5 text-xs text-mist">
                        {opportunity.orgName} &middot; {opportunity.locationMode}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-mist">No open opportunities yet.</p>
              )}
            </div>
          </section>
        </aside>
      </div>

      {editingPostId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-sand/15 backdrop-blur-sm"
            style={{ animation: "fyp-overlay-in 0.2s ease-out both" }}
            onClick={() => setEditingPostId(null)}
          />
          <div
            className="relative w-full max-w-lg space-y-4 rounded-2xl border border-border bg-white p-6 shadow-floating"
            style={{
              animation: "fyp-modal-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) both"
            }}
          >
            <h3 className="font-display text-xl text-sand">Edit post</h3>
            <textarea
              value={editDraft}
              onChange={(event) => setEditDraft(event.target.value)}
              rows={4}
              className="w-full resize-none rounded-xl border border-border bg-charcoal/30 px-4 py-3 text-sm text-sand transition-colors focus:border-sand/30 focus:outline-none"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingPostId(null)}
                className="rounded-lg px-4 py-2 text-sm text-mist hover:text-sand transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleEditSave(editingPostId)}
                className="rounded-full bg-sand px-5 py-2 text-sm font-semibold text-white hover:bg-sand/90 active:scale-[0.97] transition-all"
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}

      <ShareSheet
        open={!!shareInput}
        onClose={() => setShareInput(null)}
        shareInput={shareInput}
      />
    </div>
  );
}
