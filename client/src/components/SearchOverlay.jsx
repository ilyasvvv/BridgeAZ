import { createPortal } from "react-dom";
import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSearch } from "../utils/SearchContext";
import useGlobalSearch from "../utils/useGlobalSearch";
import CountryMultiSelect from "./CountryMultiSelect";

const TYPE_TABS = [
  { key: "all", label: "All" },
  { key: "users", label: "People" },
  { key: "opportunities", label: "Opportunities" },
  { key: "posts", label: "Posts" },
];

function SearchIcon({ className }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function PersonResult({ user, focused, onClick }) {
  const avatar = user.avatarUrl || user.profilePhotoUrl || user.profilePictureUrl;
  const location = user.locationNow?.country || user.currentRegion || "";
  const edu = Array.isArray(user.education) && user.education[0]?.institution;
  const exp = Array.isArray(user.experience) && (user.experience[0]?.company || user.experience[0]?.org);
  const sub = [edu, exp, location].filter(Boolean).join(" · ");

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
        focused ? "bg-accent/8" : "hover:bg-charcoal"
      }`}
    >
      {avatar ? (
        <img src={avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
      ) : (
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-charcoal text-sm font-medium text-mist">
          {user.name?.[0]?.toUpperCase() || "?"}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-sand">{user.name}</p>
        {(user.headline || sub) && (
          <p className="truncate text-xs text-mist">{user.headline || sub}</p>
        )}
      </div>
      {user.userType && (
        <span className="rounded-full bg-charcoal px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-mist">
          {user.userType}
        </span>
      )}
    </button>
  );
}

function OpportunityResult({ opp, focused, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
        focused ? "bg-accent/8" : "hover:bg-charcoal"
      }`}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal/10 text-teal">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-sand">{opp.title}</p>
        <p className="truncate text-xs text-mist">
          {[opp.orgName || opp.company, opp.country, opp.type].filter(Boolean).join(" · ")}
        </p>
      </div>
    </button>
  );
}

function PostResult({ post, focused, onClick }) {
  const author = post.author;
  const avatar = author?.avatarUrl || author?.profilePhotoUrl || author?.profilePictureUrl;
  const preview = post.content?.length > 100 ? post.content.slice(0, 100) + "..." : post.content;

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
        focused ? "bg-accent/8" : "hover:bg-charcoal"
      }`}
    >
      {avatar ? (
        <img src={avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
      ) : (
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-charcoal text-sm font-medium text-mist">
          {author?.name?.[0]?.toUpperCase() || "?"}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-sand">{author?.name || "Unknown"}</p>
        <p className="truncate text-xs text-mist">{preview}</p>
      </div>
    </button>
  );
}

function SectionHeader({ label, count }) {
  return (
    <div className="px-3 pb-1 pt-3">
      <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-mist/50">
        {label}
        {count > 0 && <span className="ml-1.5 text-mist/30">({count})</span>}
      </span>
    </div>
  );
}

export default function SearchOverlay() {
  const { isOpen, close } = useSearch();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const { query, setQuery, countries, setCountries, results, counts, loading, clear } = useGlobalSearch();
  const [activeTab, setActiveTab] = useState("all");
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Build flat list of results for keyboard navigation
  const flatItems = [];
  if (activeTab === "all" || activeTab === "users") {
    results.users.forEach((u) => flatItems.push({ type: "user", data: u }));
  }
  if (activeTab === "all" || activeTab === "opportunities") {
    results.opportunities.forEach((o) => flatItems.push({ type: "opportunity", data: o }));
  }
  if (activeTab === "all" || activeTab === "posts") {
    results.posts.forEach((p) => flatItems.push({ type: "post", data: p }));
  }

  const navigateTo = useCallback(
    (item) => {
      if (item.type === "user") navigate(`/profile/${item.data._id}`);
      else if (item.type === "opportunity") navigate(`/opportunities/${item.data._id}`);
      else if (item.type === "post") navigate(`/post/${item.data._id}`);
      close();
      clear();
    },
    [navigate, close, clear]
  );

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setFocusedIndex(-1);
    } else {
      clear();
      setActiveTab("all");
    }
  }, [isOpen, clear]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [isOpen]);

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      close();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((p) => (p + 1 >= flatItems.length ? 0 : p + 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((p) => (p <= 0 ? flatItems.length - 1 : p - 1));
      return;
    }
    if (e.key === "Enter" && focusedIndex >= 0 && flatItems[focusedIndex]) {
      e.preventDefault();
      navigateTo(flatItems[focusedIndex]);
    }
  };

  // Reset focus index when results change
  useEffect(() => {
    setFocusedIndex(-1);
  }, [results]);

  if (!isOpen) return null;

  const hasQuery = query.trim().length >= 2;
  const hasResults = flatItems.length > 0;
  const totalCount = counts.users + counts.opportunities + counts.posts;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[12vh] md:pt-[15vh]"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-sand/30 backdrop-blur-sm"
        onClick={close}
        style={{ animation: "searchFadeIn 0.15s ease" }}
      />

      {/* Modal */}
      <div
        className="relative mx-4 flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-floating"
        style={{ animation: "searchSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)", maxHeight: "min(70vh, 600px)" }}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <SearchIcon className="shrink-0 text-mist/40" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people, opportunities, posts..."
            className="flex-1 bg-transparent text-base text-sand outline-none placeholder:text-mist/40"
            autoComplete="off"
            spellCheck={false}
          />
          {loading && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-mist/20 border-t-accent" />
          )}
          <kbd className="hidden rounded-md border border-border bg-charcoal px-1.5 py-0.5 text-[10px] font-medium text-mist/50 sm:inline">
            ESC
          </kbd>
        </div>

        {/* Location filter */}
        <div className="border-b border-border px-4 py-2">
          <CountryMultiSelect selected={countries} onChange={setCountries} />
        </div>

        {/* Type tabs */}
        <div className="flex gap-1 border-b border-border px-4 py-2">
          {TYPE_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); setFocusedIndex(-1); }}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-sand/8 text-sand"
                    : "text-mist/60 hover:text-sand hover:bg-sand/5"
                }`}
              >
                {tab.label}
                {hasQuery && tab.key !== "all" && (
                  <span className="ml-1 text-mist/30">
                    {counts[tab.key === "users" ? "users" : tab.key === "opportunities" ? "opportunities" : "posts"] || 0}
                  </span>
                )}
                {hasQuery && tab.key === "all" && totalCount > 0 && (
                  <span className="ml-1 text-mist/30">{totalCount}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Results area */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-2 py-1">
          {!hasQuery && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <SearchIcon className="mb-3 text-mist/20" />
              <p className="text-sm text-mist/50">Search people by name, skill, or company</p>
              <p className="mt-1 text-xs text-mist/30">Find opportunities and community posts</p>
            </div>
          )}

          {hasQuery && !hasResults && !loading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-mist/50">No results for "{query}"</p>
              <p className="mt-1 text-xs text-mist/30">Try a different search term or location</p>
            </div>
          )}

          {hasQuery && hasResults && (
            <>
              {(activeTab === "all" || activeTab === "users") && results.users.length > 0 && (
                <div>
                  <SectionHeader label="People" count={counts.users} />
                  {results.users.map((user) => {
                    const idx = flatItems.findIndex((fi) => fi.type === "user" && fi.data._id === user._id);
                    return (
                      <PersonResult
                        key={user._id}
                        user={user}
                        focused={idx === focusedIndex}
                        onClick={() => navigateTo({ type: "user", data: user })}
                      />
                    );
                  })}
                </div>
              )}

              {(activeTab === "all" || activeTab === "opportunities") && results.opportunities.length > 0 && (
                <div>
                  <SectionHeader label="Opportunities" count={counts.opportunities} />
                  {results.opportunities.map((opp) => {
                    const idx = flatItems.findIndex((fi) => fi.type === "opportunity" && fi.data._id === opp._id);
                    return (
                      <OpportunityResult
                        key={opp._id}
                        opp={opp}
                        focused={idx === focusedIndex}
                        onClick={() => navigateTo({ type: "opportunity", data: opp })}
                      />
                    );
                  })}
                </div>
              )}

              {(activeTab === "all" || activeTab === "posts") && results.posts.length > 0 && (
                <div>
                  <SectionHeader label="Posts" count={counts.posts} />
                  {results.posts.map((post) => {
                    const idx = flatItems.findIndex((fi) => fi.type === "post" && fi.data._id === post._id);
                    return (
                      <PostResult
                        key={post._id}
                        post={post}
                        focused={idx === focusedIndex}
                        onClick={() => navigateTo({ type: "post", data: post })}
                      />
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {hasQuery && hasResults && (
          <div className="flex items-center justify-between border-t border-border px-4 py-2">
            <button
              onClick={() => {
                const params = new URLSearchParams({ q: query });
                if (countries.length) params.set("countries", countries.join(","));
                navigate(`/search?${params}`);
                close();
                clear();
              }}
              className="text-xs font-medium text-accent hover:text-accent/80 transition-colors"
            >
              See all results &rarr;
            </button>
            <div className="hidden items-center gap-3 text-[10px] text-mist/40 sm:flex">
              <span><kbd className="rounded border border-border bg-charcoal px-1 py-0.5 font-mono">↑↓</kbd> navigate</span>
              <span><kbd className="rounded border border-border bg-charcoal px-1 py-0.5 font-mono">↵</kbd> open</span>
              <span><kbd className="rounded border border-border bg-charcoal px-1 py-0.5 font-mono">esc</kbd> close</span>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes searchFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes searchSlideIn {
          from { opacity: 0; transform: scale(0.98) translateY(-8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>,
    document.body
  );
}
