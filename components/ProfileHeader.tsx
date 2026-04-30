"use client";

import clsx from "clsx";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import { emitPlayfulBurst } from "@/lib/playful";

export type ProfileKind = "personal" | "circle";

export type ProfileMeta = {
  name: string;
  handle: string;
  kind: ProfileKind;
  bio: string;
  tagline?: string;
  location: string;
  locationOrigin?: string;
  joined: string;
  link?: string;
  stats: { label: string; value: string }[];
  hue?: number;
  avatarUrl?: string;
  bannerUrl?: string;
  isOwner?: boolean;
};

export function ProfileHeader({
  profile,
  onMessage,
  onEditProfile,
  onPrimaryAction,
  primaryActionLabel,
  primaryActionBusy,
}: {
  profile: ProfileMeta;
  onMessage?: () => void;
  onEditProfile?: () => void;
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
  primaryActionBusy?: boolean;
}) {
  const hue = profile.hue ?? 220;
  return (
    <header className="rounded-[28px] bg-paper border border-paper-line overflow-hidden relative">
      {/* Banner — rectangular for personal, the CONTAINER is circular for circles */}
      {profile.kind === "personal" ? (
        <div
          className="h-36 md:h-44 relative"
          style={{
            background: profile.bannerUrl
              ? "#0A0A0A"
              : defaultBackdrop(profile.kind, hue),
          }}
        >
          {profile.bannerUrl ? (
            <img
              src={profile.bannerUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <>
              <div className="absolute inset-0 opacity-60" style={{ backgroundImage: "linear-gradient(90deg, rgba(193,255,114,0.18) 0 1px, transparent 1px), linear-gradient(0deg, rgba(255,255,255,0.08) 0 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
              <div className="absolute left-8 top-8 h-16 w-16 rounded-full border border-[#C1FF72]/40" />
              <div className="absolute right-10 bottom-8 h-24 w-24 rounded-full border border-paper/20" />
            </>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/20 to-transparent" />
        </div>
      ) : (
        <div
          className="h-48 md:h-64 flex items-center justify-center bg-paper-warm relative overflow-hidden"
          style={{ background: profile.bannerUrl ? "#F4F4F2" : defaultBackdrop(profile.kind, hue) }}
        >
          {profile.bannerUrl && (
            <img
              src={profile.bannerUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          {/* decorative rings */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[480px] h-[480px] rounded-full border border-ink/[0.06] absolute" />
            <div className="w-[340px] h-[340px] rounded-full border border-ink/[0.08] absolute animate-spin-slower" />
            <div className="w-[220px] h-[220px] rounded-full border border-ink/[0.1] absolute" />
          </div>
          {/* The circle "banner" itself */}
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt=""
              className="relative h-36 w-36 rounded-full object-cover shadow-pop md:h-44 md:w-44"
            />
          ) : (
            <div
              className="relative w-36 h-36 md:w-44 md:h-44 rounded-full shadow-pop"
              style={{
                background: `conic-gradient(from ${hue}deg, #0A0A0A, #2B2B2B, #6B6B6B, #0A0A0A)`,
              }}
              aria-hidden
            />
          )}
        </div>
      )}

      <div className="px-6 md:px-8 pb-6">
        <div className="flex items-start gap-5 -mt-10">
          <div className="relative shrink-0">
            <Avatar
              size={96}
              hue={hue}
              kind={profile.kind}
              src={profile.avatarUrl}
              alt={`${profile.name} avatar`}
              className="ring-4 ring-paper shadow-soft"
            />
          </div>
          <div className="flex-1 min-w-0 pt-12">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-x-6 gap-y-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="font-display text-[26px] md:text-[30px] font-semibold tracking-[-0.02em]">
                        {profile.name}
                      </h1>
                      {profile.kind === "circle" && (
                        <span className="text-[10px] font-bold tracking-[0.16em] text-ink/55 uppercase bg-paper-cool px-2 py-0.5 rounded-full">
                          Circle
                        </span>
                      )}
                    </div>
                    <div className="text-[12.5px] text-ink/50 mt-0.5">@{profile.handle}</div>
                    {profile.tagline && (
                      <div className="mt-2 text-[13px] text-ink/75">{profile.tagline}</div>
                    )}
                  </div>

                  <div className="flex items-center gap-5 pt-1.5">
                    {profile.stats.map((s) => (
                      <div key={s.label} className="min-w-[58px]">
                        <div className="font-display text-[19px] md:text-[21px] font-semibold tracking-tight">
                          {s.value}
                        </div>
                        <div className="text-[9.5px] md:text-[10px] tracking-[0.14em] text-ink/45 uppercase mt-0.5">
                          {s.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {profile.isOwner ? (
                  onEditProfile ? (
                    <button
                      type="button"
                      onClick={onEditProfile}
                      className="btn-press brand-glow h-9 px-4 rounded-pill border border-[#8FC23A]/35 bg-[#C1FF72] text-ink hover:bg-[#B4F25F] text-[12px] font-semibold inline-flex items-center gap-1.5"
                    >
                      <Icon.Edit size={13} />
                      {profile.kind === "circle" ? "Edit circle" : "Edit profile"}
                    </button>
                  ) : null
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={(event) => {
                        emitPlayfulBurst("message", event.clientX, event.clientY);
                        onMessage?.();
                      }}
                      className="btn-press h-9 px-4 rounded-pill bg-ink text-paper text-[12px] font-semibold inline-flex items-center gap-1.5"
                    >
                      <Icon.Chat size={13} />
                      Message
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        emitPlayfulBurst(profile.kind === "circle" ? "joined" : "followed", event.clientX, event.clientY);
                        onPrimaryAction?.();
                      }}
                      disabled={primaryActionBusy}
                      className="btn-press brand-glow h-9 px-4 rounded-pill border border-[#8FC23A]/35 bg-[#C1FF72] text-ink hover:bg-[#B4F25F] text-[12px] font-semibold disabled:opacity-50"
                    >
                      {primaryActionLabel || (profile.kind === "circle" ? "Join" : "Follow")}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bio */}
        <p className="mt-5 text-[14px] leading-relaxed text-ink/80 max-w-2xl">{profile.bio}</p>

        {/* Meta row */}
        <div className="mt-4 flex items-center gap-5 text-[12px] text-ink/55 flex-wrap">
          <span className="inline-flex items-center gap-1.5"><Icon.Pin size={12} />{profile.location}</span>
          {profile.locationOrigin && (
            <span className="inline-flex items-center gap-1.5"><Icon.Globe size={12} />From {profile.locationOrigin}</span>
          )}
          <span className="inline-flex items-center gap-1.5"><Icon.Calendar size={12} />Joined {profile.joined}</span>
          {profile.link && (
            <a href="#" className="inline-flex items-center gap-1.5 text-ink hover:underline">
              <Icon.Link size={12} />{profile.link}
            </a>
          )}
        </div>
      </div>
    </header>
  );
}

function defaultBackdrop(kind: ProfileKind, hue: number) {
  if (kind === "circle") {
    return `radial-gradient(circle at 50% 50%, rgba(193,255,114,0.32), transparent 18%), radial-gradient(circle at 18% 24%, hsl(${hue} 55% 78% / 0.5), transparent 24%), linear-gradient(135deg, #F4F4F2 0%, #EAFCC4 42%, #0A0A0A 100%)`;
  }
  return `radial-gradient(circle at 18% 28%, rgba(193,255,114,0.45), transparent 24%), radial-gradient(circle at 82% 70%, hsl(${hue} 58% 70% / 0.34), transparent 28%), linear-gradient(135deg, #0A0A0A 0%, #2B2B2B 48%, #F4F4F2 100%)`;
}

export function ProfileTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string; count?: number }[];
  active: string;
  onChange: (k: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 border-b border-paper-line">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          aria-label={`Profile tab: ${t.label}`}
          className={clsx(
            "relative h-11 px-5 text-[13px] font-semibold transition-colors",
            active === t.key ? "text-ink" : "text-ink/50 hover:text-ink/80"
          )}
        >
          <span className="inline-flex items-center gap-1.5">
            {t.label}
            {t.count !== undefined && (
              <span className="text-[10px] text-ink/40 font-semibold">{t.count}</span>
            )}
          </span>
          {active === t.key && (
            <span className="absolute left-3 right-3 bottom-0 h-0.5 bg-ink rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
}
