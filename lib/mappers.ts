import type { MiniProfile } from "@/components/MiniProfileCard";
import type { Post, PostCategory } from "@/components/PostCard";
import type { ProfileMeta } from "@/components/ProfileHeader";
import type { ApiAuthor, ApiCircle, ApiPost, ApiUser } from "./types";
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
    id: a._id,
    name: a.name || "Unknown",
    handle,
    kind,
    location: authorLocation(a),
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
  const mini = authorToMiniProfile({
    _id: u._id,
    name: u.name,
    username: u.username,
    avatarUrl: u.avatarUrl,
    photoUrl: u.photoUrl,
    profilePictureUrl: u.profilePictureUrl,
    currentRegion: u.currentRegion,
    locationNow: u.locationNow,
    accountType: u.accountType,
    isMentor: u.isMentor,
  });
  return {
    ...mini,
    bio: u.bio || u.headline || "",
    location: userLocation(u),
  };
}

export function circleToMiniProfile(c: ApiCircle): MiniProfile {
  const location = circleLocation(c);
  return {
    name: c.name,
    handle: c.handle,
    kind: "circle",
    location,
    bio: c.bio || "",
    hue: hueFromString(c._id || c.handle),
    stats: [
      { label: "MEMBERS", value: String(c.memberCount ?? 0) },
      { label: "POSTS", value: String(c.postCount ?? 0) },
      { label: "ACCESS", value: c.visibility === "request" ? "REQ" : (c.visibility || "public").toUpperCase() },
    ],
  };
}

export function userToProfileMeta(u: ApiUser, isOwner = false): ProfileMeta {
  const link = u.links?.[0]?.url || u.socialLinks?.website || u.socialLinks?.linkedin || u.socialLinks?.github;
  return {
    name: u.name || "Unknown",
    handle: u.username || "user",
    kind: "personal",
    bio: u.bio || "No bio yet.",
    tagline: u.headline || (u.isMentor ? "Mentor" : undefined),
    location: userLocation(u),
    locationOrigin: u.originCountry,
    joined: monthYear(u.createdAt),
    link,
    hue: hueFromString(u._id || u.username || u.name),
    isOwner,
    stats: [
      { label: "SKILLS", value: String(u.skills?.length ?? 0) },
      { label: "POSTS", value: "—" },
      { label: "ROLE", value: u.isMentor ? "MENTOR" : "MEMBER" },
    ],
  };
}

export function circleToProfileMeta(c: ApiCircle): ProfileMeta {
  return {
    name: c.name,
    handle: c.handle,
    kind: "circle",
    bio: c.bio || "No circle bio yet.",
    tagline: `${c.memberCount ?? 0} members · ${circleLocation(c)}`,
    location: circleLocation(c),
    joined: monthYear(c.createdAt),
    hue: hueFromString(c._id || c.handle),
    isOwner: !!c.isOwner,
    stats: [
      { label: "MEMBERS", value: String(c.memberCount ?? 0) },
      { label: "POSTS", value: String(c.postCount ?? 0) },
      { label: "VISIBILITY", value: c.visibility === "request" ? "REQUEST" : (c.visibility || "PUBLIC").toUpperCase() },
    ],
  };
}

function inferCategory(content: string): PostCategory {
  const lower = (content || "").toLowerCase();
  if (/(hiring|job|internship|scholarship|apply|role at|we're hiring)/i.test(lower)) return "Opportunity";
  if (/(event|meetup|rsvp|tonight|tomorrow|join us|gathering|hosting)/i.test(lower)) return "Event";
  if (/(looking for|searching for|anyone know|need a|roommate|need help finding)/i.test(lower)) return "Searching for";
  if (/(announcement|announce|new:|update:|important:)/i.test(lower)) return "Announcement";
  return "Note";
}

export function apiPostToUiPost(
  p: ApiPost,
  optionsOrIndex: { originLocation?: string } | number = {}
): Post {
  const options = typeof optionsOrIndex === "object" ? optionsOrIndex : {};
  const tags = extractHashtags(p.content || "");
  const contentWithoutTags = (p.content || "").replace(/\s*#[a-zA-Z0-9_]{2,30}/g, "").trim();
  const commentsCount = typeof p.commentCount === "number"
    ? p.commentCount
    : Array.isArray(p.comments) ? p.comments.length : 0;
  const author = p.postedAs === "circle" && p.circle
    ? circleToMiniProfile(p.circle)
    : authorToMiniProfile(p.author);

  return {
    id: p._id,
    author,
    category: inferCategory(p.content || ""),
    time: relativeTime(p.createdAt),
    location:
      options.originLocation ||
      author.location ||
      authorLocation(p.author) ||
      p.visibilityRegion ||
      "—",
    body: contentWithoutTags || p.content || "",
    tags,
    hasMedia: !!p.attachmentUrl && p.attachmentKind === "image",
    mediaUrl: p.attachmentKind === "image" ? p.attachmentUrl : undefined,
    mediaHue: hueFromString(p._id),
    likedByMe: !!p.likedByMe,
    comments: (p.comments || []).map((c) => ({
      id: c._id,
      authorName: c.author?.name || "Unknown",
      authorHandle: c.author?.username,
      body: c.content,
      time: relativeTime(c.createdAt),
      hue: hueFromString(c.author?._id || c._id),
    })),
    stats: {
      likes: p.likesCount || 0,
      comments: commentsCount,
      shares: 0,
    },
  };
}

function authorLocation(a: ApiAuthor): string {
  const city = a.locationNow?.city;
  const country = a.locationNow?.country;
  if (city && country) return `${city}, ${country}`;
  return city || a.currentRegion || country || "";
}

function userLocation(u: ApiUser): string {
  const city = u.locationNow?.city;
  const country = u.locationNow?.country;
  if (city && country) return `${city}, ${country}`;
  return u.currentRegion || country || city || "—";
}

function circleLocation(c: ApiCircle): string {
  const city = c.location?.city;
  const country = c.location?.country;
  if (city && country) return `${city}, ${country}`;
  return c.currentRegion || country || city || "Global";
}

function monthYear(value?: string): string {
  if (!value) return "recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "recently";
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

// Re-export for convenience
export { avatarFromAuthor };
