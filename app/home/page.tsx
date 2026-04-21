"use client";

import { useState } from "react";
import clsx from "clsx";
import { TopBar } from "@/components/TopBar";
import { Composer } from "@/components/Composer";
import { PostCard } from "@/components/PostCard";
import { CirclesForYou, PeopleForYou, Filters } from "@/components/SideRail";
import { TrendingCard } from "@/components/TrendingCard";
import { MessagesDock } from "@/components/MessagesDock";
import { CIRCLES, PEOPLE, POSTS } from "@/data/mock";

export default function HomePage() {
  const [filter, setFilter] = useState("All");
  const [messagesOpen, setMessagesOpen] = useState(false);

  const filtered =
    filter === "All"
      ? POSTS
      : POSTS.filter((p) =>
          (filter === "Searching" ? "Searching for" : filter) === p.category
        );

  return (
    <div className="min-h-screen bg-paper-warm">
      <TopBar />

      <main className="max-w-[1400px] mx-auto px-6 pt-6 pb-20">
        <div className="grid grid-cols-12 gap-6 items-start">
          {/* Left rail */}
          <aside className="col-span-12 lg:col-span-3 space-y-4 lg:sticky lg:top-[88px]">
            <CirclesForYou items={CIRCLES} />
            <PeopleForYou items={PEOPLE} />
            <div className="rounded-[22px] bg-ink text-paper p-5 relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full border border-paper/15 animate-spin-slower" />
              <div className="absolute -right-16 -bottom-16 w-60 h-60 rounded-full border border-paper/10" />
              <h4 className="font-display text-[18px] font-medium leading-tight">Start your own circle</h4>
              <p className="text-[12px] text-paper/60 mt-1.5">Football club, language exchange, tea gathering — anything goes.</p>
              <button className="mt-4 h-8 px-3.5 rounded-pill bg-paper text-ink text-[11.5px] font-semibold btn-press">
                Create circle →
              </button>
            </div>
          </aside>

          {/* Center */}
          <div className="col-span-12 lg:col-span-6 space-y-4">
            <Composer />
            <div className="flex items-center justify-between">
              <Filters active={filter} onChange={setFilter} />
              <span className="text-[11px] text-ink/50">Showing posts from <b className="text-ink/70">Berlin</b></span>
            </div>
            <div className="space-y-4">
              {filtered.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          </div>

          {/* Right rail — Trending on top, Messages dock at bottom. */}
          <aside className="col-span-12 lg:col-span-3 lg:sticky lg:top-[88px] space-y-4 relative">
            {/* When messages open, trending slides up out of view */}
            <div
              className={clsx(
                "transition-all duration-500 ease-[cubic-bezier(0.6,0.05,0.3,1)]",
                messagesOpen
                  ? "-translate-y-[120%] opacity-0 pointer-events-none max-h-0 overflow-hidden"
                  : "translate-y-0 opacity-100 max-h-[2000px]"
              )}
            >
              <TrendingCard />
            </div>

            <div
              className={clsx(
                "transition-all duration-500 ease-[cubic-bezier(0.6,0.05,0.3,1)]",
                messagesOpen ? "" : "lg:-mt-2"
              )}
            >
              <MessagesDock
                open={messagesOpen}
                onToggle={() => setMessagesOpen((v) => !v)}
              />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
