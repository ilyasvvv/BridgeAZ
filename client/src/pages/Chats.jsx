import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { apiClient, uploadViaPresign } from "../api/client";
import { useAuth } from "../utils/auth";
import UserChip, { USER_CHIP_SIZES } from "../components/UserChip";

const allowedAttachmentTypes = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv"
]);
const maxAttachmentBytes = 5 * 1024 * 1024;
const quickReactions = ["👍", "❤️", "😂", "😮", "👎"];

export default function Chats() {
  const { token, user } = useAuth();
  const location = useLocation();
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [threadPreviews, setThreadPreviews] = useState({});
  const [connectionIds, setConnectionIds] = useState(new Set());
  const [mentorshipIds, setMentorshipIds] = useState(new Set());
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [attachmentPreviewUrls, setAttachmentPreviewUrls] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [viewerAttachment, setViewerAttachment] = useState(null);
  const [viewerZoom, setViewerZoom] = useState(1);
  const [replyingTo, setReplyingTo] = useState(null);
  const [activeReactionMessageId, setActiveReactionMessageId] = useState("");
  const [openMenuMessageId, setOpenMenuMessageId] = useState("");
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  const [error, setError] = useState("");
  const requestedThreadId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("thread");
  }, [location.search]);

  const loadThreads = async () => {
    setError("");
    try {
      const data = await apiClient.get("/chats/threads", token);
      setThreads(data);
      if (data.length) {
        const preferred = requestedThreadId
          ? data.find((thread) => thread._id === requestedThreadId)
          : null;
        if (preferred) {
          setActiveThread(preferred);
        } else if (!activeThread) {
          setActiveThread(data[0]);
        }
      }
    } catch (err) {
      setError(err.message || "Failed to load threads");
    }
  };

  const loadRelationshipData = async () => {
    try {
      const [connectionsData, mentorshipData] = await Promise.all([
        apiClient.get("/me/connections", token),
        apiClient.get("/me/mentorships", token)
      ]);

      const nextConnectionIds = new Set();
      for (const connection of connectionsData || []) {
        if (connection?.status !== "accepted") continue;
        const requesterId = connection?.requesterId?._id;
        const addresseeId = connection?.addresseeId?._id;
        const otherId = String(requesterId) === String(user?._id) ? addresseeId : requesterId;
        if (otherId) {
          nextConnectionIds.add(String(otherId));
        }
      }

      const nextMentorshipIds = new Set();
      for (const mentorship of mentorshipData || []) {
        const mentorId = mentorship?.mentorId?._id;
        const menteeId = mentorship?.menteeId?._id;
        const otherId = String(mentorId) === String(user?._id) ? menteeId : mentorId;
        if (otherId) {
          nextMentorshipIds.add(String(otherId));
        }
      }

      setConnectionIds(nextConnectionIds);
      setMentorshipIds(nextMentorshipIds);
    } catch (relationshipError) {
      // Keep default relationship labels if network metadata fails.
    }
  };

  const getAttachmentKind = (contentType, url) => {
    const type = (contentType || "").toLowerCase();
    const lowerUrl = (url || "").toLowerCase();
    if (
      type.startsWith("image/") ||
      [".png", ".jpg", ".jpeg", ".webp", ".gif"].some((ext) => lowerUrl.endsWith(ext))
    ) {
      return "image";
    }
    if (type === "application/pdf" || lowerUrl.endsWith(".pdf")) {
      return "pdf";
    }
    return "file";
  };

  const normalizeMessageAttachments = (message) => {
    if (Array.isArray(message.attachments) && message.attachments.length > 0) {
      return message.attachments
        .filter((item) => item?.url)
        .map((item) => ({
          url: item.url,
          contentType: item.contentType || "",
          kind: item.kind || getAttachmentKind(item.contentType, item.url),
          name: item.name || item.url.split("/").pop() || "Attachment"
        }));
    }
    if (message.attachmentUrl) {
      return [
        {
          url: message.attachmentUrl,
          contentType: message.attachmentContentType || "",
          kind:
            message.attachmentKind ||
            getAttachmentKind(message.attachmentContentType, message.attachmentUrl),
          name:
            message.attachmentName ||
            message.attachmentUrl.split("/").pop() ||
            "Attachment"
        }
      ];
    }
    return [];
  };

  const normalizeReactions = (reactionsValue) => {
    if (!reactionsValue) return {};
    if (reactionsValue instanceof Map) {
      return Object.fromEntries(reactionsValue.entries());
    }
    if (typeof reactionsValue === "object") {
      return reactionsValue;
    }
    return {};
  };

  const getSenderName = (senderId) => {
    if (String(senderId) === String(user?._id)) return "You";
    if (String(senderId) === String(activeThread?.otherParticipant?._id)) {
      return activeThread?.otherParticipant?.name || "Member";
    }
    return "Member";
  };

  const getReplySnippet = (message) => {
    const base = (message?.body || "").trim();
    const fallback = normalizeMessageAttachments(message).length ? "Attachment" : "";
    const text = base || fallback || "Message";
    return text.length > 80 ? `${text.slice(0, 79)}…` : text;
  };

  const openViewer = (attachment) => {
    setViewerAttachment(attachment);
    setViewerZoom(1);
  };

  const toPreviewText = (message) => {
    if (!message) return "No messages yet.";
    const base = (message.body || "").trim();
    const hasAttachment = normalizeMessageAttachments(message).length > 0;
    const fallback = hasAttachment ? "Attachment" : "No messages yet.";
    const text = base || fallback;
    const prefix = message.senderId === user?._id ? "You: " : "";
    const combined = `${prefix}${text}`;
    return combined.length > 80 ? `${combined.slice(0, 79)}…` : combined;
  };

  const loadThreadPreviews = async (threadsData) => {
    if (!threadsData?.length) {
      setThreadPreviews({});
      return;
    }
    const previewEntries = await Promise.all(
      threadsData.map(async (thread) => {
        try {
          const threadMessages = await apiClient.get(`/chats/threads/${thread._id}/messages`, token);
          const lastMessage = threadMessages[threadMessages.length - 1];
          return [thread._id, toPreviewText(lastMessage)];
        } catch (previewError) {
          return [thread._id, "Tap to open conversation"];
        }
      })
    );
    setThreadPreviews(Object.fromEntries(previewEntries));
  };

  const loadMessages = async (threadId) => {
    try {
      const data = await apiClient.get(`/chats/threads/${threadId}/messages`, token);
      setMessages(data);
    } catch (err) {
      setError(err.message || "Failed to load messages");
    }
  };

  const markThreadRead = async (threadId) => {
    try {
      const result = await apiClient.post(`/chats/threads/${threadId}/read`, {}, token);
      setThreads((prev) =>
        prev.map((thread) =>
          thread._id === threadId ? { ...thread, myLastReadAt: result.lastReadAt } : thread
        )
      );
      setActiveThread((prev) =>
        prev && prev._id === threadId ? { ...prev, myLastReadAt: result.lastReadAt } : prev
      );
    } catch (err) {
      setError(err.message || "Failed to mark as read");
    }
  };

  const formatTime = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const normalizeThreadStatus = (thread) => thread?.status || "active";

  const validateAttachment = (file) => {
    if (!file) return "No file selected";
    if (!allowedAttachmentTypes.has(file.type)) {
      return "Unsupported file type";
    }
    if (file.size > maxAttachmentBytes) {
      return "File must be 5MB or less";
    }
    return "";
  };

  const addAttachments = (files) => {
    if (!files.length) return;
    const accepted = [];
    let firstError = "";

    for (const file of files) {
      const validationError = validateAttachment(file);
      if (validationError) {
        if (!firstError) firstError = validationError;
        continue;
      }
      accepted.push(file);
    }

    if (accepted.length) {
      setError("");
      setAttachments((prev) => [...prev, ...accepted]);
    } else if (firstError) {
      setError(firstError);
    }
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const renderAttachmentBlock = (message) => {
    const items = normalizeMessageAttachments(message);
    if (!items.length) return null;

    return (
      <div className="mt-2 space-y-2">
        {items.map((item, index) => (
          <div key={`${item.url}-${index}`}>
            {item.kind === "image" ? (
              <button
                type="button"
                onClick={() => openViewer(item)}
                className="block w-full"
              >
                <img
                  src={item.url}
                  alt={item.name}
                  className="w-full max-h-[220px] rounded-lg object-contain"
                />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openViewer(item)}
                className="flex w-full items-center justify-between rounded-lg border border-white/10 px-2 py-1 text-[11px] hover:border-teal"
              >
                <span className="truncate">
                  {item.kind === "pdf" ? "PDF" : "File"}: {item.name}
                </span>
                <span className="text-teal underline">Open</span>
              </button>
            )}
          </div>
        ))}
      </div>
    );
  };

  useEffect(() => {
    if (token) {
      loadThreads();
      loadRelationshipData();
    }
  }, [token, requestedThreadId]);

  useEffect(() => {
    if (token && threads.length) {
      loadThreadPreviews(threads);
    }
  }, [threads, token]);

  useEffect(() => {
    if (activeThread?._id) {
      (async () => {
        await loadMessages(activeThread._id);
        await markThreadRead(activeThread._id);
      })();
    }
  }, [activeThread?._id]);

  useEffect(() => {
    setReplyingTo(null);
    setActiveReactionMessageId("");
    setOpenMenuMessageId("");
  }, [activeThread?._id]);

  useEffect(() => {
    if (!attachments.length) {
      setAttachmentPreviewUrls([]);
      return;
    }

    const next = attachments.map((file) =>
      file.type.startsWith("image/") ? URL.createObjectURL(file) : ""
    );
    setAttachmentPreviewUrls(next);

    return () => {
      next.forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [attachments]);

  useEffect(() => {
    if (!viewerAttachment) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setViewerAttachment(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [viewerAttachment]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(pointer: coarse)");
    const sync = () => setIsCoarsePointer(!!media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!openMenuMessageId) return undefined;
    const onPointerDown = (event) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-chat-menu-root='true']")) return;
      setOpenMenuMessageId("");
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpenMenuMessageId("");
      }
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [openMenuMessageId]);

  const handleSend = async (event) => {
    event.preventDefault();
    setError("");
    if (!activeThread) return;
    if (!body && attachments.length === 0) {
      setError("Message body or attachment is required");
      return;
    }
    if (normalizeThreadStatus(activeThread) !== "active") return;

    try {
      let uploadedAttachments = [];
      if (attachments.length) {
        const hasInvalid = attachments.some((file) => !!validateAttachment(file));
        if (hasInvalid) {
          setError("One or more attachments are invalid");
          return;
        }

        uploadedAttachments = await Promise.all(
          attachments.map(async (file) => {
            const presign = await uploadViaPresign(
              { file, purpose: "chat_attachment" },
              token
            );
            const kind = getAttachmentKind(file.type, file.name || "");
            return {
              url: presign.documentUrl,
              contentType: file.type,
              kind,
              name: file.name
            };
          })
        );
      }

      const firstAttachment = uploadedAttachments[0];
      const message = await apiClient.post(
        `/chats/threads/${activeThread._id}/messages`,
        {
          body: body || undefined,
          replyTo: replyingTo
            ? {
                messageId: replyingTo.messageId,
                body: replyingTo.body,
                senderId: replyingTo.senderId
              }
            : undefined,
          attachments: uploadedAttachments,
          attachmentUrl: firstAttachment?.url,
          attachmentContentType: firstAttachment?.contentType,
          attachmentKind: firstAttachment?.kind,
          attachmentName: firstAttachment?.name
        },
        token
      );

      setMessages((prev) => [...prev, message]);
      setThreadPreviews((prev) => ({ ...prev, [activeThread._id]: toPreviewText(message) }));
      setBody("");
      setAttachments([]);
      setReplyingTo(null);
    } catch (err) {
      setError(err.message || "Failed to send message");
    }
  };

  const handleAccept = async () => {
    if (!activeThread?._id) return;
    try {
      const updated = await apiClient.post(
        `/chats/threads/${activeThread._id}/accept`,
        {},
        token
      );
      setThreads((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
      setActiveThread(updated);
    } catch (err) {
      setError(err.message || "Failed to accept request");
    }
  };

  const handleReject = async () => {
    if (!activeThread?._id) return;
    try {
      await apiClient.post(`/chats/threads/${activeThread._id}/reject`, {}, token);
      setThreads((prev) => prev.filter((t) => t._id !== activeThread._id));
      setActiveThread(null);
      setMessages([]);
    } catch (err) {
      setError(err.message || "Failed to decline request");
    }
  };

  const activeStatus = normalizeThreadStatus(activeThread);
  const lastOutgoingMessage = [...messages].reverse().find((message) => message.senderId === user?._id);
  const seenMessageId =
    lastOutgoingMessage &&
    activeThread?.otherLastReadAt &&
    new Date(activeThread.otherLastReadAt) >= new Date(lastOutgoingMessage.createdAt)
      ? lastOutgoingMessage._id
      : null;

  const getRelationshipLabel = (thread) => {
    const otherId = thread?.otherParticipant?._id ? String(thread.otherParticipant._id) : "";
    if (otherId && mentorshipIds.has(otherId)) return "Mentor";
    if (otherId && connectionIds.has(otherId)) return "Link";
    return "Reach";
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragOver(false);
    if (!activeThread || activeStatus !== "active") return;
    const files = Array.from(event.dataTransfer?.files || []);
    addAttachments(files);
  };

  const handleToggleReaction = async (messageId, emoji) => {
    const myId = String(user?._id || "");
    const previousMessages = messages;
    const optimisticMessages = messages.map((message) => {
      if (message._id !== messageId) return message;
      const currentReactions = normalizeReactions(message.reactions);
      const currentList = Array.isArray(currentReactions[emoji])
        ? currentReactions[emoji].map((id) => String(id))
        : [];
      const nextList = currentList.includes(myId)
        ? currentList.filter((id) => id !== myId)
        : [...currentList, myId];
      const nextReactions = { ...currentReactions };
      if (nextList.length) {
        nextReactions[emoji] = nextList;
      } else {
        delete nextReactions[emoji];
      }
      return { ...message, reactions: nextReactions };
    });
    setMessages(optimisticMessages);

    try {
      const updated = await apiClient.post(`/chats/messages/${messageId}/react`, { emoji }, token);
      setMessages((prev) =>
        prev.map((message) => (message._id === messageId ? { ...message, ...updated } : message))
      );
    } catch (reactionError) {
      setMessages(previousMessages);
      setError(reactionError.message || "Failed to react");
    }
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
      <section className="glass rounded-2xl p-3 space-y-2">
        <h2 className="font-display text-xl">Threads</h2>
        {threads.length === 0 ? (
          <p className="text-sm text-mist">No conversations yet.</p>
        ) : (
          threads.map((thread) => (
            <div
              key={thread._id}
              onClick={() => setActiveThread(thread)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setActiveThread(thread);
                }
              }}
              role="button"
              tabIndex={0}
              className={`w-full rounded-xl border px-2.5 py-1.5 text-left text-sm ${
                activeThread?._id === thread._id
                  ? "border-teal bg-teal/10 text-teal"
                  : "border-white/10 text-mist hover:border-teal"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <UserChip
                    user={thread.otherParticipant}
                    size={USER_CHIP_SIZES.THREAD_LIST}
                    showRole={false}
                    onClick={(event) => event.stopPropagation()}
                  />
                  <p className="mt-1 truncate text-xs text-mist">
                    {threadPreviews[thread._id] || "Loading preview..."}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-mist">
                    {getRelationshipLabel(thread)}
                  </span>
                  {normalizeThreadStatus(thread) === "pending" && (
                    <span className="rounded-full border border-amber/40 px-2 py-0.5 text-[10px] uppercase tracking-wide text-amber">
                      {thread.requestedBy === user?._id ? "Pending" : "Incoming"}
                    </span>
                  )}
                  {normalizeThreadStatus(thread) === "rejected" && (
                    <span className="rounded-full border border-coral/40 px-2 py-0.5 text-[10px] uppercase tracking-wide text-coral">
                      Declined
                    </span>
                  )}
                  {thread.lastMessageAt &&
                    (!thread.myLastReadAt ||
                      new Date(thread.myLastReadAt) < new Date(thread.lastMessageAt)) && (
                      <span className="h-2 w-2 rounded-full bg-teal" aria-label="Unread" />
                    )}
                </div>
              </div>
            </div>
          ))
        )}
      </section>
      <section className="glass rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          {activeThread ? (
            <UserChip
              user={activeThread.otherParticipant}
              size={USER_CHIP_SIZES.CHAT_HEADER}
              showRole={false}
              nameClassName="font-display text-xl text-sand"
            />
          ) : (
            <h2 className="font-display text-xl">Messages</h2>
          )}
        </div>
        {error && <p className="text-sm text-coral">{error}</p>}
        {activeThread && activeStatus !== "active" && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-mist">
            {activeStatus === "pending" && activeThread.requestedBy === user?._id ? (
              <p>Request sent. Waiting for approval.</p>
            ) : activeStatus === "pending" ? (
              <div className="space-y-3">
                <p>
                  Do you want to start a conversation with{" "}
                  {activeThread.otherParticipant?.name || "this member"}?
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleAccept}
                    className="rounded-full bg-teal px-4 py-2 text-xs font-semibold uppercase tracking-wide text-charcoal"
                  >
                    Accept
                  </button>
                  <button
                    onClick={handleReject}
                    className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-wide text-mist hover:border-teal"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ) : (
              <p>This request was declined.</p>
            )}
          </div>
        )}
        <div className="min-h-[200px] space-y-2">
          {messages.length === 0 ? (
            <p className="text-sm text-mist">Select a thread to view messages.</p>
          ) : (
            messages.map((message) => {
              const reactions = normalizeReactions(message.reactions);
              const reactionEntries = Object.entries(reactions).filter(
                ([, users]) => Array.isArray(users) && users.length > 0
              );
              const myId = String(user?._id || "");
              const quote = message.replyTo;
              const isMenuOpen = openMenuMessageId === message._id;

              return (
                <div
                  key={message._id}
                  className={`group flex ${message.senderId === user?._id ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`relative max-w-[70%] rounded-xl px-3 py-2 text-sm ${
                      message.senderId === user?._id
                        ? "bg-teal/20 text-sand"
                        : "border border-white/10 text-sand"
                    }`}
                    data-chat-menu-root="true"
                  >
                    {quote?.messageId && (
                      <div className="mb-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1">
                        <p className="text-[10px] uppercase tracking-wide text-mist">
                          {getSenderName(quote.senderId)}
                        </p>
                        <p className="truncate text-xs text-mist">
                          {quote.body || "Attachment"}
                        </p>
                      </div>
                    )}
                    {message.body && <p>{message.body}</p>}
                    {renderAttachmentBlock(message)}
                    <div className="mt-1 flex items-center gap-2">
                      <p className="text-[10px] text-mist">
                        {formatTime(message.createdAt)}
                      </p>
                      {isCoarsePointer && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              setReplyingTo({
                                messageId: message._id,
                                body: getReplySnippet(message),
                                senderId: message.senderId
                              })
                            }
                            className="text-[10px] uppercase tracking-wide text-mist hover:text-sand"
                          >
                            Reply
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setActiveReactionMessageId((prev) =>
                                prev === message._id ? "" : message._id
                              )
                            }
                            className="text-[10px] uppercase tracking-wide text-mist hover:text-sand"
                          >
                            React
                          </button>
                        </>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpenMenuMessageId((prev) => (prev === message._id ? "" : message._id));
                      }}
                      className={`absolute right-2 top-2 rounded-full border border-white/10 px-1.5 py-0 text-xs text-mist transition ${
                        isMenuOpen
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100"
                      }`}
                      aria-label="Message options"
                    >
                      ⋯
                    </button>
                    {isMenuOpen && (
                      <div className="absolute right-2 top-8 z-20 min-w-[140px] rounded-xl border border-white/10 bg-charcoal/95 p-1 shadow-xl">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setActiveReactionMessageId(message._id);
                            setOpenMenuMessageId("");
                          }}
                          className="block w-full rounded-lg px-3 py-1.5 text-left text-xs text-mist hover:bg-white/10"
                        >
                          React
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setReplyingTo({
                              messageId: message._id,
                              body: getReplySnippet(message),
                              senderId: message.senderId
                            });
                            setOpenMenuMessageId("");
                          }}
                          className="block w-full rounded-lg px-3 py-1.5 text-left text-xs text-mist hover:bg-white/10"
                        >
                          Reply
                        </button>
                        <p className="block rounded-lg px-3 py-1.5 text-left text-[11px] text-mist/80">
                          Sent {formatTime(message.createdAt)}
                        </p>
                      </div>
                    )}
                    <div
                      className={`mt-1 flex-wrap gap-1 ${
                        activeReactionMessageId === message._id
                          ? "flex"
                          : "hidden group-hover:flex"
                      }`}
                    >
                        {quickReactions.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleToggleReaction(message._id, emoji)}
                            className="rounded-full border border-white/10 px-2 py-0.5 text-xs hover:border-teal"
                          >
                            {emoji}
                          </button>
                        ))}
                    </div>
                    {reactionEntries.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {reactionEntries.map(([emoji, users]) => {
                          const normalizedUsers = users.map((id) => String(id));
                          const mine = normalizedUsers.includes(myId);
                          return (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleToggleReaction(message._id, emoji)}
                              className={`rounded-full border px-2 py-0.5 text-[11px] ${
                                mine
                                  ? "border-teal bg-teal/10 text-teal"
                                  : "border-white/10 text-mist"
                              }`}
                            >
                              {emoji} {normalizedUsers.length}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {message._id === seenMessageId && <p className="text-[10px] text-mist">Seen</p>}
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div
          onDragOver={(event) => {
            event.preventDefault();
            if (!activeThread || activeStatus !== "active") return;
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`rounded-xl border p-2 transition ${
            isDragOver
              ? "border-teal bg-teal/10"
              : "border-white/10 bg-transparent"
          }`}
        >
          {replyingTo && (
            <div className="mb-2 flex items-start justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-mist">
                  Replying to {getSenderName(replyingTo.senderId)}
                </p>
                <p className="truncate text-xs text-mist">{replyingTo.body}</p>
              </div>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="text-xs uppercase tracking-wide text-coral"
              >
                ×
              </button>
            </div>
          )}
          {attachments.length > 0 && (
            <div className="mb-2 rounded-xl border border-white/10 bg-white/5 p-2 space-y-2">
              {attachments.map((file, index) => (
                <div key={`${file.name}-${file.size}-${index}`} className="rounded-lg border border-white/10 p-2">
                  {attachmentPreviewUrls[index] ? (
                    <img
                      src={attachmentPreviewUrls[index]}
                      alt={file.name}
                      className="max-h-28 rounded-lg object-contain"
                    />
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-mist">
                      <span>{file.type === "application/pdf" ? "PDF" : "File"}</span>
                      <span className="truncate">{file.name}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                    className="mt-2 text-xs uppercase tracking-wide text-coral"
                  >
                    × Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setAttachments([])}
                className="text-xs uppercase tracking-wide text-mist hover:text-sand"
              >
                Clear all
              </button>
            </div>
          )}
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              value={body}
              onChange={(event) => setBody(event.target.value)}
              className="flex-1 rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sm text-sand"
              placeholder="Type a message..."
              disabled={!activeThread || activeStatus !== "active"}
            />
            <label className="rounded-full border border-white/10 px-3 py-2 text-xs uppercase tracking-wide text-mist hover:border-teal cursor-pointer">
              Attach
              <input
                type="file"
                className="hidden"
                multiple
                onChange={(event) => {
                  addAttachments(Array.from(event.target.files || []));
                  event.target.value = "";
                }}
                accept="image/png,image/jpeg,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                disabled={!activeThread || activeStatus !== "active"}
              />
            </label>
            <button
              type="submit"
              className="rounded-full bg-teal px-4 py-2 text-xs font-semibold uppercase tracking-wide text-charcoal disabled:opacity-60"
              disabled={!activeThread || activeStatus !== "active"}
            >
              Send
            </button>
          </form>
          {attachments.length === 0 && (
            <p className="mt-2 text-[11px] text-mist">
              Drag and drop files here, or use Attach.
            </p>
          )}
        </div>
      </section>
      {viewerAttachment && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-charcoal/60 px-4"
          onClick={() => setViewerAttachment(null)}
        >
          <div
            className="glass w-full max-w-5xl max-h-[85vh] overflow-hidden rounded-2xl p-4 space-y-3"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="truncate text-sm text-sand max-w-[60%]">
                {viewerAttachment.name || "Attachment"}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {viewerAttachment.kind === "image" && (
                  <>
                    <button
                      type="button"
                      onClick={() => setViewerZoom((prev) => Math.max(0.5, Number((prev - 0.25).toFixed(2))))}
                      className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-wide text-sand hover:border-teal"
                    >
                      -
                    </button>
                    <span className="text-xs text-mist">{Math.round(viewerZoom * 100)}%</span>
                    <button
                      type="button"
                      onClick={() => setViewerZoom((prev) => Math.min(3, Number((prev + 0.25).toFixed(2))))}
                      className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-wide text-sand hover:border-teal"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewerZoom(1)}
                      className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-wide text-sand hover:border-teal"
                    >
                      Reset
                    </button>
                  </>
                )}
                <a
                  href={viewerAttachment.url}
                  download
                  className="rounded-full bg-teal px-3 py-1 text-xs font-semibold uppercase tracking-wide text-charcoal"
                >
                  Download
                </a>
                <button
                  type="button"
                  onClick={() => setViewerAttachment(null)}
                  className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-wide text-sand hover:border-teal"
                >
                  Close
                </button>
              </div>
            </div>
            {viewerAttachment.kind === "image" ? (
              <div className="h-[72vh] overflow-auto rounded-xl border border-white/10 bg-black/20">
                <img
                  src={viewerAttachment.url}
                  alt={viewerAttachment.name || "Attachment image"}
                  className="mx-auto my-4 max-w-full rounded-xl object-contain"
                  style={{ transform: `scale(${viewerZoom})`, transformOrigin: "center" }}
                />
              </div>
            ) : viewerAttachment.kind === "pdf" ? (
              <iframe
                src={viewerAttachment.url}
                title={viewerAttachment.name || "PDF attachment"}
                className="h-[72vh] w-full rounded-xl border border-white/10"
              />
            ) : (
              <div className="space-y-3 rounded-xl border border-white/10 p-4">
                <p className="text-sm text-mist break-all">{viewerAttachment.name || "File attachment"}</p>
                <p className="text-xs text-mist">Preview unavailable for this file type.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
