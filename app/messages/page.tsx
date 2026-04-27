"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import clsx from "clsx";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import type { LogoMotion } from "@/components/AnimatedLogo";
import { useAuth } from "@/lib/auth";
import { chatsApi, type ChatMessage, type ChatParticipant, type ChatThread } from "@/lib/chats";
import type { ChatAttachment } from "@/lib/chats";
import { uploadFile } from "@/lib/uploads";
import { usersApi, type UserSearchResult } from "@/lib/users";
import { hueFromString, relativeTime } from "@/lib/format";

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const reportReasons = [
  "Harassment or bullying",
  "Spam or scam",
  "Hate or abusive content",
  "Unsafe personal information request",
  "Sexual or inappropriate content",
  "Impersonation",
  "Other safety concern",
];

const sensitiveInfoRegex =
  /(\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\b(?:\+?\d[\d\s().-]{7,}\d)\b|\b(?:password|passport|ssn|social security|credit card|bank account|iban|cvv)\b)/i;

const settingsKey = "bc_messages_settings_v5";
const threadSettingsKey = "bc_messages_thread_settings_v5";
const restrictedKey = "bc_messages_restricted_v4";

const QUICK_REACTIONS = ["❤️", "😂", "😮", "🥹", "🔥", "👏", "👀", "🙏"];

const EMOJI_LIBRARY = [
  "😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩",
  "😘","🥲","😋","😛","😜","🤪","😝","🤗","🤭","🤫","🤔","🫡","🤐","🤨","😐","🙄",
  "😏","😣","😥","😪","😫","🥱","😴","😌","🤤","😒","😔","😟","🤯","😬","🥵","🥶",
  "😳","🥴","😠","😡","🤬","😷","🤒","🤕","🤢","🤮","🥳","🥸","😎","🤓","🧐","🤠",
  "🤡","👻","💀","👽","🤖","🎃","😺","😻","🙀","👍","👎","👊","✊","🤞","🫰","🤟",
  "🤘","🤙","👈","👉","👆","👇","✋","🤚","🖐️","🖖","👋","🤏","💪","🫀","👀","👁️",
  "💋","💯","💥","💫","💦","💨","💬","💤","🎉","🎊","🎈","✨","⭐","🌟","🌈","☀️",
  "🌙","🪐","🚀","✈️","🛸","🛹","🏆","🎯","🍀","🌸","🌼","🌷","🌻","🌺","🍕","🍔",
  "🌮","🍰","☕","🧋","🍻","🍿","🎂","🍩","🍦","🍒","🍓","❤️","🧡","💛","💚","💙",
  "💜","🤎","🖤","🤍","💔","💕","💖","💗","💓","💘","💝","🫶","💞",
];

const STICKER_PACK = [
  { emoji: "🥳", label: "yay" },
  { emoji: "🚀", label: "send" },
  { emoji: "🌈", label: "vibes" },
  { emoji: "🍀", label: "luck" },
  { emoji: "🎯", label: "noted" },
  { emoji: "🍵", label: "spill" },
  { emoji: "🫶", label: "love" },
  { emoji: "👀", label: "lookin" },
];

const slashCommands: Array<{ key: string; label: string; tip: string }> = [
  { key: "/celebrate", label: "Celebrate 🎉", tip: "Throws confetti for both of you" },
  { key: "/hearts", label: "Heart shower ❤️", tip: "Sends rising hearts across the screen" },
  { key: "/wave", label: "Wave 👋", tip: "Sends a friendly wave" },
  { key: "/shrug", label: "Shrug ¯\\_(ツ)_/¯", tip: "Drops the universal shrug" },
  { key: "/clear", label: "Clear input", tip: "Empties the composer" },
  { key: "/safety", label: "Open safety", tip: "Block / report / restrict tools" },
  { key: "/vanish", label: "Toggle vanish mode", tip: "Hide messages on this device" },
];

type FilterKey = "all" | "online" | "requests" | "restricted";

const filterTabs: Array<{ key: FilterKey; label: string; tone?: "lime" }> = [
  { key: "all", label: "All" },
  { key: "online", label: "Online", tone: "lime" },
  { key: "requests", label: "Requests" },
  { key: "restricted", label: "Restricted" },
];

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type ChatSettings = {
  enterToSend: boolean;
  safetyNudges: boolean;
  linkPreviews: boolean;
  composerMotion: boolean;
  autoplayMedia: boolean;
};

type ThreadLocalSettings = {
  nickname?: string;
  pinned?: boolean;
  muted?: boolean;
  vanish?: boolean;
};

type ThreadSettings = Record<string, ThreadLocalSettings>;

const defaultSettings: ChatSettings = {
  enterToSend: true,
  safetyNudges: true,
  linkPreviews: true,
  composerMotion: true,
  autoplayMedia: true,
};

type PendingAttachment = ChatAttachment & {
  localId: string;
  localUrl?: string;
};

type PollDraft = { question: string; options: string[] };

type LocationDraft = { label: string; url: string };

type ReplyDraft = {
  messageId: string;
  body?: string;
  senderId?: string;
  senderName?: string;
};

type Toast = { tone?: "lime" | "ink"; text: string; id: number };

const settingToggles: Array<{
  key: keyof ChatSettings;
  title: string;
  description: string;
}> = [
  { key: "enterToSend", title: "Enter sends", description: "Shift+Enter keeps multiline." },
  { key: "safetyNudges", title: "Safety nudges", description: "Warn before sharing contact, password, or ID-like details." },
  { key: "linkPreviews", title: "Link previews", description: "Show compact previews for links in messages." },
  { key: "autoplayMedia", title: "Auto-load media", description: "Turn off to keep media tucked away until tapped." },
  { key: "composerMotion", title: "Playful motion", description: "Confetti, hearts, sparks, animated logo bursts." },
];

/* -------------------------------------------------------------------------- */
/* Local-storage helpers                                                      */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* Page entry                                                                 */
/* -------------------------------------------------------------------------- */

export default function MessagesPage() {
  return (
    <Suspense fallback={<MessagesShell>Loading…</MessagesShell>}>
      <MessagesClient />
    </Suspense>
  );
}

/* -------------------------------------------------------------------------- */
/* Main client component                                                      */
/* -------------------------------------------------------------------------- */

function MessagesClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, status } = useAuth();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const resumeInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messageAreaRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const konamiRef = useRef<string[]>([]);
  const headerLogoTapsRef = useRef<{ count: number; last: number }>({ count: 0, last: 0 });
  const isAtBottomRef = useRef(true);

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(params.get("thread"));
  const [filter, setFilter] = useState<FilterKey>("all");
  const [draft, setDraft] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [locationDraft, setLocationDraft] = useState<LocationDraft | null>(null);
  const [pollDraft, setPollDraft] = useState<PollDraft>({ question: "", options: ["", ""] });
  const [pollOpen, setPollOpen] = useState(false);
  const [popover, setPopover] = useState<"emoji" | "stickers" | "slash" | null>(null);
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [groupMatches, setGroupMatches] = useState<UserSearchResult[]>([]);
  const [groupMembers, setGroupMembers] = useState<UserSearchResult[]>([]);
  const [groupStatus, setGroupStatus] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState<UserSearchResult[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [headerMotion, setHeaderMotion] = useState<LogoMotion>("side-to-side");
  const [sendBurst, setSendBurst] = useState(false);
  const [reactPicker, setReactPicker] = useState<string | null>(null);
  const [reply, setReply] = useState<ReplyDraft | null>(null);
  const [confettiKey, setConfettiKey] = useState(0);
  const [heartsKey, setHeartsKey] = useState(0);
  const [konamiActive, setKonamiActive] = useState(false);
  const [lightbox, setLightbox] = useState<{ url: string; kind: "image" | "video" | "pdf"; name?: string } | null>(null);
  const [drawer, setDrawer] = useState<"safety" | "settings" | null>(null);
  const [reportTarget, setReportTarget] = useState<{ messageId?: string } | null>(null);
  const [reportReason, setReportReason] = useState(reportReasons[0]);
  const [reportDetails, setReportDetails] = useState("");
  const [safetyStatus, setSafetyStatus] = useState<string | null>(null);
  const [sensitiveAck, setSensitiveAck] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [settings, setSettings] = useState<ChatSettings>(() => readLocal(settingsKey, defaultSettings));
  const [threadSettings, setThreadSettings] = useState<ThreadSettings>(() =>
    readLocal(threadSettingsKey, {})
  );
  const [restrictedIds, setRestrictedIds] = useState<Set<string>>(
    () => new Set(readLocal<string[]>(restrictedKey, []))
  );
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [unreadBelow, setUnreadBelow] = useState(0);

  /* ------------------------------------------------------------------------ */
  /* Persistence                                                              */
  /* ------------------------------------------------------------------------ */

  useEffect(() => writeLocal(settingsKey, settings), [settings]);
  useEffect(() => writeLocal(threadSettingsKey, threadSettings), [threadSettings]);
  useEffect(() => writeLocal(restrictedKey, Array.from(restrictedIds)), [restrictedIds]);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/signin");
  }, [status, router]);

  useEffect(() => {
    const thread = params.get("thread");
    if (thread) setSelectedId(thread);
  }, [params]);

  useEffect(() => setSensitiveAck(false), [draft, selectedId]);

  /* ------------------------------------------------------------------------ */
  /* Toasts                                                                   */
  /* ------------------------------------------------------------------------ */

  const pushToast = useCallback((text: string, tone: Toast["tone"] = "ink") => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, text, tone }]);
    window.setTimeout(
      () => setToasts((current) => current.filter((toast) => toast.id !== id)),
      2800
    );
  }, []);

  /* ------------------------------------------------------------------------ */
  /* Reset draft state when switching threads                                 */
  /* ------------------------------------------------------------------------ */

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
    setReply(null);
    setPopover(null);
    setReactPicker(null);
  }, [selectedId]);

  /* ------------------------------------------------------------------------ */
  /* Server data                                                              */
  /* ------------------------------------------------------------------------ */

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

  /* ------------------------------------------------------------------------ */
  /* Search debounces                                                         */
  /* ------------------------------------------------------------------------ */

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
        if (!cancelled)
          setMatches(
            next.filter((match) => match._id !== user?._id && !blockedIds.has(match._id))
          );
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

  /* ------------------------------------------------------------------------ */
  /* Smart auto-scroll                                                        */
  /* ------------------------------------------------------------------------ */

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const node = messageAreaRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior });
    isAtBottomRef.current = true;
    setShowScrollBottom(false);
    setUnreadBelow(0);
  }, []);

  // Reset on thread switch — jump to bottom without animation.
  useEffect(() => {
    setUnreadBelow(0);
    setShowScrollBottom(false);
    isAtBottomRef.current = true;
    requestAnimationFrame(() => scrollToBottom("auto"));
  }, [selectedId, scrollToBottom]);

  // On new messages: only auto-scroll if the user is at the bottom; otherwise count unseen.
  const lastMessageCountRef = useRef(0);
  useEffect(() => {
    const previous = lastMessageCountRef.current;
    const next = messages.length;
    lastMessageCountRef.current = next;
    if (next === 0) return;
    if (next > previous) {
      if (isAtBottomRef.current) {
        scrollToBottom("smooth");
      } else {
        setUnreadBelow((current) => current + (next - previous));
      }
    }
  }, [messages.length, scrollToBottom]);

  function handleMessageScroll(event: React.UIEvent<HTMLDivElement>) {
    const node = event.currentTarget;
    const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
    const atBottom = distance < 80;
    isAtBottomRef.current = atBottom;
    setShowScrollBottom(!atBottom);
    if (atBottom && unreadBelow > 0) setUnreadBelow(0);
  }

  /* ------------------------------------------------------------------------ */
  /* Konami easter egg                                                        */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!settings.composerMotion) return;
    const code = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
    function onKey(event: KeyboardEvent) {
      konamiRef.current = [...konamiRef.current, event.key].slice(-code.length);
      if (konamiRef.current.join(",").toLowerCase() === code.join(",").toLowerCase()) {
        konamiRef.current = [];
        setKonamiActive(true);
        triggerConfetti();
        triggerHearts();
        flashHeader("zoomies");
        pushToast("Cheat code unlocked: lime overload 🟢", "lime");
        window.setTimeout(() => setKonamiActive(false), 1300);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.composerMotion]);

  /* ------------------------------------------------------------------------ */
  /* Derived                                                                  */
  /* ------------------------------------------------------------------------ */

  const selected = useMemo(
    () => threads.find((thread) => thread._id === selectedId) || null,
    [threads, selectedId]
  );
  const other = (selected ? otherParticipant(selected, user?._id) : null) ?? null;
  const requestedBySelf = selected ? participantId(selected.requestedBy) === user?._id : false;
  const baseCanSend = selected?.status === "active" || requestedBySelf || !selected?.status;
  const selectedThreadSettings = selected ? threadSettings[selected._id] || {} : {};
  const otherId = other?._id || "";
  const isBlocked = !!otherId && blockedIds.has(otherId);
  const isRestricted = !!otherId && restrictedIds.has(otherId);
  const canSend = baseCanSend && !isBlocked;
  const hasSensitiveDraft = settings.safetyNudges && !!draft.trim() && sensitiveInfoRegex.test(draft);
  const activePollOptions = pollDraft.options.map((option) => option.trim()).filter(Boolean);
  const hasPollDraft = !!pollDraft.question.trim() && activePollOptions.length >= 2;
  const linkPreview = settings.linkPreviews ? buildLinkPreview(draft) : null;
  const hasSendableContent =
    !!draft.trim() || pendingAttachments.length > 0 || !!locationDraft || hasPollDraft;

  const isGroupChat =
    !!selected &&
    (selected.isGroup ||
      selected.participants.filter((p) => p._id !== user?._id).length > 1);

  const requestCount = useMemo(
    () =>
      threads.filter(
        (t) => t.status === "pending" && participantId(t.requestedBy) !== user?._id
      ).length,
    [threads, user?._id]
  );
  const restrictedCount = useMemo(
    () =>
      threads.filter((t) => {
        const o = otherParticipant(t, user?._id);
        return o?._id && restrictedIds.has(o._id);
      }).length,
    [threads, user?._id, restrictedIds]
  );
  const onlineCount = useMemo(
    () => threads.filter((t) => derivePresence(t) === "online").length,
    [threads]
  );

  const filteredThreads = useMemo(() => {
    return threads.filter((thread) => {
      const o = otherParticipant(thread, user?._id);
      const isReq =
        thread.status === "pending" && participantId(thread.requestedBy) !== user?._id;
      const isRestrictedThread = !!o?._id && restrictedIds.has(o._id);
      switch (filter) {
        case "online":
          return derivePresence(thread) === "online" && !isRestrictedThread;
        case "requests":
          return isReq;
        case "restricted":
          return isRestrictedThread;
        case "all":
        default:
          return !isReq && !isRestrictedThread;
      }
    });
  }, [threads, restrictedIds, filter, user?._id]);

  const sortedThreads = useMemo(() => {
    return [...filteredThreads].sort((a, b) => {
      const aPinned = !!threadSettings[a._id]?.pinned;
      const bPinned = !!threadSettings[b._id]?.pinned;
      if (aPinned !== bPinned) return aPinned ? -1 : 1;
      const aUnread = isThreadUnread(a, user?._id);
      const bUnread = isThreadUnread(b, user?._id);
      if (aUnread !== bUnread) return aUnread ? -1 : 1;
      return (
        new Date(b.lastMessageAt || b.updatedAt || b.createdAt || 0).getTime() -
        new Date(a.lastMessageAt || a.updatedAt || a.createdAt || 0).getTime()
      );
    });
  }, [filteredThreads, threadSettings, user?._id]);

  const onlineThreads = useMemo(() => {
    return threads
      .filter((thread) => {
        const o = otherParticipant(thread, user?._id);
        if (!o?._id) return false;
        if (restrictedIds.has(o._id)) return false;
        if (
          thread.status === "pending" &&
          participantId(thread.requestedBy) !== user?._id
        )
          return false;
        return derivePresence(thread) !== "offline";
      })
      .sort((a, b) => {
        const aOnline = derivePresence(a) === "online" ? 0 : 1;
        const bOnline = derivePresence(b) === "online" ? 0 : 1;
        if (aOnline !== bOnline) return aOnline - bOnline;
        return (
          new Date(b.lastMessageAt || b.updatedAt || 0).getTime() -
          new Date(a.lastMessageAt || a.updatedAt || 0).getTime()
        );
      });
  }, [threads, user?._id, restrictedIds]);

  const groupedMessages = useMemo(() => groupMessagesByDate(messages), [messages]);

  /* ------------------------------------------------------------------------ */
  /* Easter eggs                                                              */
  /* ------------------------------------------------------------------------ */

  function triggerConfetti() {
    if (!settings.composerMotion) return;
    setConfettiKey((k) => k + 1);
  }
  function triggerHearts() {
    if (!settings.composerMotion) return;
    setHeartsKey((k) => k + 1);
  }
  function flashHeader(motion: LogoMotion, durationMs = 2200) {
    setHeaderMotion(motion);
    window.setTimeout(() => setHeaderMotion("side-to-side"), durationMs);
  }
  function tapHeaderLogo() {
    const now = Date.now();
    const last = headerLogoTapsRef.current.last;
    headerLogoTapsRef.current = {
      count: now - last < 600 ? headerLogoTapsRef.current.count + 1 : 1,
      last: now,
    };
    if (headerLogoTapsRef.current.count >= 3) {
      headerLogoTapsRef.current = { count: 0, last: 0 };
      flashHeader("zoomies", 1600);
      triggerHearts();
      pushToast("zoomies unlocked 🤸", "lime");
    } else {
      flashHeader("bop", 900);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Slash command handler                                                    */
  /* ------------------------------------------------------------------------ */

  function maybeRunSlash(text: string): { handled: boolean; remainder?: string } {
    const trimmed = text.trim().toLowerCase();
    if (trimmed === "/celebrate") {
      triggerConfetti();
      flashHeader("bounce");
      pushToast("Confetti incoming 🎊", "lime");
      return { handled: true, remainder: "🎉 celebrating with you!" };
    }
    if (trimmed === "/hearts") {
      triggerHearts();
      flashHeader("ripple");
      pushToast("Sending love ❤️", "lime");
      return { handled: true, remainder: "❤️" };
    }
    if (trimmed === "/wave") return { handled: true, remainder: "👋 hey!" };
    if (trimmed === "/shrug") return { handled: true, remainder: "¯\\_(ツ)_/¯" };
    if (trimmed === "/clear") {
      setDraft("");
      return { handled: true };
    }
    if (trimmed === "/safety") {
      setDrawer("safety");
      setDraft("");
      return { handled: true };
    }
    if (trimmed === "/vanish" && selected) {
      setThreadSettings((current) => ({
        ...current,
        [selected._id]: {
          ...(current[selected._id] || {}),
          vanish: !current[selected._id]?.vanish,
        },
      }));
      setDraft("");
      pushToast(selectedThreadSettings.vanish ? "Vanish off" : "Vanish on", "ink");
      return { handled: true };
    }
    return { handled: false };
  }

  /* ------------------------------------------------------------------------ */
  /* Actions                                                                  */
  /* ------------------------------------------------------------------------ */

  function selectThread(id: string) {
    setSelectedId(id);
    setDrawer(null);
    router.replace(`/messages?thread=${id}`);
  }

  async function startThread(match: UserSearchResult) {
    if (blockedIds.has(match._id)) {
      pushToast("Unblock this person before messaging.", "ink");
      return;
    }
    try {
      const thread = await chatsApi.startThread(match._id);
      setThreads((current) => [thread, ...current.filter((item) => item._id !== thread._id)]);
      setSelectedId(thread._id);
      setSearch("");
      setMatches([]);
      router.replace(`/messages?thread=${thread._id}`);
      flashHeader("spark", 1800);
    } catch (err: any) {
      setError(err?.message || "Failed to start chat.");
    }
  }

  async function sendMessage() {
    if (!selectedId || sending || uploading || !canSend) return;

    const slash = maybeRunSlash(draft);
    const finalText = slash.remainder ?? draft;

    const sendableNow =
      !!finalText.trim() || pendingAttachments.length > 0 || !!locationDraft || hasPollDraft;
    if (slash.handled && !slash.remainder && !sendableNow) return;

    if (hasSensitiveDraft && !sensitiveAck && !slash.handled) {
      setError(
        "This looks like sensitive personal information. Review it, then choose Send anyway if you still want to send."
      );
      return;
    }

    const body = buildOutgoingBody(finalText, locationDraft, hasPollDraft ? pollDraft : null);
    if (!body && pendingAttachments.length === 0) return;

    const attachments = pendingAttachments.map(({ localId, localUrl, ...attachment }) => attachment);

    setSending(true);
    const previous = { draft, pendingAttachments, locationDraft, pollDraft, reply };
    setDraft("");
    setPendingAttachments([]);
    setLocationDraft(null);
    setPollDraft({ question: "", options: ["", ""] });
    setPollOpen(false);
    setReply(null);
    setPopover(null);

    try {
      const message = await chatsApi.send(selectedId, {
        body,
        attachments,
        replyTo: reply
          ? { messageId: reply.messageId, body: reply.body, senderId: reply.senderId }
          : undefined,
      });
      previous.pendingAttachments.forEach((attachment) => {
        if (attachment.localUrl) URL.revokeObjectURL(attachment.localUrl);
      });
      setMessages((current) => [...current, message]);
      if (settings.composerMotion) {
        setSendBurst(true);
        flashHeader("rocket", 1600);
        window.setTimeout(() => setSendBurst(false), 600);
      }
      if (/\b(yay|congrats|happy birthday)\b/i.test(body) || finalText.includes("🎉")) {
        triggerConfetti();
      }
      if (/(love|❤️|🥰|💖)/i.test(body)) {
        triggerHearts();
      }
    } catch (err: any) {
      setDraft(previous.draft);
      setPendingAttachments(previous.pendingAttachments);
      setLocationDraft(previous.locationDraft);
      setPollDraft(previous.pollDraft);
      setReply(previous.reply);
      setError(err?.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  async function updateRequest(action: "accept" | "reject") {
    if (!selectedId) return;
    try {
      const updated =
        action === "accept"
          ? await chatsApi.accept(selectedId)
          : await chatsApi.reject(selectedId);
      setThreads((current) =>
        current.map((thread) => (thread._id === updated._id ? updated : thread))
      );
      pushToast(
        action === "accept" ? "Accepted — say hi 👋" : "Request declined.",
        action === "accept" ? "lime" : "ink"
      );
      if (action === "accept") flashHeader("wave", 1800);
    } catch (err: any) {
      setError(err?.message || `Failed to ${action} chat.`);
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
            kind: attachmentKind(upload.contentType, file.name, purpose),
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
      setGroupStatus("Pick at least two people for a group.");
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
      pushToast("Group started 🎯", "lime");
      flashHeader("high-five", 1800);
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
      setSafetyStatus("Blocked. They can't continue this chat.");
      pushToast("User blocked.", "ink");
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
      pushToast("Unblocked.", "lime");
    } catch (err: any) {
      setSafetyStatus(err?.message || "Failed to unblock user.");
    }
  }

  function toggleRestrict() {
    if (!otherId) return;
    setRestrictedIds((current) => {
      const next = new Set(current);
      if (next.has(otherId)) {
        next.delete(otherId);
        pushToast("Restriction removed.", "lime");
      } else {
        next.add(otherId);
        pushToast("Restricted. Media stays hidden.", "ink");
      }
      return next;
    });
  }

  async function reportUser(messageId?: string) {
    if (!otherId) return;
    setSafetyStatus(null);
    try {
      await chatsApi.reportUser({
        userId: otherId,
        reason: reportReason,
        details: reportDetails,
        messageId,
      });
      setReportDetails("");
      setReportTarget(null);
      setSafetyStatus("Report sent for review.");
      pushToast("Report sent for review.", "lime");
    } catch (err: any) {
      setSafetyStatus(err?.message || "Failed to send report.");
    }
  }

  async function reactToMessage(messageId: string, emoji: string) {
    if (!user?._id) return;
    setReactPicker(null);
    setMessages((current) =>
      current.map((message) => {
        if (message._id !== messageId) return message;
        const next = { ...(message.reactions || {}) };
        const list = next[emoji] ? [...next[emoji]] : [];
        const idx = list.indexOf(user._id);
        if (idx >= 0) list.splice(idx, 1);
        else list.push(user._id);
        if (list.length === 0) delete next[emoji];
        else next[emoji] = list;
        return { ...message, reactions: next };
      })
    );
    try {
      await chatsApi.react(messageId, emoji);
    } catch {
      // server reconciles on next poll
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  if (status === "loading") {
    return <MessagesShell>Loading…</MessagesShell>;
  }

  const mobileView = selected ? "convo" : "list";

  return (
    <div className={clsx("mc-shell", konamiActive && "mc-konami")}>
      <TopBar />

      <div className="mc-page" data-mobile-view={mobileView}>
        {/* ---------------- Sidebar ---------------- */}
        <aside className="mc-sidebar">
          <div className="mc-sidebar-head">
            <div className="mc-sidebar-title">
              <AnimatedLogo size={28} motion="bop" />
              <h1 className="font-display text-[20px] font-semibold tracking-[-0.02em] flex-1">
                Chats
              </h1>
              <button
                type="button"
                onClick={openGroupPanel}
                className="h-8 w-8 rounded-full border border-paper-line bg-paper inline-flex items-center justify-center hover:border-[var(--lime-bright)] hover:bg-[var(--lime-mist)] transition"
                aria-label="New group chat"
                title="New group"
              >
                <Icon.Plus size={13} />
              </button>
              <button
                type="button"
                onClick={() => setDrawer("settings")}
                className="h-8 w-8 rounded-full border border-paper-line bg-paper inline-flex items-center justify-center hover:border-[var(--lime-bright)] hover:bg-[var(--lime-mist)] transition"
                aria-label="Chat settings"
                title="Settings"
              >
                <Icon.Filter size={13} />
              </button>
            </div>
            <div className="mc-search-input">
              <Icon.Search size={14} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search chats or find people…"
              />
            </div>
            {matches.length > 0 && (
              <div className="mc-search-results scroll-clean">
                {matches.map((match) => (
                  <button
                    key={match._id}
                    type="button"
                    onClick={() => startThread(match)}
                  >
                    <Avatar size={32} hue={hueFromString(match._id)} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] font-semibold truncate">
                        {match.name}
                      </span>
                      <span className="block text-[10.5px] text-ink/50 truncate">
                        @{match.username}
                      </span>
                    </span>
                    <span className="rounded-pill bg-[var(--lime)] text-ink px-2.5 h-6 inline-flex items-center text-[10.5px] font-bold tracking-[0.04em]">
                      Start
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div className="mt-3 mc-filters">
              {filterTabs.map((tab) => {
                const count =
                  tab.key === "requests"
                    ? requestCount
                    : tab.key === "restricted"
                    ? restrictedCount
                    : tab.key === "online"
                    ? onlineCount
                    : 0;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    className="mc-filter-pill"
                    data-active={filter === tab.key}
                    data-tone={tab.tone}
                    onClick={() => setFilter(tab.key)}
                  >
                    {tab.label}
                    {count > 0 && <span className="mc-filter-pill-count">{count}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {onlineThreads.length > 0 && filter === "all" && (
            <div className="mc-stories">
              {onlineThreads.map((thread) => {
                const local = threadSettings[thread._id] || {};
                const person = otherParticipant(thread, user?._id);
                const name = threadDisplayName(thread, user?._id, local);
                const presence = derivePresence(thread);
                const unread = isThreadUnread(thread, user?._id);
                return (
                  <button
                    key={thread._id}
                    type="button"
                    className="mc-stories-item"
                    data-active={selectedId === thread._id}
                    data-online={presence === "online"}
                    data-unread={unread}
                    onClick={() => selectThread(thread._id)}
                    aria-label={`Open chat with ${name}`}
                  >
                    <span className="mc-stories-avatar-wrap">
                      <Avatar size={44} hue={hueFromString(person?._id || thread._id)} />
                    </span>
                    <span className="mc-stories-name">{name.split(" ")[0]}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mc-thread-list scroll-clean">
            {loadingThreads && threads.length === 0 ? (
              <div className="mc-sidebar-empty">
                <AnimatedLogo size={42} motion="loading" />
                Loading chats…
              </div>
            ) : sortedThreads.length === 0 ? (
              <SidebarEmpty filter={filter} />
            ) : (
              sortedThreads.map((thread) => (
                <ThreadRow
                  key={thread._id}
                  thread={thread}
                  active={selectedId === thread._id}
                  currentUserId={user?._id}
                  local={threadSettings[thread._id] || {}}
                  onClick={() => selectThread(thread._id)}
                />
              ))
            )}
          </div>
        </aside>

        {/* ---------------- Conversation pane ---------------- */}
        <section className="mc-pane">
          {!selected ? (
            <div className="mc-pane-empty">
              <AnimatedLogo size={88} motion="wave" />
              <div>
                <p className="font-display text-[22px] font-semibold tracking-[-0.02em]">
                  Pick a chat from the left
                </p>
                <p className="text-[13px] text-ink/55 mt-1">
                  Or search for someone new in the search bar.
                </p>
              </div>
            </div>
          ) : (
            <>
              <ConversationHeader
                thread={selected}
                other={other}
                isGroupChat={isGroupChat}
                isBlocked={isBlocked}
                isRestricted={isRestricted}
                threadSettings={selectedThreadSettings}
                headerMotion={headerMotion}
                onBack={() => {
                  setSelectedId(null);
                  router.replace("/messages");
                }}
                onTapLogo={tapHeaderLogo}
                onTogglePin={() =>
                  updateThreadSetting(selected._id, { pinned: !selectedThreadSettings.pinned })
                }
                onToggleMute={() =>
                  updateThreadSetting(selected._id, { muted: !selectedThreadSettings.muted })
                }
                onOpenSafety={() => setDrawer("safety")}
                onOpenSettings={() => setDrawer("settings")}
              />

              <div className="mc-message-stage">
              <div
                ref={messageAreaRef}
                onScroll={handleMessageScroll}
                className={clsx("mc-message-area", selectedThreadSettings.vanish && "mc-vanish")}
              >
                {/* Banners */}
                <div className="space-y-2 mb-1">
                  {error && (
                    <div className="mc-banner" data-tone="danger">
                      <span>⚠️</span>
                      <span className="flex-1">{error}</span>
                      <button
                        type="button"
                        onClick={() => setError(null)}
                        className="text-[11px] font-bold underline"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                  {selected.status === "pending" && !requestedBySelf && (
                    <PermissionCard
                      other={other}
                      onAccept={() => updateRequest("accept")}
                      onReject={() => updateRequest("reject")}
                    />
                  )}
                  {isBlocked && (
                    <div className="mc-banner" data-tone="danger">
                      <span>🚫</span>
                      <span className="flex-1">
                        You blocked this member. Open Safety to unblock before sending.
                      </span>
                      <button
                        type="button"
                        onClick={() => setDrawer("safety")}
                        className="mc-cta-ghost"
                      >
                        Safety
                      </button>
                    </div>
                  )}
                  {isRestricted && !isBlocked && (
                    <div className="mc-banner" data-tone="warn">
                      <Icon.Shield size={16} />
                      <span className="flex-1">
                        Restricted: media won't auto-load and link previews are off.
                      </span>
                    </div>
                  )}
                  {selectedThreadSettings.vanish && (
                    <div className="mc-banner" data-tone="lime">
                      <span>👻</span>
                      <span className="flex-1">
                        Vanish mode is on — messages stay on the server but are hidden on this device.
                      </span>
                    </div>
                  )}
                </div>

                {/* Messages */}
                {loadingMessages && messages.length === 0 && (
                  <div className="flex justify-center py-8">
                    <AnimatedLogo size={56} motion="loading" />
                  </div>
                )}
                {!loadingMessages && messages.length === 0 && (
                  <div className="flex flex-col items-center gap-3 py-12 text-center text-[13px] text-ink/55">
                    <AnimatedLogo size={64} motion="wave" />
                    <p>Send the first message — your circle is waiting.</p>
                  </div>
                )}
                {groupedMessages.map((group, groupIndex) => (
                  <div key={group.label + groupIndex} className="flex flex-col gap-2">
                    <div className="mc-date-ripple">
                      <div className="mc-date-ripple-line" />
                      <div className="mc-date-ripple-chip">{group.label}</div>
                      <div className="mc-date-ripple-line" />
                    </div>
                    {group.messages.map((message, messageIndex) => {
                      const mine = participantId(message.senderId) === user?._id;
                      const previous = group.messages[messageIndex - 1];
                      const showAvatar =
                        !mine &&
                        (!previous ||
                          participantId(previous.senderId) !== participantId(message.senderId));
                      const senderName = !mine
                        ? selected.participants.find(
                            (p) => p._id === participantId(message.senderId)
                          )?.name
                        : undefined;
                      return (
                        <BubbleRow
                          key={message._id}
                          message={message}
                          mine={mine}
                          showAvatar={showAvatar}
                          senderName={senderName}
                          currentUserId={user?._id}
                          showLinkPreviews={settings.linkPreviews && !isRestricted}
                          autoplayMedia={settings.autoplayMedia && !isRestricted}
                          reactPickerOpen={reactPicker === message._id}
                          onReactPickerToggle={() =>
                            setReactPicker((current) =>
                              current === message._id ? null : message._id
                            )
                          }
                          onReact={(emoji) => reactToMessage(message._id, emoji)}
                          onReply={() =>
                            setReply({
                              messageId: message._id,
                              body: message.body,
                              senderId: participantId(message.senderId),
                              senderName,
                            })
                          }
                          onOpenLightbox={(payload) => setLightbox(payload)}
                          onReportMessage={() => setReportTarget({ messageId: message._id })}
                        />
                      );
                    })}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              {showScrollBottom && (
                <button
                  type="button"
                  onClick={() => scrollToBottom("smooth")}
                  className="mc-scroll-bottom"
                  aria-label="Scroll to latest"
                >
                  <Icon.ChevronDown size={14} />
                  Latest
                  {unreadBelow > 0 && (
                    <span className="mc-scroll-bottom-badge">
                      {unreadBelow > 99 ? "99+" : unreadBelow}
                    </span>
                  )}
                </button>
              )}
              </div>

              <ComposerDock
                canSend={canSend}
                sending={sending}
                uploading={uploading}
                sendBurst={sendBurst}
                draft={draft}
                setDraft={setDraft}
                enterToSend={settings.enterToSend}
                onSend={sendMessage}
                hasSendableContent={hasSendableContent}
                isBlocked={isBlocked}
                composerRef={composerRef}
                fileInputRef={fileInputRef}
                resumeInputRef={resumeInputRef}
                videoInputRef={videoInputRef}
                onFile={(files, purpose) => handleFiles(files, purpose)}
                onLocation={requestLocation}
                onTogglePoll={() => setPollOpen((value) => !value)}
                popover={popover}
                setPopover={setPopover}
                reply={reply}
                setReply={setReply}
                pendingAttachments={pendingAttachments}
                removePendingAttachment={removePendingAttachment}
                locationDraft={locationDraft}
                setLocationDraft={setLocationDraft}
                linkPreview={linkPreview}
                pollOpen={pollOpen}
                pollDraft={pollDraft}
                setPollDraft={setPollDraft}
                addPollOption={addPollOption}
                updatePollOption={updatePollOption}
                removePollOption={removePollOption}
                hasSensitiveDraft={hasSensitiveDraft}
                sensitiveAck={sensitiveAck}
                ackSensitive={() => {
                  setSensitiveAck(true);
                  setError(null);
                }}
              />
            </>
          )}
        </section>
      </div>

      {/* Drawers */}
      {drawer === "safety" && selected && (
        <SafetyDrawer
          thread={selected}
          other={other}
          isGroupChat={isGroupChat}
          isBlocked={isBlocked}
          isRestricted={isRestricted}
          threadSettings={selectedThreadSettings}
          onClose={() => setDrawer(null)}
          onToggleRestrict={toggleRestrict}
          onBlock={blockUser}
          onUnblock={unblockUser}
          onOpenReport={() => setReportTarget({})}
          onTogglePin={() =>
            updateThreadSetting(selected._id, { pinned: !selectedThreadSettings.pinned })
          }
          onToggleMute={() =>
            updateThreadSetting(selected._id, { muted: !selectedThreadSettings.muted })
          }
          onToggleVanish={() =>
            updateThreadSetting(selected._id, { vanish: !selectedThreadSettings.vanish })
          }
          onChangeNickname={(value) =>
            updateThreadSetting(selected._id, { nickname: value })
          }
          safetyStatus={safetyStatus}
          messageCount={messages.length}
          currentUserId={user?._id}
        />
      )}

      {drawer === "settings" && (
        <SettingsDrawer
          settings={settings}
          updateSetting={updateSetting}
          onClose={() => setDrawer(null)}
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
          onClose={() => setGroupOpen(false)}
          onAdd={addGroupMember}
          onCreate={createGroupDraft}
        />
      )}

      {reportTarget && (
        <ReportModal
          messageId={reportTarget.messageId}
          reason={reportReason}
          setReason={setReportReason}
          details={reportDetails}
          setDetails={setReportDetails}
          onSubmit={() => reportUser(reportTarget.messageId)}
          onClose={() => setReportTarget(null)}
        />
      )}

      {lightbox && <Lightbox payload={lightbox} onClose={() => setLightbox(null)} />}

      {confettiKey > 0 && <Confetti key={`c-${confettiKey}`} />}
      {heartsKey > 0 && <Hearts key={`h-${heartsKey}`} />}

      <div className="pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="mc-toast" data-tone={toast.tone}>
            {toast.text}
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Shell                                                                      */
/* -------------------------------------------------------------------------- */

function MessagesShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mc-shell">
      <TopBar />
      <main className="max-w-[900px] mx-auto px-6 py-16 text-[14px] text-ink/60">
        {children}
      </main>
    </div>
  );
}

function SidebarEmpty({ filter }: { filter: FilterKey }) {
  const copy =
    filter === "requests"
      ? "No new requests yet. We'll buzz you when someone asks to chat."
      : filter === "restricted"
      ? "Restricted chats live here. Media stays hidden until you say so."
      : filter === "online"
      ? "No one online from your chats right now."
      : "No chats yet. Search a name above to start.";
  return (
    <div className="mc-sidebar-empty">
      <AnimatedLogo size={48} motion={filter === "requests" ? "attention" : "shy"} />
      <p>{copy}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* ThreadRow                                                                  */
/* -------------------------------------------------------------------------- */

function ThreadRow({
  thread,
  active,
  currentUserId,
  local,
  onClick,
}: {
  thread: ChatThread;
  active: boolean;
  currentUserId?: string;
  local: ThreadLocalSettings;
  onClick: () => void;
}) {
  const person = otherParticipant(thread, currentUserId);
  const name = threadDisplayName(thread, currentUserId, local);
  const unread = isThreadUnread(thread, currentUserId);
  const presence = derivePresence(thread);
  const lastSenderId =
    typeof thread.lastMessageSenderId === "string"
      ? thread.lastMessageSenderId
      : thread.lastMessageSenderId?._id;
  const myMessage = !!lastSenderId && lastSenderId === currentUserId;
  const snippet = thread.lastMessageSnippet
    ? `${myMessage ? "You: " : ""}${thread.lastMessageSnippet}`
    : thread.status === "pending"
    ? "Wants to chat"
    : `Updated ${relativeTime(thread.lastMessageAt || thread.updatedAt || thread.createdAt)}`;
  return (
    <button
      type="button"
      onClick={onClick}
      className="mc-thread-row"
      data-active={active}
      data-unread={unread}
    >
      <span className="mc-thread-avatar">
        <Avatar size={44} hue={hueFromString(person?._id || thread._id)} />
        <span className="mc-thread-presence" data-state={presence} />
      </span>
      <span className="mc-thread-meta">
        <span className="mc-thread-row-top">
          <span className="mc-thread-row-name">{name}</span>
          <span className="mc-thread-row-time">
            {relativeTime(thread.lastMessageAt || thread.updatedAt || thread.createdAt)}
          </span>
        </span>
        <span className="mc-thread-row-snippet">{snippet}</span>
      </span>
      <span className="mc-thread-row-flags">
        {local.pinned && (
          <span className="mc-thread-flag" title="Pinned">
            <Icon.Pin size={9} />
          </span>
        )}
        {local.muted && (
          <span className="mc-thread-flag" data-tone="mute" title="Muted">
            <Icon.Bell size={9} />
          </span>
        )}
        {unread && <span className="mc-thread-row-unread-dot" />}
      </span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Conversation header                                                        */
/* -------------------------------------------------------------------------- */

function ConversationHeader({
  thread,
  other,
  isGroupChat,
  isBlocked,
  isRestricted,
  threadSettings,
  headerMotion,
  onBack,
  onTapLogo,
  onTogglePin,
  onToggleMute,
  onOpenSafety,
  onOpenSettings,
}: {
  thread: ChatThread;
  other: ChatParticipant | null;
  isGroupChat: boolean;
  isBlocked: boolean;
  isRestricted: boolean;
  threadSettings: ThreadLocalSettings;
  headerMotion: LogoMotion;
  onBack: () => void;
  onTapLogo: () => void;
  onTogglePin: () => void;
  onToggleMute: () => void;
  onOpenSafety: () => void;
  onOpenSettings: () => void;
}) {
  const presence = derivePresence(thread);
  const displayName = threadDisplayName(thread, undefined, threadSettings) || "";
  const presenceLabel = isBlocked
    ? "Blocked"
    : presence === "online"
    ? "Online now"
    : presence === "away"
    ? "Active recently"
    : thread.otherLastReadAt
    ? `Seen ${relativeTime(thread.otherLastReadAt)}`
    : "Quiet";
  return (
    <div className="mc-convo-head">
      <button
        type="button"
        onClick={onBack}
        className="mc-convo-back h-9 w-9 rounded-full border border-paper-line bg-paper items-center justify-center hover:border-ink/30"
        aria-label="Back to chat list"
      >
        <Icon.ArrowLeft size={14} />
      </button>
      <button
        type="button"
        onClick={onTapLogo}
        className="hidden md:inline-flex shrink-0 rounded-full hover:bg-[var(--lime-mist)] p-1 transition"
        aria-label="bizim circle"
        title="Tap me"
      >
        <AnimatedLogo size={28} motion={headerMotion} />
      </button>
      <span className="relative">
        <Avatar size={42} hue={hueFromString(other?._id || thread._id)} />
        {!isGroupChat && (
          <span
            className="mc-thread-presence"
            data-state={presence}
            style={{ position: "absolute", bottom: 0, right: 0 }}
          />
        )}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[15.5px] font-semibold tracking-[-0.01em] truncate">
            {displayName}
          </span>
          {isGroupChat && (
            <span className="rounded-pill bg-[var(--lime-mist)] text-[var(--lime-deep)] px-2 py-0.5 text-[9.5px] font-bold tracking-[0.14em] uppercase">
              Group · {thread.participants.length}
            </span>
          )}
          {threadSettings.pinned && (
            <span className="rounded-pill bg-[var(--lime)] text-ink px-2 py-0.5 text-[9.5px] font-bold tracking-[0.14em] uppercase">
              Pinned
            </span>
          )}
          {threadSettings.muted && (
            <span className="rounded-pill bg-[var(--paper-cool)] text-ink/55 px-2 py-0.5 text-[9.5px] font-bold tracking-[0.14em] uppercase">
              Muted
            </span>
          )}
        </div>
        <div className="text-[12px] text-ink/55 mt-0.5">{presenceLabel}</div>
      </div>
      <button
        type="button"
        className="mc-icon-btn"
        onClick={onTogglePin}
        aria-label={threadSettings.pinned ? "Unpin" : "Pin"}
        title={threadSettings.pinned ? "Unpin" : "Pin to top"}
      >
        <Icon.Pin size={14} />
      </button>
      <button
        type="button"
        className="mc-icon-btn"
        onClick={onToggleMute}
        aria-label={threadSettings.muted ? "Unmute" : "Mute"}
        title="Mute"
      >
        <Icon.Bell size={14} />
      </button>
      <button
        type="button"
        className="mc-icon-btn"
        onClick={onOpenSafety}
        data-tone="shield"
        data-active={isBlocked || isRestricted}
        aria-label="Safety"
        title="Safety"
      >
        <Icon.Shield size={14} />
      </button>
      <button
        type="button"
        className="mc-icon-btn"
        onClick={onOpenSettings}
        aria-label="Settings"
        title="Settings"
      >
        <Icon.Filter size={14} />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Permission card                                                            */
/* -------------------------------------------------------------------------- */

function PermissionCard({
  other,
  onAccept,
  onReject,
}: {
  other: ChatParticipant | null;
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <div className="mc-permission-card">
      <AnimatedLogo size={48} motion="attention" />
      <div className="flex-1">
        <p className="font-display text-[16px] font-semibold tracking-[-0.02em]">
          {other?.name || "Someone"} wants to start a chat
        </p>
        <p className="text-[12px] text-ink/65 mt-1 max-w-prose">
          We never deliver messages from a stranger until you say it's okay. You can block,
          restrict, or report at any time.
        </p>
        <div className="mt-3 flex gap-2 flex-wrap">
          <button type="button" onClick={onAccept} className="mc-cta-lime">
            <Icon.Check size={13} /> Accept
          </button>
          <button type="button" onClick={onReject} className="mc-cta-ghost">
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Bubble row                                                                 */
/* -------------------------------------------------------------------------- */

type BubbleRowProps = {
  message: ChatMessage;
  mine: boolean;
  showAvatar: boolean;
  senderName?: string;
  currentUserId?: string;
  showLinkPreviews: boolean;
  autoplayMedia: boolean;
  reactPickerOpen: boolean;
  onReactPickerToggle: () => void;
  onReact: (emoji: string) => void;
  onReply: () => void;
  onOpenLightbox: (payload: { url: string; kind: "image" | "video" | "pdf"; name?: string }) => void;
  onReportMessage: () => void;
};

function BubbleRow({
  message,
  mine,
  showAvatar,
  senderName,
  currentUserId,
  showLinkPreviews,
  autoplayMedia,
  reactPickerOpen,
  onReactPickerToggle,
  onReact,
  onReply,
  onOpenLightbox,
  onReportMessage,
}: BubbleRowProps) {
  const trimmed = (message.body || "").trim();
  const emojiOnly = !!trimmed && isEmojiOnly(trimmed);
  const reactionEntries = Object.entries(message.reactions || {}).filter(
    ([, ids]) => ids && ids.length > 0
  );
  return (
    <div className="mc-bubble-row" data-mine={mine}>
      {!mine ? (
        showAvatar ? (
          <span className="mc-bubble-avatar">
            <Avatar size={30} hue={hueFromString(participantId(message.senderId) || "")} />
          </span>
        ) : (
          <span className="mc-bubble-avatar-placeholder" />
        )
      ) : null}
      <div className="flex flex-col gap-1 min-w-0">
        {!mine && showAvatar && senderName && (
          <span className="text-[10.5px] font-semibold text-ink/55 px-1">{senderName}</span>
        )}
        <div
          className="mc-bubble"
          data-mine={mine}
          data-emoji-only={emojiOnly}
          onDoubleClick={() => onReact("❤️")}
        >
          {message.replyTo?.body && (
            <div className="mc-bubble-reply" title={message.replyTo.body}>
              ↩ {message.replyTo.body}
            </div>
          )}
          {message.body && <MessageBody body={message.body} mine={mine} emojiOnly={emojiOnly} />}
          {showLinkPreviews && <MessageLinkPreview body={message.body} mine={mine} />}
          <MessageAttachments
            message={message}
            mine={mine}
            autoplayMedia={autoplayMedia}
            onOpenLightbox={onOpenLightbox}
          />
          {message.share && <ShareCard share={message.share} mine={mine} />}
          {!message.body &&
            normalizedAttachments(message).length === 0 &&
            !message.share && <div>(empty message)</div>}
          {!emojiOnly && (
            <div className="mc-bubble-meta">
              <span>{relativeTime(message.createdAt)}</span>
              {mine && <Icon.Check size={11} />}
            </div>
          )}
          <div className="mc-bubble-actions">
            <button
              type="button"
              className="mc-bubble-action"
              onClick={onReactPickerToggle}
              aria-label="React"
              title="React"
            >
              <Icon.Smile size={13} />
            </button>
            <button
              type="button"
              className="mc-bubble-action"
              onClick={onReply}
              aria-label="Reply"
              title="Reply"
            >
              <Icon.Share size={12} />
            </button>
            {!mine && (
              <button
                type="button"
                className="mc-bubble-action"
                onClick={onReportMessage}
                aria-label="Report message"
                title="Report"
              >
                <Icon.Flag size={12} />
              </button>
            )}
          </div>
          {reactPickerOpen && (
            <div className="mc-react-picker">
              {QUICK_REACTIONS.map((emoji) => (
                <button key={emoji} type="button" onClick={() => onReact(emoji)}>
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
        {reactionEntries.length > 0 && (
          <div className="mc-reactions">
            {reactionEntries.map(([emoji, ids]) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact(emoji)}
                className="mc-reaction"
                data-mine={!!currentUserId && ids.includes(currentUserId)}
              >
                <span>{emoji}</span>
                <span>{ids.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Composer dock                                                              */
/* -------------------------------------------------------------------------- */

type ComposerProps = {
  canSend: boolean;
  sending: boolean;
  uploading: boolean;
  sendBurst: boolean;
  draft: string;
  setDraft: (value: string) => void;
  enterToSend: boolean;
  onSend: () => void;
  hasSendableContent: boolean;
  isBlocked: boolean;
  composerRef: React.RefObject<HTMLTextAreaElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  resumeInputRef: React.RefObject<HTMLInputElement | null>;
  videoInputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (files: FileList | null, purpose: "chat_attachment" | "resume") => void;
  onLocation: () => void;
  onTogglePoll: () => void;
  popover: "emoji" | "stickers" | "slash" | null;
  setPopover: (value: "emoji" | "stickers" | "slash" | null) => void;
  reply: ReplyDraft | null;
  setReply: (value: ReplyDraft | null) => void;
  pendingAttachments: PendingAttachment[];
  removePendingAttachment: (localId: string) => void;
  locationDraft: LocationDraft | null;
  setLocationDraft: (value: LocationDraft | null) => void;
  linkPreview: LinkPreview | null;
  pollOpen: boolean;
  pollDraft: PollDraft;
  setPollDraft: React.Dispatch<React.SetStateAction<PollDraft>>;
  addPollOption: () => void;
  updatePollOption: (index: number, value: string) => void;
  removePollOption: (index: number) => void;
  hasSensitiveDraft: boolean;
  sensitiveAck: boolean;
  ackSensitive: () => void;
};

function ComposerDock(props: ComposerProps) {
  const {
    canSend,
    sending,
    uploading,
    sendBurst,
    draft,
    setDraft,
    enterToSend,
    onSend,
    hasSendableContent,
    isBlocked,
    composerRef,
    fileInputRef,
    resumeInputRef,
    videoInputRef,
    onFile,
    onLocation,
    onTogglePoll,
    popover,
    setPopover,
    reply,
    setReply,
    pendingAttachments,
    removePendingAttachment,
    locationDraft,
    setLocationDraft,
    linkPreview,
    pollOpen,
    pollDraft,
    setPollDraft,
    addPollOption,
    updatePollOption,
    removePollOption,
    hasSensitiveDraft,
    sensitiveAck,
    ackSensitive,
  } = props;

  return (
    <div className="mc-composer-dock">
      {/* Quick action row */}
      <div className="mc-quick-row">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
          className="hidden"
          onChange={(event) => onFile(event.target.files, "chat_attachment")}
        />
        <input
          ref={resumeInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={(event) => onFile(event.target.files, "resume")}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,.mov"
          className="hidden"
          onChange={(event) => onFile(event.target.files, "chat_attachment")}
        />
        <button
          type="button"
          className="mc-quick-pill"
          disabled={!canSend || uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          <Icon.Image size={12} /> File
        </button>
        <button
          type="button"
          className="mc-quick-pill"
          disabled={!canSend || uploading}
          onClick={() => resumeInputRef.current?.click()}
        >
          <Icon.Note size={12} /> Resume
        </button>
        <button
          type="button"
          className="mc-quick-pill"
          disabled={!canSend || uploading}
          onClick={() => videoInputRef.current?.click()}
        >
          <Icon.Video size={12} /> Video
        </button>
        <button
          type="button"
          className="mc-quick-pill"
          disabled={!canSend}
          onClick={onLocation}
        >
          <Icon.Pin size={12} /> Place
        </button>
        <button
          type="button"
          className="mc-quick-pill"
          disabled={!canSend}
          onClick={onTogglePoll}
        >
          <Icon.Poll size={12} /> Poll
        </button>
        {uploading && (
          <span className="inline-flex items-center gap-1.5 text-[11px] text-ink/55">
            <AnimatedLogo size={18} motion="loading" /> Uploading…
          </span>
        )}
      </div>

      {/* Drafts above the input */}
      {(pendingAttachments.length > 0 ||
        locationDraft ||
        linkPreview ||
        pollOpen ||
        hasSensitiveDraft) && (
        <div className="mb-2 space-y-2 px-1">
          {linkPreview && (
            <div className="mc-rich-link" style={{ marginTop: 0 }}>
              <span className="mc-rich-thumb">
                <Icon.Link size={14} />
              </span>
              <div className="min-w-0">
                <div className="text-[12px] font-bold truncate">{linkPreview.host}</div>
                <div className="text-[11px] text-ink/55 truncate">{linkPreview.url}</div>
              </div>
            </div>
          )}
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
            <div className="rounded-[18px] border border-paper-line bg-[var(--warm)] p-3">
              <input
                value={pollDraft.question}
                onChange={(event) =>
                  setPollDraft((current) => ({ ...current, question: event.target.value }))
                }
                placeholder="Poll question"
                className="h-10 w-full rounded-[14px] border border-paper-line bg-paper px-3 text-[13px] outline-none focus:border-[var(--lime-bright)]"
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
          {hasSensitiveDraft && !sensitiveAck && (
            <div className="mc-banner" data-tone="warn">
              <span>⚠️</span>
              <span className="flex-1">
                This looks like sensitive personal info. Share only if you trust this person.
              </span>
              <button type="button" onClick={ackSensitive} className="mc-cta-lime">
                Send anyway
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mc-composer-pill">
        {reply && (
          <div className="mc-reply-strip">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold tracking-[0.14em] uppercase text-ink/45">
                Replying {reply.senderName ? `to ${reply.senderName}` : ""}
              </div>
              <div className="text-[12px] text-ink/65 truncate">
                {reply.body || "(attachment)"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReply(null)}
              className="h-7 w-7 rounded-full border border-paper-line inline-flex items-center justify-center"
              aria-label="Cancel reply"
            >
              <Icon.Close size={11} />
            </button>
          </div>
        )}

        {popover === "emoji" && (
          <div className="mc-popover">
            <div className="flex items-center justify-between mb-2">
              <span className="mc-popover-title">Emoji</span>
              <button
                type="button"
                onClick={() => setPopover(null)}
                className="h-7 w-7 rounded-full border border-paper-line inline-flex items-center justify-center"
                aria-label="Close emoji"
              >
                <Icon.Close size={11} />
              </button>
            </div>
            <div className="mc-emoji-grid scroll-clean">
              {EMOJI_LIBRARY.map((emoji, index) => (
                <button
                  key={`${emoji}-${index}`}
                  type="button"
                  onClick={() => {
                    setDraft(draft + emoji);
                    composerRef.current?.focus();
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
        {popover === "stickers" && (
          <div className="mc-popover">
            <div className="flex items-center justify-between mb-2">
              <span className="mc-popover-title">Stickers</span>
              <button
                type="button"
                onClick={() => setPopover(null)}
                className="h-7 w-7 rounded-full border border-paper-line inline-flex items-center justify-center"
                aria-label="Close stickers"
              >
                <Icon.Close size={11} />
              </button>
            </div>
            <div className="mc-sticker-grid">
              {STICKER_PACK.map((sticker) => (
                <button
                  key={sticker.label}
                  type="button"
                  onClick={() => {
                    setDraft(draft ? `${draft} ${sticker.emoji}` : sticker.emoji);
                    setPopover(null);
                    composerRef.current?.focus();
                  }}
                >
                  <span>{sticker.emoji}</span>
                  <span>{sticker.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {popover === "slash" && (
          <div className="mc-popover">
            <div className="flex items-center justify-between mb-2">
              <span className="mc-popover-title">Slash commands</span>
              <button
                type="button"
                onClick={() => setPopover(null)}
                className="h-7 w-7 rounded-full border border-paper-line inline-flex items-center justify-center"
                aria-label="Close slash menu"
              >
                <Icon.Close size={11} />
              </button>
            </div>
            <div className="mc-slash-list">
              {slashCommands.map((command) => (
                <button
                  key={command.key}
                  type="button"
                  onClick={() => {
                    setDraft(command.key);
                    setPopover(null);
                    composerRef.current?.focus();
                  }}
                >
                  <span className="mc-slash-key">{command.key}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[12.5px] font-semibold">{command.label}</span>
                    <span className="block text-[11px] text-ink/55">{command.tip}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          className="mc-mini-action"
          disabled={!canSend}
          aria-label="Emoji"
          title="Emoji"
          onClick={() => setPopover(popover === "emoji" ? null : "emoji")}
        >
          <Icon.Smile size={15} />
        </button>
        <button
          type="button"
          className="mc-mini-action"
          disabled={!canSend}
          aria-label="Stickers"
          title="Stickers"
          onClick={() => setPopover(popover === "stickers" ? null : "stickers")}
        >
          <Icon.Sparkle size={14} />
        </button>
        <button
          type="button"
          className="mc-mini-action"
          disabled={!canSend}
          aria-label="Slash menu"
          title="Slash menu"
          onClick={() => setPopover(popover === "slash" ? null : "slash")}
        >
          <Icon.Slash size={14} />
        </button>
        <textarea
          ref={composerRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (enterToSend && event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSend();
            }
            if (event.key === "/" && !draft) {
              event.preventDefault();
              setPopover("slash");
            }
          }}
          disabled={!canSend}
          rows={1}
          placeholder={
            isBlocked
              ? "Unblock to message again"
              : canSend
              ? "Message…  (try /celebrate /hearts /vanish)"
              : "Waiting for request approval"
          }
          className="mc-composer-textarea"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={!hasSendableContent || sending || uploading || !canSend}
          className="mc-send"
          data-pulsing={sendBurst}
          aria-label="Send"
        >
          {sending ? <AnimatedLogo size={20} motion="loading" /> : <Icon.Send size={16} />}
        </button>
      </div>
    </div>
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
    <div className="flex items-center gap-2 rounded-[16px] border border-paper-line bg-paper p-2.5 shadow-soft">
      <span className="h-8 w-8 rounded-full bg-[var(--lime-mist)] inline-flex items-center justify-center">
        {icon}
      </span>
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
    <div className="relative h-24 w-32 shrink-0 mc-attachment-tile">
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
        className="absolute right-1.5 top-1.5 h-7 w-7 rounded-full bg-paper/95 border border-paper-line inline-flex items-center justify-center"
        aria-label="Remove attachment"
      >
        <Icon.Close size={11} />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Drawers                                                                    */
/* -------------------------------------------------------------------------- */

function SafetyDrawer({
  thread,
  other,
  isGroupChat,
  isBlocked,
  isRestricted,
  threadSettings,
  onClose,
  onToggleRestrict,
  onBlock,
  onUnblock,
  onOpenReport,
  onTogglePin,
  onToggleMute,
  onToggleVanish,
  onChangeNickname,
  safetyStatus,
  messageCount,
  currentUserId,
}: {
  thread: ChatThread;
  other: ChatParticipant | null;
  isGroupChat: boolean;
  isBlocked: boolean;
  isRestricted: boolean;
  threadSettings: ThreadLocalSettings;
  onClose: () => void;
  onToggleRestrict: () => void;
  onBlock: () => void;
  onUnblock: () => void;
  onOpenReport: () => void;
  onTogglePin: () => void;
  onToggleMute: () => void;
  onToggleVanish: () => void;
  onChangeNickname: (value: string) => void;
  safetyStatus: string | null;
  messageCount: number;
  currentUserId?: string;
}) {
  const displayName = threadDisplayName(thread, currentUserId, threadSettings);
  return (
    <>
      <div className="mc-drawer-overlay" onClick={onClose} />
      <aside className="mc-drawer">
        <div className="px-5 py-5 border-b border-paper-line flex items-center gap-3">
          <Avatar size={42} hue={hueFromString(other?._id || thread._id)} />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-ink/45">
              Safety
            </div>
            <div className="text-[15px] font-semibold tracking-[-0.01em] truncate">
              {displayName}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-paper-line inline-flex items-center justify-center"
            aria-label="Close safety drawer"
          >
            <Icon.Close size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scroll-clean p-5 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Messages" value={String(messageCount)} />
            <Stat
              label="Started"
              value={relativeTime(thread.createdAt || thread.updatedAt)}
            />
            <Stat
              label="Last seen"
              value={thread.otherLastReadAt ? relativeTime(thread.otherLastReadAt) : "—"}
            />
          </div>

          <div className="mc-banner" data-tone="warn">
            <Icon.Shield size={16} />
            <span className="flex-1 text-[12px] font-semibold">
              Keep payments, passwords, IDs, and private contact details off chat unless you trust this person.
            </span>
          </div>

          <Section title="Conversation">
            <label className="block">
              <span className="text-[10.5px] font-bold tracking-[0.14em] uppercase text-ink/45">
                Nickname
              </span>
              <input
                value={threadSettings.nickname || ""}
                onChange={(event) => onChangeNickname(event.target.value)}
                placeholder={threadDisplayName(thread, currentUserId)}
                className="mt-1 h-11 w-full rounded-[16px] border border-paper-line bg-[var(--warm)] px-3 text-[13px] outline-none focus:border-[var(--lime-bright)]"
              />
            </label>
            <Toggle
              title="Pin"
              description="Pin this chat to the top of the list."
              checked={!!threadSettings.pinned}
              onChange={onTogglePin}
            />
            <Toggle
              title="Mute"
              description="No badge or sound for new messages here."
              checked={!!threadSettings.muted}
              onChange={onToggleMute}
            />
            <Toggle
              title="Vanish mode"
              description="Hide messages on this device with a striped overlay."
              checked={!!threadSettings.vanish}
              onChange={onToggleVanish}
            />
          </Section>

          {!isGroupChat && (
            <Section title="Protection">
              <button
                type="button"
                onClick={onToggleRestrict}
                className={clsx(
                  "w-full h-11 rounded-[16px] text-[12.5px] font-bold border transition flex items-center justify-center gap-2",
                  isRestricted
                    ? "bg-[var(--lime-mist)] border-[var(--lime-bright)] text-[var(--lime-deep)]"
                    : "border-paper-line bg-paper hover:border-ink/30"
                )}
              >
                <Icon.Shield size={14} />
                {isRestricted ? "Restriction on · click to undo" : "Restrict media & previews"}
              </button>
              <button
                type="button"
                onClick={onOpenReport}
                className="w-full h-11 rounded-[16px] border border-paper-line text-[12.5px] font-bold hover:border-red-300 hover:text-red-700 flex items-center justify-center gap-2"
              >
                <Icon.Flag size={14} />
                Report this person…
              </button>
              <button
                type="button"
                onClick={isBlocked ? onUnblock : onBlock}
                className={clsx(
                  "w-full h-11 rounded-[16px] text-[12.5px] font-bold transition flex items-center justify-center gap-2",
                  isBlocked
                    ? "border border-paper-line bg-paper hover:border-ink/30"
                    : "bg-red-700 text-white hover:bg-red-800"
                )}
              >
                {isBlocked ? "Unblock" : "🚫 Block — they can't message you"}
              </button>
            </Section>
          )}

          {isGroupChat && (
            <div className="rounded-[18px] border border-paper-line bg-[var(--warm)] p-3 text-[12px] text-ink/60">
              Group leave / remove member controls need the group chat API endpoint.
            </div>
          )}

          {safetyStatus && (
            <div className="text-[12px] text-ink/65 px-1">{safetyStatus}</div>
          )}
        </div>
      </aside>
    </>
  );
}

function SettingsDrawer({
  settings,
  updateSetting,
  onClose,
}: {
  settings: ChatSettings;
  updateSetting: <K extends keyof ChatSettings>(key: K, value: ChatSettings[K]) => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="mc-drawer-overlay" onClick={onClose} />
      <aside className="mc-drawer">
        <div className="px-5 py-5 border-b border-paper-line flex items-center gap-3">
          <AnimatedLogo size={32} motion="bop" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-ink/45">
              Chat preferences
            </div>
            <div className="text-[15px] font-semibold tracking-[-0.01em]">
              On this device
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-paper-line inline-flex items-center justify-center"
            aria-label="Close settings"
          >
            <Icon.Close size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scroll-clean p-5 space-y-3">
          {settingToggles.map(({ key, title, description }) => (
            <Toggle
              key={key}
              title={title}
              description={description}
              checked={!!settings[key]}
              onChange={() => updateSetting(key, !settings[key])}
            />
          ))}
          <div className="mc-banner" data-tone="lime">
            <span>🎯</span>
            <span className="flex-1 text-[12px] font-semibold">
              Try the Konami code (↑↑↓↓←→←→ B A) for a lime overload, or triple-tap the small logo in the chat header for zoomies.
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-paper-line bg-[var(--warm)] p-3">
      <div className="text-[9.5px] font-bold tracking-[0.14em] uppercase text-ink/40">
        {label}
      </div>
      <div className="mt-1 text-[15px] font-semibold truncate">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[10.5px] font-bold tracking-[0.18em] uppercase text-ink/45">
        {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Toggle({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="w-full text-left flex items-start justify-between gap-3 rounded-[16px] border border-paper-line bg-[var(--warm)] p-3 hover:border-ink/30 transition"
    >
      <span className="flex-1">
        <span className="block text-[13px] font-semibold">{title}</span>
        <span className="block text-[11.5px] text-ink/55 mt-0.5">{description}</span>
      </span>
      <span
        className={clsx(
          "shrink-0 inline-flex items-center w-10 h-6 rounded-full p-0.5 transition",
          checked ? "bg-[var(--lime)]" : "bg-[var(--paper-cool)]"
        )}
      >
        <span
          className={clsx(
            "h-5 w-5 rounded-full bg-paper shadow-soft transition-transform",
            checked && "translate-x-4"
          )}
        />
      </span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Group modal                                                                */
/* -------------------------------------------------------------------------- */

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-[28px] bg-paper p-5 shadow-pop"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <AnimatedLogo size={32} motion="high-five" />
            <div>
              <h2 className="font-display text-[22px] font-semibold tracking-[-0.02em]">
                New group
              </h2>
              <p className="text-[12px] text-ink/55">Pick at least two people.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-paper-line inline-flex items-center justify-center"
            aria-label="Close group modal"
          >
            <Icon.Close size={14} />
          </button>
        </div>

        <label className="mt-5 block">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink/45">
            Name
          </span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Lime crew"
            className="mt-1 h-11 w-full rounded-[16px] border border-paper-line bg-[var(--warm)] px-3 text-[13px] outline-none focus:border-[var(--lime-bright)]"
          />
        </label>

        <div className="mt-3">
          <div className="relative">
            <Icon.Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/45" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search people"
              className="h-11 w-full rounded-[16px] border border-paper-line bg-[var(--warm)] pl-9 pr-3 text-[13px] outline-none focus:border-[var(--lime-bright)]"
            />
          </div>
          {matches.length > 0 && (
            <div className="mt-2 overflow-hidden rounded-[18px] border border-paper-line">
              {matches.map((match) => (
                <button
                  key={match._id}
                  type="button"
                  onClick={() => onAdd(match)}
                  className="w-full p-3 flex items-center gap-3 text-left hover:bg-[var(--paper-cool)]"
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

        {members.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {members.map((member) => (
              <button
                key={member._id}
                type="button"
                onClick={() =>
                  setMembers((current) => current.filter((item) => item._id !== member._id))
                }
                className="h-8 rounded-pill border border-paper-line bg-[var(--warm)] px-3 text-[11px] font-semibold inline-flex items-center gap-1.5 hover:border-ink/30"
              >
                {member.name} <Icon.Close size={11} />
              </button>
            ))}
          </div>
        )}

        {status && (
          <div className="mt-3 rounded-[16px] border border-paper-line bg-[var(--warm)] p-3 text-[12px] text-ink/65">
            {status}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="mc-cta-ghost">
            Close
          </button>
          <button type="button" onClick={onCreate} className="mc-cta-lime">
            Create group
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Report modal                                                               */
/* -------------------------------------------------------------------------- */

function ReportModal({
  messageId,
  reason,
  setReason,
  details,
  setDetails,
  onSubmit,
  onClose,
}: {
  messageId?: string;
  reason: string;
  setReason: (value: string) => void;
  details: string;
  setDetails: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/40 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[28px] bg-paper p-5 shadow-pop"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-[20px] font-semibold tracking-[-0.02em]">
              {messageId ? "Report message" : "Report user"}
            </h2>
            <p className="mt-0.5 text-[12px] text-ink/55">
              We review every report. You stay anonymous.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-paper-line inline-flex items-center justify-center"
            aria-label="Close report modal"
          >
            <Icon.Close size={14} />
          </button>
        </div>
        <label className="mt-4 block">
          <span className="text-[11px] text-ink/55">Reason</span>
          <select
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="mt-1 h-11 w-full rounded-[16px] border border-paper-line bg-[var(--warm)] px-3 text-[13px] outline-none"
          >
            {reportReasons.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <textarea
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          rows={4}
          placeholder="Add context for moderators (optional)"
          className="mt-3 w-full resize-none rounded-[16px] border border-paper-line bg-[var(--warm)] px-3 py-2 text-[13px] outline-none focus:border-[var(--lime-bright)]"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="mc-cta-ghost">
            Cancel
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className="h-9 px-4 rounded-pill bg-red-700 text-white text-[12px] font-bold hover:bg-red-800"
          >
            Send report
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Lightbox                                                                   */
/* -------------------------------------------------------------------------- */

function Lightbox({
  payload,
  onClose,
}: {
  payload: { url: string; kind: "image" | "video" | "pdf"; name?: string };
  onClose: () => void;
}) {
  return (
    <div className="mc-lightbox" onClick={onClose}>
      <div
        className="relative w-full max-w-3xl rounded-[24px] overflow-hidden bg-paper shadow-pop"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-paper-line">
          <span className="text-[12.5px] font-semibold truncate max-w-[60%]">
            {payload.name || "Preview"}
          </span>
          <div className="flex items-center gap-2">
            <a
              href={payload.url}
              target="_blank"
              rel="noreferrer"
              className="h-8 px-3 rounded-pill border border-paper-line text-[11px] font-bold tracking-[0.1em] uppercase hover:border-ink/30"
            >
              Open
            </a>
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-full border border-paper-line inline-flex items-center justify-center"
              aria-label="Close preview"
            >
              <Icon.Close size={14} />
            </button>
          </div>
        </div>
        <div className="bg-[var(--paper-cool)] flex items-center justify-center min-h-[60vh]">
          {payload.kind === "image" ? (
            <img src={payload.url} alt={payload.name || ""} className="max-h-[80vh] w-auto" />
          ) : payload.kind === "video" ? (
            <video src={payload.url} controls autoPlay className="max-h-[80vh] w-full bg-black" />
          ) : (
            <iframe
              src={payload.url}
              className="w-full h-[80vh] border-0 bg-paper"
              title={payload.name || "PDF"}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Confetti & hearts                                                          */
/* -------------------------------------------------------------------------- */

function Confetti() {
  const palette = ["#C1FF72", "#B0E558", "#FCE38A", "#FFB6C1", "#A0E7E5", "#FFFFFF"];
  const pieces = Array.from({ length: 60 });
  return (
    <div className="mc-confetti" aria-hidden>
      {pieces.map((_, index) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 220;
        const duration = 1300 + Math.random() * 900;
        const color = palette[index % palette.length];
        const rotate = Math.random() * 360;
        return (
          <span
            key={index}
            style={
              {
                left: `${left}%`,
                animationDelay: `${delay}ms`,
                animationDuration: `${duration}ms`,
                background: color,
                transform: `rotate(${rotate}deg)`,
              } as CSSProperties
            }
          />
        );
      })}
    </div>
  );
}

function Hearts() {
  const variants = ["❤️", "💚", "💛", "💖", "🤍"];
  const pieces = Array.from({ length: 22 });
  return (
    <div className="mc-hearts" aria-hidden>
      {pieces.map((_, index) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 600;
        const duration = 1700 + Math.random() * 800;
        const drift = (Math.random() - 0.5) * 80;
        const rotate = (Math.random() - 0.5) * 60;
        const emoji = variants[index % variants.length];
        return (
          <span
            key={index}
            style={
              {
                left: `${left}%`,
                animationDelay: `${delay}ms`,
                animationDuration: `${duration}ms`,
                ["--hx"]: `${drift}px`,
                ["--hr"]: `${rotate}deg`,
              } as CSSProperties
            }
          >
            {emoji}
          </span>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Message body / rich previews                                               */
/* -------------------------------------------------------------------------- */

function MessageBody({
  body,
  mine,
  emojiOnly,
}: {
  body: string;
  mine: boolean;
  emojiOnly: boolean;
}) {
  if (emojiOnly) return <div>{body}</div>;
  const codeBlocks = parseCodeBlocks(body);
  if (codeBlocks.length === 0) {
    return <div className="mc-rich-md whitespace-pre-wrap">{renderInline(body, mine)}</div>;
  }
  return (
    <div className="mc-rich-md space-y-2">
      {codeBlocks.map((block, index) =>
        block.type === "code" ? (
          <pre key={index} className="mc-rich-code" data-lang={block.language || "code"}>
            {block.content}
          </pre>
        ) : (
          <div key={index} className="whitespace-pre-wrap">
            {renderInline(block.content, mine)}
          </div>
        )
      )}
    </div>
  );
}

function MessageLinkPreview({ body, mine }: { body?: string; mine: boolean }) {
  const preview = buildLinkPreview(body || "");
  if (!preview) return null;
  return (
    <a href={preview.url} target="_blank" rel="noreferrer" className="mc-rich-link">
      <span className="mc-rich-thumb">
        <Icon.Link size={14} />
      </span>
      <span className="min-w-0">
        <span className="block text-[12px] font-bold truncate">{preview.host}</span>
        <span
          className={clsx(
            "block truncate text-[11px]",
            mine ? "text-[rgba(10,10,10,0.65)]" : "text-ink/55"
          )}
        >
          {preview.url}
        </span>
      </span>
    </a>
  );
}

function MessageAttachments({
  message,
  mine,
  autoplayMedia,
  onOpenLightbox,
}: {
  message: ChatMessage;
  mine: boolean;
  autoplayMedia: boolean;
  onOpenLightbox: (payload: { url: string; kind: "image" | "video" | "pdf"; name?: string }) => void;
}) {
  const attachments = normalizedAttachments(message);
  if (attachments.length === 0) return null;
  return (
    <div className="grid gap-2">
      {attachments.map((attachment, index) => {
        const isImage =
          attachment.contentType?.startsWith("image/") || attachment.kind === "image";
        const isVideo = attachment.contentType?.startsWith("video/");
        const isPdf =
          attachment.contentType === "application/pdf" || attachment.kind === "pdf";
        if (isImage) {
          return (
            <button
              key={`${attachment.url}-${index}`}
              type="button"
              onClick={() =>
                onOpenLightbox({ url: attachment.url, kind: "image", name: attachment.name })
              }
              className="mc-attachment-tile block"
            >
              {autoplayMedia ? (
                <img
                  src={attachment.url}
                  alt={attachment.name || "Attachment"}
                  className="max-h-72 w-full object-cover"
                />
              ) : (
                <BlurredMediaTile name={attachment.name || "Photo"} icon="🖼️" />
              )}
            </button>
          );
        }
        if (isVideo) {
          return (
            <div key={`${attachment.url}-${index}`} className="mc-attachment-tile">
              {autoplayMedia ? (
                <video
                  src={attachment.url}
                  controls
                  preload="metadata"
                  className="max-h-72 w-full bg-black"
                />
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    onOpenLightbox({
                      url: attachment.url,
                      kind: "video",
                      name: attachment.name,
                    })
                  }
                  className="block w-full"
                >
                  <BlurredMediaTile name={attachment.name || "Video"} icon="🎥" />
                </button>
              )}
            </div>
          );
        }
        if (isPdf) {
          return (
            <PdfPreview
              key={`${attachment.url}-${index}`}
              attachment={attachment}
              autoplayMedia={autoplayMedia}
              onOpen={() =>
                onOpenLightbox({ url: attachment.url, kind: "pdf", name: attachment.name })
              }
            />
          );
        }
        return (
          <a
            key={`${attachment.url}-${index}`}
            href={attachment.url}
            target="_blank"
            rel="noreferrer"
            className="mc-rich-link"
          >
            <span className="mc-rich-thumb">
              <Icon.Note size={14} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-bold truncate">
                {attachment.name || attachmentLabel(attachment)}
              </span>
              <span
                className={clsx(
                  "block text-[11px]",
                  mine ? "text-[rgba(10,10,10,0.65)]" : "text-ink/55"
                )}
              >
                Tap to open
              </span>
            </span>
          </a>
        );
      })}
    </div>
  );
}

function ShareCard({
  share,
  mine,
}: {
  share: NonNullable<ChatMessage["share"]>;
  mine: boolean;
}) {
  return (
    <Link href={share.url} className="mc-rich-link" style={{ marginTop: 8 }}>
      <span className="mc-rich-thumb">
        <Icon.Share size={14} />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={clsx(
            "block text-[10px] font-bold tracking-[0.14em] uppercase",
            mine ? "opacity-65" : "text-ink/45"
          )}
        >
          {share.entityType}
        </span>
        <span className="block text-[12.5px] font-semibold truncate">{share.title}</span>
        {share.subtitle && (
          <span className={clsx("block text-[11px] truncate", mine ? "opacity-65" : "text-ink/55")}>
            {share.subtitle}
          </span>
        )}
      </span>
    </Link>
  );
}

function BlurredMediaTile({ name, icon }: { name: string; icon: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-5 bg-[var(--warm)]">
      <div className="h-12 w-12 rounded-[12px] bg-[var(--paper-cool)] inline-flex items-center justify-center text-[22px]">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-semibold truncate">{name}</div>
        <div className="text-[11px] text-ink/55">Hidden by restrict — tap to view</div>
      </div>
    </div>
  );
}

function PdfPreview({
  attachment,
  autoplayMedia,
  onOpen,
}: {
  attachment: ChatAttachment;
  autoplayMedia: boolean;
  onOpen: () => void;
}) {
  return (
    <div className="mc-rich-pdf">
      <div className="mc-rich-pdf-head">
        <span style={{ fontSize: 14 }}>📄</span>
        <span className="flex-1 truncate">{attachment.name || "PDF document"}</span>
        <span className="rounded-pill bg-[var(--lime)] text-ink px-2 py-0.5 text-[9.5px] tracking-[0.16em] uppercase">
          PDF
        </span>
        <a
          href={attachment.url}
          target="_blank"
          rel="noreferrer"
          className="rounded-pill border border-paper-line bg-paper px-2.5 py-0.5 text-[10.5px] font-bold tracking-[0.1em] uppercase hover:border-ink/30"
        >
          Open
        </a>
      </div>
      {autoplayMedia ? (
        <iframe
          src={`${attachment.url}#toolbar=0&view=FitH`}
          title={attachment.name || "PDF preview"}
        />
      ) : (
        <button type="button" onClick={onOpen} className="block w-full text-left">
          <BlurredMediaTile name={attachment.name || "PDF"} icon="📄" />
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

type LinkPreview = { url: string; host: string };

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

function attachmentKind(
  contentType: string,
  name: string,
  purpose: "chat_attachment" | "resume"
): ChatAttachment["kind"] {
  if (purpose === "resume") return "pdf";
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
  return (
    thread.otherParticipant ||
    thread.participants.find((participant) => participant._id !== userId)
  );
}

function threadDisplayName(
  thread: ChatThread,
  userId?: string,
  local?: ThreadLocalSettings
) {
  if (local?.nickname) return local.nickname;
  if (thread.name || thread.title) return thread.name || thread.title || "Group chat";
  const others = thread.participants.filter((participant) => participant._id !== userId);
  if (others.length > 1) return others.map((participant) => participant.name).join(", ");
  return others[0]?.name || thread.otherParticipant?.name || "Unknown";
}

function participantId(value?: string | ChatParticipant | null): string | undefined {
  if (!value) return undefined;
  return typeof value === "string" ? value : value._id;
}

function derivePresence(thread: ChatThread): "online" | "away" | "offline" {
  const ts = thread.lastMessageAt || thread.updatedAt || thread.createdAt;
  if (!ts) return "offline";
  const minutes = (Date.now() - new Date(ts).getTime()) / 60000;
  if (minutes < 8) return "online";
  if (minutes < 60 * 6) return "away";
  return "offline";
}

function isThreadUnread(thread: ChatThread, userId?: string) {
  if (!thread.lastMessageAt) return false;
  const lastSenderId =
    typeof thread.lastMessageSenderId === "string"
      ? thread.lastMessageSenderId
      : thread.lastMessageSenderId?._id;
  if (!lastSenderId || lastSenderId === userId) return false;
  if (!thread.myLastReadAt) return true;
  return new Date(thread.lastMessageAt).getTime() > new Date(thread.myLastReadAt).getTime();
}

function isEmojiOnly(text: string) {
  if (!text) return false;
  const stripped = text.replace(/\s+/g, "");
  if (!stripped || stripped.length > 8) return false;
  if (/[A-Za-z0-9]/.test(stripped)) return false;
  return /\p{Extended_Pictographic}/u.test(stripped);
}

type CodeBlock =
  | { type: "code"; language?: string; content: string }
  | { type: "text"; content: string };

function parseCodeBlocks(body: string): CodeBlock[] {
  if (!body.includes("```")) return [];
  const blocks: CodeBlock[] = [];
  const regex = /```([a-zA-Z0-9]*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(body)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({ type: "text", content: body.slice(lastIndex, match.index) });
    }
    blocks.push({
      type: "code",
      language: match[1] || undefined,
      content: match[2].replace(/\n$/, ""),
    });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < body.length) {
    blocks.push({ type: "text", content: body.slice(lastIndex) });
  }
  return blocks;
}

function renderInline(text: string, mine: boolean): React.ReactNode {
  if (!text) return null;
  const lines = text.split(/\n/);
  return lines.map((line, lineIndex) => {
    const renderedLine = renderInlineLine(line, mine);
    return (
      <span key={lineIndex}>
        {renderedLine}
        {lineIndex < lines.length - 1 && <br />}
      </span>
    );
  });
}

function renderInlineLine(line: string, mine: boolean): React.ReactNode {
  const headingMatch = /^(#{1,3})\s+(.*)$/.exec(line);
  if (headingMatch) {
    const level = headingMatch[1].length;
    const Tag = (`h${level}` as unknown) as keyof React.JSX.IntrinsicElements;
    return <Tag>{renderInlineRich(headingMatch[2], mine)}</Tag>;
  }
  const listMatch = /^[-*]\s+(.*)$/.exec(line);
  if (listMatch) {
    return <span className="block pl-3">• {renderInlineRich(listMatch[1], mine)}</span>;
  }
  const orderedMatch = /^(\d+)\.\s+(.*)$/.exec(line);
  if (orderedMatch) {
    return (
      <span className="block pl-3">
        <span className="opacity-70">{orderedMatch[1]}.</span>{" "}
        {renderInlineRich(orderedMatch[2], mine)}
      </span>
    );
  }
  return renderInlineRich(line, mine);
}

function renderInlineRich(text: string, mine: boolean): React.ReactNode {
  if (!text) return null;
  const parts = text.split(urlRegex);
  return parts.map((part, index) => {
    if (isUrl(part)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noreferrer"
          className={clsx(
            "underline underline-offset-2 break-all",
            mine ? "text-[var(--lime-deep)]" : "text-ink"
          )}
        >
          {part}
        </a>
      );
    }
    return <span key={index}>{renderTextStyling(part)}</span>;
  });
}

function renderTextStyling(input: string): React.ReactNode {
  if (!input) return null;
  const tokens: React.ReactNode[] = [];
  let buffer = "";
  let i = 0;
  while (i < input.length) {
    const rest = input.slice(i);
    if (rest.startsWith("**")) {
      const end = rest.indexOf("**", 2);
      if (end > 1) {
        if (buffer) {
          tokens.push(buffer);
          buffer = "";
        }
        tokens.push(<strong key={tokens.length}>{rest.slice(2, end)}</strong>);
        i += end + 2;
        continue;
      }
    }
    if (rest.startsWith("__")) {
      const end = rest.indexOf("__", 2);
      if (end > 1) {
        if (buffer) {
          tokens.push(buffer);
          buffer = "";
        }
        tokens.push(<strong key={tokens.length}>{rest.slice(2, end)}</strong>);
        i += end + 2;
        continue;
      }
    }
    if (rest.startsWith("*") || rest.startsWith("_")) {
      const ch = rest[0];
      const end = rest.indexOf(ch, 1);
      if (end > 0) {
        if (buffer) {
          tokens.push(buffer);
          buffer = "";
        }
        tokens.push(<em key={tokens.length}>{rest.slice(1, end)}</em>);
        i += end + 1;
        continue;
      }
    }
    if (rest.startsWith("`")) {
      const end = rest.indexOf("`", 1);
      if (end > 0) {
        if (buffer) {
          tokens.push(buffer);
          buffer = "";
        }
        tokens.push(<code key={tokens.length}>{rest.slice(1, end)}</code>);
        i += end + 1;
        continue;
      }
    }
    buffer += input[i];
    i += 1;
  }
  if (buffer) tokens.push(buffer);
  return tokens;
}

function groupMessagesByDate(messages: ChatMessage[]) {
  const groups: Array<{ label: string; messages: ChatMessage[] }> = [];
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  function labelFor(iso: string): string {
    const date = new Date(iso);
    if (sameDay(date, today)) return "Today";
    if (sameDay(date, yesterday)) return "Yesterday";
    const diffDays = Math.floor((today.getTime() - date.getTime()) / 86400000);
    if (diffDays < 7) {
      return date.toLocaleDateString(undefined, { weekday: "long" });
    }
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  function sameDay(a: Date, b: Date) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }
  for (const message of messages) {
    const label = labelFor(message.createdAt);
    const tail = groups[groups.length - 1];
    if (tail && tail.label === label) {
      tail.messages.push(message);
    } else {
      groups.push({ label, messages: [message] });
    }
  }
  return groups;
}
