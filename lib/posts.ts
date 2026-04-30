import { api } from "./api";
import type { ApiPost, ApiComment } from "./types";

export type CreatePostInput = {
  content: string;
  attachmentUrl?: string;
  attachmentContentType?: string;
  visibilityRegion?: string;
  circleId?: string;
  postedAs?: "user" | "circle";
};

export const postsApi = {
  list: (params?: { authorId?: string; circleId?: string; limit?: number }) => {
    const query: string[] = [];
    if (params?.authorId) query.push(`authorId=${encodeURIComponent(params.authorId)}`);
    if (params?.circleId) query.push(`circleId=${encodeURIComponent(params.circleId)}`);
    if (params?.limit) query.push(`limit=${params.limit}`);
    return api.get<ApiPost[]>(`/posts${query.length ? `?${query.join("&")}` : ""}`);
  },
  get: (id: string) => api.get<ApiPost>(`/posts/${id}`),
  create: (input: CreatePostInput) => api.post<ApiPost>("/posts", input),
  toggleLike: (id: string) =>
    api.post<{ likesCount: number; likedByMe: boolean }>(
      `/posts/${id}/like`,
      {}
    ),
  comment: (id: string, content: string) =>
    api.post<ApiPost & { createdComment: ApiComment }>(
      `/posts/${id}/comment`,
      { content }
    ),
  comments: (id: string) => api.get<ApiComment[]>(`/posts/${id}/comments`),
  saved: () => api.get<ApiPost[]>("/posts/saved"),
  save: (id: string) =>
    api.post<{ saved?: boolean; savedByMe?: boolean; post?: ApiPost }>(
      `/posts/${encodeURIComponent(id)}/save`,
      {}
    ),
  unsave: (id: string) =>
    api.delete<{ saved?: boolean; savedByMe?: boolean; post?: ApiPost }>(
      `/posts/${encodeURIComponent(id)}/save`
    ),
  remove: (id: string) => api.delete<{ ok: true }>(`/posts/${id}`),
};
