"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { useRouter, useSearchParams } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { AnimatedLogo, BizimLogoLockup, type LogoMotion } from "@/components/AnimatedLogo";
import { useAuth } from "@/lib/auth";
import { chatsApi, type ChatMessage, type ChatParticipant, type ChatThread } from "@/lib/chats";
import type { ChatAttachment } from "@/lib/chats";
import { uploadFile } from "@/lib/uploads";
import { usersApi, type UserSearchResult } from "@/lib/users";
import { hueFromString, relativeTime } from "@/lib/format";

const chatStyles = [
  { key: "lime", label: "Lime" },
  { key: "paper", label: "Paper" },
  { key: "ink", label: "Ink" },
] as const;

type ChatStyle = (typeof chatStyles)[number]["key"];

const reportReasons = [
  "Harassment or bullying",
  "Spam or scam",
  "Hate or abusive content",
  "Unsafe personal information request",
  "Other safety concern",
];

const quickReactions = ["💚", "✨", "😂", "👏", "👀"];

const sensitiveInfoRegex =
  /(\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\b(?:\+?\d[\d\s().-]{7,}\d)\b|\b(?:password|passport|ssn|social security|credit card|bank account|iban|cvv)\b)/i;

const settingsKey = "bc_messages_settings_v3";
const threadSettingsKey = "bc_messages_thread_settings_v3";
const pollVotesKey = "bc_messages_poll_votes_v1";

type ChatSettings = {
  enterToSend: boolean;
  safetyNudges: boolean;
  linkPreviews: boolean;
  mediaPreviews: boolean;
  subtleMotion: boolean;
  compactBubbles: boolean;
  defaultStyle: ChatStyle;
};

type ThreadLocalSettings = {
  nickname?: string;
  style?: ChatStyle;
  pinned?: boolean;
  muted?: boolean;
  hidePreviews?: boolean;
  restricted?: boolean;
};

type ThreadSettings = Record<string, ThreadLocalSettings>;

const defaultSettings: ChatSettings = {
  enterToSend: true,
  safetyNudges: true,
  linkPreviews: true,
  mediaPreviews: true,
  subtleMotion: true,
  compactBubbles: false,
  defaultStyle: "lime",
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

type LinkPreview = {
  url: string;
  host: string;
};

const settingToggles: Array<{
  key: Exclude<keyof ChatSettings, "defaultStyle">;
  title: string;
  description: string;
}> = [
  {
    key: "enterToSend",
    title: "Enter sends",
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
    description: "Show compact previews when links appear in a message.",
  },
  {
    key: "mediaPreviews",
    title: "Media previews",
    description: "Show images and videos inline when the chat allows it.",
  },
  {
    key: "subtleMotion",
    title: "Subtle motion",
    description: "Use small send and hover animations.",
  },
  {
    key: "compactBubbles",
    title: "Compact bubbles",
    description: "Use tighter spacing for longer conversations.",
  },
];

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    if (typeof fallback === "object" && fallback !== null && !Array.isArray(fallback)) {
      return { ...(fallback as object), ...JSON.parse(raw) } as T;
    }
    return JSON.parse(raw) as T;
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
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState<UserSearchResult[]>([]);
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [groupMatches, setGroupMatches] = useState<UserSearchResult[]>([]);
  const [groupMembers, setGroupMembers] = useState<UserSearchResult[]>([]);
  const [groupStatus, setGroupStatus] = useState<string | null>(null);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendPulse, setSendPulse] = useState(false);
  const [sparkKey, setSparkKey] = useState(0);
  const [headerMotion, setHeaderMotion] = useState<LogoMotion>("landing-loop");
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [settings, setSettings] = useState<ChatSettings>(() =>
    readLocal(settingsKey, defaultSettings)
  );
  const [threadSettings, setThreadSettings] = useState<ThreadSettings>(() =>
    readLocal(threadSettingsKey, {})
  );
  const [pollVotes, setPollVotes] = useState<Record<string, number>>(() =>
    readLocal(pollVotesKey, {})
  );
  const [messageReport, setMessageReport] = useState<ChatMessage | null>(null);
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

  useEffect(() => writeLocal(settingsKey, settings), [settings]);
  useEffect(() => writeLocal(threadSettingsKey, threadSettings), [threadSettings]);
  useEffect(() => writeLocal(pollVotesKey, pollVotes), [pollVotes]);
  useEffect(() => setSensitiveAck(false), [draft, selectedId]);

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
        if (!cancelled) {
          setMatches(next.filter((match) => match._id !== user?._id && !blockedIds.has(match._id)));
        }
      } catch {
        if (!cancelled) setMatches([]);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [search, user?._id, blockedIds]);

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
                !blockedIds.has(match._id) &&
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
  }, [groupSearch, groupMembers, user?._id, blockedIds]);

  const selected = useMemo(
    () => threads.find((thread) => thread._id === selectedId) || null,
    [threads, selectedId]
  );
  const other = selected ? otherParticipant(selected, user?._id) : null;
  const requestedBySelf = selected ? participantId(selected.requestedBy) === user?._id : false;
  const baseCanSend = selected?.status === "active" || requestedBySelf || !selected?.status;
  const selectedLocal = selected ? threadSettings[selected._id] || {} : {};
  const selectedStyle = selectedLocal.style || settings.defaultStyle;
  const otherId = other?._id || "";
  const isBlocked = !!otherId && blockedIds.has(otherId);
  const isRestricted = !!selectedLocal.restricted;
  const canSend = baseCanSend && !isBlocked;
  const hidePreviews = !!selectedLocal.hidePreviews || isRestricted;
  const hasSensitiveDraft = settings.safetyNudges && !!draft.trim() && sensitiveInfoRegex.test(draft);
  const activePollOptions = pollDraft.options.map((option) => option.trim()).filter(Boolean);
  const hasPollDraft = !!pollDraft.question.trim() && activePollOptions.length >= 2;
  const linkPreview = settings.linkPreviews && !hidePreviews ? buildLinkPreview(draft) : null;
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

  function playMotion(motion: LogoMotion) {
    if (!settings.subtleMotion) return;
    setHeaderMotion(motion);
    setSparkKey((key) => key + 1);
    window.setTimeout(() => setHeaderMotion("landing-loop"), 900);
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
      setError("This looks like sensitive personal information. Review it before sending.");
      return;
    }

    const attachments = pendingAttachments.map(({ localId, localUrl, ...attachment }) => attachment);
    const previous = { draft, pendingAttachments, locationDraft, pollDraft };

    setSending(true);
    setDraft("");
    setPendingAttachments([]);
    setLocationDraft(null);
    setPollDraft({ question: "", options: ["", ""] });
    setPollOpen(false);

    try {
      const message = await chatsApi.send(selectedId, { body, attachments });
      previous.pendingAttachments.forEach((attachment) => {
        if (attachment.localUrl) URL.revokeObjectURL(attachment.localUrl);
      });
      setMessages((current) => [...current, message]);
      if (settings.subtleMotion) {
        setSendPulse(true);
        window.setTimeout(() => setSendPulse(false), 420);
      }
      playMotion(body.match(/\b(yay|congrats|birthday|good news|love|bizim)\b/i) ? "spark" : "rocket");
    } catch (err: any) {
      setDraft(previous.draft);
      setPendingAttachments(previous.pendingAttachments);
      setLocationDraft(previous.locationDraft);
      setPollDraft(previous.pollDraft);
      setError(err?.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  async function updateRequest(action: "accept" | "reject") {
    if (!selectedId) return;
    try {
      const updated =
        action === "accept" ? await chatsApi.accept(selectedId) : await chatsApi.reject(selectedId);
      setThreads((current) => current.map((thread) => (thread._id === updated._id ? updated : thread)));
      playMotion(action === "accept" ? "high-five" : "shy");
    } catch (err: any) {
      setError(err?.message || `Failed to ${action} chat.`);
    }
  }

  function votePoll(messageId: string, optionIndex: number) {
    setPollVotes((current) => ({ ...current, [messageId]: optionIndex }));
    playMotion("pop");
  }

  async function reactToMessage(message: ChatMessage, emoji: string) {
    try {
      const updated = await chatsApi.react(message._id, emoji);
      setMessages((current) =>
        current.map((item) => (item._id === updated._id ? updated : item))
      );
      playMotion("bop");
    } catch (err: any) {
      setError(err?.message || "Failed to add reaction.");
    }
  }

  async function reportMessage() {
    if (!messageReport) return;
    const targetUserId = participantId(messageReport.senderId);
    if (!targetUserId || targetUserId === user?._id) {
      setMessageReport(null);
      return;
    }
    setSafetyStatus(null);
    try {
      await chatsApi.reportUser({
        userId: targetUserId,
        messageId: messageReport._id,
        reason: reportReason,
        details: reportDetails,
      });
      setReportDetails("");
      setMessageReport(null);
      setSafetyStatus("Message report sent for review.");
    } catch (err: any) {
      setSafetyStatus(err?.message || "Failed to send message report.");
    }
  }

  function updateSetting<K extends keyof ChatSettings>(key: K, value: ChatSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function updateThreadSetting(threadId: string, patch: ThreadLocalSettings) {
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
        setLocationDraft({
          label: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
          url: `https://maps.google.com/?q=${latitude},${longitude}`,
        });
      },
      () => setError("Location permission was denied or unavailable."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function createGroup() {
    if (groupMembers.length < 2) {
      setGroupStatus("Choose at least two people.");
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
      setSafetyStatus("Blocked.");
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
      setSafetyStatus("Unblocked.");
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
      <TopBar logoVariant="canva" />
      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink/45">
              Messages
            </div>
            <h1 className="font-display text-[38px] font-semibold leading-none tracking-[-0.03em]">
              Chats
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setGroupOpen(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-pill border border-paper-line bg-paper px-4 text-[12px] font-semibold shadow-soft transition hover:border-ink/30"
          >
            <Icon.Plus size={14} />
            New group
          </button>
        </div>

        <div className="grid min-h-[calc(100vh-178px)] gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-[22px] border border-paper-line bg-paper shadow-soft">
            <div className="border-b border-paper-line bg-paper-cool p-4">
              <div className="flex items-center justify-between gap-3">
                <BizimLogoLockup size={42} motion={settings.subtleMotion ? "side-to-side" : "none"} />
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-paper-line bg-paper transition hover:border-ink/30"
                  aria-label="Chat settings"
                >
                  <Icon.Filter size={14} />
                </button>
              </div>

              <div className="relative mt-4">
                <Icon.Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/45" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search people"
                  className="h-11 w-full rounded-pill border border-paper-line bg-paper py-0 pl-9 pr-3 text-[13px] outline-none transition focus:border-[#8FC23A] focus:shadow-[0_0_0_4px_rgba(193,255,114,0.35)]"
                />
              </div>

              {matches.length > 0 && (
                <div className="mt-2 overflow-hidden rounded-[18px] border border-paper-line bg-paper">
                  {matches.map((match) => (
                    <button
                      key={match._id}
                      type="button"
                      onClick={() => startThread(match)}
                      className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-paper-cool"
                    >
                      <Avatar size={34} hue={hueFromString(match._id)} />
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-semibold">{match.name}</span>
                        <span className="block truncate text-[11px] text-ink/50">@{match.username}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="max-h-[calc(100vh-320px)] overflow-y-auto p-2">
              {loadingThreads && (
                <div className="flex items-center gap-3 p-4 text-[13px] text-ink/50">
                  <AnimatedLogo size={32} motion="loading" />
                  Loading chats...
                </div>
              )}
              {!loadingThreads && threads.length === 0 && (
                <div className="p-5 text-[13px] text-ink/50">
                  No chats yet. Search for a person to start one.
                </div>
              )}
              {visibleThreads.map((thread) => {
                const local = threadSettings[thread._id] || {};
                const person = otherParticipant(thread, user?._id);
                const group = isGroupThread(thread, user?._id);
                const displayName = threadDisplayName(thread, user?._id, local);
                const active = selectedId === thread._id;
                return (
                  <button
                    key={thread._id}
                    type="button"
                    onClick={() => selectThread(thread._id)}
                    className={clsx(
                      "group relative flex w-full items-center gap-3 rounded-[18px] p-3 text-left transition",
                      active ? "bg-[#EAFCC4]" : "hover:bg-paper-cool"
                    )}
                  >
                    <span className="relative shrink-0">
                      <Avatar size={44} hue={hueFromString(person?._id || thread._id)} />
                      {group && (
                        <span className="absolute -right-1 -bottom-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-paper bg-[#C1FF72] px-1 text-[9px] font-bold">
                          {thread.participants.length}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[13.5px] font-semibold">{displayName}</span>
                        {local.pinned && <Icon.Pin size={11} className="shrink-0 text-ink/50" />}
                      </span>
                      <span className="block truncate text-[11.5px] text-ink/50">
                        {thread.status === "pending"
                          ? "Message request"
                          : thread.lastMessageSnippet || `Updated ${relativeTime(thread.lastMessageAt || thread.updatedAt || thread.createdAt)}`}
                      </span>
                    </span>
                    {local.muted && (
                      <span className="rounded-pill border border-paper-line bg-paper px-2 py-0.5 text-[9px] font-bold tracking-[0.12em] text-ink/45">
                        MUTE
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="relative flex min-h-[640px] flex-col overflow-hidden rounded-[22px] border border-paper-line bg-paper shadow-soft">
            {settings.subtleMotion && sparkKey > 0 && <LimeBurst key={sparkKey} />}
            {!selected ? (
              <EmptyConversation />
            ) : (
              <>
                <div className="flex items-center gap-3 border-b border-paper-line bg-paper/90 p-4">
                  <span className="hidden shrink-0 sm:inline-flex">
                    <AnimatedLogo
                      key={`${headerMotion}-${sparkKey}`}
                      size={36}
                      motion={settings.subtleMotion ? headerMotion : "none"}
                    />
                  </span>
                  <Avatar size={46} hue={hueFromString(other?._id || selected._id)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[15px] font-semibold">
                        {threadDisplayName(selected, user?._id, selectedLocal)}
                      </span>
                      {isGroupThread(selected, user?._id) && (
                        <span className="rounded-pill bg-[#EAFCC4] px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.12em] text-[#4A7018]">
                          Group
                        </span>
                      )}
                    </div>
                    <div className="truncate text-[11.5px] text-ink/50">
                      {selected.status === "pending"
                        ? "Pending request"
                        : isBlocked
                        ? "Blocked"
                        : isRestricted
                        ? "Restricted locally"
                        : selectedLocal.hidePreviews
                        ? "Previews hidden"
                        : selected.otherLastReadAt
                        ? `Seen ${relativeTime(selected.otherLastReadAt)}`
                        : "Active chat"}
                    </div>
                  </div>
                  <select
                    value={selectedStyle}
                    onChange={(event) =>
                      updateThreadSetting(selected._id, { style: event.target.value as ChatStyle })
                    }
                    className="hidden h-9 rounded-pill border border-paper-line bg-paper px-3 text-[11px] font-semibold uppercase tracking-[0.1em] outline-none sm:block"
                    aria-label="Chat style"
                  >
                    {chatStyles.map((style) => (
                      <option key={style.key} value={style.key}>
                        {style.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setDetailsOpen(true)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-paper-line transition hover:border-ink/30"
                    aria-label="Chat details"
                  >
                    <Icon.More size={16} />
                  </button>
                </div>

                {selected.status === "pending" && !requestedBySelf && (
                  <div className="mx-4 mt-4 rounded-[18px] border border-paper-line bg-[#EAFCC4] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-[12.5px] font-semibold">Message request</span>
                      <span className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => updateRequest("reject")}
                          className="h-8 rounded-pill border border-ink/15 bg-paper px-3 text-[11.5px] font-semibold"
                        >
                          Decline
                        </button>
                        <button
                          type="button"
                          onClick={() => updateRequest("accept")}
                          className="h-8 rounded-pill bg-ink px-3 text-[11.5px] font-semibold text-paper"
                        >
                          Accept
                        </button>
                      </span>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mx-4 mt-4 rounded-[16px] border border-red-200 bg-red-50 p-3 text-[12px] text-red-700">
                    {error}
                  </div>
                )}

                {isBlocked && (
                  <div className="mx-4 mt-4 rounded-[16px] border border-red-200 bg-red-50 p-3 text-[12px] text-red-700">
                    You blocked this member. Open Details to unblock.
                  </div>
                )}

                <div className="flex-1 overflow-y-auto bg-paper-warm/60 p-4">
                  {loadingMessages && messages.length === 0 && (
                    <div className="flex justify-center py-10">
                      <AnimatedLogo size={56} motion="loading" />
                    </div>
                  )}
                  {messages.length === 0 && !loadingMessages && (
                    <div className="flex h-full min-h-72 flex-col items-center justify-center gap-3 text-center">
                      <AnimatedLogo size={58} motion="wave" />
                      <p className="text-[13px] text-ink/50">No messages yet.</p>
                    </div>
                  )}
                  <div className="space-y-3">
                    {messages.map((message) => {
                      const mine = participantId(message.senderId) === user?._id;
                      return (
                        <MessageBubble
                          key={message._id}
                          message={message}
                          mine={mine}
                          styleKey={selectedStyle}
                          compact={settings.compactBubbles}
                          showLinkPreviews={settings.linkPreviews && !hidePreviews}
                          showMediaPreviews={settings.mediaPreviews && !hidePreviews}
                          pollVote={pollVotes[message._id]}
                          onVotePoll={(optionIndex) => votePoll(message._id, optionIndex)}
                          onReact={(emoji) => reactToMessage(message, emoji)}
                          onReport={
                            mine
                              ? undefined
                              : () => {
                                  setReportDetails("");
                                  setMessageReport(message);
                                }
                          }
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-paper-line bg-paper p-4">
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

                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <ComposerAction icon={<Icon.Image size={14} />} label="File" disabled={!canSend || uploading} onClick={() => fileInputRef.current?.click()} />
                    <ComposerAction icon={<Icon.Note size={14} />} label="Resume" disabled={!canSend || uploading} onClick={() => resumeInputRef.current?.click()} />
                    <ComposerAction icon={<Icon.Image size={14} />} label="Video" disabled={!canSend || uploading} onClick={() => videoInputRef.current?.click()} />
                    <ComposerAction icon={<Icon.Pin size={14} />} label="Location" disabled={!canSend} onClick={requestLocation} />
                    <ComposerAction icon={<Icon.Poll size={14} />} label="Poll" disabled={!canSend} onClick={() => setPollOpen((value) => !value)} />
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
                            className="h-10 w-full rounded-[14px] border border-paper-line bg-paper px-3 text-[13px] outline-none focus:border-[#8FC23A]"
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
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-paper-line"
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
                            className="mt-2 h-8 rounded-pill border border-paper-line px-3 text-[11px] font-semibold"
                          >
                            Add option
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {hasSensitiveDraft && !sensitiveAck && (
                    <div className="mb-3 flex items-center justify-between gap-3 rounded-[16px] border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-900">
                      <span>Review sensitive details before sending.</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSensitiveAck(true);
                          setError(null);
                        }}
                        className="h-8 shrink-0 rounded-pill bg-ink px-3 text-[11px] font-semibold text-paper"
                      >
                        Send anyway
                      </button>
                    </div>
                  )}

                  <div className="flex items-end gap-2 rounded-[20px] border border-paper-line bg-paper-warm p-2.5 transition focus-within:border-[#8FC23A] focus-within:shadow-[0_0_0_4px_rgba(193,255,114,0.35)]">
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
                      rows={1}
                      placeholder={isBlocked ? "Unblock to message" : canSend ? "Message..." : "Waiting for approval"}
                      className="max-h-[140px] min-h-[34px] flex-1 resize-none bg-transparent px-2 py-2 text-[14px] outline-none placeholder:text-ink/40"
                    />
                    <button
                      type="button"
                      onClick={sendMessage}
                      disabled={!hasSendableContent || sending || uploading || !canSend}
                      className={clsx(
                        "inline-flex h-10 items-center justify-center gap-2 rounded-pill bg-[#C1FF72] px-4 text-[12px] font-semibold text-ink shadow-soft transition hover:bg-[#B4F25F] disabled:opacity-50",
                        sendPulse && "scale-105"
                      )}
                    >
                      {sending ? <AnimatedLogo size={18} motion="loading" /> : <Icon.Send size={14} />}
                      Send
                    </button>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </main>

      {settingsOpen && (
        <SettingsModal
          settings={settings}
          updateSetting={updateSetting}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {groupOpen && (
        <GroupModal
          name={groupName}
          setName={setGroupName}
          search={groupSearch}
          setSearch={setGroupSearch}
          matches={groupMatches}
          members={groupMembers}
          setMembers={setGroupMembers}
          status={groupStatus}
          onAdd={(match) => {
            setGroupMembers((current) => [...current, match]);
            setGroupSearch("");
            setGroupMatches([]);
          }}
          onCreate={createGroup}
          onClose={() => setGroupOpen(false)}
        />
      )}

      {detailsOpen && selected && (
        <DetailsModal
          thread={selected}
          local={selectedLocal}
          currentUserId={user?._id}
          messageCount={messages.length}
          isBlocked={isBlocked}
          reportReason={reportReason}
          reportDetails={reportDetails}
          safetyStatus={safetyStatus}
          setReportReason={setReportReason}
          setReportDetails={setReportDetails}
          updateThreadSetting={(patch) => updateThreadSetting(selected._id, patch)}
          onBlock={blockUser}
          onUnblock={unblockUser}
          onReport={reportUser}
          onClose={() => setDetailsOpen(false)}
        />
      )}

      {messageReport && (
        <MessageReportModal
          message={messageReport}
          reason={reportReason}
          details={reportDetails}
          status={safetyStatus}
          setReason={setReportReason}
          setDetails={setReportDetails}
          onReport={reportMessage}
          onClose={() => setMessageReport(null)}
        />
      )}
    </div>
  );
}

function MessagesShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper-warm">
      <TopBar logoVariant="canva" />
      <main className="mx-auto max-w-[900px] px-6 py-16 text-[14px] text-ink/60">
        {children}
      </main>
    </div>
  );
}

function EmptyConversation() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
      <BizimLogoLockup size={76} motion="side-to-side" />
      <div>
        <p className="font-display text-[22px] font-semibold tracking-[-0.02em]">Select a chat</p>
        <p className="mt-1 text-[13px] text-ink/50">Search or choose a thread from the inbox.</p>
      </div>
    </div>
  );
}

function LimeBurst() {
  const dots = [
    { left: 42, top: 16, delay: 0 },
    { left: 52, top: 6, delay: 80 },
    { left: 62, top: 18, delay: 130 },
    { left: 35, top: 30, delay: 170 },
    { left: 68, top: 34, delay: 210 },
    { left: 50, top: 42, delay: 260 },
  ];
  return (
    <div className="pointer-events-none absolute right-7 top-[84px] z-20 h-24 w-24" aria-hidden>
      {dots.map((dot) => (
        <span
          key={`${dot.left}-${dot.top}`}
          className="absolute h-2.5 w-2.5 rounded-full border border-ink/60 bg-[#C1FF72] shadow-soft animate-ping"
          style={{ left: `${dot.left}%`, top: `${dot.top}%`, animationDelay: `${dot.delay}ms` }}
        />
      ))}
    </div>
  );
}

function ComposerAction({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-paper-line bg-paper px-3 text-[11px] font-semibold transition hover:-translate-y-px hover:border-ink/30 disabled:translate-y-0 disabled:opacity-50"
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
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-paper">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-semibold">{title}</span>
        <span className="block truncate text-[11px] text-ink/55">{detail}</span>
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-paper-line"
        aria-label={`Remove ${title}`}
      >
        <Icon.Close size={12} />
      </button>
    </div>
  );
}

function DraftLinkPreview({ preview }: { preview: LinkPreview }) {
  return (
    <div className="flex items-center gap-3 rounded-[16px] border border-paper-line bg-paper p-3">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#EAFCC4] text-[#4A7018]">
        <Icon.Link size={16} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[12px] font-semibold">{preview.host}</span>
        <span className="block truncate text-[11px] text-ink/55">{preview.url}</span>
      </span>
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
          <span className="mt-2 truncate text-[11px] font-semibold">{attachment.name}</span>
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full border border-paper-line bg-paper/95"
        aria-label="Remove attachment"
      >
        <Icon.Close size={11} />
      </button>
    </div>
  );
}

function MessageBubble({
  message,
  mine,
  styleKey,
  compact,
  showLinkPreviews,
  showMediaPreviews,
  pollVote,
  onVotePoll,
  onReact,
  onReport,
}: {
  message: ChatMessage;
  mine: boolean;
  styleKey: ChatStyle;
  compact: boolean;
  showLinkPreviews: boolean;
  showMediaPreviews: boolean;
  pollVote?: number;
  onVotePoll: (optionIndex: number) => void;
  onReact: (emoji: string) => void;
  onReport?: () => void;
}) {
  const dark = mine && styleKey === "ink";
  const bubbleTone = mine
    ? styleKey === "ink"
      ? "bg-ink text-paper"
      : styleKey === "paper"
      ? "bg-paper border border-paper-line text-ink"
      : "bg-[#C1FF72] text-ink"
    : "bg-paper border border-paper-line text-ink";
  const attachments = normalizedAttachments(message);
  const structured = extractStructuredContent(message.body || "");

  return (
    <div className={clsx("group flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={clsx(
          "max-w-[92%] rounded-[20px] shadow-soft sm:max-w-[80%]",
          compact ? "px-3 py-2 text-[12.5px]" : "px-4 py-2.5 text-[13.5px]",
          bubbleTone
        )}
      >
        {structured.body && <RichMessageBody body={structured.body} dark={dark} />}
        {structured.location && <LocationCard location={structured.location} dark={dark} />}
        {structured.poll && (
          <PollCard
            poll={structured.poll}
            selectedIndex={pollVote}
            dark={dark}
            onVote={onVotePoll}
          />
        )}
        {showLinkPreviews && <MessageLinkPreview body={message.body} dark={dark} />}
        {showMediaPreviews ? (
          <MessageAttachments attachments={attachments} dark={dark} />
        ) : attachments.length > 0 ? (
          <div className="mt-2 text-[11px] opacity-70">{attachments.length} attachment(s)</div>
        ) : null}
        {!message.body && attachments.length === 0 && <span>(attachment)</span>}
        <MessageReactions reactions={message.reactions} dark={dark} />
        <div className="mt-1 flex items-center justify-between gap-3">
          <span className={clsx("text-[10.5px]", dark ? "text-paper/55" : "text-ink/40")}>
            {relativeTime(message.createdAt)}
          </span>
          <span className="flex items-center gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
            {quickReactions.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact(emoji)}
                className={clsx(
                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px] transition hover:-translate-y-0.5",
                  dark ? "bg-paper/10 hover:bg-paper/20" : "bg-paper-warm hover:bg-paper"
                )}
                aria-label={`React ${emoji}`}
              >
                {emoji}
              </button>
            ))}
            {onReport && (
              <button
                type="button"
                onClick={onReport}
                className={clsx(
                  "inline-flex h-6 items-center rounded-full px-2 text-[10px] font-semibold transition",
                  dark ? "bg-paper/10 text-paper/70 hover:bg-paper/20" : "bg-paper-warm text-ink/55 hover:bg-red-50 hover:text-red-700"
                )}
              >
                Report
              </button>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

function RichMessageBody({ body, dark }: { body: string; dark: boolean }) {
  const blocks = richBlocks(body);
  return (
    <div className="space-y-2">
      {blocks.map((block, index) => {
        if (block.type === "code") {
          return (
            <pre
              key={`${block.type}-${index}`}
              className={clsx(
                "overflow-x-auto rounded-[12px] border px-3 py-2 text-[12px]",
                dark ? "border-paper/20 bg-paper/10 text-paper" : "border-paper-line bg-paper-warm text-ink"
              )}
            >
              <code>{block.value}</code>
            </pre>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={`${block.type}-${index}`} className="space-y-1 pl-4">
              {block.items.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`} className="list-disc">
                  {renderInline(item, dark)}
                </li>
              ))}
            </ul>
          );
        }
        if (block.type === "quote") {
          return (
            <blockquote
              key={`${block.type}-${index}`}
              className={clsx(
                "border-l-2 pl-3",
                dark ? "border-paper/35 text-paper/80" : "border-ink/20 text-ink/70"
              )}
            >
              {renderInline(block.value, dark)}
            </blockquote>
          );
        }
        if (block.type === "heading") {
          return (
            <p key={`${block.type}-${index}`} className="text-[15px] font-bold tracking-[-0.01em]">
              {renderInline(block.value, dark)}
            </p>
          );
        }
        return (
          <p key={`${block.type}-${index}`} className="whitespace-pre-wrap leading-relaxed">
            {renderInline(block.value, dark)}
          </p>
        );
      })}
    </div>
  );
}

function MessageLinkPreview({ body, dark }: { body?: string; dark: boolean }) {
  const preview = buildLinkPreview(body || "");
  if (!preview) return null;
  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noreferrer"
      className={clsx(
        "mt-2 flex items-center gap-3 rounded-[14px] border p-2 transition hover:-translate-y-0.5",
        dark ? "border-paper/20 bg-paper/10" : "border-paper-line bg-paper-warm"
      )}
    >
      <span
        className={clsx(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] text-[14px] font-black uppercase",
          dark ? "bg-paper/15 text-paper" : "bg-[#C1FF72] text-ink"
        )}
      >
        {preview.host[0]}
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2 text-[11px] font-semibold">
          <Icon.Link size={12} />
          {preview.host}
        </span>
        <span className={clsx("mt-0.5 block truncate text-[10.5px]", dark ? "text-paper/65" : "text-ink/50")}>
          {preview.url}
        </span>
      </span>
    </a>
  );
}

function LocationCard({ location, dark }: { location: LocationDraft; dark: boolean }) {
  return (
    <a
      href={location.url}
      target="_blank"
      rel="noreferrer"
      className={clsx(
        "mt-2 flex items-center gap-3 rounded-[16px] border p-3 transition hover:-translate-y-0.5",
        dark ? "border-paper/20 bg-paper/10" : "border-paper-line bg-paper-warm"
      )}
    >
      <span className={clsx("inline-flex h-10 w-10 items-center justify-center rounded-[14px]", dark ? "bg-paper/15" : "bg-[#C1FF72]")}>
        <Icon.Pin size={16} />
      </span>
      <span className="min-w-0">
        <span className="block text-[12px] font-semibold">Shared location</span>
        <span className={clsx("block truncate text-[11px]", dark ? "text-paper/60" : "text-ink/50")}>
          {location.label}
        </span>
      </span>
    </a>
  );
}

function PollCard({
  poll,
  selectedIndex,
  dark,
  onVote,
}: {
  poll: PollDraft;
  selectedIndex?: number;
  dark: boolean;
  onVote: (optionIndex: number) => void;
}) {
  return (
    <div
      className={clsx(
        "mt-2 rounded-[16px] border p-3",
        dark ? "border-paper/20 bg-paper/10" : "border-paper-line bg-paper-warm"
      )}
    >
      <div className="flex items-center gap-2 text-[12px] font-bold">
        <Icon.Poll size={14} />
        {poll.question}
      </div>
      <div className="mt-2 space-y-1.5">
        {poll.options.map((option, index) => {
          const picked = selectedIndex === index;
          return (
            <button
              key={`${option}-${index}`}
              type="button"
              onClick={() => onVote(index)}
              className={clsx(
                "relative flex min-h-9 w-full items-center justify-between overflow-hidden rounded-[12px] border px-3 text-left text-[12px] font-semibold transition hover:-translate-y-0.5",
                picked
                  ? dark
                    ? "border-paper/40 bg-paper/20"
                    : "border-ink/20 bg-[#C1FF72]"
                  : dark
                  ? "border-paper/15 bg-paper/5"
                  : "border-paper-line bg-paper"
              )}
            >
              <span className="relative z-10">{option}</span>
              {picked && <span className="relative z-10 text-[10px] uppercase tracking-[0.12em]">Picked</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MessageReactions({
  reactions,
  dark,
}: {
  reactions?: Record<string, string[]>;
  dark: boolean;
}) {
  const entries = Object.entries(reactions || {}).filter(([, users]) => users.length > 0);
  if (entries.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {entries.map(([emoji, users]) => (
        <span
          key={emoji}
          className={clsx(
            "inline-flex h-7 items-center gap-1 rounded-full px-2 text-[11px] font-semibold",
            dark ? "bg-paper/10 text-paper/80" : "bg-paper-warm text-ink/70"
          )}
        >
          <span>{emoji}</span>
          <span>{users.length}</span>
        </span>
      ))}
    </div>
  );
}

function MessageAttachments({
  attachments,
  dark,
}: {
  attachments: ChatAttachment[];
  dark: boolean;
}) {
  if (attachments.length === 0) return null;
  return (
    <div className="mt-2 grid gap-2">
      {attachments.map((attachment, index) => {
        const isImage = attachment.contentType?.startsWith("image/") || attachment.kind === "image";
        const isVideo = attachment.contentType?.startsWith("video/");
        const isPdf =
          attachment.kind === "pdf" ||
          attachment.contentType === "application/pdf" ||
          attachment.name?.toLowerCase().endsWith(".pdf");
        const isResume =
          attachment.name?.toLowerCase().includes("resume") ||
          attachment.name?.toLowerCase().includes("cv") ||
          attachment.contentType?.includes("wordprocessingml") ||
          attachment.name?.toLowerCase().endsWith(".doc") ||
          attachment.name?.toLowerCase().endsWith(".docx");
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
            <video key={`${attachment.url}-${index}`} src={attachment.url} controls className="max-h-72 w-full rounded-[14px] bg-black" />
          );
        }
        if (isPdf) {
          return (
            <div
              key={`${attachment.url}-${index}`}
              className={clsx(
                "overflow-hidden rounded-[14px] border",
                dark ? "border-paper/20 bg-paper/10" : "border-paper-line bg-paper-warm"
              )}
            >
              <div className="flex items-center justify-between gap-3 p-2">
                <span className="min-w-0 text-[12px] font-semibold">
                  <span className="block truncate">{attachment.name || "PDF preview"}</span>
                  <span className={clsx("block text-[10.5px]", dark ? "text-paper/55" : "text-ink/45")}>PDF</span>
                </span>
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className={clsx(
                    "h-7 shrink-0 rounded-full px-3 text-[10.5px] font-semibold leading-7",
                    dark ? "bg-paper/15 text-paper" : "bg-[#C1FF72] text-ink"
                  )}
                >
                  Open
                </a>
              </div>
              <object
                data={attachment.url}
                type="application/pdf"
                className="h-64 w-full bg-paper"
                aria-label={attachment.name || "PDF preview"}
              >
                <a href={attachment.url} target="_blank" rel="noreferrer">
                  Open PDF
                </a>
              </object>
            </div>
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
              dark ? "border-paper/20 bg-paper/10" : "border-paper-line bg-paper-warm"
            )}
          >
            <span className={clsx("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px]", dark ? "bg-paper/10" : "bg-[#C1FF72]")}>
              <Icon.Note size={15} />
            </span>
            <span className="min-w-0">
              <span className="block truncate">{attachment.name || attachmentLabel(attachment)}</span>
              <span className={clsx("block text-[10.5px] font-medium", dark ? "text-paper/55" : "text-ink/45")}>
                {isResume ? "Resume or document" : attachmentLabel(attachment)}
              </span>
            </span>
          </a>
        );
      })}
    </div>
  );
}

function SettingsModal({
  settings,
  updateSetting,
  onClose,
}: {
  settings: ChatSettings;
  updateSetting: <K extends keyof ChatSettings>(key: K, value: ChatSettings[K]) => void;
  onClose: () => void;
}) {
  return (
    <ModalFrame onClose={onClose} width="max-w-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-[24px] font-semibold tracking-[-0.02em]">Chat settings</h2>
          <p className="mt-1 text-[12px] text-ink/55">Applies to every conversation on this device.</p>
        </div>
        <CloseButton onClick={onClose} label="Close chat settings" />
      </div>

      <label className="mt-5 block">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/45">
          Default style
        </span>
        <select
          value={settings.defaultStyle}
          onChange={(event) => updateSetting("defaultStyle", event.target.value as ChatStyle)}
          className="mt-1 h-11 w-full rounded-[16px] border border-paper-line bg-paper-warm px-3 text-[13px] outline-none"
        >
          {chatStyles.map((style) => (
            <option key={style.key} value={style.key}>
              {style.label}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-4 space-y-3">
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
              onChange={(event) => updateSetting(key, event.target.checked)}
              className="mt-1 h-4 w-4 accent-[#0A0A0A]"
            />
          </label>
        ))}
      </div>
    </ModalFrame>
  );
}

function GroupModal({
  name,
  setName,
  search,
  setSearch,
  matches,
  members,
  setMembers,
  status,
  onAdd,
  onCreate,
  onClose,
}: {
  name: string;
  setName: (value: string) => void;
  search: string;
  setSearch: (value: string) => void;
  matches: UserSearchResult[];
  members: UserSearchResult[];
  setMembers: React.Dispatch<React.SetStateAction<UserSearchResult[]>>;
  status: string | null;
  onAdd: (match: UserSearchResult) => void;
  onCreate: () => void;
  onClose: () => void;
}) {
  return (
    <ModalFrame onClose={onClose} width="max-w-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-[24px] font-semibold tracking-[-0.02em]">New group</h2>
          <p className="mt-1 text-[12px] text-ink/55">Add at least two people.</p>
        </div>
        <CloseButton onClick={onClose} label="Close group chat" />
      </div>

      <label className="mt-5 block">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/45">Name</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Group name"
          className="mt-1 h-11 w-full rounded-[16px] border border-paper-line bg-paper-warm px-3 text-[13px] outline-none"
        />
      </label>

      <div className="mt-3">
        <div className="relative">
          <Icon.Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/45" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search people"
            className="h-11 w-full rounded-[16px] border border-paper-line bg-paper-warm pl-9 pr-3 text-[13px] outline-none"
          />
        </div>
        {matches.length > 0 && (
          <div className="mt-2 overflow-hidden rounded-[18px] border border-paper-line">
            {matches.map((match) => (
              <button
                key={match._id}
                type="button"
                onClick={() => onAdd(match)}
                className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-paper-cool"
              >
                <Avatar size={32} hue={hueFromString(match._id)} />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold">{match.name}</span>
                  <span className="block truncate text-[11px] text-ink/50">@{match.username}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {members.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {members.map((member) => (
            <button
              key={member._id}
              type="button"
              onClick={() => setMembers((current) => current.filter((item) => item._id !== member._id))}
              className="h-8 rounded-pill border border-paper-line bg-paper-warm px-3 text-[11px] font-semibold"
            >
              {member.name} x
            </button>
          ))}
        </div>
      )}

      {status && (
        <div className="mt-3 rounded-[16px] border border-paper-line bg-paper-warm p-3 text-[12px] text-ink/65">
          {status}
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="h-9 rounded-pill border border-paper-line px-4 text-[12px] font-semibold">
          Close
        </button>
        <button type="button" onClick={onCreate} className="h-9 rounded-pill bg-[#C1FF72] px-4 text-[12px] font-semibold shadow-soft">
          Create group
        </button>
      </div>
    </ModalFrame>
  );
}

function DetailsModal({
  thread,
  local,
  currentUserId,
  messageCount,
  isBlocked,
  reportReason,
  reportDetails,
  safetyStatus,
  setReportReason,
  setReportDetails,
  updateThreadSetting,
  onBlock,
  onUnblock,
  onReport,
  onClose,
}: {
  thread: ChatThread;
  local: ThreadLocalSettings;
  currentUserId?: string;
  messageCount: number;
  isBlocked: boolean;
  reportReason: string;
  reportDetails: string;
  safetyStatus: string | null;
  setReportReason: (value: string) => void;
  setReportDetails: (value: string) => void;
  updateThreadSetting: (patch: ThreadLocalSettings) => void;
  onBlock: () => void;
  onUnblock: () => void;
  onReport: () => void;
  onClose: () => void;
}) {
  const group = isGroupThread(thread, currentUserId);
  return (
    <ModalFrame onClose={onClose} width="max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-[24px] font-semibold tracking-[-0.02em]">
            {threadDisplayName(thread, currentUserId, local)}
          </h2>
          <p className="mt-1 text-[12px] text-ink/55">{group ? "Group chat" : "Conversation"}</p>
        </div>
        <CloseButton onClick={onClose} label="Close chat details" />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Stat label="Messages" value={String(messageCount)} />
        <Stat label="Members" value={String(thread.participants.length)} />
        <Stat label="Started" value={relativeTime(thread.createdAt || thread.updatedAt)} />
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div className="space-y-3">
          <h3 className="text-[14px] font-bold">This chat</h3>
          <label className="block">
            <span className="text-[11px] text-ink/55">Nickname</span>
            <input
              value={local.nickname || ""}
              onChange={(event) => updateThreadSetting({ nickname: event.target.value })}
              placeholder={threadDisplayName(thread, currentUserId)}
              className="mt-1 h-11 w-full rounded-[16px] border border-paper-line bg-paper-warm px-3 text-[13px] outline-none"
            />
          </label>
          <label className="block">
            <span className="text-[11px] text-ink/55">Style</span>
            <select
              value={local.style || "lime"}
              onChange={(event) => updateThreadSetting({ style: event.target.value as ChatStyle })}
              className="mt-1 h-11 w-full rounded-[16px] border border-paper-line bg-paper-warm px-3 text-[13px] outline-none"
            >
              {chatStyles.map((style) => (
                <option key={style.key} value={style.key}>
                  {style.label}
                </option>
              ))}
            </select>
          </label>
          <ToggleRow label="Pin conversation" checked={!!local.pinned} onChange={(checked) => updateThreadSetting({ pinned: checked })} />
          <ToggleRow label="Mute locally" checked={!!local.muted} onChange={(checked) => updateThreadSetting({ muted: checked })} />
          <ToggleRow label="Restrict this chat locally" checked={!!local.restricted} onChange={(checked) => updateThreadSetting({ restricted: checked })} />
          <ToggleRow label="Hide rich previews" checked={!!local.hidePreviews} onChange={(checked) => updateThreadSetting({ hidePreviews: checked })} />
          {group && (
            <div className="rounded-[18px] border border-paper-line bg-paper-warm p-3">
              <div className="text-[11px] text-ink/55">Members</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {thread.participants.map((participant) => (
                  <span key={participant._id} className="rounded-pill bg-paper px-2.5 py-1 text-[11px] font-semibold">
                    {participant.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-[14px] font-bold">Safety</h3>
          {!group ? (
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
                placeholder="Add context"
                className="w-full resize-none rounded-[16px] border border-paper-line bg-paper-warm px-3 py-2 text-[13px] outline-none"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onReport}
                  className="h-9 rounded-pill border border-red-200 px-3 text-[12px] font-semibold text-red-700 hover:bg-red-50"
                >
                  Report
                </button>
                <button
                  type="button"
                  onClick={isBlocked ? onUnblock : onBlock}
                  className={clsx(
                    "h-9 rounded-pill px-3 text-[12px] font-semibold",
                    isBlocked ? "border border-paper-line" : "bg-red-700 text-white"
                  )}
                >
                  {isBlocked ? "Unblock" : "Block"}
                </button>
              </div>
            </>
          ) : (
            <div className="rounded-[18px] border border-paper-line bg-paper-warm p-3 text-[12px] text-ink/60">
              Member removal and group reports require group moderation endpoints.
            </div>
          )}
          {safetyStatus && <p className="text-[12px] text-ink/60">{safetyStatus}</p>}
        </div>
      </div>
    </ModalFrame>
  );
}

function MessageReportModal({
  message,
  reason,
  details,
  status,
  setReason,
  setDetails,
  onReport,
  onClose,
}: {
  message: ChatMessage;
  reason: string;
  details: string;
  status: string | null;
  setReason: (value: string) => void;
  setDetails: (value: string) => void;
  onReport: () => void;
  onClose: () => void;
}) {
  return (
    <ModalFrame onClose={onClose} width="max-w-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-[24px] font-semibold tracking-[-0.02em]">
            Report message
          </h2>
          <p className="mt-1 text-[12px] text-ink/55">
            This sends the selected message and context to the safety queue.
          </p>
        </div>
        <CloseButton onClick={onClose} label="Close message report" />
      </div>

      <div className="mt-4 rounded-[18px] border border-paper-line bg-paper-warm p-3 text-[12.5px] text-ink/70">
        {(message.body || "Attachment message").slice(0, 240)}
      </div>

      <label className="mt-4 block">
        <span className="text-[11px] text-ink/55">Report reason</span>
        <select
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="mt-1 h-11 w-full rounded-[16px] border border-paper-line bg-paper-warm px-3 text-[13px] outline-none"
        >
          {reportReasons.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <textarea
        value={details}
        onChange={(event) => setDetails(event.target.value)}
        rows={3}
        placeholder="Add context"
        className="mt-3 w-full resize-none rounded-[16px] border border-paper-line bg-paper-warm px-3 py-2 text-[13px] outline-none"
      />

      {status && <p className="mt-3 text-[12px] text-ink/60">{status}</p>}

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="h-9 rounded-pill border border-paper-line px-4 text-[12px] font-semibold"
        >
          Close
        </button>
        <button
          type="button"
          onClick={onReport}
          className="h-9 rounded-pill bg-red-700 px-4 text-[12px] font-semibold text-white"
        >
          Send report
        </button>
      </div>
    </ModalFrame>
  );
}

function ModalFrame({
  children,
  width,
  onClose,
}: {
  children: React.ReactNode;
  width: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={clsx("max-h-[88vh] w-full overflow-y-auto rounded-[28px] bg-paper p-5 shadow-pop", width)}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function CloseButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-paper-line"
      aria-label={label}
    >
      <Icon.Close size={14} />
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-paper-line bg-paper-warm p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/40">{label}</p>
      <p className="mt-1 text-[18px] font-semibold">{value}</p>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-[18px] border border-paper-line bg-paper-warm p-3">
      <span className="text-[13px] font-semibold">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[#0A0A0A]"
      />
    </label>
  );
}

type RichBlock =
  | { type: "paragraph"; value: string }
  | { type: "heading"; value: string }
  | { type: "quote"; value: string }
  | { type: "code"; value: string }
  | { type: "list"; items: string[] };

function extractStructuredContent(body: string): {
  body: string;
  location: LocationDraft | null;
  poll: PollDraft | null;
} {
  const lines = body.split("\n");
  const remove = new Set<number>();
  let location: LocationDraft | null = null;
  let poll: PollDraft | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!location && line.toLowerCase().startsWith("location:")) {
      const label = line.replace(/^location:\s*/i, "").trim();
      const next = lines[index + 1]?.trim();
      if (next && isUrl(next)) {
        location = { label, url: next };
        remove.add(index);
        remove.add(index + 1);
      }
    }

    if (!poll && line.toLowerCase().startsWith("poll:")) {
      const question = line.replace(/^poll:\s*/i, "").trim();
      const options: string[] = [];
      let cursor = index + 1;
      while (cursor < lines.length) {
        const match = lines[cursor].trim().match(/^\d+\.\s+(.+)$/);
        if (!match) break;
        options.push(match[1].trim());
        remove.add(cursor);
        cursor += 1;
      }
      if (question && options.length >= 2) {
        poll = { question, options };
        remove.add(index);
      }
    }
  }

  const cleaned = lines
    .filter((_, index) => !remove.has(index))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { body: cleaned, location, poll };
}

function richBlocks(body: string): RichBlock[] {
  const lines = body.split("\n");
  const blocks: RichBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];
  let code: string[] | null = null;

  function flushParagraph() {
    if (paragraph.length) {
      blocks.push({ type: "paragraph", value: paragraph.join("\n") });
      paragraph = [];
    }
  }

  function flushList() {
    if (list.length) {
      blocks.push({ type: "list", items: list });
      list = [];
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      if (code) {
        blocks.push({ type: "code", value: code.join("\n") });
        code = null;
      } else {
        flushParagraph();
        flushList();
        code = [];
      }
      continue;
    }

    if (code) {
      code.push(line);
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const listMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (listMatch) {
      flushParagraph();
      list.push(listMatch[1]);
      continue;
    }

    flushList();

    if (trimmed.startsWith(">")) {
      flushParagraph();
      blocks.push({ type: "quote", value: trimmed.replace(/^>\s?/, "") });
      continue;
    }

    const headingMatch = trimmed.match(/^#{1,3}\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      blocks.push({ type: "heading", value: headingMatch[1] });
      continue;
    }

    paragraph.push(line);
  }

  if (code) blocks.push({ type: "code", value: code.join("\n") });
  flushParagraph();
  flushList();
  return blocks;
}

function renderInline(text: string, dark: boolean): React.ReactNode[] {
  const inlineRegex = /(https?:\/\/[^\s]+)|(\*\*[^*]+\*\*)|(`[^`]+`)|(_[^_]+_)|(\*[^*]+\*)/g;
  const output: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = inlineRegex.exec(text))) {
    if (match.index > lastIndex) {
      output.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    const key = `${token}-${match.index}`;
    if (isUrl(token)) {
      output.push(
        <a
          key={key}
          href={token}
          target="_blank"
          rel="noreferrer"
          className={clsx("underline underline-offset-2", dark ? "text-paper" : "text-ink")}
        >
          {token}
        </a>
      );
    } else if (token.startsWith("**")) {
      output.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`")) {
      output.push(
        <code
          key={key}
          className={clsx(
            "rounded px-1 py-0.5 text-[0.92em]",
            dark ? "bg-paper/15" : "bg-paper-warm"
          )}
        >
          {token.slice(1, -1)}
        </code>
      );
    } else {
      output.push(<em key={key}>{token.slice(1, -1)}</em>);
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    output.push(text.slice(lastIndex));
  }

  return output;
}

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

function buildOutgoingBody(text: string, location: LocationDraft | null, poll: PollDraft | null) {
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

function isGroupThread(thread: ChatThread, userId?: string) {
  return !!thread.isGroup || thread.participants.filter((participant) => participant._id !== userId).length > 1;
}

function threadDisplayName(thread: ChatThread, userId?: string, local?: ThreadLocalSettings) {
  if (local?.nickname) return local.nickname;
  if (thread.name || thread.title) return thread.name || thread.title || "Group chat";
  const others = thread.participants.filter((participant) => participant._id !== userId);
  if (others.length > 1) return others.map((participant) => participant.name).join(", ");
  return others[0]?.name || thread.otherParticipant?.name || "Unknown user";
}

function otherParticipant(thread: ChatThread, userId?: string): ChatParticipant | undefined {
  return thread.otherParticipant || thread.participants.find((participant) => participant._id !== userId);
}

function participantId(value?: string | ChatParticipant | null): string | undefined {
  if (!value) return undefined;
  return typeof value === "string" ? value : value._id;
}
