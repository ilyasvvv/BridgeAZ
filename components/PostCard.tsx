"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import Link from "next/link";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import { MiniProfileCard, MiniProfile } from "./MiniProfileCard";
import { postsApi } from "@/lib/posts";
import { relativeTime, profileHref } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { hueFromString } from "@/lib/format";
import { emitPlayfulBurst } from "@/lib/playful";
import { getPostInteraction, setPostInteraction } from "@/lib/postInteractions";

export type PostCategory = "Note" | "Announcement" | "Event" | "Opportunity" | "Searching for" | "Poll";

export type PostComment = {
  id: string;
  authorId?: string;
  authorName: string;
  authorHandle?: string;
  author?: MiniProfile;
  body: string;
  time: string;
  hue: number;
};

export type Post = {
  id: string;
  author: MiniProfile;
  category: PostCategory;
  time: string;
  location: string;
  body: string;
  tags: string[];
  hasMedia?: boolean;
  mediaUrl?: string;
  mediaHue?: number;
  stats: { likes: number; comments: number; shares: number };
  likedByMe?: boolean;
  savedByMe?: boolean;
  comments?: PostComment[];
  eventMeta?: { date: string; venue: string };
  opportunityMeta?: { role: string; type: string };
  pollMeta?: { duration: string; options: string[] };
};

const categoryStyles: Record<PostCategory, {
  bg: string;
  fg: string;
  icon: keyof typeof Icon;
  accent: string;
  action: { icon: keyof typeof Icon; label: string; activeLabel: string };
}> = {
  Note: {
    bg: "bg-paper-cool",
    fg: "text-ink/70",
    icon: "Note",
    accent: "from-paper-cool to-paper",
    action: { icon: "Check", label: "Save", activeLabel: "Saved" },
  },
  Announcement: {
    bg: "bg-ink",
    fg: "text-paper",
    icon: "Mic",
    accent: "from-ink/10 to-paper",
    action: { icon: "Bell", label: "Follow", activeLabel: "Following" },
  },
  Event: {
    bg: "bg-[#EAFCC4] border border-[#8FC23A]/35",
    fg: "text-[#4A7018]",
    icon: "Calendar",
    accent: "from-[#EAFCC4] to-paper",
    action: { icon: "Calendar", label: "Going", activeLabel: "Going" },
  },
  Opportunity: {
    bg: "bg-ink/5 border border-ink/20",
    fg: "text-ink",
    icon: "Briefcase",
    accent: "from-[#F5E58A]/35 to-paper",
    action: { icon: "Briefcase", label: "Save lead", activeLabel: "Lead saved" },
  },
  "Searching for": {
    bg: "bg-ink/5 border border-ink/20",
    fg: "text-ink",
    icon: "Search",
    accent: "from-[#B8D8E8]/35 to-paper",
    action: { icon: "Send", label: "I can help", activeLabel: "Offered help" },
  },
  Poll: {
    bg: "bg-[#B8D8E8]/35 border border-[#B8D8E8]",
    fg: "text-ink",
    icon: "Poll",
    accent: "from-[#B8D8E8]/45 to-paper",
    action: { icon: "Bookmark", label: "Save", activeLabel: "Saved" },
  },
};

export function PostCard({
  post,
  onSavedChange,
}: {
  post: Post;
  onSavedChange?: () => void;
}) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(!!post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.stats.likes);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(!!post.savedByMe);
  const [saveBusy, setSaveBusy] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<PostComment[]>(post.comments ?? []);
  const [commentCount, setCommentCount] = useState(post.stats.comments);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  const cat = categoryStyles[post.category];
  const CatIcon = Icon[cat.icon];

  async function toggleLike() {
    if (busy) return;
    setBusy(true);
    // optimistic
    const nextLiked = !liked;
    setLiked(nextLiked);
    if (nextLiked) {
      setCelebrating(true);
      emitPlayfulBurst("liked");
      window.setTimeout(() => setCelebrating(false), 560);
    }
    setLikeCount((c) => Math.max(0, c + (nextLiked ? 1 : -1)));
    try {
      const res = await postsApi.toggleLike(post.id);
      setLiked(res.likedByMe);
      setLikeCount(res.likesCount);
    } catch {
      // revert
      setLiked(!nextLiked);
      setLikeCount((c) => Math.max(0, c + (nextLiked ? -1 : 1)));
    } finally {
      setBusy(false);
    }
  }

  async function submitComment() {
    const body = draft.trim();
    if (!body || posting) return;
    setPosting(true);
    try {
      const res = await postsApi.comment(post.id, body);
      const newComment = res.createdComment;
      setComments((cs) => [
        {
          id: newComment._id,
          authorId: newComment.author?._id,
          authorName: newComment.author?.name || user?.name || "You",
          authorHandle: newComment.author?.username,
          author: newComment.author
            ? {
                id: newComment.author._id,
                name: newComment.author.name || user?.name || "You",
                handle: newComment.author.username || newComment.author._id,
                kind: newComment.author.accountType === "circle" ? "circle" : "personal",
                location: newComment.author.currentRegion || "",
                bio: "",
                hue: hueFromString(newComment.author._id || newComment._id),
                avatarUrl:
                  newComment.author.avatarUrl ||
                  newComment.author.profilePictureUrl ||
                  newComment.author.profilePhotoUrl ||
                  newComment.author.photoUrl,
                bannerUrl:
                  newComment.author.bannerUrl ||
                  newComment.author.profileBannerUrl ||
                  newComment.author.coverPhotoUrl,
                stats: [
                  { label: "POSTS", value: "—" },
                  { label: "FOLLOWERS", value: "—" },
                  { label: "CIRCLES", value: "—" },
                ],
              }
            : undefined,
          body: newComment.content,
          time: relativeTime(newComment.createdAt),
          hue: hueFromString(newComment.author?._id || newComment._id),
        },
        ...cs,
      ]);
      setCommentCount((n) => n + 1);
      setDraft("");
    } catch {
      // ignore
    } finally {
      setPosting(false);
    }
  }

  async function toggleSave() {
    if (saveBusy) return;
    const wasSaved = saved;
    setSaveBusy(true);
    setSaved(!wasSaved);
    try {
      const result = wasSaved
        ? await postsApi.unsave(post.id)
        : await postsApi.save(post.id);
      setSaved(Boolean(result.saved ?? result.savedByMe ?? result.post?.savedByMe ?? !wasSaved));
      onSavedChange?.();
      if (!wasSaved) emitPlayfulBurst("saved");
    } catch {
      setSaved(wasSaved);
    } finally {
      setSaveBusy(false);
    }
  }

  return (
    <article
      id={`post-${post.id}`}
      className={clsx(
        "rounded-[22px] bg-paper border border-paper-line hover:shadow-soft transition-shadow overflow-hidden",
        celebrating && "playful-pop"
      )}
    >
      <div className={clsx("h-1 bg-gradient-to-r", cat.accent)} />
      <div className="p-5">
        <div className="flex items-start gap-3">
          <MiniProfileCard profile={post.author}>
            <Link href={profileHref(post.author.kind, post.author.handle, post.author.id)}>
              <Avatar
                size={42}
                hue={post.author.hue ?? 220}
                kind={post.author.kind}
                src={post.author.avatarUrl}
                alt={`${post.author.name} avatar`}
              />
            </Link>
          </MiniProfileCard>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <MiniProfileCard profile={post.author}>
                <Link
                  href={profileHref(post.author.kind, post.author.handle, post.author.id)}
                  className="text-[14px] font-semibold tracking-tight hover:underline"
                >
                  {post.author.name}
                </Link>
              </MiniProfileCard>
              {post.author.kind === "circle" && (
                <span className="text-[9.5px] font-bold tracking-[0.14em] text-ink/50 uppercase bg-paper-cool px-1.5 py-0.5 rounded-full">
                  Circle
                </span>
              )}
              <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-[10.5px] font-semibold tracking-tight", cat.bg, cat.fg)}>
                <CatIcon size={11} />
                {post.category}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11.5px] text-ink/50 mt-0.5">
              <span>{post.time}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-0.5"><Icon.Pin size={10} />{post.location}</span>
            </div>
          </div>

          <button className="w-8 h-8 rounded-full hover:bg-paper-cool flex items-center justify-center text-ink/50">
            <Icon.More size={16} />
          </button>
        </div>

        {/* Specialized headers */}
        {post.eventMeta && (
          <div className="mt-4 p-3 rounded-[14px] bg-paper-warm border border-paper-line flex items-center gap-3">
            <div className="w-11 h-11 rounded-[10px] bg-ink text-paper flex flex-col items-center justify-center leading-none">
              <span className="text-[9px] font-bold tracking-[0.14em]">EVT</span>
              <span className="text-[13px] font-semibold mt-0.5">{post.eventMeta.date.split(" ")[0]}</span>
            </div>
            <div className="text-[13px] leading-tight">
              <div className="font-semibold">{post.eventMeta.date}</div>
              <div className="text-ink/55 text-[12px] mt-0.5">{post.eventMeta.venue}</div>
            </div>
            <button className="ml-auto btn-press h-8 px-4 rounded-pill bg-ink text-paper text-[11.5px] font-semibold">
              RSVP
            </button>
          </div>
        )}
        {post.opportunityMeta && (
          <div className="mt-4 p-3 rounded-[14px] bg-paper-warm border border-paper-line flex items-center gap-3">
            <Icon.Briefcase size={18} className="text-ink/70" />
            <div className="text-[13px] leading-tight">
              <div className="font-semibold">{post.opportunityMeta.role}</div>
              <div className="text-ink/55 text-[12px] mt-0.5">{post.opportunityMeta.type}</div>
            </div>
            <button className="ml-auto btn-press h-8 px-4 rounded-pill border border-ink/20 text-[11.5px] font-semibold hover:bg-ink hover:text-paper">
              Apply
            </button>
          </div>
        )}
        {post.pollMeta && (
          <PollBlock
            postId={post.id}
            userId={user?._id}
            duration={post.pollMeta.duration}
            options={post.pollMeta.options}
          />
        )}

        {(post.body || post.tags.length > 0) && (
          <p className="mt-4 text-[14px] leading-relaxed text-ink/85 whitespace-pre-wrap">
            {post.body}
            {post.tags.length > 0 && (
              <>
                {" "}
                <span className="text-ink">
                  {post.tags.map((t) => `#${t}`).join(" ")}
                </span>
              </>
            )}
          </p>
        )}
      </div>

      {post.hasMedia && (
        post.mediaUrl ? (
          <div className="mx-5 rounded-[14px] border border-paper-line overflow-hidden">
            <img
              src={post.mediaUrl}
              alt=""
              className="block w-full max-h-[480px] object-cover"
            />
          </div>
        ) : (
          <div
            className="aspect-[16/9] mx-5 rounded-[14px] border border-paper-line relative overflow-hidden"
            style={{
              background: `conic-gradient(from ${post.mediaHue ?? 220}deg at 30% 30%, #0A0A0A 0deg, #2a2a2a 80deg, #f4f4f2 160deg, #e8e8e6 260deg, #0A0A0A 360deg)`,
            }}
            aria-hidden
          >
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-paper/15 to-transparent" />
          </div>
        )
      )}

      <div className="px-5 py-3 flex items-center justify-between border-t border-paper-line mt-4">
        <div className="flex items-center gap-4 text-[12px] text-ink/55">
          <span className="inline-flex items-center gap-1.5">
            <span className={clsx("w-5 h-5 rounded-full inline-flex items-center justify-center", liked ? "bg-ink text-paper" : "bg-paper-cool text-ink/60")}>
              <Icon.Heart size={11} />
            </span>
            {likeCount}
          </span>
          <span>{commentCount} comments</span>
          <span>{post.stats.shares} shares</span>
        </div>
      </div>

      <div className="px-3 py-2 flex items-center gap-1 border-t border-paper-line">
        <ActionBtn
          icon="Heart"
          label="Like"
          active={liked}
          onClick={toggleLike}
        />
        <ActionBtn icon="Chat" label="Comment" onClick={() => setCommentsOpen((v) => !v)} />
        <ActionBtn
          icon="Bookmark"
          label={saved ? "Saved" : saveBusy ? "Saving" : "Save"}
          active={saved}
          onClick={toggleSave}
        />
        <ActionBtn icon="Share" label="Share" />
      </div>

      {commentsOpen && (
        <div className="border-t border-paper-line bg-paper-warm/40 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <Link href="/profile" className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-ink">
              <Avatar
                size={28}
                hue={hueFromString(user?._id || "me")}
                src={user?.avatarUrl || user?.profilePictureUrl || user?.profilePhotoUrl || user?.photoUrl}
                alt={`${user?.name || "Your"} avatar`}
              />
            </Link>
            <div className="flex-1">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write a comment…"
                rows={2}
                className="w-full resize-none rounded-[14px] border border-paper-line bg-paper px-3 py-2 text-[13px] outline-none focus:border-ink/30"
              />
              <div className="mt-2 flex justify-end">
                <button
                  onClick={submitComment}
                  disabled={!draft.trim() || posting}
                  className={clsx(
                    "h-8 px-3.5 rounded-pill text-[11.5px] font-semibold inline-flex items-center gap-1",
                    draft.trim() && !posting
                      ? "bg-ink text-paper"
                      : "bg-paper-cool text-ink/45"
                  )}
                >
                  {posting ? "Posting…" : "Post"}
                </button>
              </div>
            </div>
          </div>

          {comments.length === 0 ? (
            <p className="text-[12px] text-ink/45 text-center py-2">No comments yet — be the first.</p>
          ) : (
            <ul className="space-y-2">
              {comments.map((c) => (
                <li key={c.id} className="flex items-start gap-2">
                  {c.author ? (
                    <MiniProfileCard profile={c.author}>
                      <Link
                        href={profileHref(c.author.kind, c.author.handle, c.author.id)}
                        className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-ink"
                      >
                        <Avatar
                          size={28}
                          hue={c.author.hue ?? c.hue}
                          kind={c.author.kind}
                          src={c.author.avatarUrl}
                          alt={`${c.author.name} avatar`}
                        />
                      </Link>
                    </MiniProfileCard>
                  ) : c.authorHandle || c.authorId ? (
                    <Link
                      href={profileHref("user", c.authorHandle, c.authorId)}
                      className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-ink"
                    >
                      <Avatar size={28} hue={c.hue} />
                    </Link>
                  ) : (
                    <Avatar size={28} hue={c.hue} />
                  )}
                  <div className="flex-1 rounded-[14px] bg-paper border border-paper-line px-3 py-2">
                    <div className="flex items-center gap-2 text-[12px]">
                      {c.author ? (
                        <MiniProfileCard profile={c.author}>
                          <Link
                            href={profileHref(c.author.kind, c.author.handle, c.author.id)}
                            className="font-semibold hover:underline"
                          >
                            {c.authorName}
                          </Link>
                        </MiniProfileCard>
                      ) : c.authorHandle || c.authorId ? (
                        <Link
                          href={profileHref("user", c.authorHandle, c.authorId)}
                          className="font-semibold hover:underline"
                        >
                          {c.authorName}
                        </Link>
                      ) : (
                        <span className="font-semibold">{c.authorName}</span>
                      )}
                      <span className="text-ink/40">{c.time}</span>
                    </div>
                    <p className="mt-1 text-[13px] text-ink/80 whitespace-pre-wrap">{c.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}

function ActionBtn({
  icon,
  label,
  active,
  onClick,
}: {
  icon: keyof typeof Icon;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const Ico = Icon[icon];
  return (
    <button
      onClick={onClick}
      className={clsx(
        "btn-press flex-1 h-9 rounded-pill inline-flex items-center justify-center gap-1.5 text-[12.5px] font-semibold transition-colors",
        active ? "bg-ink text-paper" : "text-ink/70 hover:bg-paper-cool"
      )}
    >
      <Ico size={14} />
      {label}
    </button>
  );
}

function PollBlock({
  postId,
  userId,
  duration,
  options,
}: {
  postId: string;
  userId?: string;
  duration: string;
  options: string[];
}) {
  const [vote, setVote] = useState<string | null>(null);

  useEffect(() => {
    const stored = getPostInteraction(userId, postId, "pollVote");
    setVote(typeof stored === "string" ? stored : null);
  }, [postId, userId]);

  return (
    <div className="mt-4 rounded-[16px] border border-paper-line bg-paper-warm p-3">
      <div className="mb-2 flex items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-[0.12em] text-ink/42">
        <span className="inline-flex items-center gap-1.5">
          <Icon.Poll size={12} />
          Poll
        </span>
        <span>{duration}</span>
      </div>
      <div className="space-y-2">
        {options.map((option) => {
          const active = vote === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setVote(option);
                setPostInteraction(userId, postId, "pollVote", option);
                emitPlayfulBurst("voted");
              }}
              className={clsx(
                "btn-press relative flex min-h-10 w-full items-center justify-between overflow-hidden rounded-[12px] border px-3 py-2 text-left text-[12.5px] font-semibold transition",
                active
                  ? "border-ink bg-[#EAFCC4] text-ink"
                  : "border-paper-line bg-paper hover:border-ink/30"
              )}
            >
              <span className="relative z-10 min-w-0 truncate">{option}</span>
              {active && (
                <span className="relative z-10 inline-flex items-center gap-1 text-[11px] font-bold text-[#4A7018]">
                  <Icon.Check size={12} />
                  Voted
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
