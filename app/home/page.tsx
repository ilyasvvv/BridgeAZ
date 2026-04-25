"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { TopBar } from "@/components/TopBar";
import { Composer } from "@/components/Composer";
import { PostCard, type Post } from "@/components/PostCard";
import { CirclesForYou, PeopleForYou, Filters } from "@/components/SideRail";
import { TrendingCard } from "@/components/TrendingCard";
import { MessagesDock } from "@/components/MessagesDock";
import { useAuth } from "@/lib/auth";
import { postsApi } from "@/lib/posts";
import { circlesApi } from "@/lib/circles";
import { usersApi } from "@/lib/users";
import { apiPostToUiPost, circleToMiniProfile, userToMiniProfile } from "@/lib/mappers";
import type { MiniProfile } from "@/components/MiniProfileCard";

export default function HomePage() {
  const router = useRouter();
  const { user, status } = useAuth();

  const [filter, setFilter] = useState("All");
  const [messagesOpen, setMessagesOpen] = useState(false);

  const [posts, setPosts] = useState<Post[] | null>(null);
  const [circles, setCircles] = useState<MiniProfile[]>([]);
  const [people, setPeople] = useState<MiniProfile[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    const load = async () => {
      try {
        const [rawPosts, rawCircles, rawPeople] = await Promise.all([
          postsApi.list(),
          circlesApi.list({ limit: 5 }),
          usersApi.list({ accountType: "personal" }),
        ]);
        if (cancelled) return;
        setPosts(rawPosts.map(apiPostToUiPost));
        setCircles(rawCircles.slice(0, 5).map(circleToMiniProfile));
        setPeople(rawPeople.filter((p) => p._id !== user?._id).slice(0, 5).map(userToMiniProfile));
      } catch (err: any) {
        if (cancelled) return;
        setLoadError(err?.message || "Failed to load feed");
      }
    };
    load();
    return () => { cancelled = true; };
  }, [status, user?._id]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-paper-warm flex items-center justify-center text-ink/50 text-sm">
        Loading…
      </div>
    );
  }

  const filtered = posts
    ? (filter === "All"
        ? posts
        : posts.filter((p) =>
            (filter === "Searching" ? "Searching for" : filter) === p.category
          ))
    : [];

  const regionLabel = user?.currentRegion || "your region";

  return (
    <div className="min-h-screen bg-paper-warm">
      <TopBar />

      <main className="max-w-[1400px] mx-auto px-6 pt-6 pb-20">
        <div className="grid grid-cols-12 gap-6 items-start">
          <aside className="col-span-12 lg:col-span-3 space-y-4 lg:sticky lg:top-[88px]">
            <CirclesForYou items={circles} />
            <PeopleForYou items={people} />
            <div className="rounded-[22px] bg-ink text-paper p-5 relative overflow-hidden">
              <div className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full border border-paper/15 animate-spin-slower" />
              <div className="absolute -right-16 -bottom-16 w-60 h-60 rounded-full border border-paper/10" />
              <h4 className="font-display text-[18px] font-medium leading-tight">Start your own circle</h4>
              <p className="text-[12px] text-paper/60 mt-1.5">Football club, language exchange, tea gathering — anything goes.</p>
              <button
                onClick={() => router.push("/circles/new")}
                className="mt-4 h-8 px-3.5 rounded-pill bg-paper text-ink text-[11.5px] font-semibold btn-press"
              >
                Create circle →
              </button>
            </div>
          </aside>

          <div className="col-span-12 lg:col-span-6 space-y-4">
            <Composer onPosted={(post) => setPosts((current) => current ? [post, ...current] : [post])} />
            <div className="flex items-center justify-between">
              <Filters active={filter} onChange={setFilter} />
              <span className="text-[11px] text-ink/50">
                Showing posts from <b className="text-ink/70">{regionLabel}</b>
              </span>
            </div>
            <div className="space-y-4">
              {loadError && (
                <div className="rounded-[18px] border border-paper-line bg-paper p-5 text-[13px] text-ink/70">
                  Couldn't load the feed: {loadError}
                </div>
              )}
              {!posts && !loadError && (
                <div className="rounded-[22px] border border-paper-line bg-paper p-5 text-[13px] text-ink/55">
                  Loading posts…
                </div>
              )}
              {posts && filtered.length === 0 && (
                <div className="rounded-[22px] border border-paper-line bg-paper p-8 text-center text-[13px] text-ink/60">
                  No posts yet for this filter. Be the first.
                </div>
              )}
              {filtered.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          </div>

          <aside className="col-span-12 lg:col-span-3 lg:sticky lg:top-[88px] space-y-4 relative">
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
