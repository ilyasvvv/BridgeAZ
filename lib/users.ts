import { api } from "./api";
import type { ApiUser } from "./types";

export type UserSearchResult = {
  _id: string;
  name: string;
  username: string;
  accountType?: "personal" | "circle";
  avatarUrl?: string;
  profilePhotoUrl?: string;
  profilePictureUrl?: string;
  country?: string;
  university?: string;
  company?: string;
  currentRegion?: string;
  headline?: string;
  bio?: string;
  skills?: string[];
  locationNow?: { country?: string; city?: string };
};

export type UpdateProfileInput = Partial<{
  name: string;
  username: string;
  headline: string;
  bio: string;
  currentRegion: string;
  profileVisibility: "public" | "private";
  isPrivate: boolean;
  profilePictureUrl: string;
  profilePhotoUrl: string;
  avatarUrl: string;
  resumeUrl: string;
  skills: string[];
  links: { label?: string; type?: string; url: string }[];
  socialLinks: { linkedin?: string; github?: string; website?: string };
  isMentor: boolean;
  locationNow: { country?: string; city?: string };
  mentorshipAvailability: string;
}>;

export const usersApi = {
  me: () => api.get<ApiUser>("/auth/me"),
  updateMe: (input: UpdateProfileInput) =>
    api.put<ApiUser>("/users/me", input),
  search: (q: string, limit = 10) =>
    api.get<UserSearchResult[]>(
      `/users/search?q=${encodeURIComponent(q)}&limit=${limit}`
    ),
  get: (id: string) => api.get<ApiUser>(`/users/${id}`),
  getByHandle: (username: string) =>
    api.get<ApiUser>(`/users/handle/${encodeURIComponent(username)}`),
  list: (params?: {
    region?: string;
    accountType?: "personal" | "circle";
    isMentor?: boolean;
  }) => {
    const query: string[] = [];
    if (params?.region) query.push(`region=${encodeURIComponent(params.region)}`);
    if (params?.accountType)
      query.push(`accountType=${encodeURIComponent(params.accountType)}`);
    if (typeof params?.isMentor === "boolean")
      query.push(`isMentor=${params.isMentor}`);
    return api.get<ApiUser[]>(`/users${query.length ? `?${query.join("&")}` : ""}`);
  },
};

/**
 * Resolve a username/handle to an ApiUser (or null).
 * The backend search matches against name + username, so we filter to a
 * username-equality result if present.
 */
export async function resolveHandle(handle: string): Promise<ApiUser | null> {
  const lower = handle.toLowerCase();
  try {
    return await usersApi.getByHandle(lower);
  } catch {
    // Fall through to search for older API deployments.
  }

  try {
    const matches = await usersApi.search(lower, 10);
    const exact = matches.find((m) => (m.username || "").toLowerCase() === lower);
    const target = exact || matches[0];
    if (!target) return null;
    return await usersApi.get(target._id);
  } catch {
    return null;
  }
}
