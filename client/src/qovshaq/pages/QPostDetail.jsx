// Qovshaq Phase 1B/3C — Single post view with comments
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
import QInput from "../components/QInput";
import QModal from "../components/QModal";

export default function QPostDetail() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [postData, commentData] = await Promise.all([
          qApi.getPost(id, token),
          qApi.getComments(id, token),
        ]);
        setPost(postData);
        setComments(Array.isArray(commentData) ? commentData : commentData.comments || []);
      } catch {
        navigate("/q", { replace: true });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, token, navigate]);

  const handleLike = async () => {
    if (!post) return;
    const liked = post.likedByMe;
    setPost((p) => ({
      ...p,
      likedByMe: !liked,
      likeCount: (p.likeCount || 0) + (liked ? -1 : 1),
    }));
    try {
      if (liked) await qApi.unlikePost(id, token);
      else await qApi.likePost(id, token);
    } catch {
      setPost((p) => ({
        ...p,
        likedByMe: liked,
        likeCount: (p.likeCount || 0) + (liked ? 0 : -1),
      }));
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const newComment = await qApi.createComment(id, { content: commentText.trim() }, token);
      setComments((prev) => [...prev, newComment]);
      setCommentText("");
      setPost((p) => ({ ...p, commentCount: (p.commentCount || 0) + 1 }));
    } catch {}
    setSubmitting(false);
  };

  const handleReport = async () => {
    if (!reportReason) return;
    try {
      await qApi.reportContent({ targetType: "post", targetId: id, reason: reportReason }, token);
      setReportOpen(false);
      setReportReason("");
    } catch {}
  };

  const handleDelete = async () => {
    if (!confirm("Delete this post?")) return;
    try {
      await qApi.deletePost(id, token);
      navigate("/q", { replace: true });
    } catch {}
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-q-surface rounded-xl border border-q-border/50 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full q-skeleton" />
            <div className="space-y-2">
              <div className="h-4 w-36 q-skeleton" />
              <div className="h-3 w-24 q-skeleton" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full q-skeleton" />
            <div className="h-4 w-5/6 q-skeleton" />
            <div className="h-4 w-2/3 q-skeleton" />
          </div>
        </div>
      </div>
    );
  }

  if (!post) return null;

  const cat = categoryMap[post.category];
  const loc = formatLocation(post.location);
  const isAuthor = user?._id === post.author?._id;

  return (
    <div className="space-y-4">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-q-text-muted hover:text-q-text transition-colors"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </button>

      <QCard className="p-6">
        {/* Author */}
        <div className="flex items-start gap-3 mb-4">
          <Link to={`/q/profile/${post.author?._id}`}>
            <QAvatar user={post.author} size="lg" />
          </Link>
          <div className="flex-1">
            <Link
              to={`/q/profile/${post.author?._id}`}
              className="font-semibold text-q-text hover:underline"
            >
              {post.author?.name}
            </Link>
            <div className="flex items-center gap-2 text-xs text-q-text-muted mt-0.5">
              {cat && <QBadge color={cat.color} icon={cat.icon}>{cat.label}</QBadge>}
              {loc && <span>{loc}</span>}
              <span>·</span>
              <span>{new Date(post.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
            </div>
          </div>

          {/* Menu */}
          <div className="flex gap-1">
            {isAuthor && (
              <button onClick={handleDelete} className="text-xs text-q-danger hover:underline">
                Delete
              </button>
            )}
            {!isAuthor && (
              <button
                onClick={() => setReportOpen(true)}
                className="text-xs text-q-text-muted hover:text-q-danger"
              >
                Report
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <p className="text-q-text leading-relaxed whitespace-pre-wrap mb-4">{post.content}</p>

        {/* Template data */}
        {post.templateData?.eventDate && (
          <div className="flex items-center gap-2 px-4 py-3 bg-q-accent-light rounded-xl text-sm mb-4">
            <span className="text-lg">{"\u{1F4C5}"}</span>
            <div>
              <div className="font-medium text-q-text">
                {new Date(post.templateData.eventDate).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </div>
              {post.templateData.eventLocation && (
                <div className="text-q-text-muted">{post.templateData.eventLocation}</div>
              )}
            </div>
          </div>
        )}

        {post.templateData?.oppCompany && (
          <div className="flex items-center gap-3 px-4 py-3 bg-q-secondary-light rounded-xl text-sm mb-4">
            <span className="text-lg">{"\u{1F3E2}"}</span>
            <div>
              <div className="font-medium text-q-text">{post.templateData.oppCompany}</div>
              <div className="text-q-text-muted">
                {[post.templateData.oppType, post.templateData.oppLocationMode].filter(Boolean).join(" · ")}
              </div>
              {post.templateData.oppApplyUrl && (
                <a
                  href={post.templateData.oppApplyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-q-primary hover:underline text-xs"
                >
                  Apply →
                </a>
              )}
            </div>
          </div>
        )}

        {/* Tags */}
        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {post.tags.map((tag) => (
              <span key={tag} className="text-xs text-q-primary bg-q-primary-light/50 px-2.5 py-1 rounded-full">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Attachments */}
        {post.attachments?.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            {post.attachments
              .filter((a) => a.kind === "image")
              .map((att, i) => (
                <img key={i} src={att.url} alt="" className="rounded-xl object-cover w-full" />
              ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-4 border-t border-q-border/50">
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={handleLike}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              post.likedByMe ? "text-q-danger bg-red-50" : "text-q-text-muted hover:bg-q-surface-alt"
            }`}
          >
            <motion.svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill={post.likedByMe ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth={2}
              animate={post.likedByMe ? { scale: [1, 1.3, 1] } : {}}
            >
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
            </motion.svg>
            {post.likeCount || 0}
          </motion.button>

          <span className="text-sm text-q-text-muted">
            {post.commentCount || 0} comments
          </span>
        </div>
      </QCard>

      {/* Comments */}
      <QCard className="p-5">
        <h3 className="font-q-display text-lg text-q-text mb-4">Comments</h3>

        <form onSubmit={handleComment} className="flex gap-2 mb-5">
          <QAvatar user={user} size="sm" />
          <div className="flex-1 flex gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 px-4 py-2 bg-q-surface-alt rounded-lg text-sm text-q-text placeholder:text-q-text-muted/50 outline-none focus:ring-2 focus:ring-q-primary/10"
            />
            <QButton type="submit" size="sm" disabled={!commentText.trim() || submitting}>
              Post
            </QButton>
          </div>
        </form>

        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment._id} className="flex gap-3">
              <Link to={`/q/profile/${comment.author?._id}`}>
                <QAvatar user={comment.author} size="sm" />
              </Link>
              <div className="flex-1">
                <div className="bg-q-surface-alt rounded-xl px-4 py-2.5">
                  <Link
                    to={`/q/profile/${comment.author?._id}`}
                    className="text-sm font-semibold text-q-text hover:underline"
                  >
                    {comment.author?.name}
                  </Link>
                  <p className="text-sm text-q-text mt-0.5">{comment.content}</p>
                </div>
                <div className="text-[11px] text-q-text-muted mt-1 px-2">
                  {new Date(comment.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          ))}

          {comments.length === 0 && (
            <p className="text-center text-sm text-q-text-muted py-4">
              No comments yet. Be the first!
            </p>
          )}
        </div>
      </QCard>

      {/* Report modal */}
      <QModal isOpen={reportOpen} onClose={() => setReportOpen(false)} title="Report Post">
        <div className="space-y-3">
          {["Spam", "Harassment", "Inappropriate content", "Misinformation", "Other"].map((reason) => (
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
