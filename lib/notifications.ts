import { api } from "./api";

export type ApiNotification = {
  _id: string;
  type:
    | "post_like"
    | "post_comment"
    | "follow"
    | "mention"
    | "chat_request"
    | "chat_message"
    | "circle_invite"
    | "event"
    | string;
  userId: string;
  actorId?: string;
  postId?: string;
  title: string;
  body?: string;
  link?: string;
  read: boolean;
  metadata?: Record<string, unknown> & {
    threadId?: string;
    actorName?: string;
  };
  createdAt: string;
  updatedAt?: string;
};

export const notificationsApi = {
  list: () => api.get<ApiNotification[]>("/notifications"),
  markAllRead: () =>
    api.patch<{ message: string }>("/notifications/read-all"),
  markRead: (id: string) =>
    api.patch<ApiNotification>(`/notifications/${id}/read`),
};

/**
 * The backend writes `link` like `/chats?thread=:id`. The Next.js app uses
 * `/messages?thread=:id`. Translate any backend link to a Next path.
 */
export function notificationLink(n: ApiNotification): string {
  const link = n.link || "";
  if (link.startsWith("/chats")) {
    return link.replace(/^\/chats/, "/messages");
  }
  if (n.type === "follow" && n.actorId) {
    return `/notifications`;
  }
  if (n.type === "post_like" || n.type === "post_comment" || n.type === "mention") {
    if (n.postId) return `/home#post-${n.postId}`;
  }
  return link || "/notifications";
}
