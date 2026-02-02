import RegionPill from "./RegionPill";
import StatusBadge from "./StatusBadge";
import { formatRelativeTime } from "../utils/format";

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
  const comments = post.comments || [];
  const attachmentUrl = post.attachmentUrl;
  const attachmentContentType = post.attachmentContentType || "";
  const lowerUrl = (attachmentUrl || "").toLowerCase();
  const isImage =
    attachmentContentType.startsWith("image/") ||
    [".png", ".jpg", ".jpeg", ".webp", ".gif"].some((ext) => lowerUrl.endsWith(ext));
  const isPdf =
    attachmentContentType === "application/pdf" || lowerUrl.endsWith(".pdf");
  const attachmentLabel = attachmentUrl ? attachmentUrl.split("/").pop() : "";
  const liked = !!post.likedByMe;
  const likesCount = post.likesCount ?? post.likes?.length ?? 0;
  return (
    <div className="glass gradient-border relative rounded-2xl p-5 min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-mist">{post.author?.name || "Member"}</p>
          <div className="mt-2 flex items-center gap-2">
            <RegionPill region={post.author?.currentRegion || "AZ"} />
            <span className="text-xs text-mist">{formatRelativeTime(post.createdAt)}</span>
          </div>
        </div>
        <StatusBadge label={post.author?.userType || "member"} tone="slate" />
      </div>
      <p className="mt-4 text-base text-sand/90 break-words whitespace-pre-wrap">
        {post.content}
      </p>
      {attachmentUrl && (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-mist min-w-0 overflow-hidden">
          {isImage ? (
            <img
              src={attachmentUrl}
              alt="Post attachment"
              className="w-full max-h-[420px] object-contain rounded-xl"
            />
          ) : isPdf ? (
            <div className="flex items-center justify-between">
              <span className="truncate">PDF attachment</span>
              <a
                href={attachmentUrl}
                target="_blank"
                rel="noreferrer"
                className="text-teal underline"
              >
                View
              </a>
            </div>
          ) : (
            <a
              href={attachmentUrl}
              target="_blank"
              rel="noreferrer"
              className="block truncate text-teal underline"
              title={attachmentLabel || attachmentUrl}
            >
              {attachmentLabel || "View attachment"}
            </a>
          )}
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-mist">
        <span>{likesCount} likes</span>
        <span>{post.comments?.length || 0} responses</span>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-mist">
        <button
          onClick={() => onLike?.(post._id)}
          className={`rounded-full border px-3 py-1 uppercase tracking-wide ${
            liked ? "border-teal text-teal" : "border-white/10 hover:border-teal"
          }`}
        >
          {liked ? "Liked" : "Like"}
        </button>
        <button
          onClick={onRespond}
          className="rounded-full border border-white/10 px-3 py-1 uppercase tracking-wide hover:border-teal"
        >
          Respond
        </button>
        <button
          onClick={onSave}
          className={`rounded-full border px-3 py-1 uppercase tracking-wide ${
            isSaved ? "border-teal text-teal" : "border-white/10 hover:border-teal"
          }`}
        >
          {isSaved ? "Saved" : "Save"}
        </button>
        <button
          onClick={onFollow}
          className="rounded-full border border-white/10 px-3 py-1 uppercase tracking-wide hover:border-teal"
        >
          Follow
        </button>
        {isOwner && (
          <>
            <button
              onClick={onEdit}
              className="rounded-full border border-white/10 px-3 py-1 uppercase tracking-wide hover:border-teal"
            >
              Edit
            </button>
            <button
              onClick={onDelete}
              className="rounded-full border border-white/10 px-3 py-1 uppercase tracking-wide hover:border-teal"
            >
              Delete
            </button>
          </>
        )}
      </div>
      {comments.length > 0 && (
        <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-mist">
          {comments.map((comment) => (
            <div key={comment._id} className="space-y-1">
              <p className="text-sand">{comment.author?.name || "Member"}</p>
              <p>{comment.content}</p>
            </div>
          ))}
          {onViewReplies && (
            <button
              onClick={onViewReplies}
              className="text-xs uppercase tracking-wide text-teal"
            >
              View all replies
            </button>
          )}
        </div>
      )}
      {showReply && (
        <form onSubmit={onReplySubmit} className="mt-4 space-y-2">
          <textarea
            value={replyValue}
            onChange={onReplyChange}
            rows={2}
            className="w-full rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sm text-sand"
            placeholder="Share a thoughtful response..."
            required
          />
          <button
            type="submit"
            className="rounded-full bg-teal px-4 py-2 text-xs font-semibold uppercase tracking-wide text-charcoal"
          >
            Send response
          </button>
        </form>
      )}
    </div>
  );
}
