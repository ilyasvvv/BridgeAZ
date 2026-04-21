"use client";

import { useState } from "react";
import clsx from "clsx";
import { TopBar } from "@/components/TopBar";
import { ProfileHeader, ProfileTabs } from "@/components/ProfileHeader";
import { PostCard } from "@/components/PostCard";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { PEOPLE, CIRCLES, POSTS } from "@/data/mock";

type View = "personal" | "circle";

export default function ProfilePreviewPage() {
  const [view, setView] = useState<View>("personal");
  const [tab, setTab] = useState("posts");

  const personalProfile = {
    ...PEOPLE[0],
    tagline: "Product designer · Azerbaijani in Berlin",
    locationOrigin: "Baku",
    joined: "March 2024",
    link: "portfolio.leyla.com",
    isOwner: true,
  };

  const circleProfile = {
    ...CIRCLES[0],
    tagline: "1.2K members · Berlin, Germany",
    joined: "January 2023",
    isOwner: false,
  };

  const profile = view === "personal" ? personalProfile : circleProfile;
  const postsForProfile = view === "personal"
    ? POSTS.filter((p) => p.author.handle === PEOPLE[0].handle)
    : POSTS.filter((p) => p.author.handle === CIRCLES[0].handle);

  const personalTabs = [
    { key: "posts", label: "Posts", count: postsForProfile.length },
    { key: "circles", label: "Circles", count: 12 },
    { key: "opportunities", label: "Opportunities", count: 4 },
    { key: "about", label: "About" },
  ];
  const circleTabs = [
    { key: "posts", label: "Posts", count: postsForProfile.length },
    { key: "members", label: "Members", count: 1200 },
    { key: "events", label: "Events", count: 14 },
    { key: "opportunities", label: "Opportunities", count: 6 },
    { key: "about", label: "About" },
  ];

  return (
    <div className="min-h-screen bg-paper-warm">
      <TopBar />

      <main className="max-w-[1100px] mx-auto px-6 py-8 space-y-5">
        {/* View switcher (demo only) */}
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center p-1 rounded-pill bg-paper border border-paper-line">
            {(["personal", "circle"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={clsx(
                  "h-8 px-4 rounded-pill text-[11.5px] font-semibold tracking-[0.08em] uppercase transition",
                  view === v ? "bg-ink text-paper" : "text-ink/55"
                )}
              >
                {v} profile
              </button>
            ))}
          </div>
        </div>

        <ProfileHeader profile={profile} />

        <div className="rounded-[22px] bg-paper border border-paper-line overflow-hidden">
          <ProfileTabs
            tabs={view === "personal" ? personalTabs : circleTabs}
            active={tab}
            onChange={setTab}
          />

          <div className="p-5">
            {tab === "posts" && (
              postsForProfile.length === 0 ? (
                <EmptyState kind={view} />
              ) : (
                <div className="space-y-4">
                  {postsForProfile.map((p) => (
                    <PostCard key={p.id} post={p} />
                  ))}
                </div>
              )
            )}

            {tab === "circles" && view === "personal" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {CIRCLES.map((c, i) => (
                  <div key={c.handle} className="p-4 rounded-[18px] border border-paper-line bg-paper-warm flex items-center gap-3">
                    <Avatar size={44} hue={150 + i * 60} kind="circle" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold truncate">{c.name}</div>
                      <div className="text-[11px] text-ink/50 truncate">{c.location}</div>
                    </div>
                    <button className="h-7 px-3 rounded-pill bg-ink text-paper text-[11px] font-semibold">View</button>
                  </div>
                ))}
              </div>
            )}

            {tab === "members" && view === "circle" && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {PEOPLE.concat(PEOPLE).map((p, i) => (
                  <div key={i} className="p-3 rounded-[18px] border border-paper-line bg-paper-warm flex items-center gap-3">
                    <Avatar size={40} hue={i * 45} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold truncate">{p.name}</div>
                      <div className="text-[11px] text-ink/50 truncate">{p.location}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === "events" && view === "circle" && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="p-4 rounded-[18px] border border-paper-line bg-paper-warm flex items-center gap-4">
                    <div className="w-14 h-14 rounded-[14px] bg-ink text-paper flex flex-col items-center justify-center leading-none">
                      <span className="text-[9.5px] font-bold tracking-[0.14em]">{["MAR", "APR", "MAY"][i - 1]}</span>
                      <span className="text-[20px] font-semibold mt-0.5">{[21, 25, 9][i - 1]}</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-[14px] font-semibold">{["Novruz Night at Hansaplatz", "Pickup Football at Tempelhof", "Spring Picnic"][i - 1]}</div>
                      <div className="text-[11.5px] text-ink/55">{["19:00 · Live music + tea", "14:00 · Bring cleats", "13:00 · BYO food"][i - 1]}</div>
                    </div>
                    <button className="h-8 px-4 rounded-pill bg-ink text-paper text-[11.5px] font-semibold">RSVP</button>
                  </div>
                ))}
              </div>
            )}

            {tab === "opportunities" && (
              <div className="space-y-3">
                {POSTS.filter((p) => p.category === "Opportunity").map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}
                <div className="text-center py-4 text-[12px] text-ink/40">No more opportunities right now.</div>
              </div>
            )}

            {tab === "about" && (
              <div className="max-w-prose text-[13.5px] text-ink/75 leading-relaxed space-y-4">
                <p>{profile.bio}</p>
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-paper-line">
                  <Fact icon="Pin" label="Location" value={profile.location} />
                  {view === "personal" && (profile as typeof personalProfile).locationOrigin && (
                    <Fact icon="Globe" label="From" value={(profile as typeof personalProfile).locationOrigin!} />
                  )}
                  <Fact icon="Calendar" label="Joined" value={profile.joined} />
                  {view === "personal" && (profile as typeof personalProfile).link && (
                    <Fact icon="Link" label="Website" value={(profile as typeof personalProfile).link!} />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Icon;
  label: string;
  value: string;
}) {
  const Ico = Icon[icon];
  return (
    <div className="flex items-center gap-3">
      <span className="w-9 h-9 rounded-full bg-paper-cool flex items-center justify-center text-ink/70">
        <Ico size={14} />
      </span>
      <div>
        <div className="text-[10.5px] tracking-[0.14em] text-ink/45 uppercase">{label}</div>
        <div className="text-[13px] font-semibold">{value}</div>
      </div>
    </div>
  );
}

function EmptyState({ kind }: { kind: View }) {
  return (
    <div className="py-16 text-center">
      <div className="relative mx-auto w-40 h-40 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-ink/10" />
        <div className="absolute inset-4 rounded-full border border-ink/10 animate-spin-slower" />
        <div className="absolute inset-10 rounded-full border border-ink/10" />
        <div className="w-12 h-12 rounded-full bg-ink text-paper flex items-center justify-center">
          <Icon.Plus size={20} />
        </div>
      </div>
      <h3 className="mt-6 font-display text-[22px] font-semibold">
        {kind === "personal" ? "Your feed lives here." : "The circle's wall is quiet."}
      </h3>
      <p className="mt-1.5 text-[13px] text-ink/55 max-w-sm mx-auto">
        {kind === "personal"
          ? "Posts you publish will appear right here — like your own personal feed."
          : "No posts yet. When members share, everything lands in this space."}
      </p>
      <button className="mt-5 h-10 px-5 rounded-pill bg-ink text-paper text-[12.5px] font-semibold btn-press inline-flex items-center gap-1.5">
        <Icon.Plus size={14} />
        Create your first post
      </button>
    </div>
  );
}
