"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/lib/auth";
import { searchApi, type SearchResponse, type SearchTypes } from "@/lib/search";
import { hueFromString, profileHref, relativeTime } from "@/lib/format";
import { emitPlayfulBurst } from "@/lib/playful";

type Scope = "all" | "people" | "circles" | "posts" | "opportunities";
type View = "stack" | "constellation" | "atlas";
type SearchMode = "page" | "overlay";

type UnifiedItem = {
  _id: string;
  _t: "person" | "circle" | "post" | "opportunity";
  _score: number;
  name: string;
  handle?: string;
  hue?: number;
  bio?: string;
  description?: string;
  body?: string;
  location?: string;
  role?: string;
  company?: string;
  members?: number;
  tags?: string[];
  category?: string;
  time?: string;
  href?: string;
  authorName?: string;
};

const SCOPES: { key: Scope; label: string }[] = [
  { key: "all", label: "Everything" },
  { key: "people", label: "People" },
  { key: "circles", label: "Circles" },
  { key: "posts", label: "Posts" },
  { key: "opportunities", label: "Opportunities" },
];

const TOPICS = [
  "berlin",
  "london",
  "remote",
  "founders",
  "newcomers",
  "students",
  "design",
  "engineering",
  "hiring",
  "free",
  "weekend",
];

const RECENT_SEARCHES = ["roommate berlin", "azerbaijani founders", "novruz", "design jobs", "weekend events"];

const EMPTY: SearchResponse = {
  users: [],
  circles: [],
  opportunities: [],
  posts: [],
  counts: { users: 0, circles: 0, opportunities: 0, posts: 0 },
};

function score(text: string[], q: string): number {
  if (!q) return Math.random() * 0.3 + 0.5;
  const Q = q.toLowerCase();
  let s = 0;
  text.filter(Boolean).forEach((raw, i) => {
    const f = String(raw).toLowerCase();
    if (f === Q) s += 100;
    else if (f.startsWith(Q)) s += 40 - i * 2;
    else if (f.includes(Q)) s += 20 - i * 1.5;
  });
  return Math.max(0, s);
}

function unifyResults(r: SearchResponse, q: string): UnifiedItem[] {
  const items: UnifiedItem[] = [];

  r.users.forEach((u) => {
    const handle = u.username || u._id;
    const loc = [u.locationNow?.city, u.locationNow?.country].filter(Boolean).join(", ") || u.currentRegion || "";
    items.push({
      _id: u._id,
      _t: "person",
      _score: score([u.name, handle, u.headline || "", loc], q),
      name: u.name,
      handle,
      hue: hueFromString(u._id || u.name || handle),
      bio: u.headline || "",
      role: u.experience?.[0]?.title || u.headline || "",
      company: u.experience?.[0]?.company || u.experience?.[0]?.org || "",
      location: loc,
      href: profileHref("user", handle),
    });
  });

  r.circles.forEach((c) => {
    const loc = [c.location?.city, c.location?.country].filter(Boolean).join(", ") || c.currentRegion || "";
    items.push({
      _id: c._id,
      _t: "circle",
      _score: score([c.name, c.handle, c.bio || "", loc], q),
      name: c.name,
      handle: c.handle,
      hue: hueFromString(c._id || c.handle),
      bio: c.bio || "",
      members: typeof c.memberCount === "number" ? c.memberCount : 0,
      location: loc,
      href: profileHref("circle", c.handle),
    });
  });

  r.opportunities.forEach((o) => {
    const loc = [o.city, o.country].filter(Boolean).join(", ");
    items.push({
      _id: o._id,
      _t: "opportunity",
      _score: score([o.title, o.company || "", o.orgName || "", o.description || "", loc], q),
      name: o.title,
      description: o.description || "",
      role: o.title,
      company: o.company || o.orgName,
      category: "Opportunity",
      tags: o.tags,
      location: loc,
    });
  });

  r.posts.forEach((p: any) => {
    const created = p.createdAt || p.created_at;
    items.push({
      _id: p._id,
      _t: "post",
      _score: score([p.body || "", p.author?.name || "", (p.tags || []).join(" ")], q),
      name: (p.body || "").slice(0, 80),
      body: p.body || "",
      tags: p.tags,
      category: p.category || "Note",
      authorName: p.author?.name,
      time: created ? relativeTime(created) : "",
      location: p.author?.currentRegion || "",
    });
  });

  return items.sort((a, b) => b._score - a._score);
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchShell>Loading search...</SearchShell>}>
      <SearchClient />
    </Suspense>
  );
}

export function SmartSearchOverlay({
  initialQuery,
  open,
  onClose,
}: {
  initialQuery: string;
  open: boolean;
  onClose: (value?: string) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const latestQueryRef = useRef(initialQuery);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) latestQueryRef.current = initialQuery;
  }, [initialQuery, open]);

  useEffect(() => {
    if (!mounted || !open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose(latestQueryRef.current);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mounted, onClose, open]);

  if (!mounted || !open) return null;

  const closeWithLatestQuery = () => onClose(latestQueryRef.current);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999]"
      role="dialog"
      aria-modal="true"
      aria-label="Smart search"
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-paper/80 backdrop-blur-xl"
        onClick={closeWithLatestQuery}
      />

      <div className="relative z-10 h-full overflow-y-auto scroll-clean">
        <button
          type="button"
          onClick={closeWithLatestQuery}
          aria-label="Close search"
          className="fixed right-4 top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-paper-line bg-paper text-ink/70 shadow-soft transition hover:border-ink/30 hover:text-ink md:right-8 md:top-8"
        >
          <Icon.Close size={16} />
        </button>

        <Suspense fallback={<SearchShell>Loading search...</SearchShell>}>
          <SearchClient
            mode="overlay"
            initialQuery={initialQuery}
            onClose={onClose}
            onQueryChange={(value) => {
              latestQueryRef.current = value;
            }}
          />
        </Suspense>
      </div>
    </div>,
    document.body
  );
}

function SearchClient({
  mode = "page",
  initialQuery,
  initialScope,
  onClose,
  onQueryChange,
}: {
  mode?: SearchMode;
  initialQuery?: string;
  initialScope?: Scope;
  onClose?: (value?: string) => void;
  onQueryChange?: (value: string) => void;
} = {}) {
  const router = useRouter();
  const params = useSearchParams();
  const { status } = useAuth();
  const [query, setQuery] = useState(initialQuery ?? params.get("q") ?? "");
  const [scope, setScope] = useState<Scope>(initialScope ?? parseScope(params.get("scope")));
  const [topics, setTopics] = useState<Set<string>>(new Set());
  const [view, setView] = useState<View>("stack");
  const [results, setResults] = useState<SearchResponse>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSearches, setSavedSearches] = useState<string[]>([]);

  useEffect(() => {
    if (mode === "page" && status === "unauthenticated") router.replace("/signin");
  }, [mode, status, router]);

  useEffect(() => {
    if (mode !== "overlay") return;
    setQuery(initialQuery ?? "");
    setScope(initialScope ?? "all");
    setTopics(new Set());
    setView("stack");
    setError(null);
  }, [initialQuery, initialScope, mode]);

  useEffect(() => {
    onQueryChange?.(query);
  }, [onQueryChange, query]);

  useEffect(() => {
    if (mode !== "page") return;
    const next = new URLSearchParams();
    if (query.trim()) next.set("q", query.trim());
    if (scope !== "all") next.set("scope", scope);
    const target = next.toString();
    const current = window.location.search.replace(/^\?/, "");
    if (target !== current) {
      window.history.replaceState(window.history.state, "", target ? `/search?${target}` : "/search");
    }
  }, [mode, query, scope]);

  const hasInput = query.trim().length >= 1 || scope !== "all" || topics.size > 0;

  useEffect(() => {
    if (status !== "authenticated") return;
    const trimmed = query.trim();
    if (!hasInput) {
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
          limit: 30,
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
  }, [query, scope, status, hasInput]);

  const unified = useMemo(() => unifyResults(results, query.trim()), [results, query]);

  const filtered = useMemo(() => {
    if (topics.size === 0) return unified;
    const lcTopics = [...topics].map((t) => t.toLowerCase());
    return unified.filter((item) => {
      const blob = [item.location, item.role, item.bio, item.description, item.body, ...(item.tags || [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return lcTopics.some((t) => blob.includes(t));
    });
  }, [unified, topics]);

  const toggleTopic = (t: string) =>
    setTopics((prev) => {
      const n = new Set(prev);
      if (n.has(t)) n.delete(t);
      else {
        n.add(t);
        emitPlayfulBurst(t);
      }
      return n;
    });

  const onSave = (event?: MouseEvent<HTMLButtonElement>) => {
    if (!query.trim()) return;
    setSavedSearches((s) => (s.includes(query.trim()) ? s : [query.trim(), ...s]));
    emitPlayfulBurst("saved", event?.clientX, event?.clientY);
  };

  const closeWithQuery = () => onClose?.(query);

  const submitSearch = () => {
    const next = new URLSearchParams();
    if (query.trim()) next.set("q", query.trim());
    if (scope !== "all") next.set("scope", scope);
    closeWithQuery();
    router.push(next.toString() ? `/search?${next.toString()}` : "/search");
  };

  return (
    <div className={clsx("bg-paper-warm relative overflow-x-hidden", mode === "overlay" ? "min-h-full" : "min-h-screen")}>
      <div
        aria-hidden
        className="pointer-events-none absolute -top-[20vw] -left-[18vw] w-[60vw] h-[60vw] rounded-full border"
        style={{ borderColor: "rgba(10,10,10,0.05)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-[40vh] left-1/3 w-[40vw] h-[40vw] rounded-full border"
        style={{ borderColor: "rgba(10,10,10,0.04)" }}
      />

      <main className="relative max-w-[1400px] mx-auto px-6 pt-6 pb-24">
        <SearchHero
          query={query}
          setQuery={setQuery}
          scope={scope}
          setScope={setScope}
          topics={topics}
          toggleTopic={toggleTopic}
          onSave={onSave}
          count={filtered.length}
          hasInput={hasInput}
          view={view}
          setView={setView}
          loading={loading}
          onSubmit={mode === "overlay" ? submitSearch : undefined}
        />

        {error && (
          <div className="mx-auto mt-6 max-w-3xl rounded-[14px] border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] text-red-700">
            {error}
          </div>
        )}

        {!hasInput ? (
          <DiscoveryPanel
            recent={RECENT_SEARCHES}
            saved={savedSearches}
            onQuery={setQuery}
          />
        ) : view === "constellation" ? (
          <ConstellationView results={filtered} onNavigate={mode === "overlay" ? closeWithQuery : undefined} />
        ) : view === "atlas" ? (
          <AtlasView results={filtered} onNavigate={mode === "overlay" ? closeWithQuery : undefined} />
        ) : (
          <StackView results={filtered} onNavigate={mode === "overlay" ? closeWithQuery : undefined} />
        )}
      </main>
    </div>
  );
}

function SearchHero({
  query,
  setQuery,
  scope,
  setScope,
  topics,
  toggleTopic,
  onSave,
  count,
  hasInput,
  view,
  setView,
  loading,
  onSubmit,
}: {
  query: string;
  setQuery: (v: string) => void;
  scope: Scope;
  setScope: (v: Scope) => void;
  topics: Set<string>;
  toggleTopic: (t: string) => void;
  onSave: () => void;
  count: number;
  hasInput: boolean;
  view: View;
  setView: (v: View) => void;
  loading: boolean;
  onSubmit?: () => void;
}) {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[18vw] -top-[8vw] h-[48vw] w-[48vw] rounded-full border"
        style={{ borderColor: "rgba(10,10,10,0.05)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[12vw] top-[2vw] h-[32vw] w-[32vw] rounded-full border"
        style={{ borderColor: "rgba(10,10,10,0.04)" }}
      />

      <div className={clsx("max-w-4xl mx-auto text-center transition-all", hasInput ? "pt-6" : "pt-12")}>
        <h1
          className={clsx(
            "font-display font-medium tracking-tight leading-[0.95] transition-all",
            hasInput ? "text-[38px]" : "text-[56px] md:text-[72px]"
          )}
        >
          {hasInput ? (
            <>
              Searching <span className="italic font-light text-ink/55">across</span> the circle
            </>
          ) : (
            <>
              Find your <span className="italic font-light">circle</span>
              <br />
              abroad.
            </>
          )}
        </h1>
      </div>

      <div className="relative mx-auto mt-8 max-w-3xl">
        <div
          aria-hidden
          className="absolute -inset-4 rounded-full"
          style={{
            background: "radial-gradient(circle at top, rgba(0,0,0,0.05), transparent 62%)",
            filter: "blur(28px)",
          }}
        />
        <div
          className="relative rounded-full border border-paper-line bg-paper"
          style={{ boxShadow: "0 2px 4px rgba(0,0,0,0.06), 0 24px 48px -12px rgba(0,0,0,0.18)" }}
        >
          <div className="flex items-center gap-3 rounded-full border border-paper-line/80 px-5 py-3.5">
            <Icon.Search size={18} className="shrink-0 text-ink/50" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                if (!onSubmit) return;
                event.preventDefault();
                onSubmit();
              }}
              placeholder="People, circles, posts, places"
              className="h-9 flex-1 bg-transparent text-[17px] outline-none placeholder:text-ink/35"
              spellCheck={false}
            />
            {loading && (
              <span className="h-5 w-5 rounded-full border-2 border-paper-line border-t-ink animate-spin" />
            )}
            {query && (
              <button
                onClick={() => setQuery("")}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-paper-cool text-ink/55 hover:text-ink"
                aria-label="Clear search"
              >
                <Icon.Close size={14} />
              </button>
            )}
            <button
              onClick={onSave}
              disabled={!query.trim()}
              className={clsx(
                "btn-press h-10 rounded-full px-4 text-[12px] font-semibold whitespace-nowrap transition",
                query.trim() ? "bg-ink text-paper" : "bg-paper-cool text-ink/35"
              )}
            >
              Save search
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-1.5 max-w-3xl mx-auto">
        {SCOPES.map((s) => {
          const active = scope === s.key;
          return (
            <button
              key={s.key}
              onClick={(event) => {
                setScope(s.key);
                if (s.key !== scope) emitPlayfulBurst(s.label, event.clientX, event.clientY);
              }}
              className={clsx(
                "btn-press h-9 rounded-full px-4 text-[12.5px] font-semibold whitespace-nowrap transition",
                active
                  ? "bg-ink text-paper shadow-soft"
                  : "border border-paper-line bg-paper text-ink/65 hover:border-ink/30"
              )}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-1.5 max-w-3xl mx-auto">
        {TOPICS.map((t) => {
          const active = topics.has(t);
          return (
            <button
              key={t}
              onClick={() => toggleTopic(t)}
              className={clsx(
                "btn-press h-7 rounded-full border px-3 text-[11px] font-semibold transition",
                active
                  ? "border-ink/30 bg-paper-cool text-ink"
                  : "border-paper-line bg-paper text-ink/50 hover:border-ink/30 hover:text-ink"
              )}
            >
              {t}
            </button>
          );
        })}
      </div>

      {hasInput && (
        <div className="mt-7 max-w-5xl mx-auto flex items-center justify-between gap-4 px-1 flex-wrap">
          <div className="font-display text-[22px] font-semibold tracking-tight whitespace-nowrap">
            {count} result{count === 1 ? "" : "s"}
          </div>
          <ViewSwitcher view={view} setView={setView} />
        </div>
      )}
    </div>
  );
}

function ViewSwitcher({ view, setView }: { view: View; setView: (v: View) => void }) {
  const VIEWS: { key: View; label: string; icon: React.ReactNode }[] = [
    { key: "stack", label: "Stack", icon: <LayersGlyph /> },
    { key: "constellation", label: "Constellation", icon: <SparkleGlyph /> },
    { key: "atlas", label: "Atlas", icon: <Icon.Pin size={12} /> },
  ];
  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-full bg-paper-cool border border-paper-line">
      {VIEWS.map((v) => {
        const active = view === v.key;
        return (
          <button
            key={v.key}
            onClick={(event) => {
              setView(v.key);
              emitPlayfulBurst(v.label, event.clientX, event.clientY);
            }}
            className={clsx(
              "btn-press inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11.5px] font-semibold transition",
              active ? "bg-ink text-paper" : "text-ink/65 hover:text-ink"
            )}
          >
            {v.icon}
            {v.label}
          </button>
        );
      })}
    </div>
  );
}

function LayersGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function SparkleGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
    </svg>
  );
}

function ResultMark({ item, size = 44 }: { item: UnifiedItem; size?: number }) {
  if (item._t === "person" || item._t === "circle") {
    return <Avatar size={size} hue={item.hue ?? 200} kind={item._t === "circle" ? "circle" : "personal"} />;
  }
  const I =
    item.category === "Event"
      ? Icon.Calendar
      : item.category === "Opportunity" || item._t === "opportunity"
      ? Icon.Briefcase
      : item.category === "Announcement"
      ? Icon.Mic
      : Icon.Note;
  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-paper-cool text-ink/70"
      style={{ width: size, height: size }}
    >
      <I size={size * 0.42} />
    </span>
  );
}

function CategoryPill({ item }: { item: UnifiedItem }) {
  if (item._t === "circle")
    return (
      <span className="text-[9.5px] font-bold tracking-[0.14em] text-ink/55 uppercase bg-paper-cool px-1.5 py-0.5 rounded-full">
        CIRCLE
      </span>
    );
  if (item._t === "person")
    return (
      <span className="text-[9.5px] font-bold tracking-[0.14em] text-ink/55 uppercase bg-paper-cool px-1.5 py-0.5 rounded-full">
        PERSON
      </span>
    );
  if (item._t === "opportunity")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-ink/5 border border-ink/20 text-ink">
        <Icon.Briefcase size={11} />
        Opportunity
      </span>
    );
  const cat = item.category || "Note";
  const map: Record<string, [string, any]> = {
    Event: ["bg-ink/5 border border-ink/20 text-ink", Icon.Calendar],
    Opportunity: ["bg-ink/5 border border-ink/20 text-ink", Icon.Briefcase],
    Announcement: ["bg-ink text-paper", Icon.Mic],
    Note: ["bg-paper-cool text-ink/70", Icon.Note],
  };
  const [cls, I] = map[cat] || map.Note;
  return (
    <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold", cls)}>
      <I size={11} />
      {cat}
    </span>
  );
}

function ItemLink({
  item,
  className,
  children,
  onNavigate,
}: {
  item: UnifiedItem;
  className?: string;
  children: React.ReactNode;
  onNavigate?: () => void;
}) {
  if (item.href) {
    return (
      <Link href={item.href} className={className} onClick={onNavigate}>
        {children}
      </Link>
    );
  }
  return <div className={className}>{children}</div>;
}

function ArrowGlyph({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="13 6 19 12 13 18" />
    </svg>
  );
}

function StackView({ results, onNavigate }: { results: UnifiedItem[]; onNavigate?: () => void }) {
  if (results.length === 0) return <EmptyMatch />;
  return (
    <div className="max-w-5xl mx-auto mt-6 space-y-3">
      {results.map((r) => (
        <ItemLink
          key={`${r._t}-${r._id}`}
          item={r}
          onNavigate={onNavigate}
          className="group block w-full text-left rounded-[22px] border border-paper-line bg-paper p-4 transition hover:border-ink/30 hover:shadow-soft relative overflow-hidden"
        >
          <span
            className="absolute left-0 top-0 bottom-0 w-[3px] bg-ink"
            style={{ opacity: Math.max(0.05, Math.min(1, r._score / 80)) }}
          />
          <div className="flex items-start gap-3.5 pl-1">
            <ResultMark item={r} size={46} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span className="text-[14.5px] font-semibold tracking-tight truncate max-w-full">
                  {r.name || "—"}
                </span>
                <CategoryPill item={r} />
              </div>
              <div className="flex items-center gap-1.5 text-[11.5px] text-ink/50 mt-0.5 flex-wrap">
                {r._t === "person" && r.role && (
                  <span>
                    {r.role}
                    {r.company ? ` at ${r.company}` : ""}
                  </span>
                )}
                {r._t === "circle" && typeof r.members === "number" && (
                  <span>{r.members.toLocaleString()} members</span>
                )}
                {r.location && (
                  <>
                    {(r._t === "person" || r._t === "circle") && r.role && <span>·</span>}
                    <span className="inline-flex items-center gap-0.5">
                      <Icon.Pin size={10} />
                      {r.location}
                    </span>
                  </>
                )}
                {r.handle && (
                  <>
                    <span>·</span>
                    <span>@{r.handle}</span>
                  </>
                )}
                {r._t === "post" && r.time && (
                  <>
                    <span>·</span>
                    <span>{r.time}</span>
                    {r.authorName && (
                      <>
                        <span>·</span>
                        <span>by {r.authorName}</span>
                      </>
                    )}
                  </>
                )}
                {r._t === "opportunity" && r.company && (
                  <>
                    <span>·</span>
                    <span>{r.company}</span>
                  </>
                )}
              </div>
              {(r.bio || r.description || r.body) && (
                <p className="mt-2 text-[13px] leading-relaxed text-ink/70 line-clamp-2">
                  {r.bio || r.description || r.body}
                </p>
              )}
              {r.tags && r.tags.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {r.tags.slice(0, 4).map((t) => (
                    <span key={t} className="text-[10.5px] text-ink/50 font-semibold">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition self-center">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-ink text-paper">
                <ArrowGlyph size={12} />
              </span>
            </div>
          </div>
        </ItemLink>
      ))}
    </div>
  );
}

function ConstellationView({ results, onNavigate }: { results: UnifiedItem[]; onNavigate?: () => void }) {
  if (results.length === 0) return <EmptyMatch />;
  const top = results.slice(0, 14);
  const maxScore = Math.max(...top.map((r) => r._score || 1), 1);
  const W = 920;
  const H = 620;
  const cx = W / 2;
  const cy = H / 2;
  const maxR = 280;
  const minR = 70;

  const placed = top.map((r, i) => {
    const norm = (r._score || 0) / maxScore;
    const radius = minR + (1 - norm) * (maxR - minR);
    const angle = (i / top.length) * Math.PI * 2 + (i % 2 ? 0.2 : -0.18) + i * 0.07;
    return { ...r, x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
  });

  return (
    <div className="max-w-5xl mx-auto mt-6">
      <div className="rounded-[26px] border border-paper-line bg-paper overflow-hidden relative" style={{ height: H }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" className="absolute inset-0">
          {[100, 170, 240, 300].map((r) => (
            <circle key={r} cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,0,0,0.06)" />
          ))}
          {placed.map((p, i) => (
            <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(0,0,0,0.04)" />
          ))}
        </svg>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <span className="w-2.5 h-2.5 rounded-full bg-ink" />
          <span className="mt-2 text-[9.5px] font-bold tracking-[0.22em] text-ink/55">YOU</span>
        </div>

        {placed.map((p) => {
          const sz = p._t === "person" || p._t === "circle" ? 56 : 50;
          return (
            <ItemLink
              key={`${p._t}-${p._id}`}
              item={p}
              onNavigate={onNavigate}
              className="absolute group"
            >
              <span style={{ position: "absolute", left: p.x, top: p.y, transform: "translate(-50%, -50%)" }} className="flex flex-col items-center gap-1.5">
                <span className="relative">
                  <ResultMark item={p} size={sz} />
                  <span className="absolute -inset-1.5 rounded-full border border-ink/25 opacity-0 group-hover:opacity-100 transition" />
                </span>
                <span
                  className="bg-paper border border-paper-line rounded-full px-2.5 h-6 flex items-center text-[10.5px] font-semibold max-w-[160px]"
                  style={{ boxShadow: "0 4px 12px -4px rgba(0,0,0,0.1)" }}
                >
                  <span className="truncate">{p.name || "—"}</span>
                </span>
              </span>
            </ItemLink>
          );
        })}

        <div className="absolute bottom-4 left-4 flex items-center gap-3 text-[10.5px] text-ink/50 font-semibold tracking-[0.06em]">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-ink" />
            closer = better match
          </span>
        </div>
        <div className="absolute bottom-4 right-4 text-[10.5px] text-ink/50 font-semibold tracking-[0.06em]">
          {placed.length} of {results.length} shown
        </div>
      </div>
    </div>
  );
}

function AtlasView({ results, onNavigate }: { results: UnifiedItem[]; onNavigate?: () => void }) {
  if (results.length === 0) return <EmptyMatch />;
  const groups = useMemo(() => {
    const map = new Map<string, UnifiedItem[]>();
    results.forEach((r) => {
      const loc = r.location || "Unknown";
      if (!map.has(loc)) map.set(loc, []);
      map.get(loc)!.push(r);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [results]);

  return (
    <div className="max-w-5xl mx-auto mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {groups.map(([loc, items]) => (
        <div key={loc} className="rounded-[22px] border border-paper-line bg-paper p-5 relative overflow-hidden">
          <div
            aria-hidden
            className="absolute -bottom-12 -right-12 w-36 h-36 rounded-full border"
            style={{ borderColor: "rgba(10,10,10,0.06)" }}
          />
          <div
            aria-hidden
            className="absolute -bottom-20 -right-20 w-52 h-52 rounded-full border"
            style={{ borderColor: "rgba(10,10,10,0.04)" }}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon.Pin size={13} className="text-ink/55" />
              <h3 className="font-display text-[16px] font-semibold tracking-[-0.01em]">{loc}</h3>
            </div>
            <span className="text-[10.5px] font-bold tracking-[0.16em] text-ink/45">{items.length} HITS</span>
          </div>
          <div className="mt-4 space-y-2 relative">
            {items.slice(0, 5).map((r) => (
              <ItemLink
                key={`${r._t}-${r._id}`}
                item={r}
                onNavigate={onNavigate}
                className="w-full text-left flex items-center gap-2.5 p-2 -mx-2 rounded-[14px] hover:bg-paper-cool transition"
              >
                <ResultMark item={r} size={32} />
                <span className="min-w-0 flex-1 block">
                  <span className="block text-[12.5px] font-semibold truncate">{r.name || "—"}</span>
                  <span className="block text-[10.5px] text-ink/50 truncate">
                    {r._t === "person" && r.role}
                    {r._t === "circle" && typeof r.members === "number" && `${r.members.toLocaleString()} members`}
                    {r._t === "post" && `${r.category || "Note"}${r.time ? ` · ${r.time}` : ""}`}
                    {r._t === "opportunity" && (r.company || "Opportunity")}
                  </span>
                </span>
                <ArrowGlyph size={11} />
              </ItemLink>
            ))}
            {items.length > 5 && (
              <div className="text-[11px] text-ink/45 font-semibold pt-1">+ {items.length - 5} more here</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyMatch() {
  return (
    <div className="max-w-2xl mx-auto mt-12 py-12 text-center">
      <div className="mx-auto inline-flex h-[140px] w-[140px] items-center justify-center rounded-full border border-paper-line">
        <Icon.Search size={36} className="text-ink/35" />
      </div>
      <h3 className="mt-6 font-display text-[22px] font-semibold tracking-[-0.02em]">
        Nothing matches that search.
      </h3>
    </div>
  );
}

function DiscoveryPanel({
  recent,
  saved,
  onQuery,
}: {
  recent: string[];
  saved: string[];
  onQuery: (q: string) => void;
}) {
  return (
    <div className="max-w-5xl mx-auto mt-10 grid grid-cols-12 gap-5">
      <section className="col-span-12 md:col-span-5 rounded-[22px] border border-paper-line bg-paper p-5">
        <h3 className="text-[10.5px] font-bold tracking-[0.18em] text-ink/55">RECENT SEARCHES</h3>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {recent.map((v) => (
            <li key={v}>
              <button
                onClick={() => onQuery(v)}
                className="btn-press h-8 rounded-full bg-paper-cool px-3 text-[12px] font-semibold transition hover:bg-ink hover:text-paper"
              >
                {v}
              </button>
            </li>
          ))}
        </ul>

        <h3 className="mt-6 text-[10.5px] font-bold tracking-[0.18em] text-ink/55">TRENDING TAGS</h3>
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {["berlin", "novruz2026", "founders", "newcomers", "design", "engineering", "hiring", "weekend"].map((t) => (
            <li key={t}>
              <button
                onClick={() => onQuery(`#${t}`)}
                className="btn-press h-8 rounded-full border border-paper-line px-3 text-[12px] font-semibold transition hover:border-ink/40"
              >
                #{t}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="relative col-span-12 md:col-span-7 overflow-hidden rounded-[22px] bg-ink p-5 text-paper">
        <div
          aria-hidden
          className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full border animate-spin-slower"
          style={{ borderColor: "rgba(255,255,255,0.15)" }}
        />
        <div
          aria-hidden
          className="absolute -bottom-16 -right-16 h-60 w-60 rounded-full border"
          style={{ borderColor: "rgba(255,255,255,0.1)" }}
        />
        <h3 className="text-[10.5px] font-bold tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.55)" }}>
          SAVED SEARCHES
        </h3>
        <ul className="mt-3 space-y-1.5 relative">
          {(saved.length > 0 ? saved : ["roommate berlin", "azerbaijani founders"]).map((v) => (
            <li
              key={v}
              className="flex h-9 items-center gap-2 rounded-full px-3"
              style={{ background: "rgba(255,255,255,0.1)" }}
            >
              <Icon.Search size={12} style={{ color: "rgba(255,255,255,0.7)" }} />
              <button onClick={() => onQuery(v)} className="text-[12.5px] font-semibold flex-1 text-left">
                {v}
              </button>
              <span
                className="text-[10px] font-semibold tracking-[0.14em]"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                LIVE
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function SearchShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper-warm">
      <main className="max-w-[900px] mx-auto px-6 py-16 text-[14px] text-ink/60">{children}</main>
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
