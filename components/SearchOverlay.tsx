"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { Avatar } from "@/components/Avatar";
import { searchApi, type SearchResponse, type SearchTypes } from "@/lib/search";
import { apiPostToUiPost, circleToMiniProfile } from "@/lib/mappers";
import { hueFromString, profileHref } from "@/lib/format";

type Scope = "all" | "people" | "circles" | "posts" | "opportunities";

const TYPE_FILTERS: { id: Scope; label: string }[] = [
  { id: "all", label: "Everything" },
  { id: "people", label: "People" },
  { id: "circles", label: "Circles" },
  { id: "posts", label: "Posts" },
  { id: "opportunities", label: "Opportunities" },
];

const EMPTY: SearchResponse = {
  users: [],
  circles: [],
  opportunities: [],
  posts: [],
  counts: { users: 0, circles: 0, opportunities: 0, posts: 0 },
};

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
  const [query, setQuery] = useState(initialQuery);
  const [typeFilter, setTypeFilter] = useState<Scope>("all");
  const [results, setResults] = useState<SearchResponse>(EMPTY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !open) return;
    setQuery(initialQuery);
  }, [initialQuery, mounted, open]);

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
      if (event.key === "Escape") onClose(query);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mounted, onClose, open, query]);

  useEffect(() => {
    if (!open) {
      setResults(EMPTY);
      return;
    }
    const trimmed = query.trim();
    if (trimmed.length < 2 && typeFilter === "all") {
      setResults(EMPTY);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const next = await searchApi.search({
          q: trimmed,
          types: scopeTypes(typeFilter),
          limit: 6,
        });
        if (!cancelled) setResults({ ...EMPTY, ...next, counts: { ...EMPTY.counts, ...next.counts } });
      } catch {
        if (!cancelled) setResults(EMPTY);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, query, typeFilter]);

  const visibleResults = useMemo(() => {
    const people = results.users.map((user) => ({
      id: user._id,
      title: user.name,
      meta: `@${user.username || user._id} · ${user.currentRegion || user.locationNow?.country || "Member"}`,
      href: profileHref("user", user.username || user._id),
      kind: "Person",
      hue: hueFromString(user._id),
    }));
    const circles = results.circles.map((circle) => {
      const mini = circleToMiniProfile(circle);
      return {
        id: circle._id,
        title: circle.name,
        meta: `@${circle.handle} · ${mini.location}`,
        href: profileHref("circle", circle.handle),
        kind: "Circle",
        hue: mini.hue ?? hueFromString(circle._id),
      };
    });
    const posts = results.posts.map((post) => {
      const ui = apiPostToUiPost(post);
      return {
        id: post._id,
        title: ui.body.slice(0, 90) || "Post",
        meta: `${ui.author.name} · ${ui.time}`,
        href: `/home#post-${post._id}`,
        kind: "Post",
        hue: hueFromString(post._id),
      };
    });
    const opportunities = results.opportunities.map((opp) => ({
      id: opp._id,
      title: opp.title,
      meta: [opp.company || opp.orgName, opp.type, opp.country].filter(Boolean).join(" · "),
      href: `/search?q=${encodeURIComponent(opp.title)}&scope=opportunities`,
      kind: "Opportunity",
      hue: hueFromString(opp._id),
    }));
    return [...people, ...circles, ...posts, ...opportunities].slice(0, 8);
  }, [results]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      <div
        aria-hidden
        className="absolute inset-0 bg-paper/75 backdrop-blur-xl"
        onClick={() => onClose(query)}
      />

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
          <div className="text-center pt-10">
            <div className="inline-flex items-center gap-3 rounded-full border border-paper-line bg-paper px-4 py-2 shadow-soft">
              <span className="circle-stamp h-8 w-8 text-[11px] font-black">b</span>
              <span className="font-display text-[15px] font-semibold tracking-[-0.02em]">
                bizim circle
              </span>
            </div>
            <p className="mx-auto mt-6 max-w-md text-[14px] leading-relaxed text-ink/55">
              Search live people, circles, posts, and opportunities from the backend.
            </p>
          </div>

          <div className="relative mx-auto mt-10 max-w-2xl">
            <div className="relative rounded-full border border-paper-line bg-paper shadow-pop">
              <div className="flex items-center gap-3 rounded-full border border-paper-line/80 px-5 py-4">
                <Icon.Search size={18} className="shrink-0 text-ink/50" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    const params = new URLSearchParams();
                    if (query.trim()) params.set("q", query.trim());
                    if (typeFilter !== "all") params.set("scope", typeFilter);
                    onClose(query);
                    router.push(params.toString() ? `/search?${params.toString()}` : "/search");
                  }}
                  placeholder="What are you looking for?"
                  className="h-8 flex-1 bg-transparent text-[16px] outline-none placeholder:text-ink/35 md:text-[18px]"
                  spellCheck={false}
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
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
                        : "border border-paper-line bg-paper text-ink/60 hover:border-ink/30 hover:text-ink"
                    )}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 rounded-[26px] border border-paper-line bg-paper p-2 shadow-soft">
              {visibleResults.length === 0 ? (
                <div className="px-5 py-10 text-center text-[13px] text-ink/45">
                  {query.trim().length < 2 && typeFilter === "all"
                    ? "Type at least two characters to search."
                    : "No results found."}
                </div>
              ) : (
                <div className="space-y-1">
                  {visibleResults.map((item) => (
                    <Link
                      key={`${item.kind}-${item.id}`}
                      href={item.href}
                      onClick={() => onClose(query)}
                      className="group flex items-center gap-3 rounded-[20px] px-3 py-3 transition hover:bg-paper-cool"
                    >
                      <Avatar size={40} hue={item.hue} kind={item.kind === "Circle" ? "circle" : "personal"} />
                      <span className="min-w-0 flex-1 text-left">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[14px] font-semibold">{item.title}</span>
                          <span className="shrink-0 rounded-pill bg-paper-cool px-2 py-0.5 text-[10px] font-semibold text-ink/50 group-hover:bg-paper">
                            {item.kind}
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate text-[12px] text-ink/50">{item.meta}</span>
                      </span>
                      <Icon.Send size={14} className="text-ink/35" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function scopeTypes(scope: Scope): SearchTypes[] | undefined {
  if (scope === "all") return undefined;
  if (scope === "people") return ["users"];
  return [scope];
}
