"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MiniProfile } from "@/components/MiniProfileCard";
import type { Post } from "@/components/PostCard";
import { CIRCLES, PEOPLE, POSTS } from "@/data/mock";

export type SearchScope =
  | "all"
  | "people"
  | "circles"
  | "posts"
  | "events"
  | "opportunities"
  | "tags";

type Correction = { raw: string; to: string };

export type TopicOption = { id: string; label: string };

type RankedPerson = MiniProfile & {
  _id: string;
  _type: "person";
  _score: number;
  _keywords: string[];
};

type RankedCircle = MiniProfile & {
  _id: string;
  _type: "circle";
  _score: number;
  _keywords: string[];
};

type RankedPost = Post & {
  _id: string;
  _type: "post" | "event" | "opportunity";
  _score: number;
  _keywords: string[];
};

type RankedTag = {
  _id: string;
  _type: "tag";
  _score: number;
  _keywords: string[];
  label: string;
  count: number;
};

export type SearchItem = RankedPerson | RankedCircle | RankedPost | RankedTag;

type SearchResults = {
  people: RankedPerson[];
  circles: RankedCircle[];
  posts: RankedPost[];
  events: RankedPost[];
  opportunities: RankedPost[];
  tags: RankedTag[];
  all: SearchItem[];
};

type SearchCounts = {
  people: number;
  circles: number;
  posts: number;
  events: number;
  opportunities: number;
  tags: number;
  total: number;
};

type SearchMemory = {
  corrections: Record<string, string>;
  docClicks: Record<string, number>;
  savedQueries: string[];
};

type SearchIndex<T extends SearchItem> = {
  scope: Exclude<SearchScope, "all">;
  item: T;
  haystack: string;
  tokens: Set<string>;
  keywords: string[];
};

const STORE_KEY = "bizim-smart-search-v1";

const EMPTY_RESULTS: SearchResults = {
  people: [],
  circles: [],
  posts: [],
  events: [],
  opportunities: [],
  tags: [],
  all: [],
};

const EMPTY_COUNTS: SearchCounts = {
  people: 0,
  circles: 0,
  posts: 0,
  events: 0,
  opportunities: 0,
  tags: 0,
  total: 0,
};

const STOP_WORDS = new Set([
  "and",
  "are",
  "for",
  "from",
  "have",
  "into",
  "its",
  "just",
  "more",
  "that",
  "the",
  "this",
  "with",
  "your",
]);

const TYPOS: Record<string, string> = {
  berln: "berlin",
  camdem: "camden",
  circl: "circle",
  cirlce: "circle",
  deisgn: "design",
  desgin: "design",
  desing: "design",
  enginer: "engineer",
  enginner: "engineer",
  fairfx: "fairfax",
  footbal: "football",
  housng: "housing",
  housign: "housing",
  internhsip: "internship",
  intrenship: "internship",
  londno: "london",
  mentr: "mentor",
  newyork: "new york",
  novrz: "novruz",
  opprotunity: "opportunity",
  poeple: "people",
  prodcut: "product",
  remot: "remote",
  rommate: "roommate",
};

const SYNONYMS: Record<string, string[]> = {
  ai: ["llm", "gpt", "machine", "intelligence"],
  berlin: ["germany"],
  circle: ["community", "group", "club"],
  circles: ["community", "group", "club"],
  design: ["designer", "figma", "ux", "ui", "product"],
  event: ["meetup", "gathering", "night"],
  events: ["meetup", "gathering", "night"],
  football: ["soccer", "pickup", "weekend"],
  housing: ["flat", "home", "roommate", "apartment"],
  internship: ["intern", "junior", "opportunity"],
  jobs: ["career", "hiring", "opportunity", "role", "work"],
  london: ["uk", "camden", "student"],
  mentor: ["guidance", "mentoring", "coach"],
  new: ["nyc", "york"],
  novruz: ["celebration", "spring"],
  people: ["member", "mentor", "person", "user"],
  posts: ["notes", "updates"],
  product: ["designer", "design", "pm"],
  remote: ["distributed", "online", "us"],
  roommate: ["flat", "housing", "share"],
  searching: ["looking", "need", "wanted"],
};

const BASE_TOPIC_OPTIONS: TopicOption[] = [
  { id: "berlin", label: "Berlin" },
  { id: "london", label: "London" },
  { id: "new york", label: "New York" },
  { id: "design", label: "Design" },
  { id: "product", label: "Product" },
  { id: "engineering", label: "Engineering" },
  { id: "football", label: "Football" },
  { id: "roommate", label: "Housing" },
  { id: "jobs", label: "Jobs" },
  { id: "community", label: "Community" },
  { id: "novruz", label: "Novruz" },
  { id: "remote", label: "Remote" },
];

function norm(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tok(value: string) {
  const normalized = norm(value);
  return normalized ? normalized.split(" ") : [];
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function buildKeywords(...parts: string[]) {
  return unique(
    parts
      .flatMap(tok)
      .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
  );
}

function buildIndexText(...parts: string[]) {
  return norm(parts.join(" "));
}

function ld(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 3) return 99;
  const matrix = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );

      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + cost);
      }
    }
  }

  return matrix[a.length][b.length];
}

function maxDistance(token: string) {
  if (token.length <= 4) return 1;
  if (token.length <= 7) return 2;
  return 3;
}

function emptyMemory(): SearchMemory {
  return { corrections: {}, docClicks: {}, savedQueries: [] };
}

function loadMemory() {
  if (typeof window === "undefined") return emptyMemory();

  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    return raw ? { ...emptyMemory(), ...JSON.parse(raw) } : emptyMemory();
  } catch {
    return emptyMemory();
  }
}

function saveMemory(memory: SearchMemory) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(memory));
  } catch {
    return;
  }
}

function makeProfileIndex(
  profile: MiniProfile,
  kind: "person" | "circle"
): SearchIndex<RankedPerson | RankedCircle> {
  const tag =
    kind === "person"
      ? ["people", "person", "member"]
      : ["circle", "circles", "community", "group"];
  const keywords = buildKeywords(
    profile.name,
    profile.handle,
    profile.location,
    profile.bio,
    ...tag
  );
  const haystack = buildIndexText(
    profile.name,
    profile.handle,
    profile.location,
    profile.bio,
    tag.join(" ")
  );
  const tokens = new Set(tok(haystack));

  return {
    scope: kind === "person" ? "people" : "circles",
    item: {
      ...profile,
      _id: `${kind}:${profile.handle}`,
      _type: kind,
      _score: 0,
      _keywords: keywords,
    },
    haystack,
    tokens,
    keywords,
  };
}

function makePostIndex(post: Post): SearchIndex<RankedPost> {
  const derivedType =
    post.category === "Event"
      ? "event"
      : post.category === "Opportunity"
        ? "opportunity"
        : "post";
  const keywords = buildKeywords(
    post.author.name,
    post.author.handle,
    post.location,
    post.body,
    post.category,
    ...post.tags,
    post.eventMeta?.date ?? "",
    post.eventMeta?.venue ?? "",
    post.opportunityMeta?.role ?? "",
    post.opportunityMeta?.type ?? ""
  );
  const haystack = buildIndexText(
    post.author.name,
    post.author.handle,
    post.location,
    post.body,
    post.category,
    post.tags.join(" "),
    post.eventMeta?.date ?? "",
    post.eventMeta?.venue ?? "",
    post.opportunityMeta?.role ?? "",
    post.opportunityMeta?.type ?? ""
  );

  return {
    scope:
      derivedType === "event"
        ? "events"
        : derivedType === "opportunity"
          ? "opportunities"
          : "posts",
    item: {
      ...post,
      _id: `post:${post.id}`,
      _type: derivedType,
      _score: 0,
      _keywords: keywords,
    },
    haystack,
    tokens: new Set(tok(haystack)),
    keywords,
  };
}

function makeTagIndexes() {
  const counts = new Map<string, number>();

  POSTS.forEach((post) => {
    post.tags.forEach((tag) => {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    });
  });

  return Array.from(counts.entries()).map(([label, count]) => {
    const keywords = buildKeywords(label, "tag", "topic");
    const haystack = buildIndexText(label, "tag topic");

    return {
      scope: "tags" as const,
      item: {
        _id: `tag:${norm(label)}`,
        _type: "tag" as const,
        _score: 0,
        _keywords: keywords,
        label,
        count,
      },
      haystack,
      tokens: new Set(tok(haystack)),
      keywords,
    };
  });
}

const PROFILE_INDEX = [
  ...PEOPLE.map((person) => makeProfileIndex(person, "person")),
  ...CIRCLES.map((circle) => makeProfileIndex(circle, "circle")),
];

const POST_INDEX = POSTS.map((post) => makePostIndex(post));
const TAG_INDEX = makeTagIndexes();
const SEARCH_INDEX = [...PROFILE_INDEX, ...POST_INDEX, ...TAG_INDEX];

const CORE_WORDS = new Set<string>();
Object.values(TYPOS).forEach((word) => CORE_WORDS.add(norm(word)));
Object.entries(SYNONYMS).forEach(([root, matches]) => {
  tok(root).forEach((word) => CORE_WORDS.add(word));
  matches.forEach((word) => tok(word).forEach((token) => CORE_WORDS.add(token)));
});
SEARCH_INDEX.forEach((entry) => {
  entry.keywords.forEach((word) => CORE_WORDS.add(word));
});
[
  "announcement",
  "camden",
  "career",
  "event",
  "fairfax",
  "founder",
  "group",
  "hiring",
  "housing",
  "internship",
  "jobs",
  "mentoring",
  "networking",
  "novruz",
  "opportunity",
  "pickup",
  "product",
  "remote",
  "roommate",
  "student",
].forEach((word) => CORE_WORDS.add(word));

function expandTokens(tokens: string[]) {
  const expanded = new Set<string>();

  tokens.forEach((token) => {
    if (!token) return;
    expanded.add(token);

    Object.entries(SYNONYMS).forEach(([root, values]) => {
      const roots = new Set([root, ...values].flatMap(tok));
      if (roots.has(token)) {
        roots.forEach((value) => expanded.add(value));
      }
    });
  });

  return Array.from(expanded);
}

function correctToken(
  token: string,
  learnedCorrections: Record<string, string>
): { token: string; fixed: boolean } {
  if (!token) return { token, fixed: false };
  if (learnedCorrections[token]) {
    return { token: learnedCorrections[token], fixed: learnedCorrections[token] !== token };
  }
  if (TYPOS[token]) {
    return { token: TYPOS[token], fixed: true };
  }
  if (CORE_WORDS.has(token)) {
    return { token, fixed: false };
  }

  let best = token;
  let bestDistance = 99;

  CORE_WORDS.forEach((candidate) => {
    const distance = ld(token, candidate);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  });

  if (best !== token && bestDistance <= maxDistance(token)) {
    return { token: best, fixed: true };
  }

  return { token, fixed: false };
}

function interpretQuery(raw: string, learnedCorrections: Record<string, string>) {
  const rawTokens = tok(raw);
  const corrections: Correction[] = [];
  const fixedTokens = rawTokens.map((token) => {
    const corrected = correctToken(token, learnedCorrections);
    if (corrected.fixed && corrected.token !== token) {
      corrections.push({ raw: token, to: corrected.token });
    }
    return corrected.token;
  });

  return { corrections, fixedTokens };
}

function matchesScope(itemScope: SearchScope, filterScope: SearchScope) {
  if (filterScope === "all") return true;
  if (filterScope === itemScope) return true;
  if (filterScope === "posts" && (itemScope === "events" || itemScope === "opportunities")) {
    return true;
  }
  return false;
}

function matchesTopic(entry: SearchIndex<SearchItem>, topic: string) {
  const topicTokens = expandTokens(tok(topic));
  if (!topicTokens.length) return false;

  return topicTokens.some(
    (token) => entry.tokens.has(token) || entry.haystack.includes(token)
  );
}

function scoreEntry(
  entry: SearchIndex<SearchItem>,
  rawQuery: string,
  fixedTokens: string[],
  docClicks: Record<string, number>
) {
  const phrase = norm(rawQuery);
  const expandedTokens = expandTokens(fixedTokens);
  let score = (docClicks[entry.item._id] ?? 0) * 4;

  if (!fixedTokens.length) {
    return score + 1;
  }

  if (phrase && entry.haystack.includes(phrase)) {
    score += 14;
  }

  const matched = new Set<string>();

  expandedTokens.forEach((token) => {
    if (!token) return;

    if (entry.tokens.has(token)) {
      score += 6;
      matched.add(token);
      return;
    }

    if (
      Array.from(entry.tokens).some(
        (candidate) => candidate.startsWith(token) || candidate.includes(token)
      )
    ) {
      score += 3;
      matched.add(token);
      return;
    }

    if (entry.haystack.includes(token)) {
      score += 2;
      matched.add(token);
    }
  });

  if (matched.size === 0) {
    return 0;
  }

  return score + matched.size * 2;
}

function pickTopicOptions(docClicks: Record<string, number>) {
  const weights = new Map<string, number>();

  BASE_TOPIC_OPTIONS.forEach((option) => weights.set(option.id, 0));

  SEARCH_INDEX.forEach((entry) => {
    const clicks = docClicks[entry.item._id] ?? 0;
    if (!clicks) return;

    BASE_TOPIC_OPTIONS.forEach((option) => {
      if (matchesTopic(entry, option.id)) {
        weights.set(option.id, (weights.get(option.id) ?? 0) + clicks);
      }
    });
  });

  return [...BASE_TOPIC_OPTIONS].sort((left, right) => {
    const delta = (weights.get(right.id) ?? 0) - (weights.get(left.id) ?? 0);
    if (delta !== 0) return delta;
    return BASE_TOPIC_OPTIONS.findIndex((option) => option.id === left.id) -
      BASE_TOPIC_OPTIONS.findIndex((option) => option.id === right.id);
  });
}

function computeResults(
  rawQuery: string,
  filterScope: SearchScope,
  topicFilters: Set<string>,
  memory: SearchMemory
) {
  const trimmed = rawQuery.trim();
  const hasQuery = trimmed.length >= 2;
  const hasFilters = filterScope !== "all" || topicFilters.size > 0;

  if (!hasQuery && !hasFilters) {
    return {
      corrections: [] as Correction[],
      counts: EMPTY_COUNTS,
      effectiveQuery: "",
      results: EMPTY_RESULTS,
    };
  }

  const interpreted = hasQuery
    ? interpretQuery(trimmed, memory.corrections)
    : { corrections: [] as Correction[], fixedTokens: [] as string[] };
  const effectiveQuery = interpreted.fixedTokens.join(" ").trim() || trimmed;
  const selectedTopics = [...topicFilters];

  const visible = SEARCH_INDEX.map((entry) => {
    if (!matchesScope(entry.scope, filterScope)) return null;
    if (selectedTopics.some((topic) => !matchesTopic(entry, topic))) return null;

    const score = scoreEntry(entry, effectiveQuery || trimmed, interpreted.fixedTokens, memory.docClicks);
    if (!score) return null;

    return {
      ...entry.item,
      _score: score,
    };
  })
    .filter(Boolean)
    .sort((left, right) => {
      const a = left as SearchItem;
      const b = right as SearchItem;
      return b._score - a._score;
    }) as SearchItem[];

  const people = visible.filter((item): item is RankedPerson => item._type === "person");
  const circles = visible.filter((item): item is RankedCircle => item._type === "circle");
  const posts = visible.filter(
    (item): item is RankedPost =>
      item._type === "post" || item._type === "event" || item._type === "opportunity"
  );
  const events = posts.filter((item) => item._type === "event");
  const opportunities = posts.filter((item) => item._type === "opportunity");
  const tags = visible.filter((item): item is RankedTag => item._type === "tag");

  const counts: SearchCounts = {
    people: people.length,
    circles: circles.length,
    posts: posts.length,
    events: events.length,
    opportunities: opportunities.length,
    tags: tags.length,
    total: visible.length,
  };

  return {
    corrections: interpreted.corrections,
    counts,
    effectiveQuery,
    results: {
      people,
      circles,
      posts,
      events,
      opportunities,
      tags,
      all: visible,
    },
  };
}

export function useSmartSearch({ debounceMs = 160 }: { debounceMs?: number } = {}) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<SearchScope>("all");
  const [topicFilters, setTopicFilters] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [counts, setCounts] = useState<SearchCounts>(EMPTY_COUNTS);
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [effectiveQuery, setEffectiveQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [memory, setMemory] = useState<SearchMemory>(emptyMemory);
  const [memoryVersion, setMemoryVersion] = useState(0);
  const hydratedRef = useRef(false);

  useEffect(() => {
    const next = loadMemory();
    hydratedRef.current = true;
    setMemory(next);
    setMemoryVersion(1);
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    saveMemory(memory);
  }, [memory]);

  useEffect(() => {
    setLoading(true);

    const timer = window.setTimeout(() => {
      const next = computeResults(query, typeFilter, topicFilters, memory);
      setResults(next.results);
      setCounts(next.counts);
      setCorrections(next.corrections);
      setEffectiveQuery(next.effectiveQuery);
      setLoading(false);
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [debounceMs, memory, memoryVersion, query, topicFilters, typeFilter]);

  const toggleTopic = useCallback((topic: string) => {
    setTopicFilters((current) => {
      const next = new Set(current);
      if (next.has(topic)) next.delete(topic);
      else next.add(topic);
      return next;
    });
  }, []);

  const clearTopics = useCallback(() => {
    setTopicFilters(new Set());
  }, []);

  const setQueryImmediate = useCallback((nextQuery: string) => {
    setQuery(nextQuery);
  }, []);

  const recordClick = useCallback((resultId: string) => {
    setMemory((current) => ({
      ...current,
      docClicks: {
        ...current.docClicks,
        [resultId]: (current.docClicks[resultId] ?? 0) + 1,
      },
    }));
    setMemoryVersion((current) => current + 1);
  }, []);

  const resetMemory = useCallback(() => {
    setMemory((current) => ({
      ...current,
      corrections: {},
      docClicks: {},
    }));
    setMemoryVersion((current) => current + 1);
  }, []);

  const saveSearch = useCallback(
    (input = query) => {
      const trimmed = input.trim();
      if (!trimmed) return;

      setMemory((current) => ({
        ...current,
        savedQueries: unique([trimmed, ...current.savedQueries]),
      }));
    },
    [query]
  );

  const removeSavedSearch = useCallback((value: string) => {
    setMemory((current) => ({
      ...current,
      savedQueries: current.savedQueries.filter((item) => item !== value),
    }));
  }, []);

  const clear = useCallback(() => {
    setQuery("");
    setTypeFilter("all");
    setTopicFilters(new Set());
    setResults(EMPTY_RESULTS);
    setCounts(EMPTY_COUNTS);
    setCorrections([]);
    setEffectiveQuery("");
    setLoading(false);
  }, []);

  const topicOptions = useMemo(
    () => pickTopicOptions(memory.docClicks),
    [memory.docClicks]
  );

  return {
    query,
    setQuery,
    setQueryImmediate,
    typeFilter,
    setTypeFilter,
    topicFilters,
    toggleTopic,
    clearTopics,
    results,
    counts,
    corrections,
    effectiveQuery,
    loading,
    recordClick,
    resetMemory,
    clear,
    saveSearch,
    removeSavedSearch,
    savedSearches: memory.savedQueries,
    topicOptions,
  };
}
