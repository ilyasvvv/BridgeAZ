import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient, uploadViaPresign } from "../api/client";
import { useAuth } from "../utils/auth";
import CommunityPostCard from "../components/CommunityPostCard";
import UserChip, { USER_CHIP_SIZES } from "../components/UserChip";
import ShareSheet from "../components/ShareSheet";
import { buildSharePayload } from "../utils/share";

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

const REPLIES_INITIAL = 2;
const REPLIES_STEP = 10;

export default function ForYou() {
  const { user, token } = useAuth();
  const [posts, setPosts] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [requests, setRequests] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filterDraft, setFilterDraft] = useState({
    visibility: "all",
    contentTextOnly: false,
    contentImage: false,
    contentVideo: false,
    region: "all",
    sort: "latest"
  });
  const [appliedFilters, setAppliedFilters] = useState({
    visibility: "all",
    contentTextOnly: false,
    contentImage: false,
    contentVideo: false,
    region: "all",
    sort: "latest"
  });
  const [savedPosts, setSavedPosts] = useState(new Set());
  const [activePostId, setActivePostId] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [editingPostId, setEditingPostId] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  const [threadPostId, setThreadPostId] = useState(null);
  const [threadComments, setThreadComments] = useState([]);
  const [replyVisibleByPost, setReplyVisibleByPost] = useState({});
  const [shareInput, setShareInput] = useState(null);
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostAttachment, setNewPostAttachment] = useState(null);
  const [newPostAttachmentPreviewUrl, setNewPostAttachmentPreviewUrl] = useState("");
  const [newPostVisibility, setNewPostVisibility] = useState("public");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
    if (!newPostAttachment || !newPostAttachment.type?.startsWith("video/")) {
      setNewPostAttachmentPreviewUrl("");
      return undefined;
    }
    const objectUrl = URL.createObjectURL(newPostAttachment);
    setNewPostAttachmentPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
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

  // Replace keyword heuristic with smarter ranking once engagement signals exist.
  const progressPosts = useMemo(() => {
    return posts.filter((post) =>
      progressKeywords.some((keyword) =>
        post.content?.toLowerCase().includes(keyword)
      )
    );
  }, [posts]);

  const filteredRegionalPosts = useMemo(() => {
    const myRegion = (user?.currentRegion || "").trim();
    let next = [...posts];

    if (appliedFilters.visibility !== "all") {
      next = next.filter((post) => {
        const visibilityToken = String(post.visibilityRegion || "").toLowerCase();
        if (appliedFilters.visibility === "public") {
          return visibilityToken === "all" || visibilityToken === "public";
        }
        return visibilityToken === "connections";
      });
    }

    const hasContentFilter =
      appliedFilters.contentTextOnly || appliedFilters.contentImage || appliedFilters.contentVideo;
    if (hasContentFilter) {
      next = next.filter((post) => {
        const contentType = String(post.attachmentContentType || "").toLowerCase();
        const hasAttachment = !!post.attachmentUrl;
        const matchesText = appliedFilters.contentTextOnly && !hasAttachment;
        const matchesImage = appliedFilters.contentImage && contentType.startsWith("image/");
        const matchesVideo = appliedFilters.contentVideo && contentType.startsWith("video/");
        return matchesText || matchesImage || matchesVideo;
      });
    }

    if (appliedFilters.region === "my" && myRegion) {
      next = next.filter((post) => String(post.visibilityRegion || "").trim() === myRegion);
    } else if (appliedFilters.region === "global" && myRegion) {
      next = next.filter((post) => String(post.visibilityRegion || "").trim() !== myRegion);
    }

    if (appliedFilters.sort === "most-liked") {
      next.sort((a, b) => {
        const likesA = a.likesCount ?? a.likes?.length ?? 0;
        const likesB = b.likesCount ?? b.likes?.length ?? 0;
        return likesB - likesA;
      });
    } else if (appliedFilters.sort === "most-replied") {
      next.sort((a, b) => {
        const repliesA = a.comments?.length ?? 0;
        const repliesB = b.comments?.length ?? 0;
        return repliesB - repliesA;
      });
    } else {
      next.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return next;
  }, [posts, appliedFilters, user]);

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
    // Wire follow system once profiles support follow relationships.
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
      resetReplyVisible(postId);
      const comments = await apiClient.get(`/posts/${postId}/comments`, token);
      setThreadPostId(postId);
      setThreadComments(comments);
    } catch (err) {
      setError(err.message || "Failed to load replies");
    }
  };

  function getReplyVisible(postId) {
    return replyVisibleByPost[postId] ?? REPLIES_INITIAL;
  }

  function resetReplyVisible(postId) {
    setReplyVisibleByPost((prev) => ({ ...prev, [postId]: REPLIES_INITIAL }));
  }

  function moreReplies(postId) {
    setReplyVisibleByPost((prev) => ({
      ...prev,
      [postId]: (prev[postId] ?? REPLIES_INITIAL) + REPLIES_STEP
    }));
  }

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
      setNewPostVisibility("public");
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to create post");
    }
  };

  const handleApplyFilters = async () => {
    setAppliedFilters(filterDraft);
    await loadData();
  };

  const handleResetFilters = async () => {
    const defaults = {
      visibility: "all",
      contentTextOnly: false,
      contentImage: false,
      contentVideo: false,
      region: "all",
      sort: "latest"
    };
    setFilterDraft(defaults);
    setAppliedFilters(defaults);
    await loadData();
  };

  const opportunityPreview = opportunities.slice(0, 5);
  const activeThreadPost = threadPostId ? posts.find((item) => item._id === threadPostId) : null;
  const visibleReplyCount = threadPostId ? getReplyVisible(threadPostId) : REPLIES_INITIAL;
  const shownReplies = threadComments.slice(0, visibleReplyCount);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {user && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreatePost(e);
          }}
          className="glass rounded-2xl p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl">Share an update</h2>
            <label className="flex items-center gap-2">
              <span className="text-xs text-white/50 whitespace-nowrap">Visibility</span>
              <select
                value={newPostVisibility}
                onChange={(event) => setNewPostVisibility(event.target.value)}
                className="h-7 w-auto rounded-md border border-white/10 bg-white/5 px-2 py-0 text-xs text-sand focus:outline-none focus:ring-0 focus:border-white/20"
              >
                <option value="public">Everyone</option>
                <option value="connections">My connections</option>
              </select>
            </label>
          </div>
          <textarea
            value={newPostContent}
            onChange={(event) => setNewPostContent(event.target.value)}
            rows={3}
            className="mt-4 w-full rounded-xl border border-white/10 bg-slate/40 px-4 py-3 text-sm text-sand"
            placeholder="Share what you're working on..."
            required
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <input
              type="file"
              onChange={(event) => setNewPostAttachment(event.target.files?.[0] || null)}
              className="text-xs text-mist"
              accept="application/pdf,image/png,image/jpeg,video/mp4,video/webm,video/quicktime,.mov"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setNewPostContent("");
                  setNewPostAttachment(null);
                  setNewPostAttachmentPreviewUrl("");
                  setNewPostVisibility("public");
                }}
                className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-wide text-mist hover:border-teal"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleCreatePost}
                className="rounded-full bg-teal px-5 py-2 text-xs font-semibold uppercase tracking-wide text-charcoal"
              >
                Post update
              </button>
            </div>
          </div>
          {newPostAttachment && (
            <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-mist">
              <p className="truncate">
                {newPostAttachment.name} · {newPostAttachment.type || "file"} ·{" "}
                {(newPostAttachment.size / (1024 * 1024)).toFixed(1)} MB
              </p>
              {newPostAttachmentPreviewUrl ? (
                <video
                  controls
                  preload="metadata"
                  className="mt-2 w-full max-h-56 rounded-lg"
                  src={newPostAttachmentPreviewUrl}
                />
              ) : null}
            </div>
          )}
        </form>
      )}

      {error && <p className="text-sm text-coral">{error}</p>}

      <section className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-wide text-sand hover:border-teal"
          >
            Filters
          </button>
        </div>
        {showFilters && (
          <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
            <h3 className="text-sm text-sand">Filters</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs text-mist">Visibility</span>
                <select
                  value={filterDraft.visibility}
                  onChange={(event) =>
                    setFilterDraft((prev) => ({ ...prev, visibility: event.target.value }))
                  }
                  className="h-9 rounded-lg border border-white/10 bg-slate-900/50 px-3 text-sm text-sand"
                >
                  <option value="all">All</option>
                  <option value="public">Public</option>
                  <option value="connections">Connections</option>
                </select>
              </label>

              <label className="space-y-1">
                <span className="text-xs text-mist">Region</span>
                <select
                  value={filterDraft.region}
                  onChange={(event) =>
                    setFilterDraft((prev) => ({ ...prev, region: event.target.value }))
                  }
                  className="h-9 rounded-lg border border-white/10 bg-slate-900/50 px-3 text-sm text-sand"
                >
                  <option value="all">All</option>
                  <option value="my">My region</option>
                  <option value="global">Global</option>
                </select>
              </label>

              <div className="space-y-2">
                <p className="text-xs text-mist">Content</p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-mist">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={filterDraft.contentTextOnly}
                      onChange={(event) =>
                        setFilterDraft((prev) => ({
                          ...prev,
                          contentTextOnly: event.target.checked
                        }))
                      }
                    />
                    Text only
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={filterDraft.contentImage}
                      onChange={(event) =>
                        setFilterDraft((prev) => ({
                          ...prev,
                          contentImage: event.target.checked
                        }))
                      }
                    />
                    Image
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={filterDraft.contentVideo}
                      onChange={(event) =>
                        setFilterDraft((prev) => ({
                          ...prev,
                          contentVideo: event.target.checked
                        }))
                      }
                    />
                    Video
                  </label>
                </div>
              </div>

              <label className="space-y-1">
                <span className="text-xs text-mist">Sort</span>
                <select
                  value={filterDraft.sort}
                  onChange={(event) =>
                    setFilterDraft((prev) => ({ ...prev, sort: event.target.value }))
                  }
                  className="h-9 rounded-lg border border-white/10 bg-slate-900/50 px-3 text-sm text-sand"
                >
                  <option value="latest">Latest</option>
                  <option value="most-liked">Most liked</option>
                  <option value="most-replied">Most replied</option>
                </select>
              </label>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={handleApplyFilters}
                className="rounded-full bg-teal px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-charcoal"
              >
                Apply filters
              </button>
              <button
                type="button"
                onClick={handleResetFilters}
                className="rounded-full border border-white/10 px-4 py-1.5 text-xs uppercase tracking-wide text-mist hover:border-teal"
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-8">
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-2xl">Community pulse</h2>
            </div>
            {loading ? (
              <p className="text-sm text-mist">Loading community pulse...</p>
            ) : filteredRegionalPosts.length === 0 ? (
              <p className="text-sm text-mist">No posts yet. Start a steady conversation.</p>
            ) : (
              <div className="space-y-4">
                {filteredRegionalPosts.map((post) => (
                  <CommunityPostCard
                    key={post._id}
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
                ))}
              </div>
            )}
          </section>

          {editingPostId && (
            <section className="glass rounded-2xl p-5 space-y-3">
              <h3 className="font-display text-lg">Edit post</h3>
              <textarea
                value={editDraft}
                onChange={(event) => setEditDraft(event.target.value)}
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sm text-sand"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditSave(editingPostId)}
                  className="rounded-full bg-teal px-4 py-2 text-xs font-semibold uppercase tracking-wide text-charcoal"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingPostId(null)}
                  className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-wide text-mist hover:border-teal"
                >
                  Cancel
                </button>
              </div>
            </section>
          )}

          {threadPostId && (
            <section className="glass rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg">Replies</h3>
                <button
                  onClick={() => setThreadPostId(null)}
                  className="text-xs uppercase tracking-wide text-mist hover:text-sand"
                >
                  Close
                </button>
              </div>
              {threadComments.length === 0 ? (
                <p className="text-sm text-mist">No replies yet.</p>
              ) : (
                <div className="space-y-2">
                  {shownReplies.map((comment) => (
                    <div key={comment._id} className="rounded-xl border border-white/10 p-3 text-sm text-sand">
                      <div className="flex items-center justify-between gap-2">
                        <UserChip
                          user={comment.author}
                          size={USER_CHIP_SIZES.FEED}
                          nameClassName="text-xs"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShareInput(
                              buildSharePayload({
                                entityType: "comment",
                                entityId: comment._id,
                                url: `/post/${threadPostId}?comment=${comment._id}`,
                                title: (comment.content || "Comment").slice(0, 90),
                                subtitle: comment.author?.name
                                  ? `Comment by ${comment.author.name}`
                                  : "Comment",
                                meta: {
                                  postId: activeThreadPost?._id || threadPostId,
                                  commentId: comment._id
                                }
                              })
                            )
                          }
                          className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-mist hover:border-teal"
                        >
                          Share
                        </button>
                      </div>
                      <p>{comment.content}</p>
                    </div>
                  ))}
                  {threadPostId && threadComments.length > visibleReplyCount && (
                    <button
                      type="button"
                      onClick={() => moreReplies(threadPostId)}
                      className="text-sm font-medium text-teal-400 hover:underline"
                    >
                      More replies (+{REPLIES_STEP})
                    </button>
                  )}
                </div>
              )}
            </section>
          )}

          <section className="glass rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-display text-xl">Progress, not performance</h3>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-wide text-mist">
                Progress updates
              </span>
            </div>
            {progressPosts.length === 0 ? (
              <p className="text-sm text-mist">
                No progress updates yet. The next small win is enough.
              </p>
            ) : (
              <div className="space-y-4">
                {progressPosts.slice(0, 5).map((post) => (
                  <CommunityPostCard
                    key={post._id}
                    post={post}
                    onRespond={() =>
                      setActivePostId((prev) => (prev === post._id ? null : post._id))
                    }
                    onSave={() => handleToggleSave(post._id)}
                    onFollow={() => handleFollow(post._id)}
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
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="glass rounded-2xl p-5 space-y-3">
            <h3 className="font-display text-xl">Mentorship & guidance</h3>
            {user?.userType === "student" ? (
              mentors.length ? (
                <div className="space-y-3">
                  <p className="text-sm text-mist">Mentors available in your region</p>
                  {mentors.slice(0, 4).map((mentor) => (
                    <div
                      key={mentor._id}
                      className="rounded-xl border border-white/10 bg-slate/40 p-3"
                    >
                      <UserChip
                        user={mentor}
                        size={USER_CHIP_SIZES.FEED}
                        nameClassName="text-sm text-sand"
                      />
                      <p className="text-xs text-mist">{mentor.headline || "Mentor"}</p>
                    </div>
                  ))}
                  <p className="text-xs text-mist">
                    Mentor request flow updates are in progress.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-mist">
                  No verified mentors nearby yet. Check Explore for wider reach.
                </p>
              )
            ) : user?.isMentor ? (
              requests.length ? (
                <div className="space-y-3">
                  <p className="text-sm text-mist">Pending requests</p>
                  {requests.slice(0, 4).map((request) => (
                    <div
                      key={request._id}
                      className="rounded-xl border border-white/10 bg-slate/40 p-3"
                    >
                      <UserChip
                        user={request.fromStudent}
                        size={USER_CHIP_SIZES.FEED}
                        nameClassName="text-sm text-sand"
                      />
                      <p className="text-xs text-mist">{request.message}</p>
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
          </section>

          <section className="glass rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl">Quiet opportunities</h3>
              <Link to="/opportunities" className="text-xs uppercase tracking-wide text-teal">
                View all
              </Link>
            </div>
            {opportunityPreview.length ? (
              <div className="space-y-3">
                {opportunityPreview.map((opportunity) => (
                  <Link
                    key={opportunity._id}
                    to={`/opportunities/${opportunity._id}`}
                    className="block rounded-xl border border-white/10 bg-slate/40 p-3 hover:border-teal"
                  >
                    <p className="text-sm text-sand">{opportunity.title}</p>
                    <p className="text-xs text-mist">
                      {opportunity.orgName} · {opportunity.locationMode}
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-mist">No open opportunities yet.</p>
            )}
          </section>
        </aside>
      </div>
      <ShareSheet open={!!shareInput} onClose={() => setShareInput(null)} shareInput={shareInput} />
    </div>
  );
}
