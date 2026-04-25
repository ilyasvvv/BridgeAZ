"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { useRouter, useSearchParams } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/lib/auth";
import { chatsApi, type ChatMessage, type ChatParticipant, type ChatThread } from "@/lib/chats";
import type { ChatAttachment } from "@/lib/chats";
import { uploadFile } from "@/lib/uploads";
import { usersApi, type UserSearchResult } from "@/lib/users";
import { hueFromString, relativeTime } from "@/lib/format";

const chatVibes = [
  { key: "classic", label: "Classic" },
  { key: "fresh", label: "Fresh" },
  { key: "pop", label: "Pop" },
  { key: "night", label: "Night" },
] as const;

const reportReasons = [
  "Harassment or bullying",
  "Spam or scam",
  "Hate or abusive content",
  "Unsafe personal information request",
  "Other safety concern",
];

const sensitiveInfoRegex =
  /(\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\b(?:\+?\d[\d\s().-]{7,}\d)\b|\b(?:password|passport|ssn|social security|credit card|bank account)\b)/i;

const settingsKey = "bc_messages_settings_v1";
const threadSettingsKey = "bc_messages_thread_settings_v1";

type ChatSettings = {
  enterToSend: boolean;
  safetyNudges: boolean;
  linkPreviews: boolean;
  composerMotion: boolean;
  compactBubbles: boolean;
  defaultVibe: (typeof chatVibes)[number]["key"];
};

type ThreadSettings = Record<
  string,
  {
    nickname?: string;
    vibe?: (typeof chatVibes)[number]["key"];
    pinned?: boolean;
    muted?: boolean;
  }
>;

const defaultSettings: ChatSettings = {
  enterToSend: true,
  safetyNudges: true,
  linkPreviews: true,
  composerMotion: true,
  compactBubbles: false,
  defaultVibe: "fresh",
};

type PendingAttachment = ChatAttachment & {
  localId: string;
  localUrl?: string;
};

type PollDraft = {
  question: string;
  options: string[];
};

type LocationDraft = {
  label: string;
  url: string;
};

const settingToggles: Array<{
  key: Exclude<keyof ChatSettings, "defaultVibe">;
  title: string;
  description: string;
}> = [
  {
    key: "enterToSend",
    title: "Enter sends messages",
    description: "Shift+Enter keeps multiline writing available.",
  },
  {
    key: "safetyNudges",
    title: "Safety nudges",
    description: "Warn before sending contact, password, financial, or ID-like details.",
  },
  {
    key: "linkPreviews",
    title: "Link previews",
    description: "Show compact previews when a message includes a link.",
  },
  {
    key: "composerMotion",
    title: "Subtle motion",
    description: "Add small send and hover animations.",
  },
  {
    key: "compactBubbles",
    title: "Compact bubbles",
    description: "Use tighter spacing for longer, faster conversations.",
  },
];

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? { ...(fallback as object), ...JSON.parse(raw) } as T : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<MessagesShell>Loading messages...</MessagesShell>}>
      <MessagesClient />
    </Suspense>
  );
}

function MessagesClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, status } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const resumeInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(params.get("thread"));
  const [draft, setDraft] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [locationDraft, setLocationDraft] = useState<LocationDraft | null>(null);
  const [pollOpen, setPollOpen] = useState(false);
  const [pollDraft, setPollDraft] = useState<PollDraft>({ question: "", options: ["", ""] });
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [groupMatches, setGroupMatches] = useState<UserSearchResult[]>([]);
  const [groupMembers, setGroupMembers] = useState<UserSearchResult[]>([]);
  const [groupStatus, setGroupStatus] = useState<string | null>(null);
  const [sendPulse, setSendPulse] = useState(false);
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState<UserSearchResult[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [settings, setSettings] = useState<ChatSettings>(() =>
    readLocal(settingsKey, defaultSettings)
  );
  const [threadSettings, setThreadSettings] = useState<ThreadSettings>(() =>
    readLocal(threadSettingsKey, {})
  );
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [reportReason, setReportReason] = useState(reportReasons[0]);
  const [reportDetails, setReportDetails] = useState("");
  const [safetyStatus, setSafetyStatus] = useState<string | null>(null);
  const [sensitiveAck, setSensitiveAck] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/signin");
  }, [status, router]);

  useEffect(() => {
    const thread = params.get("thread");
    if (thread) setSelectedId(thread);
  }, [params]);

  useEffect(() => {
    writeLocal(settingsKey, settings);
  }, [settings]);

  useEffect(() => {
    writeLocal(threadSettingsKey, threadSettings);
  }, [threadSettings]);

  useEffect(() => {
    setSensitiveAck(false);
  }, [draft, selectedId]);

  useEffect(() => {
    setPendingAttachments((current) => {
      current.forEach((attachment) => {
        if (attachment.localUrl) URL.revokeObjectURL(attachment.localUrl);
      });
      return [];
    });
    setLocationDraft(null);
    setPollDraft({ question: "", options: ["", ""] });
    setPollOpen(false);
  }, [selectedId]);

  useEffect(() => {
    if (status !== "authenticated") return;
    chatsApi
      .blockedUsers()
      .then((ids) => setBlockedIds(new Set((ids || []).map(String))))
      .catch(() => setBlockedIds(new Set()));
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;

    async function loadThreads() {
      try {
        const next = await chatsApi.threads();
        if (cancelled) return;
        setThreads(next);
        if (!selectedId && next[0]?._id) {
          setSelectedId(next[0]._id);
          router.replace(`/messages?thread=${next[0]._id}`);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load chats.");
      } finally {
        if (!cancelled) setLoadingThreads(false);
      }
    }

    loadThreads();
    const timer = window.setInterval(loadThreads, 6000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [status, selectedId, router]);

  useEffect(() => {
    if (!selectedId || status !== "authenticated") return;
    const threadId = selectedId;
    let cancelled = false;

    async function loadMessages() {
      setLoadingMessages(true);
      try {
        const next = await chatsApi.messages(threadId);
        if (cancelled) return;
        setMessages(next);
        chatsApi.markRead(threadId).catch(() => undefined);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load messages.");
      } finally {
        if (!cancelled) setLoadingMessages(false);
      }
    }

    loadMessages();
    const timer = window.setInterval(loadMessages, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [selectedId, status]);

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setMatches([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const next = await usersApi.search(q, 8);
        if (!cancelled) setMatches(next.filter((match) => match._id !== user?._id));
      } catch {
        if (!cancelled) setMatches([]);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [search, user?._id]);

  useEffect(() => {
    const q = groupSearch.trim();
    if (q.length < 2) {
      setGroupMatches([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const next = await usersApi.search(q, 8);
        if (!cancelled) {
          setGroupMatches(
            next.filter(
              (match) =>
                match._id !== user?._id &&
                !groupMembers.some((member) => member._id === match._id)
            )
          );
        }
      } catch {
        if (!cancelled) setGroupMatches([]);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [groupSearch, groupMembers, user?._id]);

  const selected = useMemo(
    () => threads.find((thread) => thread._id === selectedId) || null,
    [threads, selectedId]
  );
  const other = selected ? otherParticipant(selected, user?._id) : null;
  const requestedBySelf = selected ? participantId(selected.requestedBy) === user?._id : false;
  const baseCanSend = selected?.status === "active" || requestedBySelf || !selected?.status;
  const selectedThreadSettings = selected ? threadSettings[selected._id] || {} : {};
  const selectedVibe = selectedThreadSettings.vibe || settings.defaultVibe;
  const selectedVibeLabel = chatVibes.find((vibe) => vibe.key === selectedVibe)?.label || "Fresh";
  const selectedOtherParticipants =
    selected?.participants.filter((participant) => participant._id !== user?._id) || [];
  const isGroupChat = !!selected && (selected.isGroup || selectedOtherParticipants.length > 1);
  const otherId = other?._id || "";
  const isBlocked = !!otherId && blockedIds.has(otherId);
  const canSend = baseCanSend && !isBlocked;
  const hasSensitiveDraft = settings.safetyNudges && !!draft.trim() && sensitiveInfoRegex.test(draft);
  const activePollOptions = pollDraft.options.map((option) => option.trim()).filter(Boolean);
  const hasPollDraft = !!pollDraft.question.trim() && activePollOptions.length >= 2;
  const linkPreview = settings.linkPreviews ? buildLinkPreview(draft) : null;
  const hasSendableContent =
    !!draft.trim() || pendingAttachments.length > 0 || !!locationDraft || hasPollDraft;
  const visibleThreads = useMemo(
    () =>
      [...threads].sort((a, b) => {
        const aPinned = !!threadSettings[a._id]?.pinned;
        const bPinned = !!threadSettings[b._id]?.pinned;
        if (aPinned !== bPinned) return aPinned ? -1 : 1;
        return (
          new Date(b.lastMessageAt || b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.lastMessageAt || a.updatedAt || a.createdAt || 0).getTime()
        );
      }),
    [threads, threadSettings]
  );

  async function selectThread(id: string) {
    setSelectedId(id);
    setDetailsOpen(false);
    router.replace(`/messages?thread=${id}`);
  }

  async function startThread(match: UserSearchResult) {
    try {
      const thread = await chatsApi.startThread(match._id);
      setThreads((current) => [thread, ...current.filter((item) => item._id !== thread._id)]);
      setSelectedId(thread._id);
      setSearch("");
      setMatches([]);
      router.replace(`/messages?thread=${thread._id}`);
    } catch (err: any) {
      setError(err?.message || "Failed to start chat.");
    }
  }

  async function sendMessage() {
    const body = buildOutgoingBody(draft, locationDraft, hasPollDraft ? pollDraft : null);
    if (!selectedId || !hasSendableContent || sending || uploading || !canSend) return;
    if (hasSensitiveDraft && !sensitiveAck) {
      setError("This looks like sensitive personal information. Review it, then choose Send anyway if you still want to send.");
      return;
    }
    const attachments = pendingAttachments.map(({ localId, localUrl, ...attachment }) => attachment);
    setSending(true);
    setDraft("");
    setPendingAttachments([]);
    setLocationDraft(null);
    setPollDraft({ question: "", options: ["", ""] });
    setPollOpen(false);
    try {
      const message = await chatsApi.send(selectedId, {
        body,
        attachments,
      });
      pendingAttachments.forEach((attachment) => {
        if (attachment.localUrl) URL.revokeObjectURL(attachment.localUrl);
      });
      setMessages((current) => [...current, message]);
      if (settings.composerMotion) {
        setSendPulse(true);
        window.setTimeout(() => setSendPulse(false), 520);
      }
    } catch (err: any) {
      setDraft(draft);
      setPendingAttachments(pendingAttachments);
      setLocationDraft(locationDraft);
      setPollDraft(pollDraft);
      setError(err?.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  async function updateRequest(action: "accept" | "reject") {
    if (!selectedId) return;
    try {
      const updated = action === "accept"
        ? await chatsApi.accept(selectedId)
        : await chatsApi.reject(selectedId);
      setThreads((current) => current.map((thread) => thread._id === updated._id ? updated : thread));
    } catch (err: any) {
      setError(err?.message || `Failed to ${action} chat.`);
    }
  }

  function updateSetting<K extends keyof ChatSettings>(key: K, value: ChatSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function updateThreadSetting(threadId: string, patch: ThreadSettings[string]) {
    setThreadSettings((current) => ({
      ...current,
      [threadId]: { ...(current[threadId] || {}), ...patch },
    }));
  }

  async function handleFiles(files: FileList | null, purpose: "chat_attachment" | "resume") {
    if (!files?.length || !canSend) return;
    setUploading(true);
    setError(null);
    try {
      const next = await Promise.all(
        Array.from(files).map(async (file) => {
          const upload = await uploadFile(file, purpose);
          return {
            localId: localIdFor(file),
            url: upload.documentUrl,
            contentType: upload.contentType,
            kind: attachmentKind(upload.contentType, file.name),
            name: file.name,
            localUrl: URL.createObjectURL(file),
          } satisfies PendingAttachment;
        })
      );
      setPendingAttachments((current) => [...current, ...next]);
    } catch (err: any) {
      setError(err?.message || "Failed to upload file.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (resumeInputRef.current) resumeInputRef.current.value = "";
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  }

  function removePendingAttachment(localId: string) {
    setPendingAttachments((current) => {
      const target = current.find((attachment) => attachment.localId === localId);
      if (target?.localUrl) URL.revokeObjectURL(target.localUrl);
      return current.filter((attachment) => attachment.localId !== localId);
    });
  }

  function addPollOption() {
    setPollDraft((current) => ({ ...current, options: [...current.options, ""] }));
  }

  function updatePollOption(index: number, value: string) {
    setPollDraft((current) => ({
      ...current,
      options: current.options.map((option, optionIndex) =>
        optionIndex === index ? value : option
      ),
    }));
  }

  function removePollOption(index: number) {
    setPollDraft((current) => ({
      ...current,
      options: current.options.filter((_, optionIndex) => optionIndex !== index),
    }));
  }

  function requestLocation() {
    setError(null);
    if (!navigator.geolocation) {
      setError("Location sharing is not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const label = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        setLocationDraft({
          label,
          url: `https://maps.google.com/?q=${latitude},${longitude}`,
        });
      },
      () => setError("Location permission was denied or unavailable."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function openGroupPanel() {
    setGroupOpen(true);
    setGroupStatus(null);
  }

  function addGroupMember(match: UserSearchResult) {
    setGroupMembers((current) => [...current, match]);
    setGroupSearch("");
    setGroupMatches([]);
  }

  async function createGroupDraft() {
    if (groupMembers.length < 2) {
      setGroupStatus("Choose at least two people for a group chat.");
      return;
    }
    setGroupStatus(null);
    try {
      const thread = await chatsApi.startGroup({
        name: groupName.trim() || undefined,
        participantIds: groupMembers.map((member) => member._id),
      });
      setThreads((current) => [thread, ...current.filter((item) => item._id !== thread._id)]);
      setSelectedId(thread._id);
      setGroupOpen(false);
      setGroupName("");
      setGroupSearch("");
      setGroupMembers([]);
      router.replace(`/messages?thread=${thread._id}`);
    } catch (err: any) {
      setGroupStatus(err?.message || "Group chats are not enabled on the API yet.");
    }
  }

  async function blockUser() {
    if (!otherId) return;
    setSafetyStatus(null);
    try {
      await chatsApi.blockUser(otherId);
      setBlockedIds((current) => new Set([...current, otherId]));
      setSafetyStatus("User blocked. They cannot continue this chat with you.");
    } catch (err: any) {
      setSafetyStatus(err?.message || "Failed to block user.");
    }
  }

  async function unblockUser() {
    if (!otherId) return;
    setSafetyStatus(null);
    try {
      await chatsApi.unblockUser(otherId);
      setBlockedIds((current) => {
        const next = new Set(current);
        next.delete(otherId);
        return next;
      });
      setSafetyStatus("User unblocked.");
    } catch (err: any) {
      setSafetyStatus(err?.message || "Failed to unblock user.");
    }
  }

  async function reportUser() {
    if (!otherId) return;
    setSafetyStatus(null);
    try {
      await chatsApi.reportUser({
        userId: otherId,
        reason: reportReason,
        details: reportDetails,
      });
      setReportDetails("");
      setSafetyStatus("Report sent for review.");
    } catch (err: any) {
      setSafetyStatus(err?.message || "Failed to send report.");
    }
  }

  if (status === "loading") {
    return <MessagesShell>Loading messages...</MessagesShell>;
  }

  return (
    <div className="min-h-screen bg-paper-warm">
      <TopBar />
      <main className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-[340px_1fr] gap-5 min-h-[calc(100vh-140px)]">
          <aside className="rounded-[26px] bg-paper border border-paper-line overflow-hidden">
            <div className="p-4 border-b border-paper-line">
              <div className="flex items-center justify-between gap-3">
                <h1 className="font-display text-[30px] font-semibold tracking-[-0.02em]">Messages</h1>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={openGroupPanel}
                    className="h-8 w-8 rounded-full border border-paper-line inline-flex items-center justify-center hover:border-ink/30"
                    aria-label="Create group chat"
                    title="Create group chat"
                  >
                    <Icon.Plus size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettingsOpen(true)}
                    className="h-8 px-3 rounded-pill border border-paper-line text-[10.5px] font-bold tracking-[0.12em] uppercase hover:border-ink/30"
                  >
                    Settings
                  </button>
                </div>
              </div>
              <div className="mt-3 relative">
                <Icon.Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/45" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search people to message..."
                  className="w-full h-10 rounded-pill bg-paper-cool pl-9 pr-3 text-[13px] outline-none border border-transparent focus:border-ink/25"
                />
              </div>
              {matches.length > 0 && (
                <div className="mt-2 rounded-[18px] border border-paper-line bg-paper overflow-hidden">
                  {matches.map((match) => (
                    <button
                      key={match._id}
                      type="button"
                      onClick={() => startThread(match)}
                      className="w-full p-3 flex items-center gap-3 text-left hover:bg-paper-cool"
                    >
                      <Avatar size={34} hue={hueFromString(match._id)} />
                      <span className="min-w-0">
                        <span className="block text-[13px] font-semibold truncate">{match.name}</span>
                        <span className="block text-[11px] text-ink/50 truncate">@{match.username}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="divide-y divide-paper-line">
              {loadingThreads && (
                <div className="p-5 text-[13px] text-ink/50">Loading chats...</div>
              )}
              {!loadingThreads && threads.length === 0 && (
                <div className="p-5 text-[13px] text-ink/50">
                  No chats yet. Search for a person to start one.
                </div>
              )}
              {visibleThreads.map((thread) => {
                const person = otherParticipant(thread, user?._id);
                const local = threadSettings[thread._id] || {};
                const displayName = threadDisplayName(thread, user?._id, local);
                return (
                  <button
                    key={thread._id}
                    type="button"
                    onClick={() => selectThread(thread._id)}
                    className={clsx(
                      "w-full p-4 flex items-center gap-3 text-left transition",
                      selectedId === thread._id ? "bg-paper-cool" : "hover:bg-paper-warm"
                    )}
                  >
                    <Avatar size={42} hue={hueFromString(person?._id || thread._id)} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13.5px] font-semibold truncate">
                        {displayName}
                      </span>
                      <span className="block text-[11.5px] text-ink/50 truncate">
                        {thread.status === "pending" ? "Message request" : `Updated ${relativeTime(thread.lastMessageAt || thread.updatedAt || thread.createdAt)}`}
                      </span>
                    </span>
                    {local.pinned && <span className="text-[9px] font-bold tracking-[0.14em]">PIN</span>}
                    {local.muted && <span className="text-[9px] text-ink/45 font-bold tracking-[0.14em]">MUTE</span>}
                    {thread.status === "pending" && <span className="w-2 h-2 rounded-full bg-ink" />}
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="rounded-[26px] bg-paper border border-paper-line overflow-hidden flex flex-col">
            {!selected ? (
              <div className="flex-1 flex items-center justify-center p-10 text-center text-[13px] text-ink/55">
                Select a chat or search for someone to message.
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-paper-line flex items-center gap-3">
                  <Avatar size={44} hue={hueFromString(other?._id || selected._id)} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold truncate">
                      {threadDisplayName(selected, user?._id, selectedThreadSettings)}
                    </div>
                    <div className="text-[11px] text-ink/50">
                      {selected.status === "pending" ? "Pending request" : "Active chat"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDetailsOpen(true)}
                    className="h-8 px-3 rounded-pill border border-paper-line text-[11.5px] font-semibold hover:border-ink/30"
                  >
                    Details
                  </button>
                  {selected.status === "pending" && !requestedBySelf && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateRequest("reject")} className="h-8 px-3 rounded-pill border border-paper-line text-[11.5px] font-semibold">
                        Reject
                      </button>
                      <button onClick={() => updateRequest("accept")} className="h-8 px-3 rounded-pill bg-ink text-paper text-[11.5px] font-semibold">
                        Accept
                      </button>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="mx-4 mt-4 rounded-[16px] border border-paper-line bg-paper-warm p-3 text-[12px] text-red-700">
                    {error}
                  </div>
                )}
                {isBlocked && (
                  <div className="mx-4 mt-4 rounded-[16px] border border-red-200 bg-red-50 p-3 text-[12px] text-red-700">
                    You blocked this member. Open Details to unblock before sending.
                  </div>
                )}

                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                  {loadingMessages && messages.length === 0 && (
                    <div className="text-center text-[13px] text-ink/45">Loading messages...</div>
                  )}
                  {messages.length === 0 && !loadingMessages && (
                    <div className="text-center text-[13px] text-ink/45">No messages yet.</div>
                  )}
                  {messages.map((message) => {
                    const mine = participantId(message.senderId) === user?._id;
                    const bubbleSize = settings.compactBubbles
                      ? "px-3 py-1.5 text-[12.5px]"
                      : "px-4 py-2 text-[13.5px]";
                    const mineTone = {
                      classic: "bg-ink text-paper",
                      fresh: "bg-emerald-900 text-white",
                      pop: "bg-fuchsia-700 text-white",
                      night: "bg-zinc-950 text-white",
                    }[selectedVibe];
                    const otherTone = {
                      classic: "bg-paper-cool text-ink",
                      fresh: "bg-emerald-50 text-ink border border-emerald-100",
                      pop: "bg-amber-50 text-ink border border-amber-100",
                      night: "bg-zinc-100 text-ink border border-zinc-200",
                    }[selectedVibe];
                    return (
                      <div key={message._id} className={clsx("flex", mine ? "justify-end" : "justify-start")}>
                        <div
                          className={clsx(
                            "max-w-[72%] rounded-[18px] leading-relaxed",
                            bubbleSize,
                            mine ? mineTone : otherTone
                          )}
                        >
                          {message.body && <MessageBody body={message.body} mine={mine} />}
                          {settings.linkPreviews && <MessageLinkPreview body={message.body} mine={mine} />}
                          <MessageAttachments message={message} mine={mine} />
                          {!message.body && normalizedAttachments(message).length === 0 && (
                            <div className="whitespace-pre-wrap">(attachment)</div>
                          )}
                          <div className={clsx("mt-1 text-[10.5px]", mine ? "text-paper/55" : "text-ink/40")}>
                            {relativeTime(message.createdAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-paper-line p-4">
                  {selected.status === "pending" && !canSend && (
                    <div className="mb-3 rounded-[16px] bg-paper-cool p-3 text-[12px] text-ink/60">
                      Accept this request before replying.
                    </div>
                  )}
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                      className="hidden"
                      onChange={(event) => handleFiles(event.target.files, "chat_attachment")}
                    />
                    <input
                      ref={resumeInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                      onChange={(event) => handleFiles(event.target.files, "resume")}
                    />
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime,.mov"
                      className="hidden"
                      onChange={(event) => handleFiles(event.target.files, "chat_attachment")}
                    />
                    <ComposerAction
                      icon={<Icon.Image size={14} />}
                      label="File"
                      disabled={!canSend || uploading}
                      motion={settings.composerMotion}
                      onClick={() => fileInputRef.current?.click()}
                    />
                    <ComposerAction
                      icon={<Icon.Note size={14} />}
                      label="Resume"
                      disabled={!canSend || uploading}
                      motion={settings.composerMotion}
                      onClick={() => resumeInputRef.current?.click()}
                    />
                    <ComposerAction
                      icon={<Icon.Image size={14} />}
                      label="Video"
                      disabled={!canSend || uploading}
                      motion={settings.composerMotion}
                      onClick={() => videoInputRef.current?.click()}
                    />
                    <ComposerAction
                      icon={<Icon.Pin size={14} />}
                      label="Location"
                      disabled={!canSend}
                      motion={settings.composerMotion}
                      onClick={requestLocation}
                    />
                    <ComposerAction
                      icon={<Icon.Poll size={14} />}
                      label="Poll"
                      disabled={!canSend}
                      motion={settings.composerMotion}
                      onClick={() => setPollOpen((value) => !value)}
                    />
                    <select
                      value={selectedVibe}
                      onChange={(event) =>
                        selected && updateThreadSetting(selected._id, { vibe: event.target.value as ChatSettings["defaultVibe"] })
                      }
                      className="h-9 rounded-pill border border-paper-line bg-paper px-3 text-[11px] outline-none"
                      aria-label="Chat visual style"
                    >
                      {chatVibes.map((vibe) => (
                        <option key={vibe.key} value={vibe.key}>
                          {vibe.label}
                        </option>
                      ))}
                    </select>
                    {uploading && <span className="text-[11px] text-ink/50">Uploading...</span>}
                  </div>

                  {(pendingAttachments.length > 0 || locationDraft || linkPreview || pollOpen) && (
                    <div className="mb-3 space-y-2">
                      {linkPreview && <DraftLinkPreview preview={linkPreview} />}
                      {locationDraft && (
                        <DraftPill
                          icon={<Icon.Pin size={13} />}
                          title="Location"
                          detail={locationDraft.label}
                          onRemove={() => setLocationDraft(null)}
                        />
                      )}
                      {pendingAttachments.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {pendingAttachments.map((attachment) => (
                            <DraftAttachment
                              key={attachment.localId}
                              attachment={attachment}
                              onRemove={() => removePendingAttachment(attachment.localId)}
                            />
                          ))}
                        </div>
                      )}
                      {pollOpen && (
                        <div className="rounded-[18px] border border-paper-line bg-paper-warm p-3">
                          <input
                            value={pollDraft.question}
                            onChange={(event) =>
                              setPollDraft((current) => ({ ...current, question: event.target.value }))
                            }
                            placeholder="Poll question"
                            className="h-10 w-full rounded-[14px] border border-paper-line bg-paper px-3 text-[13px] outline-none"
                          />
                          <div className="mt-2 space-y-2">
                            {pollDraft.options.map((option, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <input
                                  value={option}
                                  onChange={(event) => updatePollOption(index, event.target.value)}
                                  placeholder={`Option ${index + 1}`}
                                  className="h-9 flex-1 rounded-[14px] border border-paper-line bg-paper px-3 text-[12px] outline-none"
                                />
                                {pollDraft.options.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => removePollOption(index)}
                                    className="h-8 w-8 rounded-full border border-paper-line inline-flex items-center justify-center"
                                    aria-label="Remove option"
                                  >
                                    <Icon.Close size={12} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={addPollOption}
                            className="mt-2 h-8 px-3 rounded-pill border border-paper-line text-[11px] font-semibold"
                          >
                            Add option
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {hasSensitiveDraft && !sensitiveAck && (
                    <div className="mb-3 rounded-[16px] border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-800">
                      This looks like sensitive personal information. Share only if you trust this person.
                      <button
                        type="button"
                        onClick={() => {
                          setSensitiveAck(true);
                          setError(null);
                        }}
                        className="ml-2 font-bold underline"
                      >
                        Send anyway
                      </button>
                    </div>
                  )}
                  <div className="flex items-end gap-2">
                    <textarea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (settings.enterToSend && event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          sendMessage();
                        }
                      }}
                      disabled={!canSend}
                      rows={2}
                      placeholder={isBlocked ? "Unblock this member to message again" : canSend ? "Message..." : "Waiting for request approval"}
                      className="flex-1 resize-none rounded-[18px] border border-paper-line bg-paper-warm px-4 py-3 text-[13.5px] outline-none focus:border-ink/30 disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={sendMessage}
                      disabled={!hasSendableContent || sending || uploading || !canSend}
                      className={clsx(
                        "btn-press h-11 px-4 rounded-pill bg-ink text-paper text-[12px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-50",
                        sendPulse && "animate-pulse"
                      )}
                    >
                      <Icon.Send size={14} />
                      Send
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
        {settingsOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4 backdrop-blur-sm"
            onClick={() => setSettingsOpen(false)}
          >
            <div
              className="w-full max-w-lg rounded-[28px] bg-paper p-5 shadow-pop"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-[24px] font-semibold tracking-[-0.02em]">
                    Chat settings
                  </h2>
                  <p className="mt-1 text-[12px] text-ink/55">
                    Applies to every conversation on this device.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="w-9 h-9 rounded-full border border-paper-line inline-flex items-center justify-center"
                  aria-label="Close chat settings"
                >
                  <Icon.Close size={14} />
                </button>
              </div>

              <div className="mt-5 space-y-3">
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/45">
                    Default vibe
                  </span>
                  <select
                    value={settings.defaultVibe}
                    onChange={(event) =>
                      updateSetting("defaultVibe", event.target.value as ChatSettings["defaultVibe"])
                    }
                    className="mt-1 h-11 w-full rounded-[16px] border border-paper-line bg-paper-warm px-3 text-[13px] outline-none"
                  >
                    {chatVibes.map((vibe) => (
                      <option key={vibe.key} value={vibe.key}>
                        {vibe.label}
                      </option>
                    ))}
                  </select>
                </label>

                {settingToggles.map(({ key, title, description }) => (
                  <label
                    key={key}
                    className="flex items-start justify-between gap-4 rounded-[18px] border border-paper-line bg-paper-warm p-3"
                  >
                    <span>
                      <span className="block text-[13px] font-semibold">{title}</span>
                      <span className="mt-0.5 block text-[11.5px] text-ink/55">{description}</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={settings[key]}
                      onChange={(event) =>
                        updateSetting(key, event.target.checked)
                      }
                      className="mt-1 h-4 w-4 accent-ink"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {groupOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4 backdrop-blur-sm"
            onClick={() => setGroupOpen(false)}
          >
            <div
              className="w-full max-w-xl rounded-[28px] bg-paper p-5 shadow-pop"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-[24px] font-semibold tracking-[-0.02em]">
                    New group
                  </h2>
                  <p className="mt-1 text-[12px] text-ink/55">
                    Group chats need two or more people.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setGroupOpen(false)}
                  className="w-9 h-9 rounded-full border border-paper-line inline-flex items-center justify-center"
                  aria-label="Close group chat"
                >
                  <Icon.Close size={14} />
                </button>
              </div>

              <label className="mt-5 block">
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/45">
                  Name
                </span>
                <input
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  placeholder="Group name"
                  className="mt-1 h-11 w-full rounded-[16px] border border-paper-line bg-paper-warm px-3 text-[13px] outline-none"
                />
              </label>

              <div className="mt-3">
                <div className="relative">
                  <Icon.Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/45" />
                  <input
                    value={groupSearch}
                    onChange={(event) => setGroupSearch(event.target.value)}
                    placeholder="Search people"
                    className="h-11 w-full rounded-[16px] border border-paper-line bg-paper-warm pl-9 pr-3 text-[13px] outline-none"
                  />
                </div>
                {groupMatches.length > 0 && (
                  <div className="mt-2 overflow-hidden rounded-[18px] border border-paper-line">
                    {groupMatches.map((match) => (
                      <button
                        key={match._id}
                        type="button"
                        onClick={() => addGroupMember(match)}
                        className="w-full p-3 flex items-center gap-3 text-left hover:bg-paper-cool"
                      >
                        <Avatar size={32} hue={hueFromString(match._id)} />
                        <span className="min-w-0">
                          <span className="block text-[13px] font-semibold truncate">{match.name}</span>
                          <span className="block text-[11px] text-ink/50 truncate">@{match.username}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {groupMembers.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {groupMembers.map((member) => (
                    <button
                      key={member._id}
                      type="button"
                      onClick={() =>
                        setGroupMembers((current) =>
                          current.filter((item) => item._id !== member._id)
                        )
                      }
                      className="h-8 rounded-pill border border-paper-line bg-paper-warm px-3 text-[11px] font-semibold"
                    >
                      {member.name} ×
                    </button>
                  ))}
                </div>
              )}

              {groupStatus && (
                <div className="mt-3 rounded-[16px] border border-paper-line bg-paper-warm p-3 text-[12px] text-ink/65">
                  {groupStatus}
                </div>
              )}

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setGroupOpen(false)}
                  className="h-9 px-4 rounded-pill border border-paper-line text-[12px] font-semibold"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={createGroupDraft}
                  className="h-9 px-4 rounded-pill bg-ink text-paper text-[12px] font-semibold"
                >
                  Create group
                </button>
              </div>
            </div>
          </div>
        )}

        {detailsOpen && selected && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4 backdrop-blur-sm"
            onClick={() => setDetailsOpen(false)}
          >
            <div
              className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-[28px] bg-paper p-5 shadow-pop"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar size={48} hue={hueFromString(other?._id || selected._id)} />
                  <div className="min-w-0">
                    <h2 className="truncate font-display text-[24px] font-semibold tracking-[-0.02em]">
                      {threadDisplayName(selected, user?._id, selectedThreadSettings)}
                    </h2>
                    <p className="text-[12px] text-ink/55">
                      {selected.status || "active"} chat · {selectedVibeLabel} vibe
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailsOpen(false)}
                  className="w-9 h-9 rounded-full border border-paper-line inline-flex items-center justify-center"
                  aria-label="Close chat details"
                >
                  <Icon.Close size={14} />
                </button>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[18px] border border-paper-line bg-paper-warm p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/40">Messages</p>
                  <p className="mt-1 text-[22px] font-semibold">{messages.length}</p>
                </div>
                <div className="rounded-[18px] border border-paper-line bg-paper-warm p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/40">Started</p>
                  <p className="mt-1 text-[13px] font-semibold">{relativeTime(selected.createdAt || selected.updatedAt)}</p>
                </div>
                <div className="rounded-[18px] border border-paper-line bg-paper-warm p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/40">Read state</p>
                  <p className="mt-1 text-[13px] font-semibold">{selected.otherLastReadAt ? "Seen recently" : "No receipt yet"}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="text-[14px] font-bold">This chat</h3>
                  <label className="block">
                    <span className="text-[11px] text-ink/55">Nickname</span>
                    <input
                      value={selectedThreadSettings.nickname || ""}
                      onChange={(event) => updateThreadSetting(selected._id, { nickname: event.target.value })}
                      placeholder={threadDisplayName(selected, user?._id)}
                      className="mt-1 h-11 w-full rounded-[16px] border border-paper-line bg-paper-warm px-3 text-[13px] outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] text-ink/55">Vibe</span>
                    <select
                      value={selectedVibe}
                      onChange={(event) =>
                        updateThreadSetting(selected._id, { vibe: event.target.value as ChatSettings["defaultVibe"] })
                      }
                      className="mt-1 h-11 w-full rounded-[16px] border border-paper-line bg-paper-warm px-3 text-[13px] outline-none"
                    >
                      {chatVibes.map((vibe) => (
                        <option key={vibe.key} value={vibe.key}>
                          {vibe.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {isGroupChat && (
                    <div className="rounded-[18px] border border-paper-line bg-paper-warm p-3">
                      <div className="text-[11px] text-ink/55">Members</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {selected.participants.map((participant) => (
                          <span
                            key={participant._id}
                            className="rounded-pill bg-paper px-2.5 py-1 text-[11px] font-semibold"
                          >
                            {participant.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <label className="flex items-center justify-between rounded-[18px] border border-paper-line bg-paper-warm p-3">
                    <span className="text-[13px] font-semibold">Pin conversation</span>
                    <input
                      type="checkbox"
                      checked={!!selectedThreadSettings.pinned}
                      onChange={(event) => updateThreadSetting(selected._id, { pinned: event.target.checked })}
                      className="h-4 w-4 accent-ink"
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-[18px] border border-paper-line bg-paper-warm p-3">
                    <span className="text-[13px] font-semibold">Mute locally</span>
                    <input
                      type="checkbox"
                      checked={!!selectedThreadSettings.muted}
                      onChange={(event) => updateThreadSetting(selected._id, { muted: event.target.checked })}
                      className="h-4 w-4 accent-ink"
                    />
                  </label>
                </div>

                <div className="space-y-3">
                  <h3 className="text-[14px] font-bold">Safety</h3>
                  <div className="rounded-[18px] border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-800">
                    Keep payments, passwords, documents, and private contact details off chat unless you trust the recipient.
                  </div>
                  {isGroupChat ? (
                    <div className="rounded-[18px] border border-paper-line bg-paper-warm p-3 text-[12px] text-ink/60">
                      Group report, remove member, and leave group controls need the group chat API endpoint.
                    </div>
                  ) : (
                    <>
                      <label className="block">
                        <span className="text-[11px] text-ink/55">Report reason</span>
                        <select
                          value={reportReason}
                          onChange={(event) => setReportReason(event.target.value)}
                          className="mt-1 h-11 w-full rounded-[16px] border border-paper-line bg-paper-warm px-3 text-[13px] outline-none"
                        >
                          {reportReasons.map((reason) => (
                            <option key={reason} value={reason}>
                              {reason}
                            </option>
                          ))}
                        </select>
                      </label>
                      <textarea
                        value={reportDetails}
                        onChange={(event) => setReportDetails(event.target.value)}
                        rows={3}
                        placeholder="Add context for moderators"
                        className="w-full resize-none rounded-[16px] border border-paper-line bg-paper-warm px-3 py-2 text-[13px] outline-none"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={reportUser}
                          className="h-9 px-3 rounded-pill border border-red-200 text-[12px] font-semibold text-red-700 hover:bg-red-50"
                        >
                          Report user
                        </button>
                        <button
                          type="button"
                          onClick={isBlocked ? unblockUser : blockUser}
                          className={clsx(
                            "h-9 px-3 rounded-pill text-[12px] font-semibold",
                            isBlocked ? "border border-paper-line" : "bg-red-700 text-white"
                          )}
                        >
                          {isBlocked ? "Unblock" : "Block"}
                        </button>
                      </div>
                    </>
                  )}
                  {safetyStatus && <p className="text-[12px] text-ink/60">{safetyStatus}</p>}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function MessagesShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper-warm">
      <TopBar />
      <main className="max-w-[900px] mx-auto px-6 py-16 text-[14px] text-ink/60">
        {children}
      </main>
    </div>
  );
}

function ComposerAction({
  icon,
  label,
  disabled,
  motion,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  motion: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "h-9 rounded-pill border border-paper-line bg-paper px-3 text-[11px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-50 transition",
        motion && "hover:-translate-y-px hover:border-ink/30"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function DraftPill({
  icon,
  title,
  detail,
  onRemove,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-[16px] border border-paper-line bg-paper-warm p-2.5">
      <span className="h-8 w-8 rounded-full bg-paper inline-flex items-center justify-center">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-semibold">{title}</span>
        <span className="block truncate text-[11px] text-ink/55">{detail}</span>
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="h-8 w-8 rounded-full border border-paper-line inline-flex items-center justify-center"
        aria-label={`Remove ${title}`}
      >
        <Icon.Close size={12} />
      </button>
    </div>
  );
}

function DraftLinkPreview({ preview }: { preview: LinkPreview }) {
  return (
    <div className="rounded-[16px] border border-paper-line bg-paper-warm p-3">
      <div className="flex items-center gap-2 text-[12px] font-semibold">
        <Icon.Link size={13} />
        {preview.host}
      </div>
      <div className="mt-1 truncate text-[11px] text-ink/55">{preview.url}</div>
    </div>
  );
}

function DraftAttachment({
  attachment,
  onRemove,
}: {
  attachment: PendingAttachment;
  onRemove: () => void;
}) {
  const isImage = attachment.contentType?.startsWith("image/");
  const isVideo = attachment.contentType?.startsWith("video/");
  return (
    <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-[16px] border border-paper-line bg-paper-warm">
      {isImage && attachment.localUrl ? (
        <img src={attachment.localUrl} alt="" className="h-full w-full object-cover" />
      ) : isVideo && attachment.localUrl ? (
        <video src={attachment.localUrl} className="h-full w-full object-cover" muted />
      ) : (
        <div className="flex h-full flex-col justify-end p-3">
          <Icon.Note size={18} />
          <span className="mt-2 line-clamp-2 text-[11px] font-semibold">{attachment.name}</span>
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-1.5 top-1.5 h-7 w-7 rounded-full bg-paper/90 border border-paper-line inline-flex items-center justify-center"
        aria-label="Remove attachment"
      >
        <Icon.Close size={11} />
      </button>
    </div>
  );
}

function MessageBody({ body, mine }: { body: string; mine: boolean }) {
  const parts = body.split(urlRegex);
  return (
    <div className="whitespace-pre-wrap">
      {parts.map((part, index) => {
        if (!isUrl(part)) return <span key={`${part}-${index}`}>{part}</span>;
        return (
          <a
            key={`${part}-${index}`}
            href={part}
            target="_blank"
            rel="noreferrer"
            className={clsx("underline underline-offset-2", mine ? "text-paper" : "text-ink")}
          >
            {part}
          </a>
        );
      })}
    </div>
  );
}

function MessageLinkPreview({ body, mine }: { body?: string; mine: boolean }) {
  const preview = buildLinkPreview(body || "");
  if (!preview) return null;
  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noreferrer"
      className={clsx(
        "mt-2 block rounded-[14px] border p-2 text-left",
        mine ? "border-white/20 bg-white/10" : "border-paper-line bg-paper"
      )}
    >
      <span className="flex items-center gap-2 text-[11px] font-semibold">
        <Icon.Link size={12} />
        {preview.host}
      </span>
      <span className={clsx("mt-0.5 block truncate text-[10.5px]", mine ? "text-paper/65" : "text-ink/50")}>
        {preview.url}
      </span>
    </a>
  );
}

function MessageAttachments({ message, mine }: { message: ChatMessage; mine: boolean }) {
  const attachments = normalizedAttachments(message);
  if (attachments.length === 0) return null;
  return (
    <div className="mt-2 grid gap-2">
      {attachments.map((attachment, index) => {
        const isImage = attachment.contentType?.startsWith("image/") || attachment.kind === "image";
        const isVideo = attachment.contentType?.startsWith("video/");
        if (isImage) {
          return (
            <a key={`${attachment.url}-${index}`} href={attachment.url} target="_blank" rel="noreferrer">
              <img
                src={attachment.url}
                alt={attachment.name || "Attachment"}
                className="max-h-72 w-full rounded-[14px] object-cover"
              />
            </a>
          );
        }
        if (isVideo) {
          return (
            <video
              key={`${attachment.url}-${index}`}
              src={attachment.url}
              controls
              className="max-h-72 w-full rounded-[14px] bg-black"
            />
          );
        }
        return (
          <a
            key={`${attachment.url}-${index}`}
            href={attachment.url}
            target="_blank"
            rel="noreferrer"
            className={clsx(
              "flex items-center gap-2 rounded-[14px] border p-2 text-[12px] font-semibold",
              mine ? "border-white/20 bg-white/10" : "border-paper-line bg-paper"
            )}
          >
            <Icon.Note size={14} />
            <span className="truncate">{attachment.name || attachmentLabel(attachment)}</span>
          </a>
        );
      })}
    </div>
  );
}

type LinkPreview = {
  url: string;
  host: string;
};

const urlRegex = /(https?:\/\/[^\s]+)/g;

function isUrl(value: string) {
  return /^https?:\/\//.test(value);
}

function buildLinkPreview(text: string): LinkPreview | null {
  const match = text.match(urlRegex)?.[0];
  if (!match) return null;
  try {
    const url = new URL(match);
    return { url: match, host: url.hostname.replace(/^www\./, "") };
  } catch {
    return null;
  }
}

function buildOutgoingBody(
  text: string,
  location: LocationDraft | null,
  poll: PollDraft | null
) {
  const parts = [text.trim()].filter(Boolean);
  if (location) {
    parts.push(`Location: ${location.label}\n${location.url}`);
  }
  if (poll) {
    const options = poll.options
      .map((option) => option.trim())
      .filter(Boolean)
      .map((option, index) => `${index + 1}. ${option}`)
      .join("\n");
    parts.push(`Poll: ${poll.question.trim()}\n${options}`);
  }
  return parts.join("\n\n");
}

function normalizedAttachments(message: ChatMessage): ChatAttachment[] {
  const attachments = [...(message.attachments || [])];
  if (message.attachmentUrl) {
    attachments.push({
      url: message.attachmentUrl,
      contentType: message.attachmentContentType,
      kind: message.attachmentKind,
      name: message.attachmentName,
    });
  }
  return attachments.filter((attachment) => !!attachment.url);
}

function attachmentKind(contentType: string, name: string): ChatAttachment["kind"] {
  if (contentType.startsWith("image/")) return "image";
  if (contentType === "application/pdf" || name.toLowerCase().endsWith(".pdf")) return "pdf";
  return "file";
}

function attachmentLabel(attachment: ChatAttachment) {
  if (attachment.kind === "pdf") return "PDF";
  if (attachment.contentType?.startsWith("video/")) return "Video";
  return "File";
}

function localIdFor(file: File) {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${file.name}-${file.size}-${random}`;
}

function otherParticipant(thread: ChatThread, userId?: string): ChatParticipant | undefined {
  return thread.otherParticipant || thread.participants.find((participant) => participant._id !== userId);
}

function threadDisplayName(
  thread: ChatThread,
  userId?: string,
  local?: ThreadSettings[string]
) {
  if (local?.nickname) return local.nickname;
  if (thread.name || thread.title) return thread.name || thread.title || "Group chat";
  const others = thread.participants.filter((participant) => participant._id !== userId);
  if (others.length > 1) return others.map((participant) => participant.name).join(", ");
  return others[0]?.name || thread.otherParticipant?.name || "Unknown user";
}

function participantId(value?: string | ChatParticipant | null): string | undefined {
  if (!value) return undefined;
  return typeof value === "string" ? value : value._id;
}
