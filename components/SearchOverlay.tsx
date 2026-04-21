"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { useSmartSearch, type SearchItem, type SearchScope } from "@/hooks/useSmartSearch";

const TYPE_FILTERS: { id: SearchScope; label: string }[] = [
  { id: "all", label: "Everything" },
  { id: "people", label: "People" },
  { id: "circles", label: "Circles" },
  { id: "posts", label: "Posts" },
  { id: "opportunities", label: "Opportunities" },
  { id: "events", label: "Events" },
];

const QUICK_QUERIES = [
  "product mentor",
  "roommate berlin",
  "novruz berlin",
  "remote design",
];

function typeLabel(item: SearchItem) {
  switch (item._type) {
    case "person":
      return "Person";
    case "circle":
      return "Circle";
    case "event":
      return "Event";
    case "opportunity":
      return "Opportunity";
    case "tag":
      return "Tag";
    default:
      return "Post";
  }
}

function titleFor(item: SearchItem) {
  switch (item._type) {
    case "person":
    case "circle":
      return item.name;
    case "tag":
      return `#${item.label}`;
    case "event":
      return item.eventMeta?.date ?? item.body;
    case "opportunity":
      return item.opportunityMeta?.role ?? item.body;
    default:
      return item.body;
  }
}

function metaFor(item: SearchItem) {
  switch (item._type) {
    case "person":
    case "circle":
      return `${item.location} · @${item.handle}`;
    case "tag":
      return `${item.count} related post${item.count === 1 ? "" : "s"}`;
    case "event":
      return `${item.location} · ${item.author.name}`;
    case "opportunity":
      return `${item.location} · ${item.opportunityMeta?.type ?? item.author.name}`;
    default:
      return `${item.location} · ${item.author.name}`;
  }
}

function snippetFor(item: SearchItem) {
  switch (item._type) {
    case "person":
    case "circle":
      return item.bio;
    case "tag":
      return "Jump into the dedicated search page to explore matching people, circles, and posts.";
    default:
      return item.body;
  }
}

function hrefFor(item: SearchItem, query: string) {
  if (item._type === "person") return `/user/${item.handle}`;
  if (item._type === "circle") return `/circle/${item.handle}`;
  if (item._type === "tag") return `/search?q=%23${encodeURIComponent(item.label)}&scope=tags`;

  const params = new URLSearchParams();
  const seed = query.trim() || item.body.slice(0, 48);
  if (seed) params.set("q", seed);
  params.set(
    "scope",
    item._type === "event"
      ? "events"
      : item._type === "opportunity"
        ? "opportunities"
        : "posts"
  );

  return `/search?${params.toString()}#result-${item.id}`;
}

export function SearchOverlay({
  initialQuery,
  open,
  onClose,
}: {
  initialQuery: string;
  open: boolean;
  onClose: (value?: string) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [mounted, setMounted] = useState(false);
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
    clear,
    topicOptions,
  } = useSmartSearch();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !open) return;
    setQueryImmediate(initialQuery);
  }, [initialQuery, mounted, open, setQueryImmediate]);

  useEffect(() => {
    if (!mounted || !open) return;

    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => inputRef.current?.focus(), 60);

    return () => {
      document.body.style.overflow = "";
      window.clearTimeout(timer);
    };
  }, [mounted, open]);

  useEffect(() => {
    if (!mounted || !open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose(query);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mounted, onClose, open, query]);

  useEffect(() => {
    if (open) return;
    clear();
  }, [clear, open]);

  const hasInput = query.trim().length >= 2 || typeFilter !== "all" || topicFilters.size > 0;
  const visibleResults = useMemo(() => results.all.slice(0, 8), [results.all]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      <div
        aria-hidden
        className="absolute inset-0 bg-paper/75 backdrop-blur-xl"
        onClick={() => onClose(query)}
      />

      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full border border-ink/10" />
        <div className="absolute -left-10 top-16 h-52 w-52 rounded-full border border-ink/8" />
        <div className="absolute -bottom-28 -right-20 h-96 w-96 rounded-full border border-ink/10" />
        <div className="absolute -bottom-8 right-14 h-60 w-60 rounded-full border border-ink/8" />
      </div>

      <button
        type="button"
        onClick={() => onClose(query)}
        aria-label="Close search"
        className="absolute right-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-paper-line bg-paper text-ink/70 shadow-soft transition hover:border-ink/30 hover:text-ink md:right-8 md:top-8"
      >
        <Icon.Close size={16} />
      </button>

      <div className="relative z-10 h-full overflow-y-auto scroll-clean px-4 py-14 md:px-8 md:py-16">
        <div className="mx-auto max-w-4xl">
          <div className={clsx("text-center transition-all", hasInput ? "pt-2" : "pt-10 md:pt-20")}>
            <div className="inline-flex items-center gap-3 rounded-full border border-paper-line bg-paper px-4 py-2 shadow-soft">
              <span className="circle-stamp h-8 w-8 text-[11px] font-black">b</span>
              <span className="font-display text-[15px] font-semibold tracking-[-0.02em]">
                bizim circle
              </span>
            </div>
            {!hasInput && (
              <p className="mx-auto mt-6 max-w-md text-[14px] leading-relaxed text-ink/55">
                Search people, circles, opportunities, events, and tags with typo tolerance and adaptive ranking.
              </p>
            )}
          </div>

          <div className={clsx("relative mx-auto transition-all", hasInput ? "mt-8 max-w-3xl" : "mt-10 max-w-2xl")}>
            <div
              aria-hidden
              className="absolute -inset-5 rounded-full bg-[radial-gradient(circle_at_top,_rgba(0,0,0,0.05),_transparent_62%)] blur-2xl"
            />
            <div className="relative rounded-full border border-paper-line bg-paper shadow-pop">
              <div className="flex items-center gap-3 rounded-full border border-paper-line/80 px-5 py-4">
                <Icon.Search size={18} className="shrink-0 text-ink/50" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="What are you looking for?"
                  className="h-8 flex-1 bg-transparent text-[16px] outline-none placeholder:text-ink/35 md:text-[18px]"
                  spellCheck={false}
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQueryImmediate("")}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-paper-cool text-ink/55 transition hover:text-ink"
                    aria-label="Clear query"
                  >
                    <Icon.Close size={14} />
                  </button>
                )}
                {loading && (
                  <span className="h-5 w-5 rounded-full border-2 border-paper-line border-t-ink animate-spin" />
                )}
              </div>
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

          <div className="mx-auto mt-8 max-w-3xl">
            <div className="flex flex-wrap justify-center gap-2">
              {TYPE_FILTERS.map((filter) => {
                const active = typeFilter === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setTypeFilter(filter.id)}
                    className={clsx(
                      "btn-press h-9 rounded-pill px-4 text-[12.5px] font-semibold transition",
                      active
                        ? "bg-ink text-paper shadow-soft"
                        : "border border-paper-line bg-paper text-ink/65 hover:border-ink/30"
                    )}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {topicOptions.slice(0, 8).map((option) => {
                const active = topicFilters.has(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
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
          </div>

          {!hasInput && (
            <div className="mx-auto mt-14 max-w-xl text-center">
              <p className="text-[11px] font-bold tracking-[0.18em] text-ink/45">
                QUICK STARTS
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {QUICK_QUERIES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setQueryImmediate(value)}
                    className="btn-press h-9 rounded-pill border border-paper-line bg-paper px-4 text-[12px] font-semibold text-ink/65 transition hover:border-ink/30 hover:text-ink"
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          )}

          {hasInput && (
            <div className="mx-auto mt-12 max-w-3xl">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold tracking-[0.18em] text-ink/45">
                    ADAPTIVE RANKING
                  </p>
                  <h2 className="mt-1 font-display text-[28px] font-semibold tracking-[-0.03em]">
                    {loading ? "Searching..." : `${counts.total} result${counts.total === 1 ? "" : "s"}`}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={resetMemory}
                  className="text-[12px] font-semibold text-ink/45 transition hover:text-ink"
                >
                  Reset memory
                </button>
              </div>

              {!loading && counts.total === 0 && (
                <div className="rounded-[28px] border border-paper-line bg-paper px-8 py-14 text-center shadow-soft">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-ink/15">
                    <Icon.Search size={24} className="text-ink/35" />
                  </div>
                  <p className="mt-5 font-semibold">No matches found</p>
                  <p className="mt-1 text-[13px] text-ink/55">
                    Try broader wording, or remove a topic filter.
                  </p>
                </div>
              )}

              {counts.total > 0 && (
                <div className="space-y-2">
                  {visibleResults.map((item) => (
                    <button
                      key={item._id}
                      type="button"
                      onClick={() => {
                        recordClick(item._id);
                        router.push(hrefFor(item, effectiveQuery || query));
                        onClose(effectiveQuery || query);
                      }}
                      className="w-full rounded-[24px] border border-paper-line bg-paper p-4 text-left shadow-soft transition hover:border-ink/30 hover:shadow-pop"
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-paper-cool text-ink/70">
                          {item._type === "tag" ? <span className="text-[14px] font-semibold">#</span> : <Icon.Search size={16} />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-[14px] font-semibold">{titleFor(item)}</span>
                            <span className="rounded-full bg-paper-cool px-2 py-0.5 text-[10px] font-bold tracking-[0.14em] text-ink/45">
                              {typeLabel(item).toUpperCase()}
                            </span>
                          </div>
                          <p className="mt-1 text-[12px] text-ink/45">{metaFor(item)}</p>
                          <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-ink/72">
                            {snippetFor(item)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-5 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    const params = new URLSearchParams();
                    const nextQuery = (effectiveQuery || query).trim();
                    if (nextQuery) params.set("q", nextQuery);
                    if (typeFilter !== "all") params.set("scope", typeFilter);
                    router.push(params.toString() ? `/search?${params.toString()}` : "/search");
                    onClose(nextQuery);
                  }}
                  className="btn-press inline-flex h-11 items-center gap-2 rounded-pill bg-ink px-5 text-[12.5px] font-semibold text-paper shadow-soft"
                >
                  Open full search
                  <Icon.Search size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
