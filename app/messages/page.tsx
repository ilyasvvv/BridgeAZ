"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { useRouter, useSearchParams } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/lib/auth";
import { chatsApi, type ChatMessage, type ChatParticipant, type ChatThread } from "@/lib/chats";
import { usersApi, type UserSearchResult } from "@/lib/users";
import { hueFromString, relativeTime } from "@/lib/format";

const promptChips = [
  { label: "Warm intro", text: "Hey, I saw your profile and wanted to say hi." },
  { label: "Coffee chat", text: "Would you be open to a quick coffee chat this week?" },
  { label: "Follow up", text: "Just checking in when you have a moment." },
  { label: "Idea spark", text: "I have a small idea that could make this stronger:" },
  { label: "Celebrate", text: "This is exciting. Congrats on making it happen." },
];

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
  playfulTools: boolean;
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
  playfulTools: true,
  compactBubbles: false,
  defaultVibe: "fresh",
};

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
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(params.get("thread"));
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [matches, setMatches] = useState<UserSearchResult[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [funOpen, setFunOpen] = useState(false);
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
  const otherId = other?._id || "";
  const isBlocked = !!otherId && blockedIds.has(otherId);
  const canSend = baseCanSend && !isBlocked;
  const hasSensitiveDraft = settings.safetyNudges && !!draft.trim() && sensitiveInfoRegex.test(draft);
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
    const body = draft.trim();
    if (!selectedId || !body || sending || !canSend) return;
    if (hasSensitiveDraft && !sensitiveAck) {
      setError("This looks like sensitive personal information. Review it, then choose Send anyway if you still want to send.");
      return;
    }
    setSending(true);
    setDraft("");
    try {
      const message = await chatsApi.send(selectedId, { body });
      setMessages((current) => [...current, message]);
    } catch (err: any) {
      setDraft(body);
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

  function insertPrompt(text: string) {
    setDraft((current) => `${current}${current && !current.endsWith("\n") ? "\n" : ""}${text}`);
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
                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  className="h-8 px-3 rounded-pill border border-paper-line text-[10.5px] font-bold tracking-[0.12em] uppercase hover:border-ink/30"
                >
                  Settings
                </button>
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
                        {person?.name || "Unknown user"}
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
                      {selectedThreadSettings.nickname || other?.name || "Unknown user"}
                    </div>
                    <div className="text-[11px] text-ink/50">
                      {selected.status === "pending" ? "Pending request" : `Active chat · ${selectedVibeLabel} vibe`}
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
                          <div className="whitespace-pre-wrap">{message.body || "(attachment)"}</div>
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
                  {settings.playfulTools && (
                    <div className="mb-3 rounded-[18px] border border-paper-line bg-paper-warm p-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setFunOpen((value) => !value)}
                          className="h-8 px-3 rounded-pill bg-ink text-paper text-[11px] font-semibold"
                        >
                          Fun tools
                        </button>
                        <select
                          value={selectedVibe}
                          onChange={(event) =>
                            selected && updateThreadSetting(selected._id, { vibe: event.target.value as ChatSettings["defaultVibe"] })
                          }
                          className="h-8 rounded-pill border border-paper-line bg-paper px-3 text-[11px] outline-none"
                        >
                          {chatVibes.map((vibe) => (
                            <option key={vibe.key} value={vibe.key}>
                              {vibe.label} vibe
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => insertPrompt(promptChips[Math.floor(Math.random() * promptChips.length)].text)}
                          disabled={!canSend}
                          className="h-8 px-3 rounded-pill border border-paper-line text-[11px] font-semibold disabled:opacity-50"
                        >
                          Surprise me
                        </button>
                      </div>
                      {funOpen && (
                        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                          {promptChips.map((prompt) => (
                            <button
                              key={prompt.label}
                              type="button"
                              onClick={() => insertPrompt(prompt.text)}
                              disabled={!canSend}
                              className="shrink-0 h-8 px-3 rounded-pill border border-paper-line bg-paper text-[11px] font-semibold disabled:opacity-50"
                            >
                              {prompt.label}
                            </button>
                          ))}
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
                      placeholder={isBlocked ? "Unblock this member to message again" : canSend ? `Write a ${selectedVibeLabel.toLowerCase()} message...` : "Waiting for request approval"}
                      className="flex-1 resize-none rounded-[18px] border border-paper-line bg-paper-warm px-4 py-3 text-[13.5px] outline-none focus:border-ink/30 disabled:opacity-60"
                    />
                    <button
                      type="button"
                      onClick={sendMessage}
                      disabled={!draft.trim() || sending || !canSend}
                      className="btn-press h-11 px-4 rounded-pill bg-ink text-paper text-[12px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
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

                {[
                  ["enterToSend", "Enter sends messages", "Shift+Enter keeps multiline writing available."],
                  ["safetyNudges", "Safety nudges", "Warn before sending contact, password, financial, or ID-like details."],
                  ["playfulTools", "Fun tools", "Show prompts, surprise starters, and vibe controls in the composer."],
                  ["compactBubbles", "Compact bubbles", "Use tighter spacing for longer, faster conversations."],
                ].map(([key, title, description]) => (
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
                      checked={!!settings[key as keyof ChatSettings]}
                      onChange={(event) =>
                        updateSetting(key as keyof ChatSettings, event.target.checked as never)
                      }
                      className="mt-1 h-4 w-4 accent-ink"
                    />
                  </label>
                ))}
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
                      {selectedThreadSettings.nickname || other?.name || "Unknown user"}
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
                      placeholder={other?.name || "Member"}
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

function otherParticipant(thread: ChatThread, userId?: string): ChatParticipant | undefined {
  return thread.otherParticipant || thread.participants.find((participant) => participant._id !== userId);
}

function participantId(value?: string | ChatParticipant | null): string | undefined {
  if (!value) return undefined;
  return typeof value === "string" ? value : value._id;
}
