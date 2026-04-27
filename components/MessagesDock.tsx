"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import { useAuth } from "@/lib/auth";
import { useLive, useThreadsFast } from "@/lib/live";
import { chatsApi, type ChatMessage, type ChatParticipant, type ChatThread } from "@/lib/chats";
import { hueFromString, relativeTime } from "@/lib/format";
import { usePolling } from "@/hooks/usePolling";

function otherFor(thread: ChatThread, userId?: string): ChatParticipant | undefined {
  return thread.otherParticipant || thread.participants?.find((p) => p._id !== userId);
}

function participantId(value?: string | ChatParticipant | null): string | undefined {
  if (!value) return undefined;
  return typeof value === "string" ? value : value._id;
}

function unreadCount(thread: ChatThread, userId?: string): number {
  if (!thread.lastMessageAt || !userId) return 0;
  const lastReadAt = thread.myLastReadAt;
  const lastMessageAt = thread.lastMessageAt;
  if (!lastReadAt) return thread.lastMessageSenderId && participantId(thread.lastMessageSenderId) !== userId ? 1 : 0;
  if (new Date(lastMessageAt).getTime() > new Date(lastReadAt).getTime()
    && thread.lastMessageSenderId && participantId(thread.lastMessageSenderId) !== userId) {
    return 1;
  }
  return 0;
}

export function MessagesDock({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();
  const { user, status } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const enabled = status === "authenticated";

  const { threads, refreshThreads } = useLive();
  useThreadsFast(open && enabled);
  const threadsLoading = enabled && threads.length === 0;

  useEffect(() => {
    if (!selectedId && threads[0]?._id) {
      setSelectedId(threads[0]._id);
    }
  }, [threads, selectedId]);

  const messagesPoll = usePolling<ChatMessage[]>(
    async () => (selectedId && open ? chatsApi.messages(selectedId) : []),
    4000,
    [selectedId, open]
  );
  const messages = messagesPoll.data || [];

  useEffect(() => {
    if (selectedId && open) {
      chatsApi.markRead(selectedId).catch(() => undefined);
    }
  }, [selectedId, open, messages.length]);

  const selected = useMemo(
    () => threads.find((t) => t._id === selectedId) || null,
    [threads, selectedId]
  );
  const other = selected ? otherFor(selected, user?._id) : null;
  const totalUnread = threads.reduce((sum, t) => sum + unreadCount(t, user?._id), 0);
  const filtered = threads.filter((t) => {
    const person = otherFor(t, user?._id);
    return (person?.name || "").toLowerCase().includes(query.toLowerCase());
  });

  async function send() {
    const body = draft.trim();
    if (!selectedId || !body || sending) return;
    setSending(true);
    setDraft("");
    try {
      const msg = await chatsApi.send(selectedId, { body });
      messagesPoll.setData((cur) => [...(cur || []), msg]);
      messagesPoll.refetch();
      refreshThreads();
    } catch {
      setDraft(body);
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={onToggle}
        className="w-full group rounded-[22px] bg-paper border border-paper-line hover:border-ink/30 hover:shadow-pop transition-all btn-press flex items-center justify-between p-4"
      >
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-ink text-paper inline-flex items-center justify-center relative">
            <Icon.Chat size={16} />
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-paper text-ink text-[10px] font-bold flex items-center justify-center border-2 border-paper">
                {totalUnread}
              </span>
            )}
          </span>
          <div className="text-left">
            <div className="text-[13px] font-bold tracking-tight">Messages</div>
            {totalUnread > 0 && <div className="text-[11px] text-ink/50">{totalUnread} unread</div>}
          </div>
        </div>
        <Icon.Plus size={16} className="text-ink/50 rotate-45 group-hover:text-ink transition" />
      </button>
    );
  }

  return (
    <div className="w-full rounded-[24px] bg-paper border border-paper-line shadow-pop overflow-hidden flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between p-4 border-b border-paper-line">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-ink text-paper inline-flex items-center justify-center">
            <Icon.Chat size={13} />
          </span>
          <h3 className="text-[13px] font-bold tracking-tight">Messages</h3>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/messages"
            className="h-7 px-2.5 rounded-pill text-[10.5px] font-bold tracking-[0.12em] uppercase bg-paper-cool hover:bg-ink hover:text-paper transition inline-flex items-center gap-1"
            title="Open full chat"
          >
            Open full
          </Link>
          <button
            onClick={onToggle}
            aria-label="Close messages"
            className="w-7 h-7 rounded-full hover:bg-paper-cool flex items-center justify-center text-ink/60"
          >
            <Icon.Close size={13} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="w-[34%] min-w-[210px] border-r border-paper-line flex flex-col min-h-0">
          <div className="p-3 border-b border-paper-line">
            <div className="flex items-center gap-2 h-10 px-3 rounded-pill bg-paper-cool">
              <Icon.Search size={13} className="text-ink/50" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                className="flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-ink/40"
              />
            </div>
          </div>
          <ul className="flex-1 overflow-auto scroll-clean">
            {threadsLoading && (
              <li className="p-3 text-[12px] text-ink/50">Loading chats…</li>
            )}
            {!threadsLoading && threads.length === 0 && (
              <li className="p-3 text-[12px] text-ink/50">No chats yet.</li>
            )}
            {filtered.map((t) => {
              const person = otherFor(t, user?._id);
              const active = selectedId === t._id;
              const unread = unreadCount(t, user?._id);
              return (
                <li key={t._id}>
                  <button
                    onClick={() => setSelectedId(t._id)}
                    className={clsx(
                      "w-full flex items-center gap-2.5 p-3 text-left hover:bg-paper-cool transition",
                      active && "bg-paper-cool"
                    )}
                  >
                    <Avatar size={38} hue={hueFromString(person?._id || t._id)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[13px] font-semibold truncate">{person?.name || "Unknown"}</div>
                        <div className="text-[10px] text-ink/40">{relativeTime(t.lastMessageAt || t.updatedAt || t.createdAt)}</div>
                      </div>
                      <div className="text-[11.5px] text-ink/55 truncate">
                        {t.status === "pending" ? "Message request" : t.lastMessageSnippet || "—"}
                      </div>
                    </div>
                    {unread > 0 && (
                      <span className="w-4 h-4 text-[9px] rounded-full bg-ink text-paper inline-flex items-center justify-center font-bold">
                        {unread}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="p-2 border-t border-paper-line">
            <button
              onClick={() => router.push("/messages")}
              className="btn-press w-full h-9 rounded-pill bg-ink text-paper text-[12px] font-semibold inline-flex items-center justify-center gap-1.5"
            >
              <Icon.Plus size={13} />
              New message
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 bg-paper-warm">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-[12px] text-ink/50">
              Pick a chat to start.
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-paper-line bg-paper flex items-center gap-3">
                <Avatar size={38} hue={hueFromString(other?._id || selected._id)} />
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold leading-tight truncate">{other?.name || "Unknown"}</div>
                  <div className="text-[10.5px] text-ink/50">
                    {selected.status === "pending" ? "Pending request" : "Active chat"}
                  </div>
                </div>
                <Link
                  href={`/messages?thread=${selected._id}`}
                  className="w-8 h-8 rounded-full hover:bg-paper-cool flex items-center justify-center text-ink/60"
                  title="Open full"
                >
                  <Icon.More size={14} />
                </Link>
              </div>

              <div className="flex-1 overflow-auto scroll-clean p-4 space-y-2.5">
                {messagesPoll.loading && messages.length === 0 && (
                  <div className="text-center text-[12px] text-ink/45">Loading…</div>
                )}
                {messages.length === 0 && !messagesPoll.loading && (
                  <div className="text-center text-[12px] text-ink/45">No messages yet.</div>
                )}
                {messages.map((m) => {
                  const mine = participantId(m.senderId) === user?._id;
                  return (
                    <div
                      key={m._id}
                      className={clsx(
                        "max-w-[82%] px-4 py-2.5 rounded-[16px] text-[13.5px] leading-snug whitespace-pre-wrap",
                        mine
                          ? "ml-auto bg-ink text-paper rounded-br-[4px]"
                          : "bg-paper border border-paper-line rounded-bl-[4px]"
                      )}
                    >
                      {m.body || "(attachment)"}
                    </div>
                  );
                })}
              </div>

              <div className="p-3 bg-paper border-t border-paper-line">
                <div className="flex items-center gap-2 h-12 px-2 rounded-pill bg-paper-cool">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    placeholder="Message…"
                    disabled={selected.status === "pending" && participantId(selected.requestedBy) !== user?._id}
                    className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-ink/40 disabled:opacity-50"
                  />
                  <button
                    onClick={send}
                    disabled={!draft.trim() || sending}
                    className="btn-press w-9 h-9 rounded-full bg-ink text-paper flex items-center justify-center disabled:opacity-50"
                  >
                    <Icon.Send size={13} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function FloatingMessagesDock({
  open,
  onToggle,
  onClose,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const { user, status } = useAuth();
  const enabled = status === "authenticated";
  const { threads } = useLive();
  useThreadsFast(enabled);
  const totalUnread = threads.reduce((sum, t) => sum + unreadCount(t, user?._id), 0);

  const previewNames = threads
    .filter((t) => unreadCount(t, user?._id) > 0)
    .map((t) => otherFor(t, user?._id)?.name)
    .filter(Boolean) as string[];
  const previewLabel = previewNames.length
    ? previewNames.length <= 2
      ? previewNames.join(", ")
      : `${previewNames.slice(0, 2).join(", ")}, +${previewNames.length - 2}`
    : "no new replies";

  if (!open) {
    return (
      <div className="fixed bottom-5 right-5 z-50">
        <button
          onClick={onToggle}
          aria-label="Open messages"
          className="group flex items-center gap-3 h-14 pl-3 pr-5 rounded-pill bg-ink text-paper shadow-pop btn-press hover:-translate-y-[1px] transition-transform"
        >
          <span className="relative inline-flex items-center justify-center w-9 h-9 rounded-full bg-paper text-ink">
            <Icon.Chat size={16} />
            {totalUnread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-ink text-paper text-[10px] font-bold flex items-center justify-center border-2 border-paper">
                {totalUnread}
              </span>
            )}
          </span>
          <span className="text-left">
            <span className="block text-[12.5px] font-semibold tracking-tight leading-tight">Messages</span>
            <span className="block text-[10.5px] font-medium text-paper/55 leading-tight mt-0.5">
              {totalUnread > 0 ? `${totalUnread} unread · ${previewLabel}` : "all caught up"}
            </span>
          </span>
          <span className="text-paper/60 group-hover:text-paper transition text-[14px] leading-none">→</span>
        </button>
      </div>
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-ink/10 md:bg-transparent"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed bottom-5 right-5 left-5 md:left-auto z-50 animate-dock-rise"
        style={{
          width: "min(760px, calc(100vw - 2.5rem))",
          height: "min(560px, calc(100vh - 2.5rem))",
        }}
      >
        <MessagesDock open={true} onToggle={onClose} />
      </div>
    </>
  );
}
