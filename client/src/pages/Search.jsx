import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../utils/auth";
import CountryMultiSelect from "../components/CountryMultiSelect";

const TYPE_OPTIONS = [
  { key: "users", label: "People" },
  { key: "opportunities", label: "Opportunities" },
  { key: "posts", label: "Posts" },
];

function SearchIcon({ className }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function PersonCard({ user }) {
  const navigate = useNavigate();
  const avatar = user.avatarUrl || user.profilePhotoUrl || user.profilePictureUrl;
  const location = user.locationNow?.country || user.currentRegion || "";
  const edu = Array.isArray(user.education) && user.education[0]?.institution;
  const exp = Array.isArray(user.experience) && (user.experience[0]?.company || user.experience[0]?.org);

  return (
    <button
      onClick={() => navigate(`/profile/${user._id}`)}
      className="apple-card flex items-center gap-4 rounded-2xl bg-white p-4 text-left transition-all hover:shadow-elevated"
    >
      {avatar ? (
        <img src={avatar} alt="" className="h-12 w-12 rounded-full object-cover" />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-charcoal text-lg font-medium text-mist">
          {user.name?.[0]?.toUpperCase() || "?"}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-sand">{user.name}</p>
        {user.headline && <p className="truncate text-xs text-mist mt-0.5">{user.headline}</p>}
        <div className="mt-1 flex flex-wrap gap-1.5">
          {location && (
            <span className="rounded-full bg-charcoal px-2 py-0.5 text-[10px] font-medium text-mist">{location}</span>
          )}
          {edu && (
            <span className="rounded-full bg-charcoal px-2 py-0.5 text-[10px] font-medium text-mist">{edu}</span>
          )}
          {exp && (
            <span className="rounded-full bg-charcoal px-2 py-0.5 text-[10px] font-medium text-mist">{exp}</span>
          )}
        </div>
      </div>
      {user.userType && (
        <span className="shrink-0 rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-mist">
          {user.userType}
        </span>
      )}
    </button>
  );
}

function OpportunityCard({ opp }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/opportunities/${opp._id}`)}
      className="apple-card flex items-center gap-4 rounded-2xl bg-white p-4 text-left transition-all hover:shadow-elevated"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal/10 text-teal">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-sand">{opp.title}</p>
        <p className="truncate text-xs text-mist mt-0.5">
          {[opp.orgName || opp.company, opp.country].filter(Boolean).join(" · ")}
        </p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {opp.type && (
            <span className="rounded-full bg-teal/8 border border-teal/20 px-2 py-0.5 text-[10px] font-medium text-teal">{opp.type}</span>
          )}
          {opp.locationMode && (
            <span className="rounded-full bg-charcoal px-2 py-0.5 text-[10px] font-medium text-mist">{opp.locationMode}</span>
          )}
        </div>
      </div>
    </button>
  );
}

function PostCard({ post }) {
  const navigate = useNavigate();
  const author = post.author;
  const avatar = author?.avatarUrl || author?.profilePhotoUrl || author?.profilePictureUrl;
  const preview = post.content?.length > 200 ? post.content.slice(0, 200) + "..." : post.content;

  return (
    <button
      onClick={() => navigate(`/post/${post._id}`)}
      className="apple-card flex items-start gap-4 rounded-2xl bg-white p-4 text-left transition-all hover:shadow-elevated"
    >
      {avatar ? (
        <img src={avatar} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-charcoal text-sm font-medium text-mist">
          {author?.name?.[0]?.toUpperCase() || "?"}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-sand">{author?.name || "Unknown"}</p>
        <p className="mt-1 text-sm text-mist leading-relaxed">{preview}</p>
      </div>
    </button>
  );
}

export default function Search() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [countries, setCountries] = useState(
    searchParams.get("countries")?.split(",").filter(Boolean) || []
  );
  const [activeTypes, setActiveTypes] = useState(["users", "opportunities", "posts"]);
  const [results, setResults] = useState({ users: [], opportunities: [], posts: [] });
  const [counts, setCounts] = useState({ users: 0, opportunities: 0, posts: 0 });
  const [loading, setLoading] = useState(false);
  const [limits, setLimits] = useState({ users: 20, opportunities: 20, posts: 20 });

  const doSearch = useCallback(
    async (q, c, t, l) => {
      if (q.trim().length < 2) {
        setResults({ users: [], opportunities: [], posts: [] });
        setCounts({ users: 0, opportunities: 0, posts: 0 });
        return;
      }
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: q.trim(), limit: String(Math.max(l.users, l.opportunities, l.posts)) });
        if (t.length < 3) params.set("types", t.join(","));
        if (c.length) params.set("countries", c.join(","));
        const data = await apiClient.get(`/search?${params}`, token);
        setResults({ users: data.users, opportunities: data.opportunities, posts: data.posts });
        setCounts(data.counts);
      } catch {
        setResults({ users: [], opportunities: [], posts: [] });
        setCounts({ users: 0, opportunities: 0, posts: 0 });
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  // Sync URL params on changes
  useEffect(() => {
    const params = {};
    if (query) params.q = query;
    if (countries.length) params.countries = countries.join(",");
    setSearchParams(params, { replace: true });
  }, [query, countries, setSearchParams]);

  // Search on mount and when filters change
  useEffect(() => {
    doSearch(query, countries, activeTypes, limits);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countries, activeTypes, limits]);

  // Debounced query search
  useEffect(() => {
    const timer = setTimeout(() => {
      doSearch(query, countries, activeTypes, limits);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const toggleType = (key) => {
    setActiveTypes((prev) => {
      if (prev.includes(key)) {
        const next = prev.filter((t) => t !== key);
        return next.length ? next : prev; // Don't allow empty
      }
      return [...prev, key];
    });
  };

  const hasQuery = query.trim().length >= 2;
  const totalCount = counts.users + counts.opportunities + counts.posts;

  return (
    <div className="pb-12">
      {/* Header */}
      <h1 className="font-display text-3xl text-sand mb-6">Search</h1>

      {/* Search bar */}
      <div className="apple-card flex items-center gap-3 rounded-2xl bg-white px-4 py-3 mb-4">
        <SearchIcon className="shrink-0 text-mist/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people, opportunities, posts..."
          className="flex-1 bg-transparent text-base text-sand outline-none placeholder:text-mist/40"
          autoFocus
          autoComplete="off"
          spellCheck={false}
        />
        {loading && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-mist/20 border-t-accent" />
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start mb-6">
        <div className="apple-card flex-1 rounded-2xl bg-white px-4 py-3">
          <CountryMultiSelect selected={countries} onChange={setCountries} />
        </div>
        <div className="flex gap-1.5">
          {TYPE_OPTIONS.map((opt) => {
            const active = activeTypes.includes(opt.key);
            return (
              <button
                key={opt.key}
                onClick={() => toggleType(opt.key)}
                className={`rounded-xl px-3.5 py-2 text-xs font-medium transition-colors ${
                  active
                    ? "bg-sand/10 text-sand border border-sand/20"
                    : "bg-white text-mist border border-border hover:border-sand/20"
                }`}
              >
                {opt.label}
                {hasQuery && <span className="ml-1 text-mist/40">{counts[opt.key] || 0}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results */}
      {!hasQuery && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <SearchIcon className="mb-4 text-mist/20" />
          <p className="text-mist/50">Search for people, opportunities, and posts</p>
          <p className="mt-1 text-sm text-mist/30">Use the location filter to narrow results by country</p>
        </div>
      )}

      {hasQuery && totalCount === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-mist/50">No results found for "{query}"</p>
          <p className="mt-1 text-sm text-mist/30">Try a different search term or adjust your filters</p>
        </div>
      )}

      {hasQuery && (
        <div className="space-y-8">
          {/* People */}
          {activeTypes.includes("users") && results.users.length > 0 && (
            <section>
              <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.15em] text-mist/50">
                People <span className="text-mist/30">({counts.users})</span>
              </h2>
              <div className="grid gap-2">
                {results.users.map((user) => (
                  <PersonCard key={user._id} user={user} />
                ))}
              </div>
              {results.users.length < counts.users && (
                <button
                  onClick={() => setLimits((p) => ({ ...p, users: p.users + 20 }))}
                  className="mt-3 text-xs font-medium text-accent hover:text-accent/80"
                >
                  Show more people
                </button>
              )}
            </section>
          )}

          {/* Opportunities */}
          {activeTypes.includes("opportunities") && results.opportunities.length > 0 && (
            <section>
              <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.15em] text-mist/50">
                Opportunities <span className="text-mist/30">({counts.opportunities})</span>
              </h2>
              <div className="grid gap-2">
                {results.opportunities.map((opp) => (
                  <OpportunityCard key={opp._id} opp={opp} />
                ))}
              </div>
              {results.opportunities.length < counts.opportunities && (
                <button
                  onClick={() => setLimits((p) => ({ ...p, opportunities: p.opportunities + 20 }))}
                  className="mt-3 text-xs font-medium text-accent hover:text-accent/80"
                >
                  Show more opportunities
                </button>
              )}
            </section>
          )}

          {/* Posts */}
          {activeTypes.includes("posts") && results.posts.length > 0 && (
            <section>
              <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.15em] text-mist/50">
                Posts <span className="text-mist/30">({counts.posts})</span>
              </h2>
              <div className="grid gap-2">
                {results.posts.map((post) => (
                  <PostCard key={post._id} post={post} />
                ))}
              </div>
              {results.posts.length < counts.posts && (
                <button
                  onClick={() => setLimits((p) => ({ ...p, posts: p.posts + 20 }))}
                  className="mt-3 text-xs font-medium text-accent hover:text-accent/80"
                >
                  Show more posts
                </button>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
