"use client";

import { useState } from "react";
import { notFound } from "next/navigation";
import clsx from "clsx";
import { TopBar } from "@/components/TopBar";
import { ProfileHeader, ProfileTabs } from "@/components/ProfileHeader";
import { PostCard } from "@/components/PostCard";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { PEOPLE, CIRCLES, POSTS } from "@/data/mock";

export default function UserProfilePage({
  params,
}: {
  params: { handle: string };
}) {
  const person = PEOPLE.find((p) => p.handle === params.handle);
  if (!person) return notFound();

  const [tab, setTab] = useState("posts");
  const posts = POSTS.filter((p) => p.author.handle === person.handle);
  const isOwner = person.handle === "leyla";

  const profile = {
    ...person,
    tagline:
      person.handle === "leyla"
        ? "Product designer · Azerbaijani in Berlin"
        : person.handle === "rashad"
        ? "CS student @ UCL · volunteer @ London Diaspora"
        : "Software engineer in NYC",
    locationOrigin: "Baku",
    joined: "March 2024",
    link: person.handle === "leyla" ? "portfolio.leyla.com" : undefined,
    isOwner,
  };

  const tabs = [
    { key: "posts", label: "Posts", count: posts.length },
    { key: "circles", label: "Circles", count: 12 },
    { key: "opportunities", label: "Opportunities", count: 4 },
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
                <EmptyFeed isOwner={isOwner} />
              ) : (
                <div className="space-y-4">
                  {posts.map((p) => (
                    <PostCard key={p.id} post={p} />
                  ))}
                </div>
              ))}

            {tab === "circles" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {CIRCLES.map((c, i) => (
                  <div
                    key={c.handle}
                    className="p-4 rounded-[18px] border border-paper-line bg-paper-warm flex items-center gap-3"
                  >
                    <Avatar size={44} hue={150 + i * 60} kind="circle" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold truncate">
                        {c.name}
                      </div>
                      <div className="text-[11px] text-ink/50 truncate">
                        {c.location}
                      </div>
                    </div>
                    <a
                      href={`/circle/${c.handle}`}
                      className="h-7 px-3 rounded-pill bg-ink text-paper text-[11px] font-semibold inline-flex items-center"
                    >
                      View
                    </a>
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
              <AboutPanel
                bio={profile.bio}
                location={profile.location}
                origin={profile.locationOrigin}
                joined={profile.joined}
                link={profile.link}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function EmptyFeed({ isOwner }: { isOwner: boolean }) {
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
        {isOwner ? "Your feed lives here." : "Nothing here yet."}
      </h3>
      <p className="mt-1.5 text-[13px] text-ink/55 max-w-sm mx-auto">
        {isOwner
          ? "Posts you publish will appear right here — like your own personal feed."
          : "When they post something, you'll see it here."}
      </p>
    </div>
  );
}

function AboutPanel({
  bio,
  location,
  origin,
  joined,
  link,
}: {
  bio: string;
  location: string;
  origin?: string;
  joined: string;
  link?: string;
}) {
  return (
    <div className="max-w-prose text-[13.5px] text-ink/75 leading-relaxed space-y-4">
      <p>{bio}</p>
      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-paper-line">
        <Fact icon="Pin" label="Location" value={location} />
        {origin && <Fact icon="Globe" label="From" value={origin} />}
        <Fact icon="Calendar" label="Joined" value={joined} />
        {link && <Fact icon="Link" label="Website" value={link} />}
      </div>
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
      <span
        className={clsx(
          "w-9 h-9 rounded-full bg-paper-cool flex items-center justify-center text-ink/70"
        )}
      >
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
