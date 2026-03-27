import { useRef, useState } from "react";
import RegionPill from "./RegionPill";
import StatusBadge from "./StatusBadge";
import UserChip, { USER_CHIP_SIZES } from "./UserChip";
import { formatRelativeTime } from "../utils/format";
import ShareSheet from "./ShareSheet";
import { buildSharePayload } from "../utils/share";

export default function CommunityPostCard({
  post,
  onRespond,
  onSave,
  onFollow,
  onLike,
  onEdit,
  onDelete,
  onViewReplies,
  isOwner,
  isSaved,
  showReply,
  replyValue,
  onReplyChange,
  onReplySubmit
}) {
  const [shareTarget, setShareTarget] = useState(null);
  const [visibleReplies, setVisibleReplies] = useState(2);
  const [allReplies, setAllReplies] = useState(null);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const videoRef = useRef(null);
  const comments = allReplies || post.comments || [];
  const attachmentUrl = post.attachmentUrl;
  const attachmentContentType = post.attachmentContentType || "";
  const lowerUrl = (attachmentUrl || "").toLowerCase();
  const isImage =
    attachmentContentType.startsWith("image/") ||
    [".png", ".jpg", ".jpeg", ".webp", ".gif"].some((ext) => lowerUrl.endsWith(ext));
  const isVideo =
    attachmentContentType.startsWith("video/") ||
    [".mp4", ".webm", ".mov", ".m4v"].some((ext) => lowerUrl.endsWith(ext));
  const isPdf =
    attachmentContentType === "application/pdf" || lowerUrl.endsWith(".pdf");
  const attachmentLabel = attachmentUrl ? attachmentUrl.split("/").pop() : "";
  const liked = !!post.likedByMe;
  const likesCount = post.likesCount ?? post.likes?.length ?? 0;
  const commentCount = post.comments?.length || 0;

  const postSharePayload = buildSharePayload({
    entityType: "post",
    entityId: post._id,
    url: `/post/${post._id}`,
    title: post.content ? post.content.slice(0, 90) : "Post",
    subtitle: post.author?.name ? `From ${post.author.name}` : "Community post",
    imageUrl: isImage ? attachmentUrl : "",
    meta: { postId: post._id }
  });

  const seekVideoBy = (delta) => {
    const node = videoRef.current;
    if (!node) return;
    const duration = Number.isFinite(node.duration) ? node.duration : Infinity;
    const nextTime = Math.max(0, Math.min(duration, (node.currentTime || 0) + delta));
    node.currentTime = nextTime;
  };

  const handleMoreReplies = async () => {
    if (onViewReplies && !allReplies && !loadingReplies) {
      setLoadingReplies(true);
      try {
        const loaded = await onViewReplies();
        if (Array.isArray(loaded)) {
          setAllReplies(loaded);
        }
      } finally {
        setLoadingReplies(false);
      }
    }
    setVisibleReplies((prev) => prev + 10);
  };

  const shownReplies = comments.slice(0, visibleReplies);

  return (
    <div className="group/card overflow-hidden rounded-2xl border border-border/60 bg-white shadow-card transition-shadow duration-300 hover:shadow-elevated">
      <div className="px-5 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <UserChip user={post.author} size={USER_CHIP_SIZES.FEED} />
            <div className="ml-[52px] mt-1.5 flex items-center gap-2">
              <RegionPill region={post.author?.currentRegion} />
              <span className="text-xs text-mist">
                {formatRelativeTime(post.createdAt)}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <StatusBadge label={post.author?.userType || "member"} tone="slate" />
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMenu(!showMenu)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-mist transition-colors hover:bg-charcoal/50 hover:text-sand"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="12" cy="19" r="1.5" />
                </svg>
              </button>
              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div
                    className="absolute right-0 top-full z-20 mt-1 min-w-[160px] rounded-xl border border-border bg-white py-1 shadow-floating"
                    style={{
                      animation:
                        "fyp-menu-in 0.15s cubic-bezier(0.16, 1, 0.3, 1) both"
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onFollow?.();
                        setShowMenu(false);
                      }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-mist transition-colors hover:bg-charcoal/40 hover:text-sand"
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="8.5" cy="7" r="4" />
                        <line x1="20" y1="8" x2="20" y2="14" />
                        <line x1="23" y1="11" x2="17" y2="11" />
                      </svg>
                      Follow
                    </button>
                    {isOwner && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            onEdit?.();
                            setShowMenu(false);
                          }}
                          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-mist transition-colors hover:bg-charcoal/40 hover:text-sand"
                        >
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          Edit
                        </button>
                        <div className="my-1 border-t border-border/50" />
                        <button
                          type="button"
                          onClick={() => {
                            onDelete?.();
                            setShowMenu(false);
                          }}
                          className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-coral transition-colors hover:bg-coral/5"
                        >
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 py-4">
        <p className="break-words whitespace-pre-wrap text-[15px] leading-relaxed text-sand/90">
          {post.content}
        </p>
      </div>

      {attachmentUrl && (
        <div className="px-5 pb-4">
          <div className="overflow-hidden rounded-xl border border-border/40 bg-charcoal/30">
            {isImage ? (
              <img
                src={attachmentUrl}
                alt="Post attachment"
                className="w-full max-h-[420px] object-contain"
              />
            ) : isVideo ? (
              <div>
                <video
                  ref={videoRef}
                  controls
                  preload="metadata"
                  className="w-full max-h-[420px]"
                >
                  <source
                    src={attachmentUrl}
                    type={attachmentContentType || "video/mp4"}
                  />
                </video>
                <div className="flex items-center gap-2 border-t border-border/40 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => seekVideoBy(-5)}
                    className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-mist transition-colors hover:border-sand/30 hover:text-sand"
                  >
                    &#10226; 5s
                  </button>
                  <button
                    type="button"
                    onClick={() => seekVideoBy(5)}
                    className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-mist transition-colors hover:border-sand/30 hover:text-sand"
                  >
                    5s &#10227;
                  </button>
                </div>
              </div>
            ) : isPdf ? (
              <div className="flex items-center justify-between px-4 py-3 text-sm">
                <div className="flex items-center gap-2 text-mist">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  PDF attachment
                </div>
                <a
                  href={attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-brand transition-colors hover:text-brand/80"
                >
                  View &rarr;
                </a>
              </div>
            ) : (
              <a
                href={attachmentUrl}
                target="_blank"
                rel="noreferrer"
                className="block truncate px-4 py-3 text-sm font-medium text-brand transition-colors hover:text-brand/80"
                title={attachmentLabel || attachmentUrl}
              >
                {attachmentLabel || "View attachment"} &rarr;
              </a>
            )}
          </div>
        </div>
      )}

      <div className="px-5 pb-4">
        <div className="flex items-center justify-between border-t border-border/40 pt-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onLike?.(post._id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-all ${
                liked
                  ? "font-medium text-coral"
                  : "text-mist hover:bg-coral/5 hover:text-coral"
              }`}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill={liked ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={liked ? "fyp-heart-pop" : ""}
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {likesCount > 0 && <span>{likesCount}</span>}
            </button>

            <button
              type="button"
              onClick={onRespond}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-all ${
                showReply
                  ? "font-medium text-brand"
                  : "text-mist hover:bg-brand/5 hover:text-brand"
              }`}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {commentCount > 0 && <span>{commentCount}</span>}
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShareTarget(postSharePayload)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-mist transition-colors hover:bg-charcoal/50 hover:text-sand"
              title="Share"
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            </button>

            <button
              type="button"
              onClick={onSave}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                isSaved
                  ? "text-sand"
                  : "text-mist hover:bg-charcoal/50 hover:text-sand"
              }`}
              title={isSaved ? "Saved" : "Save"}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill={isSaved ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {comments.length > 0 && (
        <div className="border-t border-border/40 px-5 py-4">
          <div className="space-y-3">
            {shownReplies.map((comment) => (
              <div key={comment._id} className="group/comment flex gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <UserChip
                      user={comment.author}
                      size={USER_CHIP_SIZES.SM}
                      nameClassName="text-xs"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShareTarget(
                          buildSharePayload({
                            entityType: "comment",
                            entityId: comment._id,
                            url: `/post/${post._id}?comment=${comment._id}`,
                            title: (comment.content || "Comment").slice(0, 90),
                            subtitle: comment.author?.name
                              ? `Comment by ${comment.author.name}`
                              : "Comment",
                            meta: { postId: post._id, commentId: comment._id }
                          })
                        )
                      }
                      className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-mist opacity-0 transition-all hover:border-sand/30 group-hover/comment:opacity-100"
                    >
                      Share
                    </button>
                  </div>
                  <p className="ml-[44px] mt-1 text-sm text-sand/80">
                    {comment.content}
                  </p>
                </div>
              </div>
            ))}
            {comments.length > visibleReplies && (
              <button
                type="button"
                onClick={handleMoreReplies}
                className="ml-[44px] text-xs font-medium text-brand transition-colors hover:text-brand/80"
              >
                {loadingReplies
                  ? "Loading..."
                  : `View ${comments.length - visibleReplies} more replies`}
              </button>
            )}
          </div>
        </div>
      )}

      {showReply && (
        <div className="border-t border-border/40 px-5 py-4">
          <form onSubmit={onReplySubmit} className="flex items-start gap-3">
            <textarea
              value={replyValue}
              onChange={onReplyChange}
              rows={2}
              className="flex-1 resize-none rounded-xl border border-border bg-charcoal/30 px-4 py-2.5 text-sm text-sand placeholder:text-mist/50 transition-colors focus:border-sand/30 focus:outline-none"
              placeholder="Share a thoughtful response..."
              required
            />
            <button
              type="submit"
              className="mt-0.5 shrink-0 rounded-full bg-sand px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-sand/90 active:scale-[0.97]"
            >
              Reply
            </button>
          </form>
        </div>
      )}

      <ShareSheet
        open={!!shareTarget}
        onClose={() => setShareTarget(null)}
        shareInput={shareTarget}
      />
    </div>
  );
}
