import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import BizimHeader from "../components/BizimHeader";
import useSmartSearch from "../utils/useSmartSearch";
import { API_ORIGIN } from "../api/client";

/* ───────── Filter definitions ───────── */
const TYPE_FILTERS = [
  { id: "all", label: "Everything" },
  { id: "users", label: "People" },
  { id: "opportunities", label: "Opportunities" },
  { id: "posts", label: "Posts" }
];

const TOPIC_FILTERS = [
  { id: "mentor", label: "Mentors" },
  { id: "student", label: "Students" },
  { id: "london", label: "London" },
  { id: "remote", label: "Remote" },
  { id: "ai", label: "AI" },
  { id: "product", label: "Product" },
  { id: "engineering", label: "Engineering" },
  { id: "design", label: "Design" }
];

export default function Search() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const urlQ = params.get("q") || "";
  const [inputValue, setInputValue] = useState(urlQ);
  const inputRef = useRef(null);

  const {
    query, setQuery,
    typeFilter, setTypeFilter,
    topicFilters, toggleTopic,
    results, counts, loading,
    corrections,
    recordClick, resetMemory
  } = useSmartSearch();

  /* Seed from URL ?q= on mount */
  useEffect(() => {
    if (urlQ && urlQ !== query) {
      setInputValue(urlQ);
      setQuery(urlQ);
    }
    inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Keep URL in sync */
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (inputValue.trim()) next.set("q", inputValue.trim());
    else next.delete("q");
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue]);

  const handleInput = (e) => {
    const v = e.target.value;
    setInputValue(v);
    setQuery(v);
  };

  const hasQuery = inputValue.trim().length >= 2;
  const totalResults = counts.users + counts.opportunities + counts.posts;
  const allResults = [
    ...results.users.map(r => ({ ...r, _type: "user" })),
    ...results.opportunities.map(r => ({ ...r, _type: "opportunity" })),
    ...results.posts.map(r => ({ ...r, _type: "post" }))
  ];

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      <BizimHeader />

      {/* ═══ DECORATIVE CIRCLES ═══ */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full border border-grey-200 opacity-60" />
        <div className="absolute -top-20 -left-20 w-[360px] h-[360px] rounded-full border border-grey-200 opacity-50" />
        <div className="absolute -bottom-48 -right-48 w-[640px] h-[640px] rounded-full border border-grey-200 opacity-60" />
        <div className="absolute -bottom-24 -right-24 w-[380px] h-[380px] rounded-full border border-grey-200 opacity-40" />
        <div className="absolute top-1/3 left-1/4 w-[280px] h-[280px] rounded-full bg-gradient-to-br from-grey-100 to-transparent opacity-70 blur-3xl" />
        <div className="absolute top-1/4 right-1/3 w-[220px] h-[220px] rounded-full bg-gradient-to-bl from-grey-200/50 to-transparent opacity-60 blur-3xl" />
      </div>

      {/* ═══ MAIN ═══ */}
      <main className="relative z-10 mx-auto max-w-4xl px-6 pb-24">

        {/* Title */}
        <div className={`text-center transition-all duration-500 ease-out ${hasQuery ? "pt-8 md:pt-12" : "pt-16 md:pt-28"}`}>
          <h1
            className={`font-serif italic text-sand leading-[0.9] tracking-[-0.04em] transition-all duration-500 ${
              hasQuery
                ? "text-[56px] md:text-[72px]"
                : "text-[96px] md:text-[140px]"
            }`}
          >
            Bizim<span>Circle</span>
          </h1>
          {!hasQuery && (
            <p className="mt-4 text-mist text-sm font-medium tracking-wide">
              Search people, circles, posts — one field, messy typos welcome.
            </p>
          )}
        </div>

        {/* Circular search */}
        <div className={`relative mx-auto transition-all duration-500 ${hasQuery ? "mt-8 max-w-2xl" : "mt-12 max-w-xl"}`}>
          <div aria-hidden className="absolute -inset-6 rounded-full bg-gradient-to-br from-grey-100 via-white to-grey-100 opacity-70 blur-2xl" />
          <div className="relative rounded-full border border-grey-300 bg-white shadow-floating">
            <div className="flex items-center gap-4 px-6 py-4 md:py-5 rounded-full border border-grey-200/60 bg-white">
              <svg className="w-5 h-5 text-grey-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="7" strokeWidth="2" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m20 20-3.5-3.5" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInput}
                placeholder="What are you looking for?"
                className="flex-1 bg-transparent outline-none text-base md:text-lg text-sand placeholder-grey-500"
                autoComplete="off"
                spellCheck="false"
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={() => { setInputValue(""); setQuery(""); inputRef.current?.focus(); }}
                  className="w-8 h-8 rounded-full bg-grey-100 hover:bg-grey-200 flex items-center justify-center flex-shrink-0 transition-colors"
                  aria-label="Clear search"
                >
                  <svg className="w-3.5 h-3.5 text-grey-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              )}
              {loading && (
                <div className="w-5 h-5 rounded-full border-2 border-grey-300 border-t-sand animate-spin flex-shrink-0" />
              )}
            </div>
          </div>

          {corrections.length > 0 && (
            <div className="mt-3 text-center text-sm text-mist">
              Showing results for{" "}
              {corrections.map((c, i) => (
                <span key={i}>
                  {i > 0 && ", "}
                  <span className="line-through text-grey-500">{c.raw}</span>
                  {" → "}
                  <span className="font-semibold text-sand">{c.to}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className={`mx-auto max-w-3xl transition-opacity duration-300 mt-8 ${hasQuery ? "opacity-100" : "opacity-80"}`}>
          <div className="flex flex-wrap justify-center gap-2">
            {TYPE_FILTERS.map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTypeFilter(f.id)}
                className={`h-9 px-4 rounded-full text-sm font-semibold transition-all ${
                  typeFilter === f.id
                    ? "bg-sand text-white shadow-sm"
                    : "bg-white border border-grey-300 text-mist hover:border-sand hover:text-sand"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {TOPIC_FILTERS.map(f => {
              const on = topicFilters.has(f.id);
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => toggleTopic(f.id)}
                  className={`h-8 px-3.5 rounded-full text-xs font-semibold transition-all border ${
                    on
                      ? "bg-grey-100 border-sand text-sand"
                      : "bg-white border-dashed border-grey-300 text-grey-600 hover:border-grey-500 hover:text-sand"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results */}
        {hasQuery && (
          <div className="mt-10">
            <div className="flex items-baseline justify-between mb-4 px-1">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-mist">Adaptive ranking</p>
                <h2 className="font-serif italic text-3xl text-sand mt-1">
                  {loading ? "Searching…" : `${totalResults} result${totalResults !== 1 ? "s" : ""}`}
                </h2>
              </div>
              <button
                type="button"
                onClick={resetMemory}
                className="text-xs font-semibold text-grey-500 hover:text-sand transition-colors"
              >
                Reset memory
              </button>
            </div>

            {!loading && totalResults === 0 && (
              <div className="rounded-3xl border border-grey-200 bg-white p-10 text-center">
                <div className="mx-auto w-16 h-16 rounded-full border-2 border-grey-300 flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-grey-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="7" strokeWidth="1.8" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="m20 20-3.5-3.5" />
                  </svg>
                </div>
                <p className="font-semibold text-sand">No matches found</p>
                <p className="text-sm text-mist mt-1">Try broader wording, check for typos, or remove a filter.</p>
              </div>
            )}

            <div className="space-y-2">
              {allResults.map((item) => (
                <ResultRow key={`${item._type}-${item._id}`} item={item} onClick={recordClick} navigate={navigate} />
              ))}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {!hasQuery && (
          <div className="mt-16 text-center max-w-lg mx-auto">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-mist mb-3">Try searching</p>
            <div className="flex flex-wrap justify-center gap-2">
              {["product mentor", "london internship", "ai founders", "design student"].map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => { setInputValue(q); setQuery(q); inputRef.current?.focus(); }}
                  className="h-8 px-3 rounded-full bg-grey-100 hover:bg-grey-200 text-xs font-medium text-grey-700 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

/* ═══ Result row ═══ */
function ResultRow({ item, onClick, navigate }) {
  const isUser = item._type === "user";
  const isOpp = item._type === "opportunity";

  const handleClick = () => {
    onClick(item._id);
    if (isUser) navigate(`/profile/${item._id}`);
  };

  const typeLabel = isUser ? "Person" : isOpp ? "Opportunity" : "Post";
  const typeClass = isUser
    ? "bg-sand text-white"
    : "bg-grey-100 text-sand border border-grey-300";

  const title = item.name || item.title || "Untitled";
  const subtitle = isUser
    ? (item.headline || item.userType || "Community member")
    : isOpp
    ? (item.company || item.orgName || item.type || "Opportunity")
    : (item.content ? item.content.slice(0, 120) + (item.content.length > 120 ? "…" : "") : "Community post");

  const rawAvatar = item.avatarUrl || item.profilePhotoUrl || item.profilePictureUrl || item.avatar;
  const avatarUrl = isUser && rawAvatar
    ? (rawAvatar.startsWith("http") ? rawAvatar : `${API_ORIGIN}${rawAvatar}`)
    : null;
  const initial = (title || "?").charAt(0).toUpperCase();

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full text-left flex items-center gap-4 p-4 rounded-2xl bg-white border border-grey-200 hover:border-sand hover:shadow-card transition-all group"
    >
      <div className="w-12 h-12 rounded-full bg-grey-100 border border-grey-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-base font-bold text-grey-600">{initial}</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sand truncate">{title}</p>
        <p className="text-sm text-mist truncate mt-0.5">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <span className={`hidden sm:inline-flex h-6 px-2.5 rounded-full text-[10px] font-bold uppercase tracking-wider items-center ${typeClass}`}>
          {typeLabel}
        </span>
        {item._boost > 0 && (
          <span className="w-1.5 h-1.5 rounded-full bg-sand" title="Boosted by your history" />
        )}
        <svg className="w-4 h-4 text-grey-400 group-hover:text-sand group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}
