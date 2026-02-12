import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient, uploadViaPresign } from "../api/client";
import { useAuth } from "../utils/auth";
import CommunityPostCard from "../components/CommunityPostCard";
import UserChip, { USER_CHIP_SIZES } from "../components/UserChip";
import { regionLabel } from "../utils/format";
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

export default function ForYou() {
  const { user, token } = useAuth();
  const [posts, setPosts] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [requests, setRequests] = useState([]);
  const [regionFilter, setRegionFilter] = useState("LOCAL");
  const [savedPosts, setSavedPosts] = useState(new Set());
  const [activePostId, setActivePostId] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [editingPostId, setEditingPostId] = useState(null);
  const [editDraft, setEditDraft] = useState("");
  const [threadPostId, setThreadPostId] = useState(null);
  const [threadComments, setThreadComments] = useState([]);
  const [shareInput, setShareInput] = useState(null);
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostAttachment, setNewPostAttachment] = useState(null);
  const [newPostRegion, setNewPostRegion] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const allowedTypes = ["application/pdf", "image/png", "image/jpeg"];
  const maxSizeBytes = 5 * 1024 * 1024;

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
    if (regionFilter === "ALL" || !user?.currentRegion) {
      return posts;
    }
    return posts.filter((post) => post.visibilityRegion === user?.currentRegion);
  }, [posts, regionFilter, user]);

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
      const comments = await apiClient.get(`/posts/${postId}/comments`, token);
      setThreadPostId(postId);
      setThreadComments(comments);
    } catch (err) {
      setError(err.message || "Failed to load replies");
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
    event.preventDefault();
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
          setError("File must be 5MB or less");
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
          visibilityRegion: newPostRegion || "ALL"
        },
        token
      );

      setShowCreatePostModal(false);
      setNewPostContent("");
      setNewPostAttachment(null);
      setNewPostRegion("");
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to create post");
    }
  };

  const headerRegion = regionLabel(user?.currentRegion) || "—";
  const opportunityPreview = opportunities.slice(0, 5);
  const activeThreadPost = threadPostId ? posts.find((item) => item._id === threadPostId) : null;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="glass rounded-2xl p-5">
        <p className="text-xs uppercase tracking-wide text-mist">Your context</p>
        <p className="mt-2 text-sm text-sand">
          You are currently based in {headerRegion}. Connected with members across the community.
        </p>
      </section>

      {error && <p className="text-sm text-coral">{error}</p>}

      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-8">
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-2xl">Community pulse</h2>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-mist">
                  Calm updates, thoughtful replies
                </span>
                <button
                  type="button"
                  onClick={() => setShowCreatePostModal(true)}
                  className="rounded-full bg-teal px-5 py-2 text-xs font-semibold uppercase tracking-wide text-charcoal"
                >
                  Create Post
                </button>
              </div>
            </div>
            {loading ? (
              <p className="text-sm text-mist">Loading community pulse...</p>
            ) : posts.length === 0 ? (
              <p className="text-sm text-mist">No posts yet. Start a steady conversation.</p>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
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

          <section className="glass rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-display text-xl">From where you are</h3>
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide">
                {[
                  { value: "LOCAL", label: "Your region" },
                  { value: "ALL", label: "All" }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setRegionFilter(option.value)}
                    className={`rounded-full border px-3 py-1 ${
                      regionFilter === option.value
                        ? "border-teal bg-teal/10 text-teal"
                        : "border-white/10 text-mist hover:border-teal"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            {filteredRegionalPosts.length === 0 ? (
              <p className="text-sm text-mist">
                No regional posts yet. Quiet spaces are normal too.
              </p>
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
                  {threadComments.map((comment) => (
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
      {showCreatePostModal && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-charcoal/70 px-4"
          onClick={() => setShowCreatePostModal(false)}
        >
          <form
            onSubmit={handleCreatePost}
            className="glass w-full max-w-2xl rounded-2xl p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl">Share an update</h2>
              <input
                value={newPostRegion}
                onChange={(event) => setNewPostRegion(event.target.value)}
                className="rounded-full border border-white/10 bg-slate/40 px-4 py-2 text-xs tracking-wide text-sand"
                placeholder="Visibility (leave empty for all)"
              />
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
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreatePostModal(false)}
                  className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-wide text-mist hover:border-teal"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-teal px-5 py-2 text-xs font-semibold uppercase tracking-wide text-charcoal"
                >
                  Post update
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
      <ShareSheet open={!!shareInput} onClose={() => setShareInput(null)} shareInput={shareInput} />
    </div>
  );
}
