"use client";

import clsx from "clsx";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";

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
  isOwner?: boolean;
};

export function ProfileHeader({ profile }: { profile: ProfileMeta }) {
  const hue = profile.hue ?? 220;

  return (
    <header className="rounded-[28px] bg-paper border border-paper-line overflow-hidden relative">
      {/* Banner — rectangular for personal, the CONTAINER is circular for circles */}
      {profile.kind === "personal" ? (
        <div
          className="h-36 md:h-44 relative"
          style={{
            background: `linear-gradient(135deg, #0A0A0A 0%, #2B2B2B 30%, #6B6B6B 70%, #0A0A0A 100%)`,
          }}
        >
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.25), transparent 50%)" }} />
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 80% 70%, rgba(255,255,255,0.2), transparent 50%)" }} />
        </div>
      ) : (
        <div className="h-48 md:h-64 flex items-center justify-center bg-paper-warm relative overflow-hidden">
          {/* decorative rings */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-[480px] h-[480px] rounded-full border border-ink/[0.06] absolute" />
            <div className="w-[340px] h-[340px] rounded-full border border-ink/[0.08] absolute animate-spin-slower" />
            <div className="w-[220px] h-[220px] rounded-full border border-ink/[0.1] absolute" />
          </div>
          {/* The circle "banner" itself */}
          <div
            className="relative w-36 h-36 md:w-44 md:h-44 rounded-full shadow-pop"
            style={{
              background: `conic-gradient(from ${hue}deg, #0A0A0A, #2B2B2B, #6B6B6B, #0A0A0A)`,
            }}
            aria-hidden
          />
        </div>
      )}

      <div className="px-6 md:px-8 pb-6">
        <div className="flex items-start gap-5 -mt-10">
          <div className="relative shrink-0">
            <Avatar
              size={96}
              hue={hue}
              kind={profile.kind}
              className="ring-4 ring-paper shadow-soft"
            />
          </div>
          <div className="flex-1 min-w-0 pt-12">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
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

              <div className="flex items-center gap-2">
                {profile.isOwner ? (
                  <>
                    <button className="btn-press h-9 px-4 rounded-pill bg-ink text-paper text-[12px] font-semibold">
                      Edit profile
                    </button>
                    <button className="btn-press w-9 h-9 rounded-full border border-paper-line hover:border-ink/30 flex items-center justify-center">
                      <Icon.More size={15} />
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn-press h-9 px-4 rounded-pill bg-ink text-paper text-[12px] font-semibold inline-flex items-center gap-1.5">
                      <Icon.Chat size={13} />
                      Message
                    </button>
                    <button className="btn-press h-9 px-4 rounded-pill border border-paper-line hover:border-ink/30 text-[12px] font-semibold">
                      {profile.kind === "circle" ? "Join" : "Follow"}
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

        {/* Stats row */}
        <div className="mt-6 flex items-center gap-8 border-t border-paper-line pt-5">
          {profile.stats.map((s) => (
            <div key={s.label}>
              <div className="font-display text-[22px] font-semibold tracking-tight">{s.value}</div>
              <div className="text-[10.5px] tracking-[0.14em] text-ink/50 uppercase mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
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
