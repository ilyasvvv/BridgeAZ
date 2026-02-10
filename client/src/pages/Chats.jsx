import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { apiClient, uploadViaPresign } from "../api/client";
import { useAuth } from "../utils/auth";
import UserChip from "../components/UserChip";

export default function Chats() {
  const { token, user } = useAuth();
  const location = useLocation();
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState("");
  const [attachment, setAttachment] = useState(null);
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

  const renderAttachment = (message) => {
    if (!message.attachmentUrl) return null;
    const contentType = message.attachmentContentType || "";
    const lowerUrl = message.attachmentUrl.toLowerCase();
    const isImage =
      contentType.startsWith("image/") ||
      [".png", ".jpg", ".jpeg", ".webp", ".gif"].some((ext) => lowerUrl.endsWith(ext));
    const isPdf = contentType === "application/pdf" || lowerUrl.endsWith(".pdf");
    const label = message.attachmentName || message.attachmentUrl.split("/").pop();

    if (isImage) {
      return (
        <img
          src={message.attachmentUrl}
          alt="Chat attachment"
          className="mt-2 w-full max-h-[240px] rounded-lg object-contain"
        />
      );
    }
    if (isPdf) {
      return (
        <div className="mt-2 flex items-center justify-between rounded-lg border border-white/10 px-2 py-1 text-[11px]">
          <span className="truncate">PDF attachment</span>
          <a
            href={message.attachmentUrl}
            target="_blank"
            rel="noreferrer"
            className="text-teal underline"
          >
            View
          </a>
        </div>
      );
    }
    return (
      <a
        href={message.attachmentUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-2 block truncate text-[11px] text-teal underline"
        title={label}
      >
        {label || "View attachment"}
      </a>
    );
  };

  useEffect(() => {
    if (token) {
      loadThreads();
    }
  }, [token, requestedThreadId]);

  useEffect(() => {
    if (activeThread?._id) {
      (async () => {
        await loadMessages(activeThread._id);
        await markThreadRead(activeThread._id);
      })();
    }
  }, [activeThread]);

  const handleSend = async (event) => {
    event.preventDefault();
    setError("");
    if (!activeThread) return;
    if (!body && !attachment) {
      setError("Message body or attachment is required");
      return;
    }
    if (normalizeThreadStatus(activeThread) !== "active") return;
    try {
      let attachmentUrl;
      let attachmentContentType;
      let attachmentKind;
      let attachmentName;
      if (attachment) {
        const allowed = new Set([
          "image/png",
          "image/jpeg",
          "image/webp",
          "application/pdf"
        ]);
        if (!allowed.has(attachment.type)) {
          setError("Unsupported file type");
          return;
        }
        if (attachment.size > 5 * 1024 * 1024) {
          setError("File must be 5MB or less");
          return;
        }
        const presign = await uploadViaPresign(
          { file: attachment, purpose: "chat_attachment" },
          token
        );
        attachmentUrl = presign.documentUrl;
        attachmentContentType = attachment.type;
        attachmentName = attachment.name;
        if (attachment.type.startsWith("image/")) {
          attachmentKind = "image";
        } else if (attachment.type === "application/pdf") {
          attachmentKind = "pdf";
        } else {
          attachmentKind = "file";
        }
      }

      const message = await apiClient.post(
        `/chats/threads/${activeThread._id}/messages`,
        {
          body: body || undefined,
          attachmentUrl,
          attachmentContentType,
          attachmentKind,
          attachmentName
        },
        token
      );
      setMessages((prev) => [...prev, message]);
      setBody("");
      setAttachment(null);
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

  return (
    <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-[1fr_2fr]">
      <section className="glass rounded-2xl p-4 space-y-3">
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
              className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                activeThread?._id === thread._id
                  ? "border-teal bg-teal/10 text-teal"
                  : "border-white/10 text-mist hover:border-teal"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <UserChip
                  user={thread.otherParticipant}
                  size={24}
                  showRole={false}
                  onClick={(event) => event.stopPropagation()}
                />
                <div className="flex items-center gap-2">
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
              size={36}
              showRole={!!activeThread.otherParticipant?.userType}
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
            messages.map((message) => (
              <div
                key={message._id}
                className={`flex ${message.senderId === user?._id ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] rounded-xl px-3 py-2 text-sm ${
                    message.senderId === user?._id
                      ? "bg-teal/20 text-sand"
                      : "border border-white/10 text-sand"
                  }`}
                >
                  {message.body && <p>{message.body}</p>}
                  {renderAttachment(message)}
                  <p className="mt-1 text-[10px] text-mist">
                    {formatTime(message.createdAt)}
                  </p>
                  {message.senderId === user?._id &&
                    activeThread?.otherLastReadAt &&
                    new Date(activeThread.otherLastReadAt) >= new Date(message.createdAt) && (
                      <p className="text-[10px] text-mist">Seen</p>
                    )}
                </div>
              </div>
            ))
          )}
        </div>
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
              onChange={(event) => setAttachment(event.target.files?.[0] || null)}
              accept="image/png,image/jpeg,image/webp,application/pdf"
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
        {attachment && (
          <p className="text-xs text-mist">Attachment: {attachment.name}</p>
        )}
      </section>
    </div>
  );
}
