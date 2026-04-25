import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../utils/auth";
import { apiClient, uploadViaPresign } from "../api/client";
import BizimHeader from "../components/BizimHeader";
import PostCard from "../components/PostCard";
import Avatar from "../components/Avatar";

const POST_TABS = [
  { key: "note", label: "Note", icon: "📝" },
  { key: "event", label: "Event", icon: "📅" },
  { key: "opportunity", label: "Opportunity", icon: "💼" },
];

const resolveAvatarUrl = (u) =>
  u?.avatarUrl || u?.photoUrl || u?.profilePhoto || u?.profilePhotoUrl || u?.profilePictureUrl || null;

const getId = (value) => String(value?._id || value?.id || value || "");

export default function Dashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const composeRef = useRef(null);

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Compose state
  const [composeOpen, setComposeOpen] = useState(false);
  const [postType, setPostType] = useState("note");
  const [content, setContent] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState("");
  const [posting, setPosting] = useState(false);
  const [chatThreads, setChatThreads] = useState([]);
  const [chatPreviews, setChatPreviews] = useState({});
  const [messageSearch, setMessageSearch] = useState("");

  // Load posts
  const loadPosts = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get("/posts", token);
      setPosts(data);
    } catch (err) {
      setError(err.message || "Failed to load feed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadPosts();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const toPreviewText = (message) => {
      if (!message) return "No messages yet.";
      const text =
        (message.body || "").trim() ||
        (message.share?.title ? `Shared: ${message.share.title}` : "") ||
        (message.attachments?.length || message.attachmentUrl ? "Attachment" : "No messages yet.");
      const prefix = getId(message.senderId) === getId(user?._id) ? "You: " : "";
      const combined = `${prefix}${text}`;
      return combined.length > 54 ? `${combined.slice(0, 53)}...` : combined;
    };

    const loadChatThreads = async () => {
      try {
        const threads = await apiClient.get("/chats/threads", token);
        if (cancelled) return;
        const limited = (threads || []).slice(0, 6);
        setChatThreads(limited);

        const previews = await Promise.all(
          limited.map(async (thread) => {
            try {
              const messages = await apiClient.get(`/chats/threads/${thread._id}/messages`, token);
              return [thread._id, toPreviewText(messages[messages.length - 1])];
            } catch {
              return [thread._id, "Tap to open conversation"];
            }
          })
        );
        if (!cancelled) setChatPreviews(Object.fromEntries(previews));
      } catch {
        if (!cancelled) {
          setChatThreads([]);
          setChatPreviews({});
        }
      }
    };

    loadChatThreads();
    return () => {
      cancelled = true;
    };
  }, [token, user?._id]);

  // Attachment preview
  useEffect(() => {
    if (!attachment) { setAttachmentPreview(""); return; }
    const type = attachment.type || "";
    if (type.startsWith("image/") || type.startsWith("video/")) {
      const url = URL.createObjectURL(attachment);
      setAttachmentPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setAttachmentPreview("");
  }, [attachment]);

  const handleCreatePost = async () => {
    if (!content.trim()) return;
    setPosting(true);
    setError("");
    try {
      let attachmentUrl, attachmentContentType;
      if (attachment) {
        const upload = await uploadViaPresign({ file: attachment, purpose: "attachment" }, token);
        attachmentUrl = upload.documentUrl;
        attachmentContentType = attachment.type;
      }
      await apiClient.post("/posts", {
        content,
        attachmentUrl,
        attachmentContentType,
        visibilityRegion: "ALL",
      }, token);
      setContent("");
      setAttachment(null);
      setAttachmentPreview("");
      setComposeOpen(false);
      setPostType("note");
      await loadPosts();
    } catch (err) {
      setError(err.message || "Failed to create post");
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId) => {
    try {
      const res = await apiClient.post(`/posts/${postId}/like`, {}, token);
      setPosts((prev) =>
        prev.map((p) => p._id === postId ? { ...p, likesCount: res.likesCount, likedByMe: res.likedByMe } : p)
      );
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredChatThreads = chatThreads.filter((thread) => {
    const query = messageSearch.trim().toLowerCase();
    if (!query) return true;
    const participant = thread.otherParticipant || {};
    return [participant.name, participant.username, chatPreviews[thread._id]]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query));
  });

  return (
    <>
      <BizimHeader />

      <div className="mx-auto max-w-7xl px-4 md:px-6 py-6 grid gap-6 md:grid-cols-[260px_1fr] lg:grid-cols-[260px_1fr_300px]">

        {/* ════════ LEFT SIDEBAR ════════ */}
        <aside className="hidden md:block space-y-5">
          {/* Circles For You */}
          <div className="rounded-2xl bg-white border border-grey-300 p-5 sticky top-[72px]">
            <h3 className="text-sm font-semibold text-sand mb-4 flex items-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-sand inline-flex items-center justify-center text-[8px] font-bold">○</span>
              Circles For You
            </h3>
            <div className="space-y-3">
              {["Circle Name 1", "Circle Name 2", "Circle Name 3"].map((name, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-100" />
                    <div>
                      <p className="text-xs font-semibold text-sand">{name}</p>
                      <p className="text-[11px] text-mist">500 members</p>
                    </div>
                  </div>
                  <button className="rounded-full border border-blue-500 text-blue-600 text-[11px] font-semibold px-3 py-0.5 hover:bg-blue-50 transition-colors">
                    Join
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* People For You */}
          <div className="rounded-2xl bg-white border border-grey-300 p-5">
            <h3 className="text-sm font-semibold text-sand mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-sand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              People For You
            </h3>
            <div className="space-y-3">
              {[
                { name: "User Name 1", loc: "Location" },
                { name: "User Name 2", loc: "Location" },
                { name: "User Name 3", loc: "Location" },
              ].map((p, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-grey-300" />
                    <div>
                      <p className="text-xs font-semibold text-sand">{p.name}</p>
                      <p className="text-[11px] text-mist">{p.loc}</p>
                    </div>
                  </div>
                  <button className="rounded-full bg-blue-500 text-white text-[11px] font-semibold px-3 py-1 hover:bg-blue-600 transition-colors">
                    Follow
                  </button>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* ════════ CENTER FEED ════════ */}
        <main className="space-y-5 min-w-0">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 flex justify-between">
              <span>{error}</span>
              <button onClick={() => setError("")} className="text-red-400 hover:text-red-600">&times;</button>
            </div>
          )}

          {/* ── Post composer ── */}
          {!composeOpen ? (
            <div className="rounded-2xl bg-white border border-grey-300 p-4">
              {/* Type tabs */}
              <div className="flex gap-2 mb-4">
                {POST_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => { setPostType(tab.key); setComposeOpen(true); }}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                      tab.key === "note"
                        ? "bg-blue-500 text-white"
                        : "bg-grey-100 text-mist hover:bg-grey-200"
                    }`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>
              {/* Click to open */}
              <button
                onClick={() => { setComposeOpen(true); setTimeout(() => composeRef.current?.focus(), 100); }}
                className="w-full flex items-center gap-3 text-left"
              >
                <div className="w-10 h-10 rounded-full bg-grey-300 flex-shrink-0" />
                <span className="text-sm text-mist">What's on your mind?</span>
              </button>
            </div>
          ) : (
            <div className="rounded-2xl bg-white border border-grey-300 p-5 animate-scale-in">
              {/* Tabs */}
              <div className="flex gap-2 mb-4">
                {POST_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setPostType(tab.key)}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                      postType === tab.key
                        ? "bg-blue-500 text-white"
                        : "bg-grey-100 text-mist hover:bg-grey-200"
                    }`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              {/* Compose area */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-grey-300 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <textarea
                    ref={composeRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={
                      postType === "note" ? "What's on your mind?"
                      : postType === "event" ? "Describe your event..."
                      : "Describe the opportunity..."
                    }
                    rows={4}
                    className="w-full resize-none rounded-xl border-0 bg-transparent text-sm text-sand placeholder:text-mist/50 focus:outline-none focus:ring-0"
                  />
                </div>
              </div>

              {/* Attachment preview */}
              {attachmentPreview && (
                <div className="ml-[52px] mt-2 rounded-xl border border-grey-300 bg-grey-100 p-2 relative">
                  {attachment?.type?.startsWith("image/") ? (
                    <img src={attachmentPreview} alt="Preview" className="w-full max-h-48 rounded-lg object-contain" />
                  ) : (
                    <video src={attachmentPreview} className="w-full max-h-48 rounded-lg" controls />
                  )}
                  <button
                    onClick={() => { setAttachment(null); setAttachmentPreview(""); }}
                    className="absolute top-3 right-3 w-7 h-7 bg-sand/80 text-white rounded-full flex items-center justify-center text-xs hover:bg-sand"
                  >
                    &times;
                  </button>
                </div>
              )}

              {/* Actions */}
              <div className="ml-[52px] mt-3 flex items-center justify-between border-t border-grey-200 pt-3">
                <div className="flex gap-1">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-9 h-9 rounded-full bg-grey-100 hover:bg-grey-200 flex items-center justify-center text-sm transition-colors"
                  >
                    📎
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    accept="image/*,video/*,application/pdf"
                    onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setComposeOpen(false); setContent(""); setAttachment(null); }}
                    className="text-xs text-mist hover:text-sand transition-colors px-3 py-1.5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreatePost}
                    disabled={posting || !content.trim()}
                    className="circular-btn text-xs px-5 py-2 disabled:opacity-50"
                  >
                    {posting ? "Posting..." : "Post"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Feed ── */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl bg-white border border-grey-300 p-5 animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-grey-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-grey-200 rounded w-1/3" />
                      <div className="h-3 bg-grey-200 rounded w-full" />
                      <div className="h-3 bg-grey-200 rounded w-2/3" />
                    </div>
                  </div>
                  <div className="mt-4 h-40 bg-grey-200 rounded-xl" />
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-2xl bg-white border border-grey-300 p-12 text-center">
              <p className="text-mist mb-2">No posts yet.</p>
              <p className="text-sm text-mist/60">Follow people and join circles to see content here.</p>
            </div>
          ) : (
            posts.map((post) => <PostCard key={post._id} post={post} onLike={handleLike} />)
          )}
        </main>

        {/* ════════ RIGHT SIDEBAR: MESSAGES ════════ */}
        <aside className="hidden lg:block">
          <div className="rounded-2xl bg-white border border-grey-300 p-5 sticky top-[72px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-sand">Messages</h3>
              <Link to="/chats" className="text-xs font-medium text-mist hover:text-sand">
                Open
              </Link>
            </div>

            {/* Search messages */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-grey-100 border border-grey-300 mb-4">
              <svg className="w-3.5 h-3.5 text-grey-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={messageSearch}
                onChange={(event) => setMessageSearch(event.target.value)}
                placeholder="Search messages..."
                className="flex-1 bg-transparent outline-none text-xs text-sand placeholder-grey-500"
              />
            </div>

            {/* Message list */}
            <div className="space-y-1">
              {filteredChatThreads.length === 0 ? (
                <div className="rounded-xl border border-grey-300 bg-grey-100 px-3 py-4 text-center">
                  <p className="text-xs font-medium text-sand">No conversations yet</p>
                  <p className="mt-1 text-[11px] text-mist">Open messages to start a thread.</p>
                </div>
              ) : (
                filteredChatThreads.map((thread) => {
                  const participant = thread.otherParticipant || {};
                  const isUnread =
                    thread.lastMessageAt &&
                    (!thread.myLastReadAt || new Date(thread.myLastReadAt) < new Date(thread.lastMessageAt));
                  return (
                    <button
                      key={thread._id}
                      type="button"
                      onClick={() => navigate(`/chats?thread=${thread._id}`)}
                      className="flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-grey-100"
                    >
                      <div className="relative flex-shrink-0">
                        <Avatar
                          url={resolveAvatarUrl(participant)}
                          alt={`${participant.name || "Member"} avatar`}
                          size={40}
                          className="border border-grey-300"
                        />
                        {isUnread && (
                          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-blue-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className={`truncate text-xs ${isUnread ? "font-bold" : "font-semibold"} text-sand`}>
                            {participant.name || participant.username || "Member"}
                          </p>
                          {thread.status === "pending" && (
                            <span className="flex-shrink-0 rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-amber-700">
                              Pending
                            </span>
                          )}
                        </div>
                        <p className={`truncate text-[11px] ${isUnread ? "font-medium text-sand" : "text-mist"}`}>
                          {chatPreviews[thread._id] || "Loading preview..."}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* New message button */}
            <button
              type="button"
              onClick={() => navigate("/chats")}
              className="w-full mt-4 rounded-full bg-blue-500 text-white text-xs font-semibold py-2.5 hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              New Message
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
