import { api } from "./api";
import type { ApiAuthor } from "./types";

export type ChatParticipant = ApiAuthor & {
  _id: string;
};

export type ChatThread = {
  _id: string;
  participants: ChatParticipant[];
  status?: "pending" | "active" | "rejected";
  requestedBy?: string;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
  lastMessageAt?: string;
  createdAt?: string;
  updatedAt?: string;
  otherParticipant?: ChatParticipant;
  myLastReadAt?: string | null;
  otherLastReadAt?: string | null;
};

export type ChatAttachment = {
  url: string;
  contentType?: string;
  kind?: "image" | "pdf" | "file";
  name?: string;
};

export type ChatMessage = {
  _id: string;
  threadId: string;
  senderId: string | ChatParticipant;
  body?: string;
  share?: {
    entityType: string;
    entityId: string;
    url: string;
    title?: string;
    subtitle?: string;
    imageUrl?: string;
  };
  replyTo?: { messageId: string; body?: string; senderId?: string };
  attachments?: ChatAttachment[];
  attachmentUrl?: string;
  attachmentContentType?: string;
  attachmentKind?: "image" | "pdf" | "file";
  attachmentName?: string;
  reactions?: Record<string, string[]>;
  createdAt: string;
  updatedAt?: string;
};

export type SendMessageInput = {
  body?: string;
  attachments?: ChatAttachment[];
  attachmentUrl?: string;
  attachmentContentType?: string;
  attachmentKind?: "image" | "pdf" | "file";
  attachmentName?: string;
  replyTo?: { messageId: string; body?: string; senderId?: string };
};

export const chatsApi = {
  threads: () => api.get<ChatThread[]>("/chats/threads"),
  messages: (threadId: string) =>
    api.get<ChatMessage[]>(`/chats/threads/${threadId}/messages`),
  send: (threadId: string, input: SendMessageInput) =>
    api.post<ChatMessage>(`/chats/threads/${threadId}/messages`, input),
  startThread: (userId: string) =>
    api.post<ChatThread>("/chats/threads", { userId }),
  markRead: (threadId: string) =>
    api.post<{ ok: true; threadId: string; lastReadAt: string }>(
      `/chats/threads/${threadId}/read`,
      {}
    ),
  accept: (threadId: string) =>
    api.post<ChatThread>(`/chats/threads/${threadId}/accept`, {}),
  reject: (threadId: string) =>
    api.post<ChatThread>(`/chats/threads/${threadId}/reject`, {}),
  react: (messageId: string, emoji: string) =>
    api.post<ChatMessage>(`/chats/messages/${messageId}/react`, { emoji }),
};
