// Qovshaq Phase 1C — API wrapper for /api/q/* endpoints
import { apiClient } from "../../api/client";

export const qApi = {
  // Posts
  getPosts: (params, token, opts) => {
    const qs = new URLSearchParams();
    if (params.country) qs.set("country", params.country);
    if (params.city) qs.set("city", params.city);
    if (params.category) qs.set("category", Array.isArray(params.category) ? params.category.join(",") : params.category);
    if (params.tags?.length) qs.set("tags", params.tags.join(","));
    if (params.search) qs.set("search", params.search);
    if (params.sort) qs.set("sort", params.sort);
    if (params.timeRange) qs.set("timeRange", params.timeRange);
    if (params.page) qs.set("page", params.page);
    if (params.limit) qs.set("limit", params.limit);
    const query = qs.toString();
    return apiClient.get(`/q/posts${query ? `?${query}` : ""}`, token, opts);
  },

  getPost: (id, token) => apiClient.get(`/q/posts/${id}`, token),

  createPost: (data, token) => apiClient.post("/q/posts", data, token),

  updatePost: (id, data, token) => apiClient.patch(`/q/posts/${id}`, data, token),

  deletePost: (id, token) => apiClient.delete(`/q/posts/${id}`, token),

  likePost: (id, token) => apiClient.post(`/q/posts/${id}/like`, {}, token),

  unlikePost: (id, token) => apiClient.delete(`/q/posts/${id}/like`, token),

  bookmarkPost: (id, token) => apiClient.post(`/q/posts/${id}/bookmark`, {}, token),

  unbookmarkPost: (id, token) => apiClient.delete(`/q/posts/${id}/bookmark`, token),

  interestedPost: (id, token) => apiClient.post(`/q/posts/${id}/interested`, {}, token),

  uninterestedPost: (id, token) => apiClient.delete(`/q/posts/${id}/interested`, token),

  suggestTags: (id, token) => apiClient.post(`/q/posts/${id}/suggest-tags`, {}, token),

  // Comments
  getComments: (postId, token) => apiClient.get(`/q/posts/${postId}/comments`, token),

  createComment: (postId, data, token) => apiClient.post(`/q/posts/${postId}/comments`, data, token),

  // Onboarding
  completeOnboarding: (data, token) => apiClient.post("/q/onboard", data, token),

  // Safety
  blockUser: (userId, token) => apiClient.post(`/q/block/${userId}`, {}, token),

  unblockUser: (userId, token) => apiClient.delete(`/q/block/${userId}`, token),

  reportContent: (data, token) => apiClient.post("/q/report", data, token),

  // Profile
  getQProfile: (userId, token) => apiClient.get(`/q/profile/${userId}`, token),
};
