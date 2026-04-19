import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { apiClient } from "../api/client";
import { useAuth } from "./auth";

/* ═══════════════════════════════════════════════════
   SMART SEARCH HOOK
   Wraps the backend /search endpoint with client-side:
   - Typo correction (common table + Damerau-Levenshtein)
   - Synonym expansion
   - Click-based learning (localStorage)
   ═══════════════════════════════════════════════════ */

const EMPTY = { users: [], opportunities: [], posts: [] };
const EMPTY_COUNTS = { users: 0, opportunities: 0, posts: 0 };
const STORE_KEY = "bizim-smart-search-v1";

/* ── Common typos (hand-curated) ── */
const TYPOS = {
  intrenship:"internship",intenship:"internship",intrnship:"internship",internhsip:"internship",
  inernship:"internship",internsip:"internship",interniship:"internship",
  prodcut:"product",produt:"product",pruduct:"product",poduct:"product",prduct:"product",
  mentr:"mentor",menter:"mentor",mento:"mentor",mentrr:"mentor",mntor:"mentor",
  enginer:"engineer",engneer:"engineer",enginere:"engineer",enginner:"engineer",
  desgin:"design",desgn:"design",desing:"design",dezign:"design",dsign:"design",
  londno:"london",londn:"london",lnodon:"london",
  studet:"student",studnet:"student",sudent:"student",studen:"student",
  carrer:"career",carreer:"career",carier:"career",carear:"career",
  comunity:"community",commnity:"community",communty:"community",
  opprotunity:"opportunity",oportunity:"opportunity",oppurtunity:"opportunity",
  netowrking:"networking",netwrking:"networking",newtorking:"networking",
  housng:"housing",housign:"housing",accomodation:"accommodation",
  figam:"figma",fimga:"figma",biulders:"builders",bulders:"builders",buidlers:"builders",
  serch:"search",serach:"search",saerch:"search",poeple:"people",peple:"people",pepole:"people",
  circl:"circle",cirlce:"circle",gruop:"group",groop:"group",
  mentorhsip:"mentorship",mentrship:"mentorship",
  founer:"founder",foudner:"founder",fouder:"founder",
  reserch:"research",resaerch:"research"
};

/* ── Synonym groups (query expansion) ── */
const SYN = {
  people:["person","people","member","mentor","mentors","professional","student","user","profile"],
  opportunity:["opportunity","opportunities","job","jobs","internship","internships","role","roles","position","opening","work","hire","hiring"],
  london:["london","uk","britain","england"],
  remote:["remote","distributed","anywhere","wfh","online"],
  ai:["ai","artificial","intelligence","ml","machine","gpt","llm"],
  product:["product","pm","manager","roadmap"],
  founder:["founder","cofounder","startup","entrepreneur"],
  design:["design","ux","ui","figma","designer","creative"],
  engineering:["engineering","engineer","dev","developer","code","coding","programmer","software"],
  career:["career","job","work","profession","resume","cv"],
  student:["student","undergrad","graduate","uni","university","college"]
};

/* ── Core vocabulary for fuzzy matching ── */
const CORE_WORDS = new Set();
Object.values(TYPOS).forEach(v => CORE_WORDS.add(v));
Object.entries(SYN).forEach(([k, vs]) => { CORE_WORDS.add(k); vs.forEach(v => CORE_WORDS.add(v)); });
[
  "mentorship","mentor","internship","research","founder","engineer","designer",
  "professional","networking","community","fintech","edtech","analytics","marketing",
  "finance","consulting","operations","sales","frontend","backend","fullstack",
  "javascript","python","react","node","typescript","data","science","analyst"
].forEach(w => CORE_WORDS.add(w));

/* ── Text utilities ── */
const norm = s => (s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")
  .replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim();
const tok = s => { const n = norm(s); return n ? n.split(" ") : []; };

/* Damerau-Levenshtein distance */
function ld(a, b) {
  if (Math.abs(a.length - b.length) > 3) return 99;
  const m = Array.from({length:a.length+1}, () => new Array(b.length+1).fill(0));
  for (let i=0;i<=a.length;i++) m[i][0]=i;
  for (let j=0;j<=b.length;j++) m[0][j]=j;
  for (let i=1;i<=a.length;i++) for (let j=1;j<=b.length;j++) {
    const c = a[i-1]===b[j-1] ? 0 : 1;
    m[i][j] = Math.min(m[i-1][j]+1, m[i][j-1]+1, m[i-1][j-1]+c);
    if (i>1 && j>1 && a[i-1]===b[j-2] && a[i-2]===b[j-1])
      m[i][j] = Math.min(m[i][j], m[i-2][j-2]+c);
  }
  return m[a.length][b.length];
}
const maxD = t => t.length<=3 ? 1 : t.length<=6 ? 2 : 3;

/* ── Memory ── */
function loadMem() {
  try {
    const r = localStorage.getItem(STORE_KEY);
    return r ? { corrections:{}, docClicks:{}, ...JSON.parse(r) } : { corrections:{}, docClicks:{} };
  } catch { return { corrections:{}, docClicks:{} }; }
}
function saveMem(mem) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(mem)); } catch {}
}

/* ── Spell correction for one token ── */
function correctToken(token, learned) {
  if (learned[token]) return { token: learned[token], fixed: true };
  if (TYPOS[token]) return { token: TYPOS[token], fixed: true };
  if (CORE_WORDS.has(token)) return { token, fixed: false };
  if (token.length < 3) return { token, fixed: false };

  // Fuzzy match against core vocabulary
  let best = token, bestD = Infinity;
  const md = maxD(token);
  for (const word of CORE_WORDS) {
    if (Math.abs(word.length - token.length) > md) continue;
    const d = ld(token, word);
    if (d < bestD && d <= md) { best = word; bestD = d; }
  }
  return best !== token ? { token: best, fixed: true } : { token, fixed: false };
}

/* ── Expand token with synonyms ── */
function expandQueryTokens(tokens) {
  const expanded = new Set(tokens);
  tokens.forEach(t => {
    Object.entries(SYN).forEach(([root, variants]) => {
      if (root === t || variants.includes(t)) {
        expanded.add(root);
        variants.forEach(v => expanded.add(v));
      }
    });
  });
  return [...expanded];
}

/* ═══════════════════════════════════════════════════
   HOOK
   ═══════════════════════════════════════════════════ */

export default function useSmartSearch({ debounceMs = 280 } = {}) {
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all"); // all | users | opportunities | posts
  const [topicFilters, setTopicFilters] = useState(new Set());
  const [countries, setCountries] = useState([]);
  const [results, setResults] = useState(EMPTY);
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [loading, setLoading] = useState(false);
  const [corrections, setCorrections] = useState([]);
  const [effectiveQuery, setEffectiveQuery] = useState("");

  const memRef = useRef(loadMem());
  const abortRef = useRef(null);
  const timerRef = useRef(null);

  /* Interpret raw query → corrected query + corrections list */
  const interpret = useCallback((raw) => {
    const rawTokens = tok(raw);
    const out = rawTokens.map(t => correctToken(t, memRef.current.corrections));
    const fixedTokens = out.map(o => o.token);
    const fixes = out
      .map((o, i) => o.fixed && o.token !== rawTokens[i]
        ? { raw: rawTokens[i], to: o.token } : null)
      .filter(Boolean);
    return { fixedTokens, fixes };
  }, []);

  /* Core search — hits backend with expanded query */
  const doSearch = useCallback(async (rawQuery) => {
    if (abortRef.current) abortRef.current.abort();
    const trimmed = rawQuery.trim();

    const hasFilters = typeFilter !== "all" || topicFilters.size > 0 || countries.length > 0;

    // Nothing to do: no query AND no filters
    if (trimmed.length < 2 && !hasFilters) {
      setResults(EMPTY); setCounts(EMPTY_COUNTS);
      setLoading(false); setCorrections([]); setEffectiveQuery("");
      return;
    }

    let searchQ = "";
    let fixes = [];

    if (trimmed.length >= 2) {
      const out = interpret(trimmed);
      searchQ = out.fixedTokens.join(" ").trim() || trimmed;
      fixes = out.fixes;
    } else if (topicFilters.size > 0) {
      // No query, but topic filters selected → use first topic as seed
      searchQ = [...topicFilters][0];
    }
    setCorrections(fixes);
    setEffectiveQuery(searchQ);

    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    try {
      const params = new URLSearchParams({ limit: "10" });
      if (searchQ) params.set("q", searchQ);
      const types = typeFilter === "all"
        ? ["users","opportunities","posts"]
        : [typeFilter];
      if (types.length < 3) params.set("types", types.join(","));
      if (countries.length) params.set("countries", countries.join(","));

      const data = await apiClient.get(`/search?${params}`, token, { signal: controller.signal });

      if (!controller.signal.aborted) {
        // Apply topic filters client-side + learning boost
        const filtered = applyTopicAndBoost(data, topicFilters, memRef.current);
        setResults({
          users: filtered.users,
          opportunities: filtered.opportunities,
          posts: filtered.posts
        });
        setCounts(data.counts);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setResults(EMPTY); setCounts(EMPTY_COUNTS);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [token, typeFilter, topicFilters, countries, interpret]);

  /* Debounced query input */
  const setQueryDebounced = useCallback((q) => {
    setQuery(q);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(q), debounceMs);
  }, [doSearch, debounceMs]);

  /* Immediate re-run when filters change — also fires when there is no query yet */
  useEffect(() => {
    doSearch(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, topicFilters, countries]);

  /* Record click → save correction + boost */
  const recordClick = useCallback((resultId) => {
    const mem = memRef.current;
    mem.docClicks[resultId] = (mem.docClicks[resultId] || 0) + 1;
    corrections.forEach(c => { mem.corrections[c.raw] = c.to; });
    saveMem(mem);
  }, [corrections]);

  const toggleTopic = useCallback((id) => {
    setTopicFilters(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const resetMemory = useCallback(() => {
    memRef.current = { corrections:{}, docClicks:{} };
    saveMem(memRef.current);
    if (query.trim().length >= 2) doSearch(query);
  }, [doSearch, query]);

  const clear = useCallback(() => {
    clearTimeout(timerRef.current);
    if (abortRef.current) abortRef.current.abort();
    setQuery(""); setResults(EMPTY); setCounts(EMPTY_COUNTS);
    setLoading(false); setCorrections([]); setEffectiveQuery("");
  }, []);

  useEffect(() => () => {
    clearTimeout(timerRef.current);
    if (abortRef.current) abortRef.current.abort();
  }, []);

  return {
    query, setQuery: setQueryDebounced,
    typeFilter, setTypeFilter,
    topicFilters, toggleTopic,
    countries, setCountries,
    results, counts, loading,
    corrections, effectiveQuery,
    recordClick, resetMemory, clear,
    docClicks: memRef.current.docClicks
  };
}

/* ── Client-side topic filter + learning boost ── */
function applyTopicAndBoost(data, topicFilters, mem) {
  const passesTopics = (item) => {
    if (!topicFilters.size) return true;
    const bag = new Set([
      ...(item.tags || []).map(norm),
      ...tok(item.locationNow?.country),
      ...tok(item.currentRegion),
      ...tok(item.country),
      ...tok(item.city),
      ...tok(item.headline),
      ...tok(item.title),
      ...tok(item.userType)
    ]);
    return [...topicFilters].every(f => {
      const syns = new Set([f]);
      Object.entries(SYN).forEach(([k, vs]) => {
        if (k === f || vs.includes(f)) { syns.add(k); vs.forEach(v => syns.add(v)); }
      });
      return [...syns].some(s => bag.has(s));
    });
  };

  const rank = (arr) => arr
    .filter(passesTopics)
    .map(item => ({ ...item, _boost: (mem.docClicks[item._id] || 0) * 5 }))
    .sort((a, b) => (b._boost || 0) - (a._boost || 0));

  return {
    users: rank(data.users || []),
    opportunities: rank(data.opportunities || []),
    posts: rank(data.posts || [])
  };
}
