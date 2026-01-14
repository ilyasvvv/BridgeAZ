import StatusBadge from "./StatusBadge";
import RegionPill from "./RegionPill";
import { formatRelativeTime } from "../utils/format";

export default function PostCard({ post, onLike }) {
  return (
    <div className="glass gradient-border relative rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-mist">{post.author?.name || "Member"}</p>
          <div className="mt-2 flex items-center gap-2">
            <RegionPill region={post.author?.currentRegion || "AZ"} />
            <span className="text-xs text-mist">{formatRelativeTime(post.createdAt)}</span>
          </div>
        </div>
        <StatusBadge label={post.author?.userType || "member"} tone="slate" />
      </div>
      <p className="mt-4 text-base text-sand/90">{post.content}</p>
      {post.attachmentUrl && (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-mist">
          Attachment: {post.attachmentUrl}
        </div>
      )}
      <div className="mt-4 flex items-center justify-between text-xs text-mist">
        <span>{post.likes?.length || 0} likes</span>
        <button
          onClick={() => onLike?.(post._id)}
          className="rounded-full border border-white/10 px-3 py-1 uppercase tracking-wide hover:border-teal"
        >
          Like
        </button>
      </div>
    </div>
  );
}
