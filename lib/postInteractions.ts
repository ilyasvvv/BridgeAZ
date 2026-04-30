"use client";

type InteractionMap = Record<string, Record<string, string | boolean>>;

const STORAGE_PREFIX = "bc_post_interactions_v1";
export const SAVED_POSTS_EVENT = "bc:saved-posts-changed";

function storageKey(userId?: string | null) {
  return `${STORAGE_PREFIX}:${userId || "anon"}`;
}

function readMap(userId?: string | null): InteractionMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeMap(userId: string | null | undefined, map: InteractionMap) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(userId), JSON.stringify(map));
}

export function getPostInteraction(
  userId: string | null | undefined,
  postId: string,
  key: string
) {
  return readMap(userId)[postId]?.[key];
}

export function setPostInteraction(
  userId: string | null | undefined,
  postId: string,
  key: string,
  value: string | boolean
) {
  const map = readMap(userId);
  map[postId] = { ...(map[postId] || {}), [key]: value };
  writeMap(userId, map);
  if (key === "saved") {
    window.dispatchEvent(new CustomEvent(SAVED_POSTS_EVENT));
  }
}

export function getSavedPostIds(userId?: string | null): string[] {
  const map = readMap(userId);
  return Object.entries(map)
    .filter(([, values]) => values.saved === true)
    .map(([postId]) => postId);
}
