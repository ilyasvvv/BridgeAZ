"use client";

import { ReactNode, useRef, useState } from "react";
import clsx from "clsx";
import Link from "next/link";

export type MiniProfile = {
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
  const [open, setOpen] = useState(false);
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
              href={`/${profile.kind === "circle" ? "circle" : "user"}/${profile.handle}`}
              className="btn-press flex-1 h-9 rounded-pill bg-ink text-paper text-[12px] font-semibold inline-flex items-center justify-center"
            >
              View profile
            </Link>
            <button className="btn-press h-9 px-3 rounded-pill border border-paper-line text-[12px] font-semibold hover:border-ink/30">
              {profile.kind === "personal" ? "Follow" : "Join"}
            </button>
          </span>
        </span>
      </span>
    </span>
  );
}
