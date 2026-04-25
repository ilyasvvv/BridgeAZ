import { api } from "./api";
import type { ApiAuthor, ApiCircle, ApiPost } from "./types";

export type SearchUser = {
  _id: string;
  name: string;
  username?: string;
  accountType?: "personal" | "circle";
  avatarUrl?: string;
  profilePhotoUrl?: string;
  profilePictureUrl?: string;
  headline?: string;
  currentRegion?: string;
  locationNow?: { country?: string; city?: string };
  isMentor?: boolean;
  education?: { institution?: string; fieldOfStudy?: string }[];
  experience?: { company?: string; org?: string; title?: string }[];
};

export type SearchOpportunity = {
  _id: string;
  title: string;
  company?: string;
  orgName?: string;
  type?: string;
  locationMode?: string;
  country?: string;
  city?: string;
  description?: string;
  tags?: string[];
  status?: string;
  createdAt?: string;
  postedBy?: string;
};

export type SearchPost = ApiPost & { author: ApiAuthor };

export type SearchResponse = {
  users: SearchUser[];
  circles: ApiCircle[];
  opportunities: SearchOpportunity[];
  posts: SearchPost[];
  counts: { users: number; circles: number; opportunities: number; posts: number };
};

export type SearchTypes = "users" | "circles" | "opportunities" | "posts";

export const searchApi = {
  search: (params: {
    q?: string;
    types?: SearchTypes[];
    countries?: string[];
    limit?: number;
  }) => {
    const qs: string[] = [];
    if (params.q) qs.push(`q=${encodeURIComponent(params.q)}`);
    if (params.types?.length) qs.push(`types=${params.types.join(",")}`);
    if (params.countries?.length)
      qs.push(`countries=${params.countries.map(encodeURIComponent).join(",")}`);
    if (params.limit) qs.push(`limit=${params.limit}`);
    return api.get<SearchResponse>(`/search${qs.length ? `?${qs.join("&")}` : ""}`);
  },
};
