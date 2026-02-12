import { useRef, useState } from "react";
import StatusBadge from "./StatusBadge";
import RegionPill from "./RegionPill";
import UserChip, { USER_CHIP_SIZES } from "./UserChip";
import { formatRelativeTime } from "../utils/format";
import ShareSheet from "./ShareSheet";
import { buildSharePayload } from "../utils/share";

export default function PostCard({ post, onLike }) {
  const [showShareSheet, setShowShareSheet] = useState(false);
  const videoRef = useRef(null);
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

  return (
    <div className="glass gradient-border relative rounded-2xl p-5 min-w-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <UserChip user={post.author} size={USER_CHIP_SIZES.FEED} />
          <div className="mt-2 flex items-center gap-2">
            <RegionPill region={post.author?.currentRegion} />
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
          ) : isVideo ? (
            <div className="space-y-2">
              <video
                ref={videoRef}
                controls
                preload="metadata"
                className="w-full max-h-[420px] rounded-xl"
              >
                <source src={attachmentUrl} type={attachmentContentType || "video/mp4"} />
              </video>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => seekVideoBy(-5)}
                  className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-wide text-mist hover:border-teal"
                >
                  ⟲ 5s
                </button>
                <button
                  type="button"
                  onClick={() => seekVideoBy(5)}
                  className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-wide text-mist hover:border-teal"
                >
                  5s ⟳
                </button>
              </div>
            </div>
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
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-mist">
        <span>{likesCount} likes</span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onLike?.(post._id)}
            className={`rounded-full border px-3 py-1 uppercase tracking-wide ${
              liked ? "border-teal text-teal" : "border-white/10 hover:border-teal"
            }`}
          >
            {liked ? "Liked" : "Like"}
          </button>
          <button
            onClick={() => setShowShareSheet(true)}
            className="rounded-full border border-white/10 px-3 py-1 uppercase tracking-wide hover:border-teal"
          >
            Share
          </button>
        </div>
      </div>
      <ShareSheet
        open={showShareSheet}
        onClose={() => setShowShareSheet(false)}
        shareInput={postSharePayload}
      />
    </div>
  );
}
