import type { MiniProfile } from "@/components/MiniProfileCard";
import type { Post, PostCategory } from "@/components/PostCard";
import type { ApiAuthor, ApiPost, ApiUser } from "./types";
import {
  avatarFromAuthor,
  extractHashtags,
  hueFromString,
  relativeTime,
} from "./format";

export function authorToMiniProfile(
  a: ApiAuthor,
  fallback?: { followers?: number; circles?: number }
): MiniProfile {
  const kind = a.accountType === "circle" ? "circle" : "personal";
  const handle = a.username || (a.name || "user").toLowerCase().replace(/\s+/g, "");
  return {
    name: a.name || "Unknown",
    handle,
    kind,
    location: a.currentRegion || "",
    bio: "",
    hue: hueFromString(a._id || a.name || handle),
    stats: [
      { label: "POSTS", value: "—" },
      { label: "FOLLOWERS", value: fallback?.followers != null ? String(fallback.followers) : "—" },
      { label: kind === "circle" ? "EVENTS" : "CIRCLES", value: fallback?.circles != null ? String(fallback.circles) : "—" },
    ],
  };
}

export function userToMiniProfile(u: ApiUser): MiniProfile {
  return authorToMiniProfile({
    _id: u._id,
    name: u.name,
    username: u.username,
    avatarUrl: u.avatarUrl,
    photoUrl: u.photoUrl,
    profilePictureUrl: u.profilePictureUrl,
    currentRegion: u.currentRegion,
    accountType: u.accountType,
    isMentor: u.isMentor,
  });
}

function inferCategory(content: string): PostCategory {
  const lower = (content || "").toLowerCase();
  if (/(hiring|job|internship|scholarship|apply|role at|we're hiring)/i.test(lower)) return "Opportunity";
  if (/(event|meetup|rsvp|tonight|tomorrow|join us|gathering|hosting)/i.test(lower)) return "Event";
  if (/(looking for|searching for|anyone know|need a|roommate|need help finding)/i.test(lower)) return "Searching for";
  if (/(announcement|announce|new:|update:|important:)/i.test(lower)) return "Announcement";
  return "Note";
}

export function apiPostToUiPost(p: ApiPost): Post {
  const tags = extractHashtags(p.content || "");
  const contentWithoutTags = (p.content || "").replace(/\s*#[a-zA-Z0-9_]{2,30}/g, "").trim();
  const commentsCount = typeof p.commentCount === "number"
    ? p.commentCount
    : Array.isArray(p.comments) ? p.comments.length : 0;

  return {
    id: p._id,
    author: authorToMiniProfile(p.author),
    category: inferCategory(p.content || ""),
    time: relativeTime(p.createdAt),
    location: p.author?.currentRegion || p.visibilityRegion || "—",
    body: contentWithoutTags || p.content || "",
    tags,
    hasMedia: !!p.attachmentUrl && p.attachmentKind === "image",
    mediaHue: hueFromString(p._id),
    stats: {
      likes: p.likesCount || 0,
      comments: commentsCount,
      shares: 0,
    },
  };
}

// Re-export for convenience
export { avatarFromAuthor };
