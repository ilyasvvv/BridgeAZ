import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSearch } from "../utils/SearchContext";
import useSmartSearch from "../utils/useSmartSearch";
import { API_ORIGIN } from "../api/client";

/* ───────── Filter definitions ───────── */
const TYPE_FILTERS = [
  { id: "all", label: "Everything" },
  { id: "users", label: "People" },
  { id: "opportunities", label: "Opportunities" },
  { id: "posts", label: "Posts" }
];

/* Topic chips are derived from the user's own activity (useSmartSearch.learnedTags) */

/* ═══════════════════════════════════════════════════
   OVERLAY (drop-down takeover)
   ═══════════════════════════════════════════════════ */
export default function SearchOverlay() {
  const { isOpen, close } = useSearch();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);

  const {
    query, setQuery,
    typeFilter, setTypeFilter,
    topicFilters, toggleTopic,
    results, counts, loading,
    corrections,
    recordClick, resetMemory,
    clear,
    learnedTags
  } = useSmartSearch();

  const hasQuery = query.trim().length >= 2;
  const hasFilters = typeFilter !== "all" || topicFilters.size > 0;
  const hasInput = hasQuery || hasFilters;
  const totalResults = counts.users + counts.opportunities + counts.posts;

  /* Animated unmount: keep DOM around for 250ms while exit anim plays */
  const requestClose = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => {
      close();
      setClosing(false);
    }, 240);
  };

  /* Mount/unmount sync with isOpen */
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      setClosing(false);
    } else {
      setMounted(false);
    }
  }, [isOpen]);

  /* Focus input + lock scroll on open */
  useEffect(() => {
    if (!mounted) return;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => {
      document.body.style.overflow = "";
      clearTimeout(t);
    };
  }, [mounted]);

  /* ESC to close */
  useEffect(() => {
    if (!mounted) return;
    const onKey = (e) => { if (e.key === "Escape") requestClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  /* Reset local state when fully closed */
  useEffect(() => {
    if (!isOpen) clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!mounted) return null;

  const handleOpenResult = (item) => {
    recordClick(item._id, item);
    if (item._type === "user") navigate(`/profile/${item._id}`);
    else if (item._type === "opportunity") navigate(`/opportunities/${item._id}`);
    else if (item._type === "post") navigate(`/post/${item._id}`);
    requestClose();
  };

  const animState = closing ? "closing" : "opening";

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto"
      style={{ animation: `${closing ? "searchFadeOut" : "searchFadeIn"} 0.24s ease forwards` }}
    >
      {/* Backdrop — stronger blur, lower opacity so page still shows through */}
      <div
        className="fixed inset-0 bg-white/50 backdrop-blur-xl"
        onClick={requestClose}
        aria-hidden
      />

      {/* Decorative orbit circles */}
      <div aria-hidden className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-48 -left-48 w-[560px] h-[560px] rounded-full border border-grey-200 opacity-60" />
        <div className="absolute -top-24 -left-24 w-[380px] h-[380px] rounded-full border border-grey-200 opacity-50" />
        <div className="absolute -bottom-52 -right-52 w-[680px] h-[680px] rounded-full border border-grey-200 opacity-60" />
        <div className="absolute -bottom-24 -right-24 w-[400px] h-[400px] rounded-full border border-grey-200 opacity-40" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] rounded-full bg-gradient-to-br from-grey-100 to-transparent opacity-70 blur-3xl" />
        <div className="absolute top-1/4 right-1/3 w-[220px] h-[220px] rounded-full bg-gradient-to-bl from-grey-200/60 to-transparent opacity-60 blur-3xl" />
      </div>

      {/* Close button */}
      <button
        type="button"
        onClick={requestClose}
        aria-label="Close search"
        className="fixed top-4 right-4 md:top-6 md:right-6 z-20 w-10 h-10 rounded-full bg-white border border-grey-300 shadow-card flex items-center justify-center hover:bg-grey-100 transition-colors"
      >
        <svg className="w-4 h-4 text-sand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>

      {/* ═══ Centered panel that drops in / lifts out ═══ */}
      <div
        className="relative z-10 mx-auto max-w-4xl px-6 pb-32"
        data-anim={animState}
        style={{
          animation: `${closing ? "searchLiftOut" : "searchDropDown"} 0.32s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`
        }}
      >
        {/* Title — matches header logo format (◯ on left, text on right), scaled up */}
        <div className={`text-center transition-all duration-500 ease-out ${hasQuery ? "pt-10 md:pt-14" : "pt-20 md:pt-32"}`}>
          <div
            className={`flex items-center justify-center transition-all duration-500 ${
              hasQuery ? "gap-3 md:gap-4" : "gap-4 md:gap-6"
            }`}
          >
            <div
              className={`rounded-full border-sand flex items-center justify-center transition-all duration-500 ${
                hasQuery
                  ? "w-12 h-12 md:w-16 md:h-16 border-[3px]"
                  : "w-20 h-20 md:w-28 md:h-28 border-[4px]"
              }`}
            >
              <span
                className={`text-sand font-bold tracking-tight transition-all duration-500 ${
                  hasQuery ? "text-base md:text-xl" : "text-2xl md:text-4xl"
                }`}
              >
                iii
              </span>
            </div>
            <div
              className={`flex items-baseline transition-all duration-500 ${
                hasQuery ? "gap-2 md:gap-3" : "gap-3 md:gap-4"
              }`}
            >
              <span
                className={`font-display font-bold text-sand transition-all duration-500 ${
                  hasQuery ? "text-3xl md:text-5xl" : "text-5xl md:text-7xl"
                }`}
              >
                bizim
              </span>
              <span
                className={`font-display font-bold text-sand transition-all duration-500 ${
                  hasQuery ? "text-3xl md:text-5xl" : "text-5xl md:text-7xl"
                }`}
              >
                circle
              </span>
            </div>
          </div>
          {!hasQuery && (
            <p className="mt-6 text-mist text-sm font-medium tracking-wide">
              Search people, circles, posts and more!
            </p>
          )}
        </div>

        {/* Circular search bar */}
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
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="What are you looking for?"
                className="flex-1 bg-transparent outline-none text-base md:text-lg text-sand placeholder-grey-500"
                autoComplete="off"
                spellCheck="false"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(""); inputRef.current?.focus(); }}
                  className="w-8 h-8 rounded-full bg-grey-100 hover:bg-grey-200 flex items-center justify-center flex-shrink-0 transition-colors"
                  aria-label="Clear"
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
        {hasInput && (
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

            {/* ─── People (profile preview cards) ─── */}
            {(typeFilter === "all" || typeFilter === "users") && results.users.length > 0 && (
              <Section label="People" count={counts.users}>
                <div className="grid gap-3 sm:grid-cols-2">
                  {results.users.map(u => (
                    <PersonCard key={u._id} user={u} onClick={() => handleOpenResult({ ...u, _type: "user" })} />
                  ))}
                </div>
              </Section>
            )}

            {/* ─── Opportunities (opportunity-styled cards) ─── */}
            {(typeFilter === "all" || typeFilter === "opportunities") && results.opportunities.length > 0 && (
              <Section label="Opportunities" count={counts.opportunities}>
                <div className="grid gap-3 sm:grid-cols-2">
                  {results.opportunities.map(o => (
                    <OppCard key={o._id} opp={o} onClick={() => handleOpenResult({ ...o, _type: "opportunity" })} />
                  ))}
                </div>
              </Section>
            )}

            {/* ─── Posts (post-styled cards) ─── */}
            {(typeFilter === "all" || typeFilter === "posts") && results.posts.length > 0 && (
              <Section label="Posts" count={counts.posts}>
                <div className="space-y-3">
                  {results.posts.map(p => (
                    <PostPreview key={p._id} post={p} onClick={() => handleOpenResult({ ...p, _type: "post" })} />
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}

        {/* Suggestion chips */}
        {!hasInput && (
          <div className="mt-16 text-center max-w-lg mx-auto">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-mist mb-3">Try searching</p>
            <div className="flex flex-wrap justify-center gap-2">
              {["product mentor", "london internship", "ai founders", "design student"].map(q => (
                <button
                  key={q}
                  type="button"
                  onClick={() => { setQuery(q); inputRef.current?.focus(); }}
                  className="h-8 px-3 rounded-full bg-grey-100 hover:bg-grey-200 text-xs font-medium text-grey-700 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes searchFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes searchFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes searchDropDown {
          from { opacity: 0; transform: translateY(-32px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes searchLiftOut {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(-24px) scale(0.98); }
        }
      `}</style>
    </div>,
    document.body
  );
}

/* ═══ Section header ═══ */
function Section({ label, count, children }) {
  return (
    <div className="mt-8 first:mt-0">
      <div className="flex items-baseline gap-2 mb-3 px-1">
        <h3 className="font-serif italic text-xl text-sand">{label}</h3>
        <span className="text-xs text-mist">· {count}</span>
      </div>
      {children}
    </div>
  );
}

/* ═══ Person card (profile preview) ═══ */
function PersonCard({ user, onClick }) {
  const raw = user.avatarUrl || user.profilePhotoUrl || user.profilePictureUrl;
  const avatar = raw ? (raw.startsWith("http") ? raw : `${API_ORIGIN}${raw}`) : null;
  const initial = (user.name || "?").charAt(0).toUpperCase();
  const location = user.locationNow?.country || user.currentRegion || user.country || "";
  const edu = Array.isArray(user.education) && user.education[0]?.institution;
  const sub = user.headline || [edu, location].filter(Boolean).join(" · ") || user.userType || "Community member";

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative w-full text-left p-4 rounded-3xl bg-white border border-grey-200 hover:border-sand hover:shadow-card transition-all flex items-center gap-4"
    >
      {/* Decorative ring */}
      <div aria-hidden className="absolute -top-2 -right-2 w-12 h-12 rounded-full border border-grey-200 opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="w-14 h-14 rounded-full bg-grey-100 border border-grey-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {avatar ? (
          <img src={avatar} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-lg font-bold text-grey-600">{initial}</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sand truncate">{user.name || "Unnamed"}</p>
          {(user.mentorVerified || user.studentVerified) && (
            <span className="flex-shrink-0 w-4 h-4 rounded-full bg-sand flex items-center justify-center" title="Verified">
              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </span>
          )}
        </div>
        <p className="text-xs text-mist truncate mt-0.5">{sub}</p>
        {user.userType && (
          <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-grey-100 border border-grey-200 text-[10px] font-bold uppercase tracking-wider text-sand">
            {user.userType}
          </span>
        )}
      </div>

      {user._boost > 0 && (
        <span className="w-1.5 h-1.5 rounded-full bg-sand" title="Boosted by your history" />
      )}
    </button>
  );
}

/* ═══ Opportunity card ═══ */
function OppCard({ opp, onClick }) {
  const org = opp.orgName || opp.company || "Opportunity";
  const where = [opp.city, opp.country].filter(Boolean).join(", ") || opp.locationMode || "";
  const tags = (opp.tags || []).slice(0, 3);

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left p-5 rounded-3xl bg-white border border-grey-200 hover:border-sand hover:shadow-card transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-sand text-white flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect width="18" height="13" x="3" y="7" rx="2" strokeWidth="1.8" />
            <path strokeLinecap="round" strokeWidth="1.8" d="M16 20V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v15" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sand truncate">{opp.title || "Untitled"}</p>
          <p className="text-xs text-mist truncate mt-0.5">
            {org}{where ? ` · ${where}` : ""}
          </p>
        </div>
        {opp.type && (
          <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-grey-100 border border-grey-200 text-[10px] font-bold uppercase tracking-wider text-sand">
            {opp.type}
          </span>
        )}
      </div>

      {opp.description && (
        <p className="mt-3 text-sm text-mist line-clamp-2">{opp.description}</p>
      )}

      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((t, i) => (
            <span key={i} className="px-2 py-0.5 rounded-full bg-grey-100 text-[10px] font-medium text-grey-700">
              #{t}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

/* ═══ Post preview card ═══ */
function PostPreview({ post, onClick }) {
  const author = post.author || {};
  const raw = author.avatarUrl || author.profilePhotoUrl || author.profilePictureUrl;
  const avatar = raw ? (raw.startsWith("http") ? raw : `${API_ORIGIN}${raw}`) : null;
  const initial = (author.name || "?").charAt(0).toUpperCase();
  const content = post.content || "";
  const preview = content.length > 220 ? content.slice(0, 220) + "…" : content;

  const attUrl = post.attachmentUrl || "";
  const lower = attUrl.toLowerCase();
  const isImage = (post.attachmentContentType || "").startsWith("image/")
    || [".png", ".jpg", ".jpeg", ".webp", ".gif"].some(ext => lower.endsWith(ext));
  const imgSrc = isImage
    ? (attUrl.startsWith("http") ? attUrl : `${API_ORIGIN}${attUrl}`)
    : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left p-5 rounded-3xl bg-white border border-grey-200 hover:border-sand hover:shadow-card transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-grey-100 border border-grey-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {avatar ? (
            <img src={avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-grey-600">{initial}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sand truncate">{author.name || "Unknown"}</p>
            {author.userType && (
              <span className="px-1.5 py-0.5 rounded-full bg-grey-100 text-[10px] font-bold uppercase tracking-wider text-grey-700">
                {author.userType}
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-sand whitespace-pre-line line-clamp-3">{preview}</p>

          {imgSrc && (
            <div className="mt-3 w-full h-40 rounded-2xl overflow-hidden bg-grey-100 border border-grey-200">
              <img src={imgSrc} alt="" className="w-full h-full object-cover" />
            </div>
          )}

          <div className="mt-3 flex items-center gap-4 text-[11px] text-mist">
            {typeof post.likesCount === "number" && (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {post.likesCount}
              </span>
            )}
            {Array.isArray(post.comments) && (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {post.comments.length}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
