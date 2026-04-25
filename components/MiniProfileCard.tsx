"use client";

import { ReactNode, useRef, useState } from "react";
import clsx from "clsx";
import Link from "next/link";
import { profileHref } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { usersApi } from "@/lib/users";

export type MiniProfile = {
  id?: string;
  name: string;
  handle: string;
  kind: "personal" | "circle";
  location: string;
  bio: string;
  stats: { label: string; value: string }[];
  hue?: number;
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
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followTouched, setFollowTouched] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [followError, setFollowError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function show() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setOpen(true), 600);
  }
  function hide() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setOpen(false), 140);
  }

  const hue = profile.hue ?? 220;
  const bannerRect =
    profile.kind === "personal"
      ? "w-full h-14 rounded-[14px] bg-gradient-to-br from-ink to-ink/70"
      : "";
  const canFollow = profile.kind === "personal" && !!profile.id && profile.id !== user?._id;

  async function toggleFollow() {
    if (!canFollow || !profile.id || followBusy) return;
    const wasFollowing = following;
    setFollowBusy(true);
    setFollowTouched(true);
    setFollowError(null);
    setFollowing(!wasFollowing);

    try {
      const result = wasFollowing
        ? await usersApi.unfollow(profile.id)
        : await usersApi.follow(profile.id);
      setFollowing(result.following);
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

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      <span
        className={clsx(
          "pointer-events-none absolute z-50 w-[300px] transition-all duration-200",
          placement === "bottom" && "top-full left-0 mt-2",
          placement === "top" && "bottom-full left-0 mb-2",
          placement === "right" && "left-full top-0 ml-2",
          open
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-1"
        )}
      >
        <span className="block rounded-[22px] bg-paper shadow-pop border border-paper-line p-4">
          {/* Banner — rectangular for personal, circular for circle */}
          {profile.kind === "personal" ? (
            <span className={clsx("block", bannerRect)} aria-hidden />
          ) : (
            <span className="flex justify-center">
              <span
                className="block rounded-full"
                style={{
                  width: 72,
                  height: 72,
                  background: `conic-gradient(from ${hue}deg, #0A0A0A, #6B6B6B, #0A0A0A)`,
                  boxShadow: "0 6px 24px -8px rgba(0,0,0,0.25)",
                }}
                aria-hidden
              />
            </span>
          )}

          <span className="flex items-center gap-3 mt-3">
            <span
              className={clsx(
                "inline-flex shrink-0 items-center justify-center overflow-hidden",
                "w-11 h-11 rounded-full",
                profile.kind === "personal" ? "-mt-8 ring-4 ring-paper" : ""
              )}
              style={{
                background: `conic-gradient(from ${hue + 30}deg, #0A0A0A, #555, #0A0A0A)`,
              }}
              aria-hidden
            />
            <span className="block min-w-0">
              <span className="flex items-center gap-1.5 text-[14px] font-semibold tracking-tight">
                {profile.name}
                {profile.kind === "circle" && (
                  <span className="text-[9.5px] font-bold tracking-[0.14em] text-ink/50 uppercase bg-paper-cool px-1.5 py-0.5 rounded-full">
                    Circle
                  </span>
                )}
              </span>
              <span className="block text-[12px] text-ink/50 truncate">@{profile.handle}</span>
            </span>
          </span>

          <span className="block mt-3 text-[12.5px] leading-relaxed text-ink/70">{profile.bio}</span>

          <span className="flex items-center gap-2 mt-3 text-[11.5px] text-ink/50">
            <span className="inline-block w-1 h-1 rounded-full bg-ink/40" />
            {profile.location}
          </span>

          <span className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-paper-line">
            {profile.stats.map((s) => (
              <span key={s.label} className="block text-center">
                <span className="block text-[14px] font-semibold">{s.value}</span>
                <span className="block text-[10px] tracking-[0.12em] text-ink/45 uppercase mt-0.5">
                  {s.label}
                </span>
              </span>
            ))}
          </span>

          <span className="flex items-center gap-2 mt-4">
            <Link
              href={profileHref(profile.kind, profile.handle)}
              className="btn-press flex-1 h-9 rounded-pill bg-ink text-paper text-[12px] font-semibold inline-flex items-center justify-center"
            >
              View profile
            </Link>
            {canFollow ? (
              <button
                type="button"
                onClick={toggleFollow}
                disabled={followBusy}
                className={clsx(
                  "btn-press h-9 px-3 rounded-pill border text-[12px] font-semibold disabled:opacity-50",
                  following
                    ? "border-ink bg-ink text-paper"
                    : "border-paper-line hover:border-ink/30"
                )}
              >
                {followBusy ? "..." : following ? "Following" : "Follow"}
              </button>
            ) : (
              <span className="h-9 px-3 rounded-pill border border-paper-line text-[12px] font-semibold inline-flex items-center justify-center text-ink/45">
                {profile.kind === "personal" ? "Follow" : "Join"}
              </span>
            )}
          </span>
          {followTouched && followError && (
            <span className="block mt-2 text-[11px] text-red-700">{followError}</span>
          )}
        </span>
      </span>
    </span>
  );
}
