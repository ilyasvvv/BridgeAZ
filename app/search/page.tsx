"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import clsx from "clsx";
import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { PostCard } from "@/components/PostCard";
import { TopBar } from "@/components/TopBar";
import { POSTS } from "@/data/mock";
import { useSmartSearch, type SearchScope } from "@/hooks/useSmartSearch";

const SCOPES: { key: SearchScope; label: string }[] = [
  { key: "all", label: "All" },
  { key: "people", label: "People" },
  { key: "circles", label: "Circles" },
  { key: "posts", label: "Posts" },
  { key: "events", label: "Events" },
  { key: "opportunities", label: "Opportunities" },
  { key: "tags", label: "Tags" },
];

const RECENT = ["#Novruz2026", "roommate berlin", "product mentor", "football berlin"];

function parseScope(value: string | null): SearchScope {
  if (!value) return "all";
  return SCOPES.some((scope) => scope.key === value) ? (value as SearchScope) : "all";
}

export default function SearchPage() {
  const [initialized, setInitialized] = useState(false);
  const {
    query,
    setQuery,
    setQueryImmediate,
    typeFilter,
    setTypeFilter,
    topicFilters,
    toggleTopic,
    results,
    counts,
    corrections,
    effectiveQuery,
    loading,
    recordClick,
    resetMemory,
    saveSearch,
    removeSavedSearch,
    savedSearches,
    topicOptions,
  } = useSmartSearch();

  const allTags = useMemo(
    () =>
      Array.from(new Set(POSTS.flatMap((post) => post.tags))).sort((left, right) =>
        left.localeCompare(right)
      ),
    []
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQueryImmediate(params.get("q") ?? "");
    setTypeFilter(parseScope(params.get("scope")));
    setInitialized(true);
  }, [setQueryImmediate, setTypeFilter]);

  useEffect(() => {
    if (!initialized) return;

    const next = new URLSearchParams(window.location.search);
    const trimmed = query.trim();

    if (trimmed) next.set("q", trimmed);
    else next.delete("q");

    if (typeFilter !== "all") next.set("scope", typeFilter);
    else next.delete("scope");

    const target = next.toString();
    const current = window.location.search.startsWith("?")
      ? window.location.search.slice(1)
      : window.location.search;

    if (target === current) return;

    window.history.replaceState(window.history.state, "", target ? `/search?${target}` : "/search");
  }, [initialized, query, typeFilter]);

  const hasInput = query.trim().length >= 2 || typeFilter !== "all" || topicFilters.size > 0;
  const generalPosts = results.posts.filter(
    (post) => post._type === "post" && post.category !== "Event" && post.category !== "Opportunity"
  );

  return (
    <div className="min-h-screen bg-paper-warm">
      <TopBar />

      <div
        aria-hidden
        className="pointer-events-none absolute -right-[22vw] top-[8vh] h-[60vw] w-[60vw] rounded-full border border-ink/[0.04]"
      />

      <main className="relative mx-auto max-w-[1200px] px-6 pb-16 pt-6">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-[11px] font-bold tracking-[0.2em] text-ink/45">SMART SEARCH</p>
          <h1 className="mt-2 font-display text-[44px] font-semibold tracking-[-0.04em] md:text-[72px]">
            Search with memory
          </h1>
        </div>

        <div className="relative mx-auto mt-8 max-w-4xl rounded-[30px] border border-paper-line bg-paper p-2.5 shadow-soft">
          <div className="flex items-center gap-2">
            <Icon.Search size={20} className="ml-4 text-ink/60" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search people, circles, posts, tags, or places..."
              className="h-12 flex-1 bg-transparent text-[18px] outline-none placeholder:text-ink/35"
              spellCheck={false}
            />
            {query && (
              <button
                onClick={() => setQueryImmediate("")}
                className="flex h-9 w-9 items-center justify-center rounded-full text-ink/60 transition hover:bg-paper-cool"
                aria-label="Clear search"
              >
                <Icon.Close size={14} />
              </button>
            )}
            {loading && (
              <span className="mr-1 h-5 w-5 rounded-full border-2 border-paper-line border-t-ink animate-spin" />
            )}
            <button
              onClick={() => saveSearch()}
              disabled={!query.trim()}
              className={clsx(
                "btn-press h-11 rounded-pill px-4 text-[12px] font-semibold transition",
                query.trim()
                  ? "bg-ink text-paper shadow-soft"
                  : "bg-paper-cool text-ink/35"
              )}
            >
              Save search
            </button>
          </div>
        </div>

        {corrections.length > 0 && (
          <div className="mt-3 text-center text-[13px] text-ink/55">
            Showing results for{" "}
            {corrections.map((correction, index) => (
              <span key={`${correction.raw}-${correction.to}`}>
                {index > 0 && ", "}
                <span className="line-through text-ink/35">{correction.raw}</span>
                {" -> "}
                <span className="font-semibold text-ink">{correction.to}</span>
              </span>
            ))}
          </div>
        )}

        <div className="mt-5 flex items-center gap-1 overflow-x-auto scroll-clean pb-1">
          {SCOPES.map((scope) => {
            const active = typeFilter === scope.key;
            return (
              <button
                key={scope.key}
                onClick={() => setTypeFilter(scope.key)}
                className={clsx(
                  "btn-press h-9 rounded-pill px-4 text-[12.5px] font-semibold whitespace-nowrap transition",
                  active
                    ? "bg-ink text-paper shadow-soft"
                    : "border border-paper-line bg-paper text-ink/65 hover:border-ink/30"
                )}
              >
                {scope.label}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {topicOptions.map((option) => {
            const active = topicFilters.has(option.id);
            return (
              <button
                key={option.id}
                onClick={() => toggleTopic(option.id)}
                className={clsx(
                  "btn-press h-8 rounded-pill border px-3.5 text-[11.5px] font-semibold transition",
                  active
                    ? "border-ink/30 bg-paper-cool text-ink"
                    : "border-paper-line bg-paper text-ink/50 hover:border-ink/30 hover:text-ink"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3 text-[12px] text-ink/50">
          <span>
            {hasInput
              ? `${counts.total} adaptive result${counts.total === 1 ? "" : "s"}`
              : "Start typing or pick a scope to search"}
          </span>
          <button
            onClick={resetMemory}
            className="font-semibold text-ink/45 transition hover:text-ink"
          >
            Reset memory
          </button>
          {effectiveQuery && (
            <span className="rounded-full bg-paper px-3 py-1 font-semibold text-ink/60">
              Interpreted as: {effectiveQuery}
            </span>
          )}
        </div>

        {!hasInput && (
          <div className="mt-8 grid grid-cols-12 gap-5">
            <section className="col-span-12 rounded-[22px] border border-paper-line bg-paper p-5 md:col-span-5">
              <h3 className="text-[11px] font-bold tracking-[0.18em] text-ink/55">
                RECENT SEARCHES
              </h3>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {RECENT.map((value) => (
                  <li key={value}>
                    <button
                      onClick={() => setQueryImmediate(value)}
                      className="btn-press h-8 rounded-pill bg-paper-cool px-3 text-[12px] font-semibold transition hover:bg-ink hover:text-paper"
                    >
                      {value}
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="relative col-span-12 overflow-hidden rounded-[22px] bg-ink p-5 text-paper md:col-span-7">
              <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full border border-paper/15" />
              <div className="absolute -bottom-16 -right-16 h-60 w-60 rounded-full border border-paper/10" />
              <h3 className="text-[11px] font-bold tracking-[0.18em] text-paper/55">
                SAVED SEARCHES
              </h3>
              {savedSearches.length === 0 ? (
                <p className="mt-3 max-w-md text-[13px] leading-snug text-paper/65">
                  Save a search and the app keeps it ready. The ranking engine also learns from what you open.
                </p>
              ) : (
                <ul className="mt-3 space-y-1.5">
                  {savedSearches.map((value) => (
                    <li
                      key={value}
                      className="flex h-9 items-center gap-2 rounded-pill bg-paper/10 px-3"
                    >
                      <Icon.Search size={12} className="text-paper/70" />
                      <button
                        onClick={() => setQueryImmediate(value)}
                        className="text-[12.5px] font-semibold"
                      >
                        {value}
                      </button>
                      <button
                        onClick={() => removeSavedSearch(value)}
                        className="ml-auto text-paper/60 transition hover:text-paper"
                        aria-label={`Remove ${value}`}
                      >
                        <Icon.Close size={12} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="col-span-12 rounded-[22px] border border-paper-line bg-paper p-5">
              <h3 className="text-[11px] font-bold tracking-[0.18em] text-ink/55">
                TRENDING TAGS
              </h3>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {allTags.map((tag) => (
                  <li key={tag}>
                    <button
                      onClick={() => {
                        setQueryImmediate(`#${tag}`);
                        setTypeFilter("tags");
                      }}
                      className="btn-press h-8 rounded-pill border border-paper-line px-3 text-[12px] font-semibold transition hover:border-ink/40"
                    >
                      #{tag}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}

        {hasInput && counts.total === 0 && !loading && (
          <div className="mt-10 py-16 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-ink/15">
              <Icon.Search size={28} className="text-ink/40" />
            </div>
            <h3 className="mt-5 font-display text-[20px] font-semibold">Nothing matches that search.</h3>
            <p className="mt-1.5 text-[13px] text-ink/55">
              Try broader wording, drop a topic chip, or reset the learned ranking.
            </p>
          </div>
        )}

        {hasInput && counts.total > 0 && (
          <div className="mt-6 space-y-5">
            {results.people.length > 0 && (
              <ResultSection title={`People (${results.people.length})`}>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {results.people.map((person, index) => (
                    <Link
                      key={person._id}
                      href={`/user/${person.handle}`}
                      onClick={() => recordClick(person._id)}
                      className="flex items-start gap-3 rounded-[18px] border border-paper-line bg-paper p-4 transition hover:border-ink/30 hover:shadow-soft"
                    >
                      <Avatar size={44} hue={40 + index * 60} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] font-semibold">{person.name}</div>
                        <div className="truncate text-[11.5px] text-ink/50">
                          @{person.handle} · {person.location}
                        </div>
                        <p className="mt-1 line-clamp-2 text-[12px] text-ink/65">{person.bio}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </ResultSection>
            )}

            {results.circles.length > 0 && (
              <ResultSection title={`Circles (${results.circles.length})`}>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {results.circles.map((circle, index) => (
                    <Link
                      key={circle._id}
                      href={`/circle/${circle.handle}`}
                      onClick={() => recordClick(circle._id)}
                      className="flex items-start gap-3 rounded-[18px] border border-paper-line bg-paper p-4 transition hover:border-ink/30 hover:shadow-soft"
                    >
                      <Avatar size={44} hue={180 + index * 40} kind="circle" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <div className="truncate text-[13.5px] font-semibold">{circle.name}</div>
                          <span className="shrink-0 rounded-full bg-paper-cool px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-ink/55">
                            Circle
                          </span>
                        </div>
                        <div className="truncate text-[11.5px] text-ink/50">
                          {circle.location} · {circle.stats[0]?.value} members
                        </div>
                        <p className="mt-1 line-clamp-2 text-[12px] text-ink/65">{circle.bio}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </ResultSection>
            )}

            {results.opportunities.length > 0 && (
              <ResultSection title={`Opportunities (${results.opportunities.length})`}>
                <div className="space-y-3">
                  {results.opportunities.map((post) => (
                    <div
                      key={post.id}
                      id={`result-${post.id}`}
                      onClickCapture={() => recordClick(`post:${post.id}`)}
                    >
                      <PostCard post={post} />
                    </div>
                  ))}
                </div>
              </ResultSection>
            )}

            {results.events.length > 0 && (
              <ResultSection title={`Events (${results.events.length})`}>
                <div className="space-y-3">
                  {results.events.map((post) => (
                    <div
                      key={post.id}
                      id={`result-${post.id}`}
                      onClickCapture={() => recordClick(`post:${post.id}`)}
                    >
                      <PostCard post={post} />
                    </div>
                  ))}
                </div>
              </ResultSection>
            )}

            {generalPosts.length > 0 && (
              <ResultSection title={`Posts (${generalPosts.length})`}>
                <div className="space-y-3">
                  {generalPosts.map((post) => (
                    <div
                      key={post.id}
                      id={`result-${post.id}`}
                      onClickCapture={() => recordClick(`post:${post.id}`)}
                    >
                      <PostCard post={post} />
                    </div>
                  ))}
                </div>
              </ResultSection>
            )}

            {results.tags.length > 0 && (
              <ResultSection title={`Tags (${results.tags.length})`}>
                <div className="flex flex-wrap gap-1.5">
                  {results.tags.map((tag) => (
                    <button
                      key={tag._id}
                      onClick={() => {
                        recordClick(tag._id);
                        setQueryImmediate(`#${tag.label}`);
                        setTypeFilter("tags");
                      }}
                      className="btn-press h-8 rounded-pill border border-paper-line px-3 text-[12px] font-semibold transition hover:border-ink/40"
                    >
                      #{tag.label}
                    </button>
                  ))}
                </div>
              </ResultSection>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function ResultSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-3 text-[11px] font-bold tracking-[0.18em] text-ink/55">
        {title.toUpperCase()}
      </h3>
      {children}
    </section>
  );
}
