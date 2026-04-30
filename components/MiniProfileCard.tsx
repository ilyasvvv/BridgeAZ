"use client";

import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import { profileHref } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { usersApi } from "@/lib/users";
import { circlesApi } from "@/lib/circles";
import { chatsApi } from "@/lib/chats";
import { circleToMiniProfile, userToMiniProfile } from "@/lib/mappers";

export type MiniProfile = {
  id?: string;
  name: string;
  handle: string;
  kind: "personal" | "circle";
  location: string;
  bio: string;
  stats: { label: string; value: string }[];
  hue?: number;
  avatarUrl?: string;
  bannerUrl?: string;
  following?: boolean;
  membershipStatus?: "none" | "pending" | "active" | "rejected";
  memberRole?: "owner" | "admin" | "member";
  isAdmin?: boolean;
  isOwner?: boolean;
};

/**
 * Wraps any trigger. On hover (after a short delay) shows a small floating
 * card with essential profile info — different framing for personal vs
 * circle accounts.
 */
export function MiniProfileCard({
  profile,
  children,
  placement = "bottom",
}: {
  profile: MiniProfile;
  children: ReactNode;
  placement?: "bottom" | "top" | "right";
}) {
  const router = useRouter();
  const { user } = useAuth();
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [detail, setDetail] = useState<MiniProfile>(profile);
  const [following, setFollowing] = useState(!!profile.following);
  const [followTouched, setFollowTouched] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [messageBusy, setMessageBusy] = useState(false);
  const [followError, setFollowError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setDetail(profile);
    setFollowing(
      profile.kind === "circle"
        ? profile.membershipStatus === "active" || !!profile.following
        : !!profile.following
    );
  }, [profile]);

  useEffect(() => {
    if (!open) return;
    const updateRect = () => {
      const next = triggerRef.current?.getBoundingClientRect();
      if (next) setRect(next);
    };
    updateRect();
    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);
    return () => {
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !profile.id) return;
    let cancelled = false;
    async function loadDetail() {
      try {
        if (profile.kind === "circle") {
          const circle = await circlesApi.get(profile.handle || profile.id!);
          if (!cancelled) {
            const next = circleToMiniProfile(circle);
            setDetail(next);
            setFollowing(next.membershipStatus === "active" || !!next.following);
          }
          return;
        }

        const [fullUser, relationship] = await Promise.all([
          usersApi.get(profile.id!),
          user?._id === profile.id
            ? Promise.resolve(null)
            : usersApi.relationship(profile.id!).catch(() => null),
        ]);
        if (cancelled) return;
        setDetail(userToMiniProfile(fullUser));
        if (relationship) setFollowing(relationship.following);
      } catch {
        // Keep the summary profile if expanded detail is unavailable.
      }
    }
    loadDetail();
    return () => {
      cancelled = true;
    };
  }, [open, profile.handle, profile.id, profile.kind, user?._id]);

  function show() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setOpen(true), 600);
  }
  function hide() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setOpen(false), 140);
  }

  const hue = detail.hue ?? 220;
  const href = profileHref(detail.kind, detail.handle, detail.id);
  const isJoinedCircle = detail.kind === "circle" && (following || detail.membershipStatus === "active");
  const isPendingCircle = detail.kind === "circle" && detail.membershipStatus === "pending";
  const canFollow =
    detail.kind === "circle"
      ? !!(detail.id || detail.handle) && !isPendingCircle
      : !!detail.id && detail.id !== user?._id;
  const canMessage = detail.kind === "personal" && !!detail.id && detail.id !== user?._id;
  const sharedSignal = detail.kind === "circle"
    ? "Circle clubhouse"
    : detail.location && user?.currentRegion && detail.location.includes(user.currentRegion)
    ? "Same region"
    : "Warm intro";
  const floatingStyle = useMemo(() => {
    if (!rect) return undefined;
    const width = 276;
    const gap = 10;
    const left = Math.min(
      Math.max(12, placement === "right" ? rect.right + gap : rect.left),
      window.innerWidth - width - 12
    );
    const top =
      placement === "top"
        ? Math.max(12, rect.top - 236 - gap)
        : Math.min(rect.bottom + gap, window.innerHeight - 12);
    return { left, top, width };
  }, [placement, rect]);

  async function toggleFollow() {
    if (!canFollow || followBusy) return;
    const wasFollowing = following;
    setFollowBusy(true);
    setFollowTouched(true);
    setFollowError(null);
    setFollowing(!wasFollowing);

    try {
      if (detail.kind === "circle") {
        const target = detail.handle || detail.id;
        if (!target) throw new Error("Circle unavailable");
        if (wasFollowing) {
          await circlesApi.leave(target);
          setFollowing(false);
        } else {
          await circlesApi.join(target);
          setFollowing(true);
        }
      } else {
        if (!detail.id) throw new Error("Profile unavailable");
        const result = wasFollowing
          ? await usersApi.unfollow(detail.id)
          : await usersApi.follow(detail.id);
        setFollowing(result.following);
      }
    } catch (err: any) {
      if (err?.status === 409 && !wasFollowing) {
        setFollowing(true);
        return;
      }
      setFollowing(wasFollowing);
      setFollowError(err?.message || "Follow failed");
    } finally {
      setFollowBusy(false);
    }
  }

  async function startMessage() {
    if (!canMessage || !detail.id || messageBusy) return;
    setMessageBusy(true);
    try {
      const thread = await chatsApi.startThread(detail.id);
      router.push(`/messages?thread=${thread._id}`);
    } finally {
      setMessageBusy(false);
    }
  }

  const preview = mounted && open && floatingStyle
    ? createPortal(
        <span
          className="fixed z-[9999] block"
          style={floatingStyle}
          onMouseEnter={show}
          onMouseLeave={hide}
          onFocus={show}
          onBlur={hide}
        >
          <span className="block overflow-hidden rounded-[18px] border border-paper-line bg-paper shadow-pop">
            <span
              className="block h-16 bg-ink"
              style={
                detail.bannerUrl
                  ? { backgroundImage: `url(${detail.bannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                  : { background: `linear-gradient(135deg, #0A0A0A, hsl(${hue} 26% 42%), #C1FF72)` }
              }
              aria-hidden
            />
            <span className="block p-3 pt-0">
              <span className="flex items-end gap-2">
                <Link href={href} className="-mt-6 shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-ink">
                  <Avatar
                    size={52}
                    hue={hue}
                    kind={detail.kind}
                    src={detail.avatarUrl}
                    alt={`${detail.name} avatar`}
                    className="ring-4 ring-paper"
                  />
                </Link>
                <span className="min-w-0 flex-1 pb-0.5">
                  <span className="flex items-center gap-1.5">
                    <Link href={href} className="truncate text-[13px] font-bold tracking-tight hover:underline">
                      {detail.name}
                    </Link>
                    {detail.kind === "circle" && (
                      <span className="shrink-0 rounded-full bg-paper-cool px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.12em] text-ink/50">
                        Circle
                      </span>
                    )}
                  </span>
                  <span className="block text-[10.5px] font-semibold leading-snug text-ink/45">
                    @{detail.handle}
                    {detail.stats.slice(0, 3).map((s) => (
                      <span key={s.label} className="ml-1.5 text-ink/55">
                        · {s.value} {s.label.toLowerCase()}
                      </span>
                    ))}
                  </span>
                </span>
              </span>

              {detail.bio && (
                <span className="mt-2 line-clamp-2 block text-[12px] leading-snug text-ink/68">
                  {detail.bio}
                </span>
              )}

              <span className="mt-2 flex items-center justify-between gap-2 text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink/42">
                <span className="truncate normal-case tracking-normal text-[11.5px] font-semibold text-ink/48">
                  {detail.location}
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#EAFCC4] px-2 py-0.5 text-[#4A7018]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#8FC23A]" />
                  {sharedSignal}
                </span>
              </span>

              <span className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleFollow}
                  disabled={!canFollow || followBusy}
                  className={clsx(
                    "btn-press h-8 flex-1 rounded-pill text-[11.5px] font-bold disabled:opacity-45",
                    following
                      ? "bg-ink text-paper"
                      : "border border-[#8FC23A]/45 bg-[#C1FF72] text-ink hover:bg-[#B4F25F]"
                  )}
                  >
                  {followBusy
                    ? "..."
                    : detail.kind === "circle"
                    ? isPendingCircle
                      ? "Pending"
                      : isJoinedCircle
                      ? "Following"
                      : "Follow"
                    : following
                    ? "Following"
                    : "Follow"}
                </button>
                <button
                  type="button"
                  onClick={startMessage}
                  disabled={!canMessage || messageBusy}
                  className="btn-press inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-pill bg-ink text-[11.5px] font-bold text-paper disabled:opacity-45"
                >
                  <Icon.Chat size={12} />
                  {messageBusy ? "..." : "Message"}
                </button>
              </span>
              {followTouched && followError && (
                <span className="mt-2 block text-[11px] text-red-700">{followError}</span>
              )}
            </span>
          </span>
        </span>,
        document.body
      )
    : null;

  return (
    <span
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {preview}
    </span>
  );
}
