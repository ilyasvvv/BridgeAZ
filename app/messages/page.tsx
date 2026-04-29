"use client";

import {
  Suspense,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import clsx from "clsx";
import { useRouter, useSearchParams } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/lib/auth";
import { useThreadsFast } from "@/lib/live";
import {
  chatsApi,
  type ChatAttachment,
  type ChatMessage,
  type ChatParticipant,
  type ChatThread,
} from "@/lib/chats";
import { uploadFile } from "@/lib/uploads";
import { avatarFromAuthor, hueFromString, relativeTime } from "@/lib/format";

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

type ThemeId = "warm" | "mint" | "sand" | "sky" | "rose" | "graphite";

type ThemeDef = {
  id: ThemeId;
  label: string;
  surface: string;
  swatch: string;
  bubbleMe: string;
  bubbleThem: string;
};

const THEMES: Record<ThemeId, ThemeDef> = {
  warm:     { id: "warm",     label: "Warm paper", surface: "msg-surface-warm",     swatch: "#FAFAF8", bubbleMe: "#0A0A0A", bubbleThem: "#FFFFFF" },
  mint:     { id: "mint",     label: "Mint",       surface: "msg-surface-mint",     swatch: "#DCF1DE", bubbleMe: "#0A0A0A", bubbleThem: "#FFFFFF" },
  sand:     { id: "sand",     label: "Sand",       surface: "msg-surface-sand",     swatch: "#F1E4C5", bubbleMe: "#0A0A0A", bubbleThem: "#FFFFFF" },
  sky:      { id: "sky",      label: "Sky",        surface: "msg-surface-sky",      swatch: "#D6E4F2", bubbleMe: "#0A0A0A", bubbleThem: "#FFFFFF" },
  rose:     { id: "rose",     label: "Rose",       surface: "msg-surface-rose",     swatch: "#F2D9E2", bubbleMe: "#0A0A0A", bubbleThem: "#FFFFFF" },
  graphite: { id: "graphite", label: "Graphite",   surface: "msg-surface-graphite", swatch: "#D9D9D6", bubbleMe: "#0A0A0A", bubbleThem: "#FFFFFF" },
};

type StickerId = "lime" | "spark" | "heart" | "check" | "wave" | "tea" | "circle" | "novruz";

type StickerMeta = { id: StickerId; label: string; category: "reactions" | "greetings" | "circle" };

const STICKERS: StickerMeta[] = [
  { id: "lime",   label: "Lime burst",     category: "reactions" },
  { id: "spark",  label: "Spark",          category: "reactions" },
  { id: "heart",  label: "Heart",          category: "reactions" },
  { id: "check",  label: "Got it",         category: "reactions" },
  { id: "wave",   label: "Salam",          category: "greetings" },
  { id: "tea",    label: "Çay vaxtıdır",   category: "greetings" },
  { id: "circle", label: "In the circle",  category: "circle" },
  { id: "novruz", label: "Novruz mübarək", category: "circle" },
];

type AnimationId = "confetti" | "hearts" | "sparkles" | "snow";

const ANIMATIONS: Array<{ id: AnimationId; label: string; hint: string }> = [
  { id: "confetti", label: "Confetti",   hint: "Quick lime + ink burst" },
  { id: "hearts",   label: "Hearts",     hint: "Soft float-up of small hearts" },
  { id: "sparkles", label: "Sparkles",   hint: "Drift of small sparks" },
  { id: "snow",     label: "Quiet snow", hint: "Slow ambient drift" },
];

type FilterKey = "all" | "unread" | "people" | "circles";

const FILTER_TABS: Array<{ id: FilterKey; label: string }> = [
  { id: "all",     label: "All" },
  { id: "unread",  label: "Unread" },
  { id: "people",  label: "People" },
  { id: "circles", label: "Circles" },
];

const REPORT_REASONS = [
  "Harassment or bullying",
  "Spam or scam",
  "Hate or abusive content",
  "Unsafe personal-information request",
  "Sexual or inappropriate content",
  "Impersonation",
  "Other safety concern",
];

const STICKER_BODY_PREFIX = "::sticker:";
const EGG_PATTERN = /i\s*love\s*bizim\s*circle/i;

const themeStorageKey = "bc_messages_theme_v1";
const prefsStorageKey = "bc_messages_prefs_v1";

/* -------------------------------------------------------------------------- */
/* Local-storage helpers                                                      */
/* -------------------------------------------------------------------------- */

function readLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota
  }
}

/* -------------------------------------------------------------------------- */
/* Page entry                                                                 */
/* -------------------------------------------------------------------------- */

export default function MessagesPage() {
  return (
    <Suspense fallback={<MessagesShell />}>
      <MessagesClient />
    </Suspense>
  );
}

function MessagesShell({ children }: { children?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper-warm flex flex-col">
      <TopBar />
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-3 sm:px-6 py-4 flex items-center justify-center text-[12.5px] text-ink/55">
        {children || "Loading…"}
      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main client                                                                */
/* -------------------------------------------------------------------------- */

type ThreadPrefs = {
  readReceipts?: boolean;
  muted?: boolean;
};

function MessagesClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, status } = useAuth();

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeId, setActiveId] = useState<string | null>(params.get("thread"));
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [draft, setDraft] = useState("");
  const [stickerOpen, setStickerOpen] = useState(false);
  const [animOpen, setAnimOpen] = useState(false);
  const [pieces, setPieces] = useState<Particle[]>([]);
  const [eggMessage, setEggMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
  const [reportDetails, setReportDetails] = useState("");
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [themeMap, setThemeMap] = useState<Record<string, ThemeId>>(() =>
    readLocal<Record<string, ThemeId>>(themeStorageKey, {})
  );
  const [prefsMap, setPrefsMap] = useState<Record<string, ThreadPrefs>>(() =>
    readLocal<Record<string, ThreadPrefs>>(prefsStorageKey, {})
  );

  const threadRef = useRef<HTMLDivElement | null>(null);
  const reactionRoot = useRef<HTMLElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const idCounter = useRef(0);

  // Stay subscribed to fast thread refresh while on this page
  useThreadsFast(true);

  useEffect(() => writeLocal(themeStorageKey, themeMap), [themeMap]);
  useEffect(() => writeLocal(prefsStorageKey, prefsMap), [prefsMap]);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/signin");
  }, [status, router]);

  useEffect(() => {
    const t = params.get("thread");
    if (t) setActiveId(t);
  }, [params]);

  useEffect(() => {
    if (status !== "authenticated") return;
    chatsApi
      .blockedUsers()
      .then((ids) => setBlockedIds(new Set((ids || []).map(String))))
      .catch(() => setBlockedIds(new Set()));
  }, [status]);

  // Load threads + poll
  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    const BASE_INTERVAL = 12000;
    let interval = BASE_INTERVAL;
    const schedule = (ms: number) => {
      if (timer) clearInterval(timer);
      interval = ms;
      timer = setInterval(load, ms);
    };
    const load = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const next = await chatsApi.threads();
        if (cancelled) return;
        setThreads(next);
        if (!activeId && next[0]?._id) {
          setActiveId(next[0]._id);
        }
        if (interval !== BASE_INTERVAL) schedule(BASE_INTERVAL);
      } catch (err: any) {
        if (cancelled) return;
        if (err?.status === 429) {
          schedule(Math.min(interval * 2, 60000));
          return;
        }
        setError(err?.message || "Failed to load chats.");
      }
    };
    load();
    timer = setInterval(load, interval);
    const onVis = () => {
      if (typeof document !== "undefined" && !document.hidden) load();
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVis);
    }
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVis);
      }
    };
  }, [status, activeId]);

  // Load messages for active thread + poll
  useEffect(() => {
    if (!activeId || status !== "authenticated") return;
    const id = activeId;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    const BASE_INTERVAL = 8000;
    let interval = BASE_INTERVAL;
    let lastMarkedAt: string | null = null;
    const schedule = (ms: number) => {
      if (timer) clearInterval(timer);
      interval = ms;
      timer = setInterval(load, ms);
    };
    const load = async () => {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const next = await chatsApi.messages(id);
        if (cancelled) return;
        setMessages(next);
        const lastAt = next[next.length - 1]?.createdAt || null;
        const prefs = prefsMap[id] || {};
        if (
          prefs.readReceipts !== false &&
          lastAt &&
          lastAt !== lastMarkedAt
        ) {
          lastMarkedAt = lastAt;
          chatsApi.markRead(id).catch(() => undefined);
        }
        if (interval !== BASE_INTERVAL) schedule(BASE_INTERVAL);
      } catch (err: any) {
        if (cancelled) return;
        if (err?.status === 429) {
          schedule(Math.min(interval * 2, 60000));
          return;
        }
        setError(err?.message || "Failed to load messages.");
      }
    };
    load();
    timer = setInterval(load, interval);
    const onVis = () => {
      if (typeof document !== "undefined" && !document.hidden) load();
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVis);
    }
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVis);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, status]);

  // Reset composer when active thread changes
  useEffect(() => {
    setDraft("");
    setStickerOpen(false);
    setAnimOpen(false);
    setError(null);
  }, [activeId]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages, activeId]);

  /* ------------------------------------------------------------------------ */
  /* Particle bursts                                                          */
  /* ------------------------------------------------------------------------ */

  type Particle = {
    id: number;
    kind: "sticker" | "heart" | "spark" | "confetti";
    x: number;
    y: number;
    dx: number;
    r0: number;
    r1: number;
    size?: number;
    stickerId?: StickerId;
    cx?: number;
    cy?: number;
    cr?: number;
    w?: number;
    h?: number;
    color?: string;
  };

  const burst = useCallback(
    (
      kind: Particle["kind"],
      opts: { count?: number; stickerId?: StickerId; x?: number; y?: number } = {}
    ) => {
      const root = reactionRoot.current;
      const rect = root?.getBoundingClientRect();
      const cx = opts.x ?? (rect ? rect.width * 0.5 : 200);
      const cy = opts.y ?? (rect ? rect.height * 0.65 : 200);
      const count = opts.count ?? 12;
      const next: Particle[] = [];
      const palette = ["#C1FF72", "#0A0A0A", "#A8E85A", "#FAFAF8", "#E8C76A"];
      for (let i = 0; i < count; i++) {
        idCounter.current += 1;
        const angle = (i / count) * Math.PI * 2;
        const r = 60 + Math.random() * 80;
        const piece: Particle = {
          id: idCounter.current,
          kind,
          x: cx,
          y: cy,
          dx: (Math.random() - 0.5) * 80,
          r0: (Math.random() - 0.5) * 30,
          r1: (Math.random() - 0.5) * 60,
        };
        if (kind === "confetti") {
          piece.cx = Math.cos(angle) * r;
          piece.cy = Math.sin(angle) * r + 40;
          piece.cr = 180 + Math.random() * 540;
          piece.w = 4 + Math.random() * 6;
          piece.h = 8 + Math.random() * 10;
          piece.color = palette[i % palette.length];
        }
        if (kind === "heart" || kind === "spark") {
          piece.size = 14 + Math.random() * 14;
          piece.dx = (Math.random() - 0.5) * 120;
        }
        if (kind === "sticker") {
          piece.stickerId = opts.stickerId;
          piece.size = 28 + Math.random() * 14;
          piece.dx = (Math.random() - 0.5) * 60;
        }
        next.push(piece);
      }
      setPieces((cur) => [...cur, ...next]);
      const ttl = kind === "confetti" ? 2400 : 2000;
      window.setTimeout(() => {
        setPieces((cur) => cur.filter((p) => !next.find((n) => n.id === p.id)));
      }, ttl);
    },
    []
  );

  /* ------------------------------------------------------------------------ */
  /* Derived                                                                  */
  /* ------------------------------------------------------------------------ */

  const sortedThreads = useMemo(() => {
    return [...threads].sort((a, b) => {
      const aUnread = isThreadUnread(a, user?._id);
      const bUnread = isThreadUnread(b, user?._id);
      if (aUnread !== bUnread) return aUnread ? -1 : 1;
      return (
        new Date(b.lastMessageAt || b.updatedAt || b.createdAt || 0).getTime() -
        new Date(a.lastMessageAt || a.updatedAt || a.createdAt || 0).getTime()
      );
    });
  }, [threads, user?._id]);

  const filteredThreads = useMemo(() => {
    return sortedThreads
      .filter((t) => {
        if (!query.trim()) return true;
        const name = displayName(t, user?._id).toLowerCase();
        return name.includes(query.toLowerCase());
      })
      .filter((t) => {
        if (filter === "all") return true;
        if (filter === "unread") return isThreadUnread(t, user?._id);
        const isCircle = isGroupThread(t, user?._id);
        if (filter === "circles") return isCircle;
        if (filter === "people") return !isCircle;
        return true;
      });
  }, [sortedThreads, query, filter, user?._id]);

  const unreadCount = useMemo(
    () => threads.filter((t) => isThreadUnread(t, user?._id)).length,
    [threads, user?._id]
  );

  const active = useMemo(
    () => threads.find((t) => t._id === activeId) || null,
    [threads, activeId]
  );
  const other = active ? otherParticipant(active, user?._id) : null;
  const otherId = other?._id;
  const isCircle = active ? isGroupThread(active, user?._id) : false;
  const themeId: ThemeId = (active && themeMap[active._id]) || "warm";
  const themeDef = THEMES[themeId];
  const prefs: ThreadPrefs = (active && prefsMap[active._id]) || {};
  const readReceiptsOn = prefs.readReceipts !== false;
  const muted = !!prefs.muted;
  const isBlocked = !!otherId && blockedIds.has(otherId);
  const requestedBySelf = active?.requestedBy
    ? participantId(active.requestedBy) === user?._id
    : false;
  const canSend =
    !!active && !isBlocked && (active.status === "active" || requestedBySelf || !active.status);

  /* ------------------------------------------------------------------------ */
  /* Actions                                                                  */
  /* ------------------------------------------------------------------------ */

  const setTheme = (id: ThemeId) => {
    if (!active) return;
    setThemeMap((m) => ({ ...m, [active._id]: id }));
  };
  const setPref = (k: keyof ThreadPrefs, v: boolean) => {
    if (!active) return;
    setPrefsMap((m) => ({ ...m, [active._id]: { ...m[active._id], [k]: v } }));
  };

  const selectThread = (id: string) => {
    setActiveId(id);
    router.replace(`/messages?thread=${id}`);
  };

  const openDetails = () => setDetailsOpen((v) => !v);

  const triggerEgg = () => {
    setEggMessage("biz də səni sevirik");
    burst("confetti", { count: 24 });
    window.setTimeout(() => burst("sticker", { count: 6, stickerId: "circle" }), 180);
    window.setTimeout(() => setEggMessage(null), 2400);
  };

  const sendBody = async (body: string): Promise<boolean> => {
    if (!active || !body.trim() || !canSend) return false;
    setSending(true);
    try {
      const msg = await chatsApi.send(active._id, { body });
      setMessages((cur) => [...cur, msg]);
      return true;
    } catch (err: any) {
      if (err?.status === 429) {
        setError("You're sending too fast — give it a second.");
        setDraft((cur) => cur || body);
      } else {
        setError(err?.message || "Failed to send.");
      }
      return false;
    } finally {
      setSending(false);
    }
  };

  const sendDraft = async () => {
    const text = draft.trim();
    if (!text) return;
    if (EGG_PATTERN.test(text)) triggerEgg();
    setDraft("");
    await sendBody(text);
  };

  const sendSticker = async (id: StickerId) => {
    setStickerOpen(false);
    burst("sticker", { count: 4, stickerId: id });
    if (!active) return;
    setSending(true);
    try {
      const msg = await chatsApi.send(active._id, { body: STICKER_BODY_PREFIX + id });
      setMessages((cur) => [...cur, msg]);
    } catch (err: any) {
      if (err?.status === 429) {
        setError("You're sending too fast — give it a second.");
      } else {
        setError(err?.message || "Failed to send.");
      }
    } finally {
      setSending(false);
    }
  };

  const playEffect = (id: AnimationId) => {
    setAnimOpen(false);
    if (id === "confetti") burst("confetti", { count: 32 });
    if (id === "hearts") burst("heart", { count: 14 });
    if (id === "sparkles") burst("spark", { count: 18 });
    if (id === "snow") burst("spark", { count: 22 });
  };

  const onAttach = () => fileInputRef.current?.click();

  const onFileChosen = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !active) return;
    setUploading(true);
    try {
      const upload = await uploadFile(file, "chat_attachment");
      const kind: ChatAttachment["kind"] = file.type.startsWith("image/")
        ? "image"
        : file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
        ? "pdf"
        : "file";
      const attachment: ChatAttachment = {
        url: upload.documentUrl,
        contentType: upload.contentType,
        kind,
        name: file.name,
      };
      const msg = await chatsApi.send(active._id, { attachments: [attachment] });
      setMessages((cur) => [...cur, msg]);
    } catch (err: any) {
      setError(err?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const acceptRequest = async () => {
    if (!active) return;
    try {
      const updated = await chatsApi.accept(active._id);
      setThreads((cur) => cur.map((t) => (t._id === updated._id ? updated : t)));
    } catch (err: any) {
      setError(err?.message || "Failed.");
    }
  };

  const rejectRequest = async () => {
    if (!active) return;
    try {
      const updated = await chatsApi.reject(active._id);
      setThreads((cur) => cur.map((t) => (t._id === updated._id ? updated : t)));
    } catch (err: any) {
      setError(err?.message || "Failed.");
    }
  };

  const blockOther = async () => {
    if (!otherId) return;
    try {
      await chatsApi.blockUser(otherId);
      setBlockedIds((cur) => new Set(cur).add(otherId));
    } catch (err: any) {
      setError(err?.message || "Block failed.");
    }
  };

  const unblockOther = async () => {
    if (!otherId) return;
    try {
      await chatsApi.unblockUser(otherId);
      setBlockedIds((cur) => {
        const next = new Set(cur);
        next.delete(otherId);
        return next;
      });
    } catch (err: any) {
      setError(err?.message || "Unblock failed.");
    }
  };

  const submitReport = async () => {
    if (!otherId) return;
    try {
      await chatsApi.reportUser({
        userId: otherId,
        reason: reportReason,
        details: reportDetails || undefined,
      });
      setReportOpen(false);
      setReportDetails("");
    } catch (err: any) {
      setError(err?.message || "Report failed.");
    }
  };

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  if (status === "loading" || (status === "authenticated" && threads.length === 0 && !error)) {
    return <MessagesShell>Loading conversations…</MessagesShell>;
  }

  return (
    <div className="min-h-screen bg-paper-warm flex flex-col">
      <TopBar />

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-3 sm:px-6 py-4">
        <div
          className="bg-paper rounded-card border border-paper-line shadow-soft overflow-hidden grid"
          style={{
            height: "calc(100vh - 64px - 32px)",
            gridTemplateColumns: detailsOpen ? "320px 1fr 320px" : "320px 1fr",
          }}
        >
          <Sidebar
            items={filteredThreads}
            activeId={activeId}
            userId={user?._id}
            onSelect={selectThread}
            query={query}
            onQuery={setQuery}
            filter={filter}
            onFilter={setFilter}
            unreadCount={unreadCount}
          />
          {active ? (
            <Conversation
              ref={reactionRoot as React.RefObject<HTMLElement>}
              thread={active}
              userId={user?._id}
              other={other}
              isCircle={isCircle}
              messages={messages}
              themeDef={themeDef}
              draft={draft}
              onDraft={setDraft}
              onSend={sendDraft}
              onAttach={onAttach}
              fileInputRef={fileInputRef}
              onFileChosen={onFileChosen}
              uploading={uploading}
              sending={sending}
              canSend={canSend}
              isBlocked={isBlocked}
              status={active.status}
              requestedBySelf={requestedBySelf}
              onAccept={acceptRequest}
              onReject={rejectRequest}
              stickerOpen={stickerOpen}
              animOpen={animOpen}
              onToggleSticker={() => {
                setStickerOpen((v) => !v);
                setAnimOpen(false);
              }}
              onToggleAnim={() => {
                setAnimOpen((v) => !v);
                setStickerOpen(false);
              }}
              onSticker={sendSticker}
              onAnim={playEffect}
              onOpenDetails={openDetails}
              detailsOpen={detailsOpen}
              pieces={pieces}
              eggMessage={eggMessage}
              error={error}
              onDismissError={() => setError(null)}
            />
          ) : (
            <section className="flex items-center justify-center text-[12.5px] text-ink/55">
              Select a conversation to begin.
            </section>
          )}
          {detailsOpen && active && (
            <Details
              thread={active}
              userId={user?._id}
              other={other}
              isCircle={isCircle}
              messages={messages}
              theme={themeId}
              onTheme={setTheme}
              readReceipts={readReceiptsOn}
              onReadReceipts={(v) => setPref("readReceipts", v)}
              muted={muted}
              onMuted={(v) => setPref("muted", v)}
              isBlocked={isBlocked}
              onBlock={blockOther}
              onUnblock={unblockOther}
              onReport={() => setReportOpen(true)}
            />
          )}
        </div>
      </main>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={onFileChosen}
      />

      {reportOpen && other && (
        <ReportModal
          name={other.name}
          reason={reportReason}
          details={reportDetails}
          onReason={setReportReason}
          onDetails={setReportDetails}
          onSubmit={submitReport}
          onClose={() => setReportOpen(false)}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sidebar                                                                    */
/* -------------------------------------------------------------------------- */

function Sidebar({
  items,
  activeId,
  userId,
  onSelect,
  query,
  onQuery,
  filter,
  onFilter,
  unreadCount,
}: {
  items: ChatThread[];
  activeId: string | null;
  userId?: string;
  onSelect: (id: string) => void;
  query: string;
  onQuery: (v: string) => void;
  filter: FilterKey;
  onFilter: (f: FilterKey) => void;
  unreadCount: number;
}) {
  return (
    <aside className="flex flex-col h-full bg-paper border-r border-paper-line min-h-0">
      <div className="px-5 pt-5 pb-3 shrink-0">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="font-display text-[26px] font-semibold tracking-[-0.02em] leading-none">
              Messages
            </h1>
            <p className="text-[11.5px] text-ink/50 mt-1.5">
              <span className="font-semibold text-ink/75">{unreadCount}</span>{" "}
              unread · replies optional
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 pb-2 shrink-0">
        <label className="flex items-center gap-2 h-10 px-3.5 rounded-pill bg-paper-cool focus-within:bg-paper focus-within:ring-1 focus-within:ring-ink/20 transition">
          <Icon.Search size={14} className="text-ink/50" />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search conversations"
            className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-ink/40 min-w-0"
          />
          {query && (
            <button onClick={() => onQuery("")} className="text-ink/40 hover:text-ink">
              <Icon.Close size={12} />
            </button>
          )}
        </label>
      </div>

      <div className="px-4 pb-2 shrink-0 flex items-center gap-1.5 overflow-x-auto scroll-clean">
        {FILTER_TABS.map((f) => (
          <button
            key={f.id}
            onClick={() => onFilter(f.id)}
            className={clsx(
              "btn-press shrink-0 h-7 px-3 rounded-pill text-[11.5px] font-semibold tracking-tight transition",
              filter === f.id
                ? "bg-ink text-paper"
                : "bg-paper-cool text-ink/65 hover:bg-paper-cool/70"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scroll-clean min-h-0">
        <ul>
          {items.map((t) => (
            <ChatRow
              key={t._id}
              t={t}
              userId={userId}
              active={t._id === activeId}
              onSelect={() => onSelect(t._id)}
            />
          ))}
        </ul>
        {items.length === 0 && (
          <div className="px-5 py-10 text-center text-[12.5px] text-ink/45">
            No conversations match.
          </div>
        )}
      </div>
    </aside>
  );
}

function ChatRow({
  t,
  userId,
  active,
  onSelect,
}: {
  t: ChatThread;
  userId?: string;
  active: boolean;
  onSelect: () => void;
}) {
  const isCircle = isGroupThread(t, userId);
  const other = otherParticipant(t, userId);
  const name = displayName(t, userId);
  const hue = hueFromString(other?._id || t._id || name);
  const unread = isThreadUnread(t, userId);
  const last = t.lastMessageSnippet || (isCircle ? "New circle message" : "Say hi");
  const at = relativeTime(t.lastMessageAt) || "";
  const online =
    !isCircle && !!t.lastMessageAt
      ? (Date.now() - new Date(t.lastMessageAt).getTime()) / 60000 < 8
      : false;
  const avatarSrc = avatarFromAuthor((other || {}) as any);

  return (
    <li>
      <button
        onClick={onSelect}
        className={clsx(
          "w-full flex items-center gap-3 px-4 py-3 text-left transition relative",
          active ? "bg-paper-cool msg-chat-active" : "hover:bg-paper-warm"
        )}
      >
        <div className="relative shrink-0">
          <Avatar
            size={42}
            hue={hue}
            kind={isCircle ? "circle" : "personal"}
            src={avatarSrc}
            label={(name || "?").slice(0, 1).toUpperCase()}
          />
          {online && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-lime rounded-full border-2 border-paper" />
          )}
          {isCircle && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-ink text-paper text-[8px] font-bold inline-flex items-center justify-center border-2 border-paper">
              c
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[13.5px] font-semibold tracking-tight truncate">{name}</div>
            <div
              className={clsx(
                "text-[10.5px] shrink-0",
                unread ? "text-ink font-bold" : "text-ink/40"
              )}
            >
              {at}
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 mt-0.5">
            <div
              className={clsx(
                "text-[12px] truncate",
                unread ? "text-ink/80 font-medium" : "text-ink/55"
              )}
            >
              {last}
            </div>
            {unread && (
              <span className="shrink-0 w-[18px] h-[18px] text-[10px] rounded-full bg-ink text-paper inline-flex items-center justify-center font-bold">
                ●
              </span>
            )}
          </div>
        </div>
      </button>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* Conversation                                                               */
/* -------------------------------------------------------------------------- */

type ConversationProps = {
  thread: ChatThread;
  userId?: string;
  other: ChatParticipant | null | undefined;
  isCircle: boolean;
  messages: ChatMessage[];
  themeDef: ThemeDef;
  draft: string;
  onDraft: (v: string) => void;
  onSend: () => void;
  onAttach: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChosen: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploading: boolean;
  sending: boolean;
  canSend: boolean;
  isBlocked: boolean;
  status?: ChatThread["status"];
  requestedBySelf: boolean;
  onAccept: () => void;
  onReject: () => void;
  stickerOpen: boolean;
  animOpen: boolean;
  onToggleSticker: () => void;
  onToggleAnim: () => void;
  onSticker: (id: StickerId) => void;
  onAnim: (id: AnimationId) => void;
  onOpenDetails: () => void;
  detailsOpen: boolean;
  pieces: any[];
  eggMessage: string | null;
  error: string | null;
  onDismissError: () => void;
};

const Conversation = forwardRef<HTMLElement, ConversationProps>(function Conversation(
  {
      thread,
      userId,
      other,
      isCircle,
      messages,
      themeDef,
      draft,
      onDraft,
      onSend,
      onAttach,
      uploading,
      sending,
      canSend,
      isBlocked,
      status,
      requestedBySelf,
      onAccept,
      onReject,
      stickerOpen,
      animOpen,
      onToggleSticker,
      onToggleAnim,
      onSticker,
      onAnim,
      onOpenDetails,
      detailsOpen,
      pieces,
      eggMessage,
      error,
      onDismissError,
    },
    ref
  ) {
    const threadRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      if (threadRef.current) {
        threadRef.current.scrollTop = threadRef.current.scrollHeight;
      }
    }, [messages]);

    const name = displayName(thread, userId);
    const hue = hueFromString(other?._id || thread._id || name);
    const avatarSrc = avatarFromAuthor((other || {}) as any);
    const online =
      !isCircle && !!thread.lastMessageAt
        ? (Date.now() - new Date(thread.lastMessageAt).getTime()) / 60000 < 8
        : false;

    const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSend();
      }
    };

    const isPending = status === "pending" && !requestedBySelf;

    return (
      <section
        ref={ref}
        className={clsx(
          "relative flex flex-col h-full min-h-0 msg-paper-grain",
          themeDef.surface
        )}
      >
        <div className="px-5 h-[64px] shrink-0 flex items-center gap-3 bg-paper/85 backdrop-blur-xl border-b border-paper-line">
          <div className="relative">
            <Avatar
              size={40}
              hue={hue}
              kind={isCircle ? "circle" : "personal"}
              src={avatarSrc}
              label={(name || "?").slice(0, 1).toUpperCase()}
            />
            {online && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-lime rounded-full border-2 border-paper" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-[14.5px] font-semibold leading-tight truncate">{name}</div>
              {isCircle && (
                <span className="text-[9.5px] font-bold tracking-[0.14em] uppercase text-ink/55 bg-paper-cool px-1.5 py-0.5 rounded-full">
                  Group
                </span>
              )}
            </div>
            <div className="text-[11.5px] text-ink/55 leading-tight mt-0.5 truncate">
              {isCircle
                ? `${thread.participants.length} members · replies optional`
                : online
                ? "online now"
                : thread.lastMessageAt
                ? `last seen ${relativeTime(thread.lastMessageAt)} ago`
                : "offline"}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={onOpenDetails}
              className={clsx(
                "btn-press h-9 px-3 inline-flex items-center gap-1.5 rounded-pill border transition text-[11.5px] font-semibold tracking-tight",
                detailsOpen
                  ? "bg-ink text-paper border-ink"
                  : "bg-paper border-paper-line hover:border-ink/30"
              )}
            >
              Details
            </button>
          </div>
        </div>

        {error && (
          <div className="px-5 py-2 bg-paper border-b border-paper-line flex items-center justify-between gap-2 text-[11.5px] text-ink/70">
            <span>{error}</span>
            <button onClick={onDismissError} className="text-ink/40 hover:text-ink">
              <Icon.Close size={12} />
            </button>
          </div>
        )}

        {isPending && (
          <div className="px-5 py-3 bg-paper-warm border-b border-paper-line flex items-center justify-between gap-3">
            <div className="text-[12px] text-ink/65">
              {name} wants to start a chat. Accept to reply.
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onReject}
                className="btn-press h-8 px-3 rounded-pill bg-paper border border-paper-line text-[11.5px] font-semibold"
              >
                Decline
              </button>
              <button
                onClick={onAccept}
                className="btn-press h-8 px-3 rounded-pill bg-ink text-paper text-[11.5px] font-semibold"
              >
                Accept
              </button>
            </div>
          </div>
        )}

        <div ref={threadRef} className="relative flex-1 overflow-y-auto scroll-clean px-5 py-5">
          <DateChip label="Today" />
          <ul className="space-y-1.5 max-w-[680px] mx-auto">
            {messages.map((m, i) => (
              <Bubble
                key={m._id || i}
                msg={m}
                prev={messages[i - 1]}
                next={messages[i + 1]}
                userId={userId}
                themeDef={themeDef}
                isCircle={isCircle}
              />
            ))}
            {messages.length === 0 && (
              <li className="text-center text-[12px] text-ink/45 py-10">
                No messages yet — say hi.
              </li>
            )}
          </ul>
        </div>

        <Composer
          draft={draft}
          onDraft={onDraft}
          onSend={onSend}
          onKey={onKey}
          stickerOpen={stickerOpen}
          animOpen={animOpen}
          onToggleSticker={onToggleSticker}
          onToggleAnim={onToggleAnim}
          onSticker={onSticker}
          onAnim={onAnim}
          onAttach={onAttach}
          uploading={uploading}
          sending={sending}
          disabled={!canSend}
          disabledReason={
            isBlocked
              ? "You blocked this person — unblock from Safety to message."
              : isPending
              ? "Accept the request to reply."
              : undefined
          }
        />

        <ReactionLayer pieces={pieces} />
        <EggBanner show={!!eggMessage} message={eggMessage} />
      </section>
    );
  }
);

function DateChip({ label }: { label: string }) {
  return (
    <div className="flex justify-center my-2">
      <span className="text-[10px] tracking-[0.18em] uppercase font-bold text-ink/45 bg-paper/70 backdrop-blur-sm px-2.5 py-1 rounded-pill border border-paper-line">
        {label}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Bubble                                                                     */
/* -------------------------------------------------------------------------- */

function Bubble({
  msg,
  prev,
  next,
  userId,
  themeDef,
  isCircle,
}: {
  msg: ChatMessage;
  prev?: ChatMessage;
  next?: ChatMessage;
  userId?: string;
  themeDef: ThemeDef;
  isCircle: boolean;
}) {
  const senderId =
    typeof msg.senderId === "string" ? msg.senderId : msg.senderId?._id;
  const me = senderId === userId;
  const sender = typeof msg.senderId === "string" ? null : msg.senderId;
  const stickerId = parseStickerBody(msg.body);
  const groupedTop = !!prev && getSenderId(prev) === senderId;
  const groupedBot = !!next && getSenderId(next) === senderId;
  const at = relativeTime(msg.createdAt);
  const attachments = normalizeAttachments(msg);

  if (stickerId && (!attachments || attachments.length === 0)) {
    return (
      <li className={clsx("flex msg-bubble-in", me ? "justify-end" : "justify-start")}>
        <div className="px-2 py-1">
          <StickerGlyph id={stickerId} size={56} />
          <div
            className={clsx(
              "text-[10px] font-medium mt-1 text-ink/45",
              me ? "text-right" : ""
            )}
          >
            {at}
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className={clsx("flex msg-bubble-in", me ? "justify-end" : "justify-start")}>
      <div className={clsx("max-w-[78%] flex flex-col", me ? "items-end" : "items-start")}>
        {!me && isCircle && sender?.name && !groupedTop && (
          <span className="text-[10.5px] font-semibold text-ink/55 mb-0.5 ml-3">
            {sender.name}
          </span>
        )}
        {(msg.body || attachments.length > 0) && (
          <div
            className={clsx(
              "px-3.5 py-2.5 text-[13.5px] leading-snug shadow-soft",
              me ? "text-paper" : "text-ink border border-paper-line"
            )}
            style={{
              background: me ? themeDef.bubbleMe : themeDef.bubbleThem,
              borderRadius: bubbleRadius(me, groupedTop, groupedBot),
            }}
          >
            {msg.body && <span className="whitespace-pre-wrap break-words">{msg.body}</span>}
            {attachments.length > 0 && (
              <div className={clsx("mt-2 flex flex-col gap-1.5", me ? "items-end" : "items-start")}>
                {attachments.map((a, i) => (
                  <AttachmentPreview key={i} a={a} mine={me} />
                ))}
              </div>
            )}
          </div>
        )}
        <div
          className={clsx(
            "flex items-center gap-1.5 mt-1",
            me ? "flex-row-reverse" : ""
          )}
        >
          <span className="text-[10px] text-ink/40 px-1.5">{at}</span>
        </div>
      </div>
    </li>
  );
}

function AttachmentPreview({ a, mine }: { a: ChatAttachment; mine: boolean }) {
  if (a.kind === "image") {
    return (
      <a href={a.url} target="_blank" rel="noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={a.url}
          alt={a.name || "image"}
          className="rounded-[10px] max-h-56 object-cover border border-paper-line"
        />
      </a>
    );
  }
  return (
    <a
      href={a.url}
      target="_blank"
      rel="noreferrer"
      className={clsx(
        "inline-flex items-center gap-2 px-2.5 py-1.5 rounded-[10px] border text-[11.5px] font-semibold no-underline",
        mine
          ? "bg-paper/15 border-paper/30 text-paper"
          : "bg-paper-cool border-paper-line text-ink"
      )}
    >
      <Icon.Note size={12} />
      <span className="truncate max-w-[180px]">{a.name || "Attachment"}</span>
    </a>
  );
}

function bubbleRadius(me: boolean, top: boolean, bot: boolean) {
  const big = "16px";
  const small = "6px";
  if (me) {
    return `${big} ${top ? small : big} ${bot ? small : big} ${big}`;
  }
  return `${top ? small : big} ${big} ${big} ${bot ? small : big}`;
}

/* -------------------------------------------------------------------------- */
/* Composer                                                                   */
/* -------------------------------------------------------------------------- */

function Composer({
  draft,
  onDraft,
  onSend,
  onKey,
  stickerOpen,
  animOpen,
  onToggleSticker,
  onToggleAnim,
  onSticker,
  onAnim,
  onAttach,
  uploading,
  sending,
  disabled,
  disabledReason,
}: {
  draft: string;
  onDraft: (v: string) => void;
  onSend: () => void;
  onKey: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  stickerOpen: boolean;
  animOpen: boolean;
  onToggleSticker: () => void;
  onToggleAnim: () => void;
  onSticker: (id: StickerId) => void;
  onAnim: (id: AnimationId) => void;
  onAttach: () => void;
  uploading: boolean;
  sending: boolean;
  disabled: boolean;
  disabledReason?: string;
}) {
  return (
    <div className="relative shrink-0 px-4 pt-2 pb-4 bg-paper/85 backdrop-blur-xl border-t border-paper-line">
      {stickerOpen && <StickerTray onPick={onSticker} />}
      {animOpen && <AnimationTray onPick={onAnim} />}

      <div className="flex items-end gap-2 px-2.5 py-2 rounded-[22px] bg-paper border border-paper-line focus-within:border-ink/30 focus-within:shadow-soft transition max-w-[760px] mx-auto">
        <button
          onClick={onToggleSticker}
          disabled={disabled}
          className={clsx(
            "btn-press w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition",
            stickerOpen ? "bg-ink text-paper" : "hover:bg-paper-cool text-ink/60",
            disabled && "opacity-40"
          )}
          title="Stickers"
        >
          <StickerGlyph id="lime" size={18} />
        </button>
        <button
          onClick={onToggleAnim}
          disabled={disabled}
          className={clsx(
            "btn-press w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition",
            animOpen ? "bg-ink text-paper" : "hover:bg-paper-cool text-ink/60",
            disabled && "opacity-40"
          )}
          title="Send an effect"
        >
          <Icon.Sparkle size={16} />
        </button>
        <button
          onClick={onAttach}
          disabled={disabled || uploading}
          className={clsx(
            "btn-press w-9 h-9 rounded-full flex items-center justify-center shrink-0 hover:bg-paper-cool text-ink/55",
            (disabled || uploading) && "opacity-40"
          )}
          title="Attach"
        >
          <Icon.Plus size={16} />
        </button>

        <textarea
          value={draft}
          onChange={(e) => onDraft(e.target.value)}
          onKeyDown={onKey}
          rows={1}
          disabled={disabled}
          placeholder={
            disabledReason || (uploading ? "Uploading…" : "Write a message — Enter to send")
          }
          className="flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-ink/40 resize-none py-2 max-h-32 min-h-[24px]"
        />

        <button
          onClick={onSend}
          disabled={!draft.trim() || disabled || sending}
          className={clsx(
            "btn-press w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition",
            draft.trim() && !disabled && !sending
              ? "bg-lime text-ink shadow-soft"
              : "bg-paper-cool text-ink/40"
          )}
          aria-label="Send"
        >
          <Icon.Send size={14} />
        </button>
      </div>

      <div className="flex items-center justify-end max-w-[760px] mx-auto mt-1.5 px-2">
        <span className="text-[10px] text-ink/40">
          Enter sends · Shift+Enter is a new line
        </span>
      </div>
    </div>
  );
}

function StickerTray({ onPick }: { onPick: (id: StickerId) => void }) {
  const groups: Array<{ label: string; items: StickerMeta[] }> = [
    { label: "Reactions", items: STICKERS.filter((s) => s.category === "reactions") },
    { label: "Greetings", items: STICKERS.filter((s) => s.category === "greetings") },
    { label: "Circle",    items: STICKERS.filter((s) => s.category === "circle") },
  ];
  return (
    <div className="absolute left-1/2 bottom-full -translate-x-1/2 mb-3 w-[440px] max-w-[92vw] bg-paper rounded-[20px] border border-paper-line shadow-pop p-4 z-30">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[11px] font-bold tracking-[0.18em] uppercase text-ink/55">
          Stickers
        </h4>
        <span className="text-[10.5px] text-ink/40">tap to send</span>
      </div>
      <div className="space-y-3 max-h-[260px] overflow-auto scroll-clean">
        {groups.map((g) => (
          <div key={g.label}>
            <div className="text-[10px] font-bold tracking-[0.14em] uppercase text-ink/45 mb-1.5">
              {g.label}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {g.items.map((meta) => (
                <button
                  key={meta.id}
                  onClick={() => onPick(meta.id)}
                  className="btn-press inline-flex items-center gap-1.5 h-9 pl-2 pr-3 rounded-pill bg-paper-cool hover:bg-paper border border-transparent hover:border-paper-line transition"
                  title={meta.label}
                >
                  <StickerGlyph id={meta.id} size={20} />
                  <span className="text-[11.5px] font-semibold tracking-tight">
                    {meta.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnimationTray({ onPick }: { onPick: (id: AnimationId) => void }) {
  return (
    <div className="absolute left-1/2 bottom-full -translate-x-1/2 mb-3 w-[440px] max-w-[92vw] bg-paper rounded-[20px] border border-paper-line shadow-pop p-4 z-30">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[11px] font-bold tracking-[0.18em] uppercase text-ink/55">
          Effects
        </h4>
        <span className="text-[10.5px] text-ink/40">plays for both of you</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {ANIMATIONS.map((a) => (
          <button
            key={a.id}
            onClick={() => onPick(a.id)}
            className="btn-press text-left p-3 rounded-[14px] bg-paper-cool hover:bg-paper border border-transparent hover:border-paper-line transition"
          >
            <div className="text-[12.5px] font-semibold tracking-tight">{a.label}</div>
            <div className="text-[10.5px] text-ink/50 mt-0.5">{a.hint}</div>
          </button>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-paper-line text-[10.5px] text-ink/45 leading-relaxed">
        Tip: try writing{" "}
        <span className="font-mono text-ink/70">"i love bizim circle"</span> in the composer 🤫
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Details panel                                                              */
/* -------------------------------------------------------------------------- */

function Details({
  thread,
  userId,
  other,
  isCircle,
  messages,
  theme,
  onTheme,
  readReceipts,
  onReadReceipts,
  muted,
  onMuted,
  isBlocked,
  onBlock,
  onUnblock,
  onReport,
}: {
  thread: ChatThread;
  userId?: string;
  other: ChatParticipant | null | undefined;
  isCircle: boolean;
  messages: ChatMessage[];
  theme: ThemeId;
  onTheme: (id: ThemeId) => void;
  readReceipts: boolean;
  onReadReceipts: (v: boolean) => void;
  muted: boolean;
  onMuted: (v: boolean) => void;
  isBlocked: boolean;
  onBlock: () => void;
  onUnblock: () => void;
  onReport: () => void;
}) {
  const name = displayName(thread, userId);
  const hue = hueFromString(other?._id || thread._id || name);
  const avatarSrc = avatarFromAuthor((other || {}) as any);

  return (
    <aside className="bg-paper border-l border-paper-line flex flex-col h-full overflow-y-auto scroll-clean">
      <div className="p-5 flex flex-col items-center text-center border-b border-paper-line">
        <Avatar
          size={68}
          hue={hue}
          kind={isCircle ? "circle" : "personal"}
          src={avatarSrc}
          label={(name || "?").slice(0, 1).toUpperCase()}
        />
        <div className="mt-3 text-[16px] font-semibold tracking-tight">{name}</div>
        <div className="text-[11.5px] text-ink/55 mt-0.5">
          {isCircle
            ? `${thread.participants.length} members`
            : other?.username
            ? `@${other.username}`
            : ""}
        </div>
      </div>

      <div className="p-5 border-b border-paper-line">
        <h4 className="text-[10px] font-bold tracking-[0.18em] uppercase text-ink/55 mb-3">
          Chat theme
        </h4>
        <div className="grid grid-cols-3 gap-2">
          {Object.values(THEMES).map((t) => (
            <button
              key={t.id}
              onClick={() => onTheme(t.id)}
              className={clsx(
                "btn-press relative rounded-[14px] p-2.5 text-left border transition",
                theme === t.id ? "border-ink" : "border-paper-line hover:border-ink/30"
              )}
              style={{ background: t.swatch }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-ink">{t.label}</span>
                {theme === t.id && <Icon.Check size={12} />}
              </div>
              <div className="mt-2 flex items-end gap-1">
                <span
                  className="block w-7 h-3 rounded-pill"
                  style={{ background: t.bubbleMe }}
                />
                <span
                  className="block w-5 h-3 rounded-pill border border-paper-line"
                  style={{ background: t.bubbleThem }}
                />
              </div>
            </button>
          ))}
        </div>
      </div>

      <SharedSection messages={messages} />

      <div className="p-5 border-b border-paper-line">
        <h4 className="text-[10px] font-bold tracking-[0.18em] uppercase text-ink/55 mb-3">
          Preferences
        </h4>
        <PrefRow
          label="Read receipts"
          hint="Let them see when you've read messages"
          value={readReceipts}
          onChange={onReadReceipts}
        />
        <PrefRow
          label={`Mute ${isCircle ? "circle" : (other?.name?.split(" ")[0] || "chat")}`}
          hint="Silence notifications without leaving the chat"
          value={muted}
          onChange={onMuted}
        />
      </div>

      {/* Safety section — block / report / community guidelines */}
      <div className="p-5 border-b border-paper-line">
        <h4 className="text-[10px] font-bold tracking-[0.18em] uppercase text-ink/55 mb-3">
          Safety
        </h4>
        <div className="rounded-[14px] border border-paper-line bg-paper-warm p-4 text-[11.5px] text-ink/65 leading-relaxed mb-3">
          bizim circle is for warm, real connection. Treat people with respect — no
          harassment, no spam, no requests for sensitive personal information.
        </div>
        <div className="flex flex-col gap-1.5">
          <button
            onClick={onReport}
            disabled={!other}
            className="btn-press h-9 px-3 rounded-pill bg-paper-cool hover:bg-paper border border-paper-line text-[11.5px] font-semibold inline-flex items-center justify-between disabled:opacity-40"
          >
            <span>Report this conversation</span>
            <Icon.Note size={12} className="text-ink/45" />
          </button>
          {other && (
            isBlocked ? (
              <button
                onClick={onUnblock}
                className="btn-press h-9 px-3 rounded-pill bg-paper-cool hover:bg-paper border border-paper-line text-[11.5px] font-semibold inline-flex items-center justify-between"
              >
                <span>Unblock {other.name?.split(" ")[0]}</span>
                <Icon.User size={12} className="text-ink/45" />
              </button>
            ) : (
              <button
                onClick={onBlock}
                className="btn-press h-9 px-3 rounded-pill bg-paper-cool hover:bg-paper border border-paper-line text-[11.5px] font-semibold inline-flex items-center justify-between"
              >
                <span>Block {other.name?.split(" ")[0]}</span>
                <Icon.User size={12} className="text-ink/45" />
              </button>
            )
          )}
          <a
            href="/about"
            className="btn-press h-9 px-3 rounded-pill bg-paper-cool hover:bg-paper border border-paper-line text-[11.5px] font-semibold inline-flex items-center justify-between"
          >
            <span>Community guidelines</span>
            <Icon.Link size={12} className="text-ink/45" />
          </a>
        </div>
      </div>
    </aside>
  );
}

function PrefRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-paper-line last:border-0">
      <div className="min-w-0">
        <div className="text-[12.5px] font-semibold tracking-tight">{label}</div>
        <div className="text-[10.5px] text-ink/50 leading-tight mt-0.5">{hint}</div>
      </div>
      <button
        onClick={() => onChange(!value)}
        role="switch"
        aria-checked={value}
        className={clsx(
          "btn-press relative shrink-0 w-10 h-6 rounded-pill transition-colors",
          value ? "bg-ink" : "bg-paper-cool border border-paper-line"
        )}
      >
        <span
          className={clsx(
            "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-paper transition-transform",
            value ? "translate-x-4" : "translate-x-0"
          )}
          style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.15)" }}
        />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared media / links / docs — derived from message history                 */
/* -------------------------------------------------------------------------- */

const URL_RE = /(https?:\/\/[^\s]+)/g;

function SharedSection({ messages }: { messages: ChatMessage[] }) {
  const [tab, setTab] = useState<"media" | "links" | "docs">("media");
  const data = useMemo(() => {
    const media: Array<{ url: string; name?: string }> = [];
    const docs: Array<{ url: string; name?: string }> = [];
    const links: Array<{ url: string; host: string }> = [];
    for (const m of messages) {
      const attachments = normalizeAttachments(m);
      for (const a of attachments) {
        if (!a.url) continue;
        if (a.kind === "image") media.push({ url: a.url, name: a.name });
        else docs.push({ url: a.url, name: a.name || "Attachment" });
      }
      if (m.body) {
        const matches = m.body.match(URL_RE) || [];
        for (const url of matches) {
          try {
            const parsed = new URL(url);
            links.push({ url, host: parsed.hostname.replace(/^www\./, "") });
          } catch {
            // skip
          }
        }
      }
    }
    return { media, docs, links };
  }, [messages]);

  const tabs = [
    { id: "media" as const, label: "Media", count: data.media.length },
    { id: "links" as const, label: "Links", count: data.links.length },
    { id: "docs"  as const, label: "Docs",  count: data.docs.length  },
  ];

  return (
    <div className="p-5 border-b border-paper-line">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[10px] font-bold tracking-[0.18em] uppercase text-ink/55">
          Shared in this chat
        </h4>
      </div>
      <div className="flex items-center gap-1 p-1 rounded-pill bg-paper-cool mb-3">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={clsx(
              "btn-press flex-1 h-7 rounded-pill text-[11px] font-semibold tracking-tight inline-flex items-center justify-center gap-1 transition",
              tab === tb.id
                ? "bg-paper text-ink shadow-soft"
                : "text-ink/55 hover:text-ink"
            )}
          >
            {tb.label}
            <span
              className={clsx(
                "text-[9.5px] font-bold",
                tab === tb.id ? "text-ink/55" : "text-ink/40"
              )}
            >
              {tb.count}
            </span>
          </button>
        ))}
      </div>
      {tab === "media" &&
        (data.media.length === 0 ? (
          <EmptyShared label="No media yet" />
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {data.media.slice(0, 9).map((m, i) => (
              <a
                key={i}
                href={m.url}
                target="_blank"
                rel="noreferrer"
                className="aspect-square rounded-[10px] border border-paper-line relative overflow-hidden"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.url}
                  alt={m.name || "image"}
                  className="w-full h-full object-cover"
                />
              </a>
            ))}
          </div>
        ))}
      {tab === "links" &&
        (data.links.length === 0 ? (
          <EmptyShared label="No links shared" />
        ) : (
          <ul className="space-y-1.5">
            {data.links.slice(0, 12).map((l, i) => (
              <li key={i}>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-2.5 p-2.5 rounded-[10px] hover:bg-paper-cool border border-paper-line transition"
                >
                  <span className="shrink-0 w-7 h-7 rounded-[8px] bg-paper-cool inline-flex items-center justify-center text-ink/55">
                    <Icon.Link size={13} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-semibold tracking-tight truncate">
                      {l.url}
                    </div>
                    <div className="text-[10.5px] text-ink/50 truncate">{l.host}</div>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        ))}
      {tab === "docs" &&
        (data.docs.length === 0 ? (
          <EmptyShared label="No documents shared" />
        ) : (
          <ul className="space-y-1.5">
            {data.docs.slice(0, 12).map((d, i) => (
              <li key={i}>
                <a
                  href={d.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2.5 p-2.5 rounded-[10px] hover:bg-paper-cool border border-paper-line transition"
                >
                  <span className="shrink-0 w-7 h-7 rounded-[8px] bg-paper-cool inline-flex items-center justify-center text-ink/55">
                    <Icon.Note size={13} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-semibold tracking-tight truncate">
                      {d.name}
                    </div>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}

function EmptyShared({ label }: { label: string }) {
  return (
    <div className="text-[11.5px] text-ink/45 text-center py-5 rounded-[10px] bg-paper-warm border border-dashed border-paper-line">
      {label}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sticker glyphs                                                             */
/* -------------------------------------------------------------------------- */

function StickerGlyph({
  id,
  size = 18,
  color,
}: {
  id: StickerId;
  size?: number;
  color?: string;
}) {
  const c = color || "currentColor";
  switch (id) {
    case "lime":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" fill="#C1FF72" stroke="#0A0A0A" strokeWidth="1.6" />
          <path
            d="M12 6v12M6 12h12M8 8l8 8M16 8l-8 8"
            stroke="#0A0A0A"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "spark":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={c}
          strokeWidth="1.6"
          strokeLinecap="round"
        >
          <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
          <path d="M12 8l1.6 2.4L16 12l-2.4 1.6L12 16l-1.6-2.4L8 12l2.4-1.6z" fill={c} />
        </svg>
      );
    case "heart":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={c}
          strokeWidth="1.6"
          strokeLinejoin="round"
        >
          <path d="M12 20s-7-4.5-9-9A5 5 0 0 1 12 6a5 5 0 0 1 9 5c-2 4.5-9 9-9 9z" fill={c} />
        </svg>
      );
    case "check":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" fill="#C1FF72" stroke="#0A0A0A" strokeWidth="1.6" />
          <path
            d="m7.5 12.5 3 3 6-6"
            stroke="#0A0A0A"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      );
    case "wave":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={c}
          strokeWidth="1.6"
          strokeLinecap="round"
        >
          <path d="M5 14a4 4 0 0 1 4-4M5 18a8 8 0 0 1 8-8M9 20a10 10 0 0 1 10-10" />
        </svg>
      );
    case "tea":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          stroke={c}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 9h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z" />
          <path d="M16 11h2a2 2 0 0 1 0 4h-2" />
          <path d="M8 3c.8 1-.8 2 0 3M11 3c.8 1-.8 2 0 3" />
        </svg>
      );
    case "circle":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" fill="#0A0A0A" />
          <circle cx="12" cy="12" r="5" fill="#C1FF72" />
        </svg>
      );
    case "novruz":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 3c2 4 5 5 5 9a5 5 0 0 1-10 0c0-2 1.5-3 2.5-5C10.5 5 12 4 12 3z"
            fill="#E8C76A"
            stroke="#0A0A0A"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      );
    default:
      return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Reaction layer + egg banner                                                */
/* -------------------------------------------------------------------------- */

function ReactionLayer({ pieces }: { pieces: any[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p) => {
        const style: CSSProperties & Record<string, string | number> = {
          left: p.x,
          top: p.y,
          transform: "translate(-50%, -50%)",
          ["--dx"]: `${p.dx || 0}px`,
          ["--r0"]: `${p.r0 || 0}deg`,
          ["--r1"]: `${p.r1 || 0}deg`,
        };
        return (
          <div key={p.id} className="absolute" style={style}>
            {p.kind === "sticker" && (
              <div className="msg-float-up">
                <StickerGlyph id={p.stickerId} size={p.size || 28} />
              </div>
            )}
            {p.kind === "heart" && (
              <div className="msg-float-up">
                <StickerGlyph id="heart" size={p.size || 18} color="#0A0A0A" />
              </div>
            )}
            {p.kind === "spark" && (
              <div className="msg-float-up">
                <StickerGlyph id="spark" size={p.size || 16} color="#0A0A0A" />
              </div>
            )}
            {p.kind === "confetti" && (
              <div
                className="msg-confetti-piece rounded-[2px]"
                style={{
                  width: p.w || 6,
                  height: p.h || 10,
                  background: p.color || "#C1FF72",
                  ["--cx" as any]: `${p.cx || 0}px`,
                  ["--cy" as any]: `${p.cy || 80}px`,
                  ["--cr" as any]: `${p.cr || 360}deg`,
                } as CSSProperties}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function EggBanner({ show, message }: { show: boolean; message: string | null }) {
  if (!show) return null;
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center"
      aria-hidden
    >
      <div
        className="msg-egg-pop relative px-8 py-6 rounded-[28px] bg-paper border border-paper-line shadow-pop"
        style={{ position: "absolute", top: "50%", left: "50%" }}
      >
        <div className="absolute -top-3 -left-3 w-10 h-10 rounded-full bg-lime border-2 border-paper flex items-center justify-center">
          <StickerGlyph id="spark" size={18} color="#0A0A0A" />
        </div>
        <div className="text-center">
          <div className="text-[11px] font-bold tracking-[0.18em] uppercase text-ink/55">
            bizim circle
          </div>
          <div className="font-display text-[28px] font-semibold tracking-[-0.02em] mt-1.5">
            {message || "biz də səni sevirik"}
          </div>
          <div className="text-[12.5px] text-ink/55 mt-1.5">
            we love you too · the circle is yours
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Report modal                                                               */
/* -------------------------------------------------------------------------- */

function ReportModal({
  name,
  reason,
  details,
  onReason,
  onDetails,
  onSubmit,
  onClose,
}: {
  name: string;
  reason: string;
  details: string;
  onReason: (v: string) => void;
  onDetails: (v: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-paper rounded-[20px] border border-paper-line shadow-pop p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-display text-[18px] font-semibold tracking-tight">
              Report {name}
            </h3>
            <p className="text-[11.5px] text-ink/55 mt-0.5">
              We'll review this conversation. Your report stays anonymous.
            </p>
          </div>
          <button onClick={onClose} className="text-ink/40 hover:text-ink">
            <Icon.Close size={14} />
          </button>
        </div>

        <label className="block text-[10px] font-bold tracking-[0.18em] uppercase text-ink/55 mb-1.5">
          Reason
        </label>
        <select
          value={reason}
          onChange={(e) => onReason(e.target.value)}
          className="w-full h-10 px-3 rounded-[12px] border border-paper-line bg-paper text-[12.5px] mb-3"
        >
          {REPORT_REASONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>

        <label className="block text-[10px] font-bold tracking-[0.18em] uppercase text-ink/55 mb-1.5">
          Details (optional)
        </label>
        <textarea
          value={details}
          onChange={(e) => onDetails(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 rounded-[12px] border border-paper-line bg-paper text-[12.5px] resize-none"
          placeholder="What happened?"
        />

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="btn-press h-9 px-3 rounded-pill bg-paper-cool text-[11.5px] font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            className="btn-press h-9 px-3 rounded-pill bg-ink text-paper text-[11.5px] font-semibold"
          >
            Send report
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function otherParticipant(thread: ChatThread, userId?: string): ChatParticipant | undefined {
  return (
    thread.otherParticipant ||
    thread.participants.find((p) => p._id !== userId)
  );
}

function participantId(value?: string | ChatParticipant | null): string | undefined {
  if (!value) return undefined;
  return typeof value === "string" ? value : value._id;
}

function getSenderId(m: ChatMessage): string | undefined {
  return typeof m.senderId === "string" ? m.senderId : m.senderId?._id;
}

function isGroupThread(thread: ChatThread, userId?: string): boolean {
  if (thread.isGroup) return true;
  const others = thread.participants.filter((p) => p._id !== userId);
  return others.length > 1;
}

function displayName(thread: ChatThread, userId?: string): string {
  if (thread.name || thread.title) return thread.name || thread.title || "Group chat";
  const others = thread.participants.filter((p) => p._id !== userId);
  if (others.length > 1) return others.map((p) => p.name).join(", ");
  return others[0]?.name || thread.otherParticipant?.name || "Unknown";
}

function isThreadUnread(thread: ChatThread, userId?: string): boolean {
  if (!thread.lastMessageAt) return false;
  const lastSenderId =
    typeof thread.lastMessageSenderId === "string"
      ? thread.lastMessageSenderId
      : thread.lastMessageSenderId?._id;
  if (!lastSenderId || lastSenderId === userId) return false;
  if (!thread.myLastReadAt) return true;
  return new Date(thread.lastMessageAt).getTime() > new Date(thread.myLastReadAt).getTime();
}

function normalizeAttachments(message: ChatMessage): ChatAttachment[] {
  const attachments = [...(message.attachments || [])];
  if (message.attachmentUrl) {
    attachments.push({
      url: message.attachmentUrl,
      contentType: message.attachmentContentType,
      kind: message.attachmentKind,
      name: message.attachmentName,
    });
  }
  return attachments.filter((a) => !!a.url);
}

function parseStickerBody(body?: string): StickerId | null {
  if (!body || !body.startsWith(STICKER_BODY_PREFIX)) return null;
  const id = body.slice(STICKER_BODY_PREFIX.length).trim() as StickerId;
  if (STICKERS.find((s) => s.id === id)) return id;
  return null;
}
