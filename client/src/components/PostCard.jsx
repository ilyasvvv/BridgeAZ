import { useState } from "react";
import { Link } from "react-router-dom";
import StatusBadge from "./StatusBadge";
import RegionPill from "./RegionPill";
import { formatRelativeTime } from "../utils/format";

export default function PostCard({ post, onLike }) {
  const [shareStatus, setShareStatus] = useState("");
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

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post._id}`;
    const text = (post.content || "").slice(0, 80);

    const setTempStatus = (value) => {
      setShareStatus(value);
      setTimeout(() => setShareStatus(""), 1500);
    };

    if (navigator.share) {
      try {
        await navigator.share({ title: "BridgeAZ", text, url });
        setTempStatus("Shared");
        return;
      } catch (error) {
        // Fall back to clipboard on failure or cancel.
      }
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      setTempStatus("Copied");
      return;
    }

    window.prompt("Copy link:", url);
    setTempStatus("Copied");
  };

  return (
    <div className="glass gradient-border relative rounded-2xl p-5 min-w-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            to={post.author?._id ? `/profile/${post.author._id}` : "#"}
            className="text-sm text-mist hover:text-sand hover:underline"
          >
            {post.author?.name || "Member"}
          </Link>
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
            onClick={handleShare}
            className="rounded-full border border-white/10 px-3 py-1 uppercase tracking-wide hover:border-teal"
          >
            {shareStatus || "Share"}
          </button>
        </div>
      </div>
    </div>
  );
}
