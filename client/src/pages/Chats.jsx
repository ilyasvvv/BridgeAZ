import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { API_BASE, apiClient, uploadViaPresign } from "../api/client";
import { useAuth } from "../utils/auth";
import UserChip, { USER_CHIP_SIZES } from "../components/UserChip";
import Avatar from "../components/Avatar";
import BizimHeader from "../components/BizimHeader";

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
const inlineTokenRegex =
  /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\((?:https?:\/\/|www\.)[^\s)]+\)|(?:https?:\/\/|www\.)[^\s<>"']+)/g;
const markdownLinkRegex = /\[([^\]]+)\]\(((?:https?:\/\/|www\.)[^\s)]+)\)/g;
const plainUrlRegex = /(?:https?:\/\/|www\.)[^\s<>"']+/g;

const getEntityId = (value) => String(value?._id || value?.id || value || "");
const sameEntity = (left, right) => getEntityId(left) === getEntityId(right);

export default function Chats({ showHeader = true }) {
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
  const [linkPreviews, setLinkPreviews] = useState({});
  const [sharePostPreviews, setSharePostPreviews] = useState({});
  const [error, setError] = useState("");
  const messagesScrollRef = useRef(null);
  const composerRef = useRef(null);
  const isNearBottomRef = useRef(true);
  const previousMessageCountRef = useRef(0);
  const forceScrollToBottomRef = useRef(false);
  const fetchedSharePostIdsRef = useRef(new Set());
  const newMessageThresholdRef = useRef(0);
  const activeThreadIdRef = useRef("");
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
    if (sameEntity(senderId, user?._id)) return "You";
    if (sameEntity(senderId, activeThread?.otherParticipant?._id)) {
      return activeThread?.otherParticipant?.name || "Member";
    }
    return "Member";
  };

  const getReplySnippet = (message) => {
    const base = (message?.body || "").trim();
    const fallback = message?.share?.title
      ? `Shared: ${message.share.title}`
      : normalizeMessageAttachments(message).length
        ? "Attachment"
        : "";
    const text = base || fallback || "Message";
    return text.length > 80 ? `${text.slice(0, 79)}…` : text;
  };

  const resolveShareEntityId = (share) => {
    if (!share) return "";
    if (share.meta?.postId && share.entityType === "post") return String(share.meta.postId);
    if (share.meta?.opportunityId && share.entityType === "opportunity") {
      return String(share.meta.opportunityId);
    }
    if (share.meta?.profileId && share.entityType === "profile") return String(share.meta.profileId);
    if (share.meta?.commentId && share.entityType === "comment") return String(share.meta.commentId);
    return share.entityId ? String(share.entityId) : "";
  };

  const resolveAvatarUrl = (value) =>
    value?.avatarUrl ||
    value?.photoUrl ||
    value?.profilePhoto ||
    value?.profilePhotoUrl ||
    value?.profilePictureUrl ||
    "";

  const toHref = (rawUrl) => (rawUrl.startsWith("www.") ? `https://${rawUrl}` : rawUrl);

  const trimTrailingUrlPunctuation = (rawUrl) => {
    let value = rawUrl;
    let suffix = "";

    while (/[.,!?;:]$/.test(value)) {
      suffix = value.slice(-1) + suffix;
      value = value.slice(0, -1);
    }
    while (value.endsWith(")")) {
      const opens = (value.match(/\(/g) || []).length;
      const closes = (value.match(/\)/g) || []).length;
      if (closes <= opens) break;
      suffix = ")" + suffix;
      value = value.slice(0, -1);
    }

    return { cleanUrl: value, trailing: suffix };
  };

  const isPrivateOrLocalHostname = (hostname) => {
    const host = (hostname || "").toLowerCase();
    if (!host) return true;
    if (host === "localhost" || host === "::1" || host.endsWith(".local")) return true;
    if (host.startsWith("127.") || host.startsWith("10.") || host.startsWith("192.168.")) return true;
    const match172 = host.match(/^172\.(\d+)\./);
    if (match172) {
      const octet = Number(match172[1]);
      if (octet >= 16 && octet <= 31) return true;
    }
    return false;
  };

  const extractUrlsFromText = (text) => {
    const input = text || "";
    const markdownMatches = [];
    let mdMatch;
    while ((mdMatch = markdownLinkRegex.exec(input)) !== null) {
      const { cleanUrl } = trimTrailingUrlPunctuation(mdMatch[2]);
      markdownMatches.push({
        index: mdMatch.index,
        end: mdMatch.index + mdMatch[0].length,
        url: cleanUrl
      });
    }
    markdownLinkRegex.lastIndex = 0;

    const plainMatches = [];
    let plainMatch;
    while ((plainMatch = plainUrlRegex.exec(input)) !== null) {
      const insideMarkdown = markdownMatches.some(
        (item) => plainMatch.index >= item.index && plainMatch.index < item.end
      );
      if (insideMarkdown) continue;
      const { cleanUrl } = trimTrailingUrlPunctuation(plainMatch[0]);
      plainMatches.push({ index: plainMatch.index, url: cleanUrl });
    }
    plainUrlRegex.lastIndex = 0;

    return [...markdownMatches, ...plainMatches]
      .filter((item) => !!item.url)
      .sort((a, b) => a.index - b.index)
      .map((item) => item.url);
  };

  const renderFormattedBody = (text, keyPrefix) => {
    const input = text || "";
    const parts = [];
    let cursor = 0;
    let match;
    let tokenIndex = 0;

    while ((match = inlineTokenRegex.exec(input)) !== null) {
      if (match.index > cursor) {
        parts.push(input.slice(cursor, match.index));
      }
      const token = match[0];
      const tokenKey = `${keyPrefix}-${tokenIndex++}`;

      if (token.startsWith("**") && token.endsWith("**")) {
        parts.push(<strong key={tokenKey}>{token.slice(2, -2)}</strong>);
      } else if (token.startsWith("*") && token.endsWith("*")) {
        parts.push(<em key={tokenKey}>{token.slice(1, -1)}</em>);
      } else if (token.startsWith("`") && token.endsWith("`")) {
        parts.push(
          <code key={tokenKey} className="rounded bg-surface-alt px-1 py-0.5 text-[0.92em]">
            {token.slice(1, -1)}
          </code>
        );
      } else if (token.startsWith("[")) {
        const parsed = token.match(/^\[([^\]]+)\]\(((?:https?:\/\/|www\.)[^\s)]+)\)$/);
        if (parsed) {
          const { cleanUrl, trailing } = trimTrailingUrlPunctuation(parsed[2]);
          parts.push(
            <a
              key={tokenKey}
              href={toHref(cleanUrl)}
              className="text-accent underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {parsed[1]}
            </a>
          );
          if (trailing) parts.push(trailing);
        } else {
          parts.push(token);
        }
      } else {
        const { cleanUrl, trailing } = trimTrailingUrlPunctuation(token);
        parts.push(
          <a
            key={tokenKey}
            href={toHref(cleanUrl)}
            className="text-accent underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            {cleanUrl}
          </a>
        );
        if (trailing) parts.push(trailing);
      }
      cursor = match.index + token.length;
    }
    inlineTokenRegex.lastIndex = 0;

    if (cursor < input.length) {
      parts.push(input.slice(cursor));
    }
    return parts;
  };

  const openViewer = (attachment) => {
    setViewerAttachment(attachment);
    setViewerZoom(1);
  };

  const toPreviewText = (message) => {
    if (!message) return "No messages yet.";
    const base = (message.body || "").trim();
    const shareText = message.share?.title ? `Shared: ${message.share.title}` : "";
    const hasAttachment = normalizeMessageAttachments(message).length > 0;
    const fallback = shareText || (hasAttachment ? "Attachment" : "No messages yet.");
    const text = base || fallback;
    const prefix = sameEntity(message.senderId, user?._id) ? "You: " : "";
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
      newMessageThresholdRef.current = data.length;
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
              <div className="flex w-full items-center justify-between rounded-lg border border-border px-2 py-1 text-[11px] hover:border-accent">
                <button
                  type="button"
                  onClick={() => openViewer(item)}
                  className="min-w-0 flex-1 truncate text-left"
                >
                  <span className="truncate">
                    {item.kind === "pdf" ? "PDF" : "File"}: {item.name}
                  </span>
                </button>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 shrink-0 text-accent underline"
                >
                  Open
                </a>
              </div>
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
      forceScrollToBottomRef.current = true;
      (async () => {
        await loadMessages(activeThread._id);
        await markThreadRead(activeThread._id);
      })();
    }
  }, [activeThread?._id]);

  useEffect(() => {
    activeThreadIdRef.current = activeThread?._id || "";
  }, [activeThread?._id]);

  useEffect(() => {
    if (!token) return undefined;

    const controller = new AbortController();
    let buffer = "";

    const reloadThreads = async () => {
      try {
        const data = await apiClient.get("/chats/threads", token);
        setThreads(data);
        setActiveThread((prev) => {
          if (!prev?._id) return prev;
          return data.find((thread) => thread._id === prev._id) || prev;
        });
      } catch {
        // Keep the existing view if a background realtime refresh fails.
      }
    };

    const parseEventBlock = (block) => {
      const lines = block.split("\n");
      let event = "message";
      const dataLines = [];

      for (const line of lines) {
        if (line.startsWith("event:")) {
          event = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).trim());
        }
      }

      if (!dataLines.length || event === "heartbeat" || event === "ready") return;

      let payload;
      try {
        payload = JSON.parse(dataLines.join("\n"));
      } catch {
        return;
      }

      if (event === "chat:thread") {
        reloadThreads();
        return;
      }

      if (event === "chat:message" && payload?.threadId && payload?.message) {
        const incoming = payload.message;
        const threadId = String(payload.threadId);
        setThreadPreviews((prev) => ({ ...prev, [threadId]: toPreviewText(incoming) }));
        setThreads((prev) =>
          prev.map((thread) =>
            thread._id === threadId
              ? { ...thread, lastMessageAt: incoming.createdAt || new Date().toISOString() }
              : thread
          )
        );

        if (activeThreadIdRef.current === threadId) {
          setMessages((prev) =>
            prev.some((message) => message._id === incoming._id) ? prev : [...prev, incoming]
          );
          if (!sameEntity(incoming.senderId, user?._id)) {
            apiClient.post(`/chats/threads/${threadId}/read`, {}, token).catch(() => {});
          }
        } else {
          reloadThreads();
        }
        return;
      }

      if (event === "chat:reaction" && payload?.messageId) {
        setMessages((prev) =>
          prev.map((message) =>
            message._id === payload.messageId ? { ...message, reactions: payload.reactions } : message
          )
        );
        return;
      }

      if (event === "chat:read" && payload?.threadId && payload?.userId) {
        const threadId = String(payload.threadId);
        const isMine = sameEntity(payload.userId, user?._id);
        const readKey = isMine ? "myLastReadAt" : "otherLastReadAt";
        setThreads((prev) =>
          prev.map((thread) =>
            thread._id === threadId ? { ...thread, [readKey]: payload.lastReadAt } : thread
          )
        );
        setActiveThread((prev) =>
          prev && prev._id === threadId ? { ...prev, [readKey]: payload.lastReadAt } : prev
        );
      }
    };

    const connect = async () => {
      try {
        const response = await fetch(`${API_BASE}/realtime`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal
        });
        if (!response.ok || !response.body) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        while (!controller.signal.aborted) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split("\n\n");
          buffer = blocks.pop() || "";
          blocks.forEach(parseEventBlock);
        }
      } catch (streamError) {
        if (!controller.signal.aborted) {
          // The polling-free realtime channel is opportunistic; manual refresh still works.
        }
      }
    };

    connect();
    return () => controller.abort();
  }, [token, user?._id]);

  useEffect(() => {
    setReplyingTo(null);
    setActiveReactionMessageId("");
    setOpenMenuMessageId("");
    previousMessageCountRef.current = 0;
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
    const firstUrls = messages
      .map((message) => extractUrlsFromText(message.body || "")[0])
      .filter(Boolean);
    const uniqueUrls = [...new Set(firstUrls)];
    uniqueUrls.forEach((url) => {
      if (linkPreviews[url]) return;
      let parsed;
      try {
        parsed = new URL(toHref(url));
      } catch (urlError) {
        setLinkPreviews((prev) => ({
          ...prev,
          [url]: { status: "ready", url: toHref(url), hostname: url, title: url }
        }));
        return;
      }

      const hostname = parsed.hostname;
      if (isPrivateOrLocalHostname(hostname)) {
        setLinkPreviews((prev) => ({
          ...prev,
          [url]: { status: "ready", url: parsed.toString(), hostname, title: hostname }
        }));
        return;
      }

      setLinkPreviews((prev) => ({
        ...prev,
        [url]: { status: "loading", url: parsed.toString(), hostname, title: hostname }
      }));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);
      fetch(parsed.toString(), { signal: controller.signal })
        .then((response) => response.text())
        .then((html) => {
          const doc = new DOMParser().parseFromString(html, "text/html");
          const title =
            doc.querySelector("meta[property='og:title']")?.getAttribute("content") ||
            doc.querySelector("title")?.textContent ||
            hostname;
          const description =
            doc.querySelector("meta[property='og:description']")?.getAttribute("content") || "";
          const image =
            doc.querySelector("meta[property='og:image']")?.getAttribute("content") || "";
          setLinkPreviews((prev) => ({
            ...prev,
            [url]: {
              status: "ready",
              url: parsed.toString(),
              hostname,
              title: title.trim() || hostname,
              description: description.trim(),
              image: image.trim()
            }
          }));
        })
        .catch(() => {
          setLinkPreviews((prev) => ({
            ...prev,
            [url]: { status: "ready", url: parsed.toString(), hostname, title: hostname }
          }));
        })
        .finally(() => {
          clearTimeout(timeoutId);
        });
    });
  }, [messages, linkPreviews]);

  useEffect(() => {
    if (!token) return;
    const postIds = [...new Set(
      messages
        .filter((message) => message?.share?.entityType === "post")
        .map((message) => resolveShareEntityId(message.share))
        .filter(Boolean)
    )];

    postIds.forEach((postId) => {
      if (fetchedSharePostIdsRef.current.has(postId)) return;
      fetchedSharePostIdsRef.current.add(postId);
      setSharePostPreviews((prev) =>
        prev[postId] ? prev : { ...prev, [postId]: { status: "loading", data: null } }
      );

      apiClient
        .get(`/posts/${postId}`, token)
        .then((postData) => {
          setSharePostPreviews((prev) => ({
            ...prev,
            [postId]: { status: "ready", data: postData || null }
          }));
        })
        .catch(() => {
          setSharePostPreviews((prev) => ({
            ...prev,
            [postId]: { status: "error", data: null }
          }));
        });
    });
  }, [messages, token]);

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
      if (
        target instanceof Element &&
        (target.closest("[data-chat-menu-root='true']") ||
          target.closest("[data-chat-reaction-root='true']"))
      ) {
        return;
      }
      setOpenMenuMessageId("");
      setActiveReactionMessageId("");
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpenMenuMessageId("");
        setActiveReactionMessageId("");
      }
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [openMenuMessageId]);

  useEffect(() => {
    if (!activeReactionMessageId) return undefined;
    const onPointerDown = (event) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-chat-reaction-root='true']")) {
        return;
      }
      setActiveReactionMessageId("");
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setActiveReactionMessageId("");
      }
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeReactionMessageId]);

  useEffect(() => {
    const currentCount = messages.length;
    const previousCount = previousMessageCountRef.current;
    if (!currentCount) {
      previousMessageCountRef.current = 0;
      return;
    }

    const lastMessage = messages[currentCount - 1];
    const shouldAutoScroll =
      forceScrollToBottomRef.current ||
      (currentCount > previousCount &&
        (isNearBottomRef.current || String(lastMessage?.senderId) === String(user?._id)));

    if (shouldAutoScroll) {
      requestAnimationFrame(() => {
        scrollMessagesToBottom(forceScrollToBottomRef.current ? "auto" : "smooth");
      });
      forceScrollToBottomRef.current = false;
    }

    previousMessageCountRef.current = currentCount;
  }, [messages, user?._id]);

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

  const applyFormatting = (mode) => {
    const textarea = composerRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart ?? body.length;
    const end = textarea.selectionEnd ?? body.length;
    const selected = body.slice(start, end);
    const prefix = body.slice(0, start);
    const suffix = body.slice(end);
    let insertValue = "";
    let selectStart = start;
    let selectEnd = end;

    if (mode === "bold") {
      const content = selected || "bold text";
      insertValue = `**${content}**`;
      selectStart = start + 2;
      selectEnd = start + 2 + content.length;
    } else if (mode === "italic") {
      const content = selected || "italic text";
      insertValue = `*${content}*`;
      selectStart = start + 1;
      selectEnd = start + 1 + content.length;
    } else if (mode === "code") {
      const content = selected || "code";
      insertValue = `\`${content}\``;
      selectStart = start + 1;
      selectEnd = start + 1 + content.length;
    } else if (mode === "link") {
      const label = selected || "text";
      const urlPlaceholder = "https://";
      insertValue = `[${label}](${urlPlaceholder})`;
      selectStart = start + label.length + 3;
      selectEnd = selectStart + urlPlaceholder.length;
    }

    const next = `${prefix}${insertValue}${suffix}`;
    setBody(next);
    requestAnimationFrame(() => {
      if (!composerRef.current) return;
      composerRef.current.focus();
      composerRef.current.setSelectionRange(selectStart, selectEnd);
    });
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
  const lastOutgoingMessage = [...messages].reverse().find((message) => sameEntity(message.senderId, user?._id));
  const seenMessageId =
    lastOutgoingMessage &&
    activeThread?.otherLastReadAt &&
    new Date(activeThread.otherLastReadAt) >= new Date(lastOutgoingMessage.createdAt)
      ? lastOutgoingMessage._id
      : null;

  const getRelationshipLabel = (thread) => {
    const otherId = thread?.otherParticipant?._id ? String(thread.otherParticipant._id) : "";
    if (otherId && mentorshipIds.has(otherId)) return "Mentor";
    if (otherId && connectionIds.has(otherId)) return "Bridged";
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
    setActiveReactionMessageId("");

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

  const updateNearBottomFlag = () => {
    const node = messagesScrollRef.current;
    if (!node) return;
    const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
    isNearBottomRef.current = distance <= 120;
  };

  const scrollMessagesToBottom = (behavior = "auto") => {
    const node = messagesScrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior });
    isNearBottomRef.current = true;
  };

  const renderShareCard = (message) => {
    const share = message?.share;
    if (!share?.entityType || !share?.url) return null;
    const entityId = resolveShareEntityId(share);

    if (share.entityType === "post") {
      const preview = sharePostPreviews[entityId];
      const post = preview?.data || null;
      const postAttachmentUrl = post?.attachmentUrl || "";
      const postAttachmentType = post?.attachmentContentType || "";
      const isImage = postAttachmentType.startsWith("image/");
      const attachmentKind = post?.attachmentKind || (isImage ? "image" : postAttachmentUrl ? "file" : "");

      return (
        <Link
          to={share.url}
          className="mt-2 block rounded-lg border border-border bg-charcoal px-2 py-2 hover:border-accent"
        >
          {preview?.status === "loading" || !preview ? (
            <p className="text-xs text-mist">Loading preview...</p>
          ) : post ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Avatar
                  url={resolveAvatarUrl(post.author)}
                  alt={`${post.author?.name || "Member"} avatar`}
                  size={20}
                />
                <p className="text-xs text-sand">{post.author?.name || share.subtitle || "Member"}</p>
              </div>
              {post.content ? (
                <p
                  className="text-xs text-mist"
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 4,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden"
                  }}
                >
                  {post.content}
                </p>
              ) : null}
              {postAttachmentUrl && isImage ? (
                <img
                  src={postAttachmentUrl}
                  alt="Shared post media"
                  className="max-h-36 w-full rounded-lg object-cover"
                />
              ) : postAttachmentUrl ? (
                <div className="rounded-md border border-border px-2 py-1 text-[11px] text-mist">
                  {attachmentKind === "pdf" ? "PDF attachment" : "File attachment"}
                </div>
              ) : null}
              <span className="inline-flex rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-accent">
                Open post
              </span>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wide text-mist">Shared post</p>
              <p className="text-xs text-sand">{share.title || "Post"}</p>
              <span className="inline-flex rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-accent">
                Open post
              </span>
            </div>
          )}
        </Link>
      );
    }

    if (share.entityType === "opportunity") {
      return (
        <Link
          to={share.url}
          className="mt-2 block rounded-lg border border-border bg-charcoal px-2 py-2 hover:border-accent"
        >
          <p className="text-[10px] uppercase tracking-wide text-mist">Shared opportunity</p>
          <p className="text-xs text-sand">{share.title || "Opportunity"}</p>
          {share.subtitle ? <p className="text-[11px] text-mist">{share.subtitle}</p> : null}
          <span className="mt-1 inline-flex rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-accent">
            Open opportunity
          </span>
        </Link>
      );
    }

    if (share.entityType === "profile") {
      const tags = (share.subtitle || "")
        .split("·")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 3);
      return (
        <Link
          to={share.url}
          className="mt-2 block rounded-lg border border-border bg-charcoal px-2 py-2 hover:border-accent"
        >
          <div className="flex items-center gap-2">
            <Avatar url={share.imageUrl} alt={`${share.title || "Profile"} avatar`} size={24} />
            <div className="min-w-0">
              <p className="truncate text-xs text-sand">{share.title || "Profile"}</p>
              <p className="text-[10px] uppercase tracking-wide text-mist">Shared profile</p>
            </div>
          </div>
          {tags.length ? (
            <div className="mt-1 flex flex-wrap gap-1">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border px-2 py-0.5 text-[10px] text-mist"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </Link>
      );
    }

    if (share.entityType === "comment") {
      return (
        <Link
          to={share.url}
          className="mt-2 block rounded-lg border border-border bg-charcoal px-2 py-2 hover:border-accent"
        >
          <p className="text-[10px] uppercase tracking-wide text-mist">Shared comment</p>
          <p
            className="text-xs text-sand"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden"
            }}
          >
            {share.title || "Comment"}
          </p>
          <span className="mt-1 inline-flex rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-accent">
            View in post
          </span>
        </Link>
      );
    }

    return (
      <Link
        to={share.url}
        className="mt-2 block rounded-lg border border-border bg-charcoal px-2 py-2 hover:border-accent"
      >
        <p className="text-[10px] uppercase tracking-wide text-mist">
          Shared {share.entityType}
        </p>
        <p className="text-xs text-sand">{share.title || "Shared item"}</p>
      </Link>
    );
  };

  return (
    <>
      {showHeader && <BizimHeader />}
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-6 md:h-[calc(100vh-72px)] md:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] md:overflow-hidden" style={{ "--accent": "29 29 68", "--accent-soft": "95 96 116" }}>

      {/* ── Thread list sidebar ── */}
      <section className="rounded-2xl bg-white/80 backdrop-blur-md border border-white/40 shadow-card p-4 md:flex md:min-h-0 md:flex-col">
        <h2 className="font-display text-lg tracking-tight text-sand">Threads</h2>
        <div className="mb-3 mt-2 h-px bg-border/60" />
        <div className="space-y-1 md:min-h-0 md:flex-1 md:overflow-y-auto md:pr-1">
          {threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <svg className="mb-4 h-16 w-16 text-mist/25" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="10" y="16" width="44" height="28" rx="6" />
                <path d="M10 38l14-9 8 6 8-6 14 9" />
                <circle cx="32" cy="10" r="2.5" fill="currentColor" opacity="0.3" />
              </svg>
              <p className="text-sm font-medium text-mist">No conversations yet</p>
              <p className="mt-1 text-xs text-mist/60">Start a conversation from someone&apos;s profile</p>
            </div>
          ) : (
            threads.map((thread) => {
              const isActive = activeThread?._id === thread._id;
              const threadStatus = normalizeThreadStatus(thread);
              const isUnread = thread.lastMessageAt && (!thread.myLastReadAt || new Date(thread.myLastReadAt) < new Date(thread.lastMessageAt));

              const statusLabel = (() => {
                if (threadStatus === "pending") return thread.requestedBy === user?._id ? "Pending" : "Incoming";
                if (threadStatus === "rejected") return "Declined";
                return getRelationshipLabel(thread);
              })();
              const statusColor = (() => {
                if (threadStatus === "pending" && thread.requestedBy !== user?._id) return "text-amber-600 bg-amber-50 border-amber-200";
                if (threadStatus === "rejected") return "text-coral bg-coral/5 border-coral/20";
                return "text-mist bg-charcoal border-border/60";
              })();

              return (
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
                  className={`relative w-full cursor-pointer rounded-xl px-3 py-3 text-left text-sm transition-all duration-200 ${
                    isActive
                      ? "border border-accent/25 bg-accent/[0.06] shadow-sm"
                      : isUnread
                        ? "border border-transparent bg-white shadow-card"
                        : "border border-transparent hover:bg-white/60 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <UserChip
                          user={thread.otherParticipant}
                          size={USER_CHIP_SIZES.THREAD_LIST}
                          showRole={false}
                          onClick={(event) => event.stopPropagation()}
                        />
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </div>
                      <p className={`mt-1 truncate text-[13px] leading-snug ${isUnread && !isActive ? "font-medium text-sand/80" : "text-mist/80"}`}>
                        {threadPreviews[thread._id] || "Loading preview..."}
                      </p>
                    </div>
                    {isUnread && (
                      <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-accent chat-unread-pulse" aria-label="Unread" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ── Message panel ── */}
      <section className="rounded-2xl bg-white/80 backdrop-blur-md border border-white/40 shadow-card p-4 md:flex md:min-h-0 md:flex-col">
        {!activeThread ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center py-16">
            <svg className="mb-5 h-20 w-20 text-mist/15" viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M20 56V24a8 8 0 018-8h24a8 8 0 018 8v20a8 8 0 01-8 8H34l-10 8v-4z" />
              <circle cx="36" cy="34" r="2" fill="currentColor" opacity="0.3" />
              <circle cx="44" cy="34" r="2" fill="currentColor" opacity="0.3" />
              <circle cx="52" cy="34" r="2" fill="currentColor" opacity="0.3" />
            </svg>
            <p className="font-display text-lg text-sand/70">Select a conversation</p>
            <p className="mt-1 text-sm text-mist/50">Choose a thread from the left to start messaging</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-border/50">
              <div className="flex items-center gap-3">
                <UserChip
                  user={activeThread.otherParticipant}
                  size={USER_CHIP_SIZES.CHAT_HEADER}
                  showRole={false}
                  nameClassName="font-display text-xl text-sand"
                />
                <span className="rounded-full bg-accent/[0.08] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent/60">
                  {getRelationshipLabel(activeThread)}
                </span>
              </div>
            </div>

            {error && <p className="mt-2 text-sm text-coral">{error}</p>}

            {/* Status banner */}
            {activeStatus !== "active" && (
              <div className="mt-3 rounded-xl border border-border/60 bg-charcoal/50 p-4 text-sm text-mist">
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
                        className="rounded-full bg-accent px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white transition-all hover:opacity-90 active:scale-[0.98]"
                      >
                        Accept
                      </button>
                      <button
                        onClick={handleReject}
                        className="rounded-full border border-border px-5 py-2 text-xs uppercase tracking-wide text-mist transition-all hover:border-accent hover:text-sand active:scale-[0.98]"
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

            {/* Messages */}
            <div
              ref={messagesScrollRef}
              onScroll={updateNearBottomFlag}
              className="mt-4 min-h-[200px] space-y-3 md:min-h-0 md:flex-1 md:overflow-y-auto md:pr-1"
            >
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm text-mist/60">No messages yet. Say hello!</p>
                </div>
              ) : (
                messages.map((message, msgIndex) => {
                  const reactions = normalizeReactions(message.reactions);
                  const reactionEntries = Object.entries(reactions).filter(
                    ([, users]) => Array.isArray(users) && users.length > 0
                  );
                  const myId = String(user?._id || "");
                  const quote = message.replyTo;
                  const isMenuOpen = openMenuMessageId === message._id;
                  const isOwn = sameEntity(message.senderId, user?._id);
                  const previewUrl = extractUrlsFromText(message.body || "")[0];
                  const previewData = previewUrl ? linkPreviews[previewUrl] : null;
                  const isNewMessage = msgIndex >= newMessageThresholdRef.current;

                  return (
                    <div
                      key={message._id}
                      className={`group flex ${isOwn ? "justify-end" : "justify-start"} ${isNewMessage ? "chat-msg-in" : ""}`}
                    >
                      <div
                        className={`relative max-w-[75%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${
                          isOwn
                            ? "bg-accent/[0.08] text-sand"
                            : "bg-white border border-border/50 text-sand shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                        }`}
                        data-chat-menu-root="true"
                      >
                        {/* Hover action bar (desktop) */}
                        <div className={`absolute ${isOwn ? "left-0" : "right-0"} -top-9 z-10 flex items-center gap-0.5 rounded-lg border border-border/50 bg-white p-0.5 shadow-elevated transition-all duration-150 ${isCoarsePointer ? "hidden" : "pointer-events-none opacity-0 scale-95 group-hover:pointer-events-auto group-hover:opacity-100 group-hover:scale-100"}`}>
                          <button type="button" onClick={(e) => { e.stopPropagation(); setActiveReactionMessageId((prev) => prev === message._id ? "" : message._id); }} className="rounded-md p-1.5 text-mist hover:bg-charcoal hover:text-sand transition-colors" aria-label="React">
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><circle cx="9" cy="10" r="0.8" fill="currentColor" /><circle cx="15" cy="10" r="0.8" fill="currentColor" /></svg>
                          </button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); setReplyingTo({ messageId: message._id, body: getReplySnippet(message), senderId: message.senderId }); }} className="rounded-md p-1.5 text-mist hover:bg-charcoal hover:text-sand transition-colors" aria-label="Reply">
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 14L4 9l5-5" /><path d="M4 9h10a5 5 0 015 5v2" /></svg>
                          </button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); setOpenMenuMessageId((prev) => prev === message._id ? "" : message._id); }} className="rounded-md p-1.5 text-mist hover:bg-charcoal hover:text-sand transition-colors" aria-label="More options">
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></svg>
                          </button>
                        </div>

                        {/* Coarse pointer menu toggle */}
                        {isCoarsePointer && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuMessageId((prev) => (prev === message._id ? "" : message._id));
                            }}
                            className="absolute right-2 top-2 rounded-full border border-border/50 bg-white/80 px-1.5 py-0 text-xs text-mist shadow-sm"
                            aria-label="Message options"
                          >
                            ⋯
                          </button>
                        )}

                        {/* Dropdown menu (touch / more options) */}
                        {isMenuOpen && (
                          <div className="absolute right-0 -top-[4.5rem] z-20 min-w-[140px] rounded-xl border border-border/50 bg-white p-1 shadow-elevated chat-reaction-in">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveReactionMessageId(message._id);
                                setOpenMenuMessageId("");
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs text-mist hover:bg-charcoal"
                            >
                              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /></svg>
                              React
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setReplyingTo({
                                  messageId: message._id,
                                  body: getReplySnippet(message),
                                  senderId: message.senderId
                                });
                                setOpenMenuMessageId("");
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs text-mist hover:bg-charcoal"
                            >
                              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 14L4 9l5-5" /><path d="M4 9h10a5 5 0 015 5v2" /></svg>
                              Reply
                            </button>
                            <p className="rounded-lg px-3 py-1.5 text-[11px] text-mist/60">
                              Sent {formatTime(message.createdAt)}
                            </p>
                          </div>
                        )}

                        {/* Reply quote */}
                        {quote?.messageId && (
                          <div className="mb-2 rounded-lg bg-accent/[0.04] border border-accent/10 px-2.5 py-1.5">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-accent/50">
                              {getSenderName(quote.senderId)}
                            </p>
                            <p className="truncate text-xs text-mist">
                              {quote.body || "Attachment"}
                            </p>
                          </div>
                        )}

                        {/* Body */}
                        {message.body && (
                          <p className="whitespace-pre-wrap break-words">
                            {renderFormattedBody(message.body, message._id)}
                          </p>
                        )}

                        {renderShareCard(message)}
                        {renderAttachmentBlock(message)}

                        {/* Link preview */}
                        {previewUrl && (
                          <a
                            href={toHref(previewUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 block rounded-lg border border-border/50 bg-charcoal/40 px-2.5 py-2 text-xs text-mist transition-colors hover:border-accent/30"
                          >
                            {previewData?.status === "loading" ? (
                              <p className="text-mist/60">Loading preview...</p>
                            ) : (
                              <div className="space-y-0.5">
                                <p className="text-[10px] uppercase tracking-wide text-mist/50">
                                  {previewData?.hostname || previewUrl}
                                </p>
                                <p className="text-xs font-medium text-sand">
                                  {previewData?.title || previewData?.hostname || previewUrl}
                                </p>
                                {previewData?.description && (
                                  <p
                                    className="text-[11px] text-mist/70"
                                    style={{
                                      display: "-webkit-box",
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: "vertical",
                                      overflow: "hidden"
                                    }}
                                  >
                                    {previewData.description}
                                  </p>
                                )}
                              </div>
                            )}
                          </a>
                        )}

                        {/* Timestamp + coarse pointer actions */}
                        <div className="mt-1.5 flex items-center gap-2">
                          <p className="text-[10px] text-mist/50">
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
                                className="text-[10px] uppercase tracking-wide text-mist/50 hover:text-sand"
                              >
                                Reply
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveReactionMessageId(message._id)}
                                className="text-[10px] uppercase tracking-wide text-mist/50 hover:text-sand"
                              >
                                React
                              </button>
                            </>
                          )}
                        </div>

                        {/* Reaction picker */}
                        {activeReactionMessageId === message._id && (
                          <div
                            data-chat-reaction-root="true"
                            className="absolute -top-11 left-0 z-20 flex items-center gap-1 rounded-full border border-border/50 bg-white px-2 py-1 shadow-elevated chat-reaction-in"
                          >
                            {quickReactions.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleToggleReaction(message._id, emoji)}
                                className="rounded-full p-1 text-base transition-transform duration-150 hover:scale-125 hover:bg-charcoal"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Reaction display */}
                        {reactionEntries.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {reactionEntries.map(([emoji, users]) => {
                              const normalizedUsers = users.map((id) => String(id));
                              const mine = normalizedUsers.includes(myId);
                              return (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => handleToggleReaction(message._id, emoji)}
                                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] transition-all duration-150 ${
                                    mine
                                      ? "bg-accent/10 text-accent shadow-[inset_0_0_0_1px_rgb(var(--accent)/0.2)]"
                                      : "bg-charcoal text-mist hover:bg-charcoal/80"
                                  }`}
                                >
                                  {emoji} {normalizedUsers.length}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {message._id === seenMessageId && (
                          <p className="mt-0.5 text-[10px] text-mist/40">Seen</p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* ── Composer ── */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                if (!activeThread || activeStatus !== "active") return;
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={`mt-3 transition-colors ${
                isDragOver ? "rounded-xl ring-2 ring-accent/30 bg-accent/[0.03]" : ""
              }`}
            >
              {/* Reply indicator */}
              {replyingTo && (
                <div className="mb-2 flex items-start justify-between gap-2 rounded-lg bg-accent/[0.04] border border-accent/15 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-accent/50">
                      Replying to {getSenderName(replyingTo.senderId)}
                    </p>
                    <p className="truncate text-xs text-mist">{replyingTo.body}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="shrink-0 rounded-full p-0.5 text-mist hover:bg-charcoal hover:text-sand transition-colors"
                    aria-label="Cancel reply"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
              )}

              {/* Attachment previews */}
              {attachments.length > 0 && (
                <div className="mb-2 flex gap-2 overflow-x-auto rounded-lg border border-border/50 bg-charcoal/30 p-2">
                  {attachments.map((file, index) => (
                    <div key={`${file.name}-${file.size}-${index}`} className="group/att relative shrink-0 w-24 rounded-lg border border-border/50 bg-white p-1.5">
                      {attachmentPreviewUrls[index] ? (
                        <img
                          src={attachmentPreviewUrls[index]}
                          alt={file.name}
                          className="h-16 w-full rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-16 flex-col items-center justify-center text-center">
                          <svg className="h-5 w-5 text-mist/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                          <span className="mt-1 text-[9px] text-mist/60 truncate w-full px-1">{file.name}</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-sand text-white text-[10px] opacity-0 group-hover/att:opacity-100 transition-opacity shadow-sm"
                        aria-label="Remove attachment"
                      >
                        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAttachments([])}
                    className="shrink-0 self-center rounded-full px-3 py-1 text-[10px] uppercase tracking-wide text-mist/60 hover:text-sand transition-colors"
                  >
                    Clear all
                  </button>
                </div>
              )}

              {/* Unified composer box */}
              <div className="rounded-xl border border-border/60 bg-white transition-all focus-within:border-accent/30 focus-within:shadow-[0_0_0_3px_rgb(var(--accent)/0.05)]">
                <form onSubmit={handleSend}>
                  <textarea
                    ref={composerRef}
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    rows={2}
                    className="w-full resize-none rounded-t-xl border-0 bg-transparent px-4 pt-3 pb-1 text-sm leading-relaxed text-sand placeholder:text-mist/40 focus:outline-none focus:ring-0"
                    placeholder="Type a message..."
                    disabled={!activeThread || activeStatus !== "active"}
                  />
                  <div className="flex items-center gap-0.5 border-t border-border/30 px-2 py-1.5">
                    <button type="button" onClick={() => applyFormatting("bold")} className="rounded-md p-1.5 text-mist/50 transition-colors hover:bg-charcoal hover:text-sand" title="Bold">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h8a4 4 0 012.69 6.97A4 4 0 0115 20H6V4zm2 8h6a2 2 0 000-4H8v4zm0 2v4h7a2 2 0 000-4H8z" /></svg>
                    </button>
                    <button type="button" onClick={() => applyFormatting("italic")} className="rounded-md p-1.5 text-mist/50 transition-colors hover:bg-charcoal hover:text-sand" title="Italic">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4h8l-1 2h-2.5l-4 12H13l-1 2H4l1-2h2.5l4-12H9l1-2z" /></svg>
                    </button>
                    <button type="button" onClick={() => applyFormatting("code")} className="rounded-md p-1.5 text-mist/50 transition-colors hover:bg-charcoal hover:text-sand" title="Code">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
                    </button>
                    <button type="button" onClick={() => applyFormatting("link")} className="rounded-md p-1.5 text-mist/50 transition-colors hover:bg-charcoal hover:text-sand" title="Link">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>
                    </button>

                    <div className="mx-1 h-4 w-px bg-border/40" />

                    <label className="cursor-pointer rounded-md p-1.5 text-mist/50 transition-colors hover:bg-charcoal hover:text-sand" title="Attach file">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" /></svg>
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

                    <div className="flex-1" />

                    <button
                      type="submit"
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white transition-all duration-150 hover:opacity-90 active:scale-95 disabled:bg-mist/20 disabled:text-mist/40"
                      disabled={!activeThread || activeStatus !== "active"}
                      aria-label="Send message"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </>
        )}
      </section>

      {/* ── Attachment viewer modal ── */}
      {viewerAttachment && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-sand/40 backdrop-blur-sm px-4 chat-overlay-in"
          onClick={() => setViewerAttachment(null)}
        >
          <div
            className="w-full max-w-5xl max-h-[85vh] overflow-hidden rounded-2xl bg-white p-5 shadow-floating space-y-4 chat-modal-in"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="truncate text-sm font-medium text-sand max-w-[50%]">
                {viewerAttachment.name || "Attachment"}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                {viewerAttachment.kind === "image" && (
                  <>
                    <button
                      type="button"
                      onClick={() => setViewerZoom((prev) => Math.max(0.5, Number((prev - 0.25).toFixed(2))))}
                      className="rounded-lg border border-border/50 p-2 text-mist transition-colors hover:bg-charcoal hover:text-sand"
                      aria-label="Zoom out"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
                    </button>
                    <span className="min-w-[3rem] text-center text-xs tabular-nums text-mist">{Math.round(viewerZoom * 100)}%</span>
                    <button
                      type="button"
                      onClick={() => setViewerZoom((prev) => Math.min(3, Number((prev + 0.25).toFixed(2))))}
                      className="rounded-lg border border-border/50 p-2 text-mist transition-colors hover:bg-charcoal hover:text-sand"
                      aria-label="Zoom in"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewerZoom(1)}
                      className="rounded-lg border border-border/50 px-3 py-2 text-xs text-mist transition-colors hover:bg-charcoal hover:text-sand"
                    >
                      Fit
                    </button>
                  </>
                )}
                <a
                  href={viewerAttachment.url}
                  download
                  className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Download
                </a>
                <button
                  type="button"
                  onClick={() => setViewerAttachment(null)}
                  className="rounded-lg border border-border/50 p-2 text-mist transition-colors hover:bg-charcoal hover:text-sand"
                  aria-label="Close viewer"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
            </div>
            {viewerAttachment.kind === "image" ? (
              <div className="h-[72vh] overflow-auto rounded-xl border border-border/50 bg-charcoal/30">
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
                className="h-[72vh] w-full rounded-xl border border-border/50"
              />
            ) : (
              <div className="space-y-3 rounded-xl border border-border/50 bg-charcoal/30 p-6">
                <svg className="mx-auto h-12 w-12 text-mist/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                <p className="text-center text-sm text-mist break-all">{viewerAttachment.name || "File attachment"}</p>
                <p className="text-center text-xs text-mist/60">Preview unavailable for this file type.</p>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </>
  );
}
