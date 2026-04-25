import { api } from "./api";
import type { ApiCircle, ApiPost } from "./types";

export type CreateCircleInput = {
  name: string;
  handle: string;
  bio?: string;
  currentRegion?: string;
  location?: { city?: string; country?: string };
  visibility?: "public" | "request" | "private";
  minAge?: boolean;
  avatarUrl?: string;
  bannerUrl?: string;
};

export const circlesApi = {
  list: (params?: { region?: string; mine?: boolean; q?: string; limit?: number }) => {
    const query: string[] = [];
    if (params?.region) query.push(`region=${encodeURIComponent(params.region)}`);
    if (typeof params?.mine === "boolean") query.push(`mine=${params.mine}`);
    if (params?.q) query.push(`q=${encodeURIComponent(params.q)}`);
    if (params?.limit) query.push(`limit=${params.limit}`);
    return api.get<ApiCircle[]>(`/circles${query.length ? `?${query.join("&")}` : ""}`);
  },
  create: (input: CreateCircleInput) => api.post<ApiCircle>("/circles", input),
  get: (idOrHandle: string) => api.get<ApiCircle>(`/circles/${encodeURIComponent(idOrHandle)}`),
  posts: (idOrHandle: string) =>
    api.get<ApiPost[]>(`/circles/${encodeURIComponent(idOrHandle)}/posts`),
  update: (idOrHandle: string, input: Partial<CreateCircleInput>) =>
    api.patch<ApiCircle>(`/circles/${encodeURIComponent(idOrHandle)}`, input),
  join: (idOrHandle: string) =>
    api.post<ApiCircle>(`/circles/${encodeURIComponent(idOrHandle)}/join`, {}),
  leave: (idOrHandle: string) =>
    api.delete<{ ok: true }>(`/circles/${encodeURIComponent(idOrHandle)}/join`),
};
