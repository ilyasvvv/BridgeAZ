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

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/signin");
  }, [status, router]);

  useEffect(() => {
    const thread = params.get("thread");
    if (thread) setSelectedId(thread);
  }, [params]);

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
  const canSend = selected?.status === "active" || requestedBySelf || !selected?.status;

  async function selectThread(id: string) {
    setSelectedId(id);
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
              <h1 className="font-display text-[30px] font-semibold tracking-[-0.02em]">Messages</h1>
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
              {threads.map((thread) => {
                const person = otherParticipant(thread, user?._id);
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
                    <div className="text-[14px] font-semibold truncate">{other?.name || "Unknown user"}</div>
                    <div className="text-[11px] text-ink/50">
                      {selected.status === "pending" ? "Pending request" : "Active chat"}
                    </div>
                  </div>
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

                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                  {loadingMessages && messages.length === 0 && (
                    <div className="text-center text-[13px] text-ink/45">Loading messages...</div>
                  )}
                  {messages.length === 0 && !loadingMessages && (
                    <div className="text-center text-[13px] text-ink/45">No messages yet.</div>
                  )}
                  {messages.map((message) => {
                    const mine = participantId(message.senderId) === user?._id;
                    return (
                      <div key={message._id} className={clsx("flex", mine ? "justify-end" : "justify-start")}>
                        <div
                          className={clsx(
                            "max-w-[72%] rounded-[18px] px-4 py-2 text-[13.5px] leading-relaxed",
                            mine ? "bg-ink text-paper" : "bg-paper-cool text-ink"
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
                  <div className="flex items-end gap-2">
                    <textarea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          sendMessage();
                        }
                      }}
                      disabled={!canSend}
                      rows={2}
                      placeholder={canSend ? "Write a message..." : "Waiting for request approval"}
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
