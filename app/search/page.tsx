"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { PostCard } from "@/components/PostCard";
import { TopBar } from "@/components/TopBar";
import { useAuth } from "@/lib/auth";
import { searchApi, type SearchResponse, type SearchTypes } from "@/lib/search";
import { apiPostToUiPost, circleToMiniProfile, userToMiniProfile } from "@/lib/mappers";
import { hueFromString } from "@/lib/format";
import type { ApiUser } from "@/lib/types";

type Scope = "all" | "people" | "circles" | "posts" | "opportunities";

const SCOPES: { key: Scope; label: string }[] = [
  { key: "all", label: "All" },
  { key: "people", label: "People" },
  { key: "circles", label: "Circles" },
  { key: "posts", label: "Posts" },
  { key: "opportunities", label: "Opportunities" },
];

const EMPTY: SearchResponse = {
  users: [],
  circles: [],
  opportunities: [],
  posts: [],
  counts: { users: 0, circles: 0, opportunities: 0, posts: 0 },
};

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchShell>Loading search...</SearchShell>}>
      <SearchClient />
    </Suspense>
  );
}

function SearchClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { status } = useAuth();
  const [query, setQuery] = useState(params.get("q") || "");
  const [scope, setScope] = useState<Scope>(parseScope(params.get("scope")));
  const [results, setResults] = useState<SearchResponse>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/signin");
  }, [status, router]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (query.trim()) next.set("q", query.trim());
    if (scope !== "all") next.set("scope", scope);
    const target = next.toString();
    const current = window.location.search.replace(/^\?/, "");
    if (target !== current) {
      window.history.replaceState(window.history.state, "", target ? `/search?${target}` : "/search");
    }
  }, [query, scope]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const trimmed = query.trim();
    if (trimmed.length < 2 && scope === "all") {
      setResults(EMPTY);
      setError(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const next = await searchApi.search({
          q: trimmed,
          types: scopeTypes(scope),
          limit: 20,
        });
        if (!cancelled) setResults({ ...EMPTY, ...next, counts: { ...EMPTY.counts, ...next.counts } });
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Search failed.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, scope, status]);

  const total = results.counts.users + results.counts.circles + results.counts.posts + results.counts.opportunities;
  const people = useMemo(
    () => results.users.map((user) => userToMiniProfile(searchUserToApiUser(user))),
    [results.users]
  );
  const circles = useMemo(
    () => results.circles.map(circleToMiniProfile),
    [results.circles]
  );
  const posts = useMemo(
    () => results.posts.map(apiPostToUiPost),
    [results.posts]
  );

  return (
    <div className="min-h-screen bg-paper-warm">
      <TopBar />

      <main className="relative mx-auto max-w-[1200px] px-6 pb-16 pt-6">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-[11px] font-bold tracking-[0.2em] text-ink/45">SEARCH</p>
          <h1 className="mt-2 font-display text-[44px] font-semibold tracking-[-0.04em] md:text-[72px]">
            Find the circle
          </h1>
        </div>

        <div className="relative mx-auto mt-8 max-w-4xl rounded-[30px] border border-paper-line bg-paper p-2.5 shadow-soft">
          <div className="flex items-center gap-2">
            <Icon.Search size={20} className="ml-4 text-ink/60" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search people, circles, posts, opportunities..."
              className="h-12 flex-1 bg-transparent text-[18px] outline-none placeholder:text-ink/35"
              spellCheck={false}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="flex h-9 w-9 items-center justify-center rounded-full text-ink/60 transition hover:bg-paper-cool"
                aria-label="Clear search"
              >
                <Icon.Close size={14} />
              </button>
            )}
            {loading && (
              <span className="mr-3 h-5 w-5 rounded-full border-2 border-paper-line border-t-ink animate-spin" />
            )}
          </div>
        </div>

        <div className="mt-5 flex items-center gap-1 overflow-x-auto scroll-clean pb-1">
          {SCOPES.map((item) => {
            const active = scope === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setScope(item.key)}
                className={clsx(
                  "btn-press h-9 rounded-pill px-4 text-[12.5px] font-semibold whitespace-nowrap transition",
                  active
                    ? "bg-ink text-paper shadow-soft"
                    : "border border-paper-line bg-paper text-ink/65 hover:border-ink/30"
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="mt-5 text-[12px] text-ink/50">
          {error ? (
            <span className="text-red-700">{error}</span>
          ) : query.trim().length < 2 && scope === "all" ? (
            "Start typing to search the live database."
          ) : (
            `${total} result${total === 1 ? "" : "s"}`
          )}
        </div>

        <div className="mt-6 grid grid-cols-12 gap-5">
          {(scope === "all" || scope === "people") && (
            <ResultSection title="People" count={results.counts.users}>
              <div className="grid gap-3 md:grid-cols-2">
                {people.map((person) => (
                  <ProfileResult key={person.handle} profile={person} />
                ))}
              </div>
            </ResultSection>
          )}

          {(scope === "all" || scope === "circles") && (
            <ResultSection title="Circles" count={results.counts.circles}>
              <div className="grid gap-3 md:grid-cols-2">
                {circles.map((circle) => (
                  <ProfileResult key={circle.handle} profile={circle} />
                ))}
              </div>
            </ResultSection>
          )}

          {(scope === "all" || scope === "opportunities") && (
            <ResultSection title="Opportunities" count={results.counts.opportunities}>
              <div className="grid gap-3">
                {results.opportunities.map((opp) => (
                  <div key={opp._id} className="rounded-[18px] border border-paper-line bg-paper p-4">
                    <div className="text-[14px] font-semibold">{opp.title}</div>
                    <div className="mt-1 text-[12px] text-ink/55">
                      {[opp.company || opp.orgName, opp.type, [opp.city, opp.country].filter(Boolean).join(", ")]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                    {opp.description && <p className="mt-2 text-[12.5px] text-ink/65 line-clamp-2">{opp.description}</p>}
                  </div>
                ))}
              </div>
            </ResultSection>
          )}

          {(scope === "all" || scope === "posts") && (
            <ResultSection title="Posts" count={results.counts.posts}>
              <div className="space-y-4">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            </ResultSection>
          )}
        </div>
      </main>
    </div>
  );
}

function ResultSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="col-span-12 rounded-[24px] border border-paper-line bg-paper/70 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-bold tracking-[0.18em] text-ink/55 uppercase">{title}</h2>
        <span className="text-[11px] text-ink/40">{count}</span>
      </div>
      {count === 0 ? <div className="text-[13px] text-ink/45">No results.</div> : children}
    </section>
  );
}

function ProfileResult({ profile }: { profile: ReturnType<typeof userToMiniProfile> }) {
  return (
    <Link
      href={`/${profile.kind === "circle" ? "circle" : "user"}/${profile.handle}`}
      className="rounded-[18px] border border-paper-line bg-paper p-4 flex items-center gap-3 hover:border-ink/30 transition"
    >
      <Avatar size={44} hue={profile.hue ?? hueFromString(profile.handle)} kind={profile.kind} />
      <span className="min-w-0">
        <span className="block text-[14px] font-semibold truncate">{profile.name}</span>
        <span className="block text-[12px] text-ink/50 truncate">@{profile.handle} · {profile.location}</span>
        {profile.bio && <span className="block mt-1 text-[12px] text-ink/60 line-clamp-1">{profile.bio}</span>}
      </span>
    </Link>
  );
}

function SearchShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper-warm">
      <TopBar />
      <main className="max-w-[900px] mx-auto px-6 py-16 text-[14px] text-ink/60">
        {children}
      </main>
    </div>
  );
}

function parseScope(value: string | null): Scope {
  return SCOPES.some((scope) => scope.key === value) ? (value as Scope) : "all";
}

function scopeTypes(scope: Scope): SearchTypes[] | undefined {
  if (scope === "all") return undefined;
  if (scope === "people") return ["users"];
  return [scope];
}

function searchUserToApiUser(user: SearchResponse["users"][number]): ApiUser {
  return {
    _id: user._id,
    name: user.name,
    username: user.username || user._id,
    email: "",
    accountType: user.accountType || "personal",
    userType: "member",
    roles: ["member"],
    avatarUrl: user.avatarUrl,
    profilePhotoUrl: user.profilePhotoUrl,
    profilePictureUrl: user.profilePictureUrl,
    headline: user.headline,
    bio: user.headline,
    currentRegion: user.currentRegion,
    locationNow: user.locationNow,
    isMentor: user.isMentor,
  };
}
