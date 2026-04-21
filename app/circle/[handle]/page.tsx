"use client";

import { useState } from "react";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { ProfileHeader, ProfileTabs } from "@/components/ProfileHeader";
import { PostCard } from "@/components/PostCard";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { PEOPLE, CIRCLES, POSTS } from "@/data/mock";

export default function CircleProfilePage({
  params,
}: {
  params: { handle: string };
}) {
  const circle = CIRCLES.find((c) => c.handle === params.handle);
  if (!circle) return notFound();

  const [tab, setTab] = useState("posts");
  const posts = POSTS.filter((p) => p.author.handle === circle.handle);

  const profile = {
    ...circle,
    tagline: `${circle.stats[0].value} members · ${circle.location}`,
    joined: "January 2023",
    isOwner: false,
  };

  const tabs = [
    { key: "posts", label: "Posts", count: posts.length },
    { key: "members", label: "Members", count: 1200 },
    { key: "events", label: "Events", count: 14 },
    { key: "opportunities", label: "Opportunities", count: 6 },
    { key: "about", label: "About" },
  ];

  return (
    <div className="min-h-screen bg-paper-warm">
      <TopBar />
      <main className="max-w-[1100px] mx-auto px-6 py-8 space-y-5">
        <ProfileHeader profile={profile} />

        <div className="rounded-[22px] bg-paper border border-paper-line overflow-hidden">
          <ProfileTabs tabs={tabs} active={tab} onChange={setTab} />
          <div className="p-5">
            {tab === "posts" &&
              (posts.length === 0 ? (
                <EmptyWall />
              ) : (
                <div className="space-y-4">
                  {posts.map((p) => (
                    <PostCard key={p.id} post={p} />
                  ))}
                </div>
              ))}

            {tab === "members" && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {PEOPLE.concat(PEOPLE).map((p, i) => (
                  <a
                    key={i}
                    href={`/user/${p.handle}`}
                    className="p-3 rounded-[18px] border border-paper-line bg-paper-warm flex items-center gap-3 hover:border-ink/30 transition"
                  >
                    <Avatar size={40} hue={i * 45} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold truncate">
                        {p.name}
                      </div>
                      <div className="text-[11px] text-ink/50 truncate">
                        {p.location}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}

            {tab === "events" && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="p-4 rounded-[18px] border border-paper-line bg-paper-warm flex items-center gap-4"
                  >
                    <div className="w-14 h-14 rounded-[14px] bg-ink text-paper flex flex-col items-center justify-center leading-none">
                      <span className="text-[9.5px] font-bold tracking-[0.14em]">
                        {["MAR", "APR", "MAY"][i - 1]}
                      </span>
                      <span className="text-[20px] font-semibold mt-0.5">
                        {[21, 25, 9][i - 1]}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="text-[14px] font-semibold">
                        {
                          [
                            "Novruz Night at Hansaplatz",
                            "Pickup Football at Tempelhof",
                            "Spring Picnic",
                          ][i - 1]
                        }
                      </div>
                      <div className="text-[11.5px] text-ink/55">
                        {
                          [
                            "19:00 · Live music + tea",
                            "14:00 · Bring cleats",
                            "13:00 · BYO food",
                          ][i - 1]
                        }
                      </div>
                    </div>
                    <button className="h-8 px-4 rounded-pill bg-ink text-paper text-[11.5px] font-semibold btn-press">
                      RSVP
                    </button>
                  </div>
                ))}
              </div>
            )}

            {tab === "opportunities" && (
              <div className="space-y-3">
                {POSTS.filter((p) => p.category === "Opportunity").map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}
              </div>
            )}

            {tab === "about" && (
              <div className="max-w-prose text-[13.5px] text-ink/75 leading-relaxed space-y-4">
                <p>{circle.bio}</p>
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-paper-line text-[13px]">
                  <Meta icon="Pin" label="Location" value={circle.location} />
                  <Meta icon="Calendar" label="Founded" value={profile.joined} />
                  <Meta icon="User" label="Members" value={circle.stats[0].value} />
                  <Meta icon="Globe" label="Visibility" value="Public" />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function EmptyWall() {
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
        The circle's wall is quiet.
      </h3>
      <p className="mt-1.5 text-[13px] text-ink/55 max-w-sm mx-auto">
        When members share, everything lands in this space.
      </p>
    </div>
  );
}

function Meta({
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
        <div className="text-[10.5px] tracking-[0.14em] text-ink/45 uppercase">
          {label}
        </div>
        <div className="text-[13px] font-semibold">{value}</div>
      </div>
    </div>
  );
}
