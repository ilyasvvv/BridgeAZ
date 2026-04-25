"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/lib/auth";
import { notificationsApi, notificationLink, type ApiNotification } from "@/lib/notifications";
import { hueFromString, relativeTime } from "@/lib/format";

const kindIcons: Record<string, keyof typeof Icon> = {
  post_like: "Heart",
  post_comment: "Chat",
  follow: "User",
  mention: "Note",
  circle_invite: "Globe",
  circle_join: "Globe",
  circle_join_request: "Globe",
  event: "Calendar",
  chat_request: "Send",
  chat_message: "Chat",
};

const kindMeta: Record<string, { label: string; tone: string; accent: string }> = {
  post_like: {
    label: "Love",
    tone: "bg-rose-50 text-rose-700 border-rose-100",
    accent: "from-rose-300 via-orange-200 to-amber-200",
  },
  post_comment: {
    label: "Comment",
    tone: "bg-sky-50 text-sky-700 border-sky-100",
    accent: "from-sky-300 via-cyan-200 to-emerald-200",
  },
  follow: {
    label: "New friend",
    tone: "bg-violet-50 text-violet-700 border-violet-100",
    accent: "from-violet-300 via-fuchsia-200 to-rose-200",
  },
  mention: {
    label: "Mention",
    tone: "bg-amber-50 text-amber-800 border-amber-100",
    accent: "from-amber-300 via-lime-200 to-emerald-200",
  },
  circle_invite: {
    label: "Circle",
    tone: "bg-emerald-50 text-emerald-700 border-emerald-100",
    accent: "from-emerald-300 via-teal-200 to-sky-200",
  },
  circle_join: {
    label: "Circle",
    tone: "bg-emerald-50 text-emerald-700 border-emerald-100",
    accent: "from-emerald-300 via-teal-200 to-sky-200",
  },
  circle_join_request: {
    label: "Request",
    tone: "bg-lime-50 text-lime-800 border-lime-100",
    accent: "from-lime-300 via-amber-200 to-orange-200",
  },
  event: {
    label: "Event",
    tone: "bg-orange-50 text-orange-700 border-orange-100",
    accent: "from-orange-300 via-pink-200 to-violet-200",
  },
  chat_request: {
    label: "Chat",
    tone: "bg-cyan-50 text-cyan-700 border-cyan-100",
    accent: "from-cyan-300 via-blue-200 to-violet-200",
  },
  chat_message: {
    label: "Message",
    tone: "bg-blue-50 text-blue-700 border-blue-100",
    accent: "from-blue-300 via-indigo-200 to-fuchsia-200",
  },
};

type FilterKey = "all" | "unread" | "social" | "circles" | "mentions";

const filterLabels: Record<FilterKey, string> = {
  all: "All",
  unread: "Unread",
  social: "Social",
  circles: "Circles",
  mentions: "Mentions",
};

function isSocial(n: ApiNotification) {
  return ["post_like", "post_comment", "follow", "chat_request", "chat_message"].includes(n.type);
}

function isCircle(n: ApiNotification) {
  return n.type.startsWith("circle_") || n.type === "event";
}

export default function NotificationsPage() {
  const router = useRouter();
  const { status } = useAuth();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [items, setItems] = useState<ApiNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/signin");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const next = await notificationsApi.list();
        if (!cancelled) setItems(next);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load notifications.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const timer = window.setInterval(load, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [status]);

  const unreadCount = items.filter((n) => !n.read).length;
  const mentionCount = items.filter((n) => n.type === "mention").length;
  const socialCount = items.filter(isSocial).length;
  const circleCount = items.filter(isCircle).length;

  const counts: Record<FilterKey, number> = {
    all: items.length,
    unread: unreadCount,
    social: socialCount,
    circles: circleCount,
    mentions: mentionCount,
  };

  const filtered = items.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "mentions") return n.type === "mention";
    if (filter === "social") return isSocial(n);
    if (filter === "circles") return isCircle(n);
    return true;
  });

  const latest = items[0];
  const readPercent = items.length ? Math.round(((items.length - unreadCount) / items.length) * 100) : 100;

  async function markAllRead() {
    const previous = items;
    setItems((xs) => xs.map((n) => ({ ...n, read: true })));
    try {
      await notificationsApi.markAllRead();
    } catch {
      setItems(previous);
    }
  }

  async function openNotification(n: ApiNotification) {
    if (!n.read) {
      setItems((xs) => xs.map((item) => item._id === n._id ? { ...item, read: true } : item));
      notificationsApi.markRead(n._id).catch(() => {
        setItems((xs) => xs.map((item) => item._id === n._id ? { ...item, read: false } : item));
      });
    }
    router.push(notificationLink(n));
  }

  return (
    <div className="min-h-screen bg-[#fbfaf5]">
      <TopBar />

      <main className="max-w-[1120px] mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-20">
        <section className="relative overflow-hidden rounded-[28px] border border-ink/10 bg-paper shadow-soft">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(251,113,133,0.24),transparent_32%),radial-gradient(circle_at_85%_0%,rgba(45,212,191,0.22),transparent_30%),radial-gradient(circle_at_70%_85%,rgba(251,191,36,0.22),transparent_28%)]" />
          <div className="absolute -right-14 -top-20 h-56 w-56 rounded-full border border-ink/10 animate-spin-slower" />
          <div className="absolute right-10 top-8 h-20 w-20 rounded-full border border-ink/10 animate-float" />
          <div className="relative p-5 sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-pill border border-ink/10 bg-paper/75 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-ink/60 backdrop-blur">
                  <Icon.Bell size={13} />
                  Activity hub
                </div>
                <h1 className="mt-4 font-display text-[34px] sm:text-[46px] font-semibold tracking-tight leading-[0.98]">
                  Your circle is buzzing.
                </h1>
                <p className="mt-3 max-w-xl text-[13.5px] sm:text-sm leading-6 text-ink/62">
                  Catch replies, invites, mentions, and messages without losing the thread.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:w-[360px]">
                <div className="rounded-[18px] border border-paper-line bg-paper/80 p-3 backdrop-blur">
                  <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink/40">Unread</div>
                  <div className="mt-1 font-display text-2xl font-semibold">{unreadCount}</div>
                </div>
                <div className="rounded-[18px] border border-paper-line bg-paper/80 p-3 backdrop-blur">
                  <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink/40">Mentions</div>
                  <div className="mt-1 font-display text-2xl font-semibold">{mentionCount}</div>
                </div>
                <div className="rounded-[18px] border border-paper-line bg-paper/80 p-3 backdrop-blur">
                  <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-ink/40">Read</div>
                  <div className="mt-1 font-display text-2xl font-semibold">{readPercent}%</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-5 grid grid-cols-12 gap-5 items-start">
          <aside className="col-span-12 lg:col-span-4 xl:col-span-3 space-y-4 lg:sticky lg:top-[88px]">
            <div className="rounded-[24px] border border-paper-line bg-paper p-3 shadow-soft">
              <div className="flex items-center justify-between px-2 py-1.5">
                <span className="inline-flex items-center gap-2 text-[12px] font-bold text-ink/55">
                  <Icon.Filter size={14} />
                  Sort the buzz
                </span>
                {unreadCount > 0 && (
                  <span className="rounded-pill bg-ink px-2 py-0.5 text-[10px] font-bold text-paper">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="mt-2 grid gap-1">
                {(["all", "unread", "social", "circles", "mentions"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={clsx(
                      "btn-press flex h-11 items-center justify-between rounded-[16px] px-3 text-left text-[13px] font-semibold transition",
                      filter === f
                        ? "bg-ink text-paper shadow-pop"
                        : "text-ink/62 hover:bg-paper-cool hover:text-ink"
                    )}
                  >
                    <span>{filterLabels[f]}</span>
                    <span
                      className={clsx(
                        "min-w-7 rounded-pill px-2 py-0.5 text-center text-[11px] font-bold",
                        filter === f ? "bg-paper text-ink" : "bg-paper-cool text-ink/50"
                      )}
                    >
                      {counts[f]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-ink/10 bg-ink p-4 text-paper overflow-hidden relative">
              <div className="absolute -right-12 -bottom-16 h-40 w-40 rounded-full border border-paper/15" />
              <div className="relative">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-paper text-ink">
                  <Icon.Check size={16} />
                </div>
                <h2 className="mt-3 font-display text-[20px] font-semibold tracking-tight">Inbox sprint</h2>
                <p className="mt-1 text-[12.5px] leading-5 text-paper/62">
                  One tap clears the visual noise, but keeps every notification here for later.
                </p>
                <button
                  onClick={markAllRead}
                  disabled={unreadCount === 0}
                  className={clsx(
                    "btn-press mt-4 inline-flex h-9 items-center gap-2 rounded-pill px-4 text-[12px] font-bold",
                    unreadCount === 0
                      ? "bg-paper/10 text-paper/35 cursor-not-allowed"
                      : "bg-paper text-ink hover:bg-paper/90"
                  )}
                >
                  <Icon.Check size={14} />
                  Mark all read
                </button>
              </div>
            </div>

            {latest && (
              <div className="rounded-[24px] border border-paper-line bg-paper p-4 shadow-soft">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/40">Latest ping</div>
                <div className="mt-2 text-[13px] font-semibold leading-snug">{latest.title}</div>
                <div className="mt-1 text-[11px] text-ink/45">{relativeTime(latest.createdAt)}</div>
              </div>
            )}
          </aside>

          <section className="col-span-12 lg:col-span-8 xl:col-span-9">
            <div className="rounded-[26px] border border-paper-line bg-paper shadow-soft overflow-hidden">
              <div className="flex flex-col gap-2 border-b border-paper-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-display text-[22px] font-semibold tracking-tight">{filterLabels[filter]}</h2>
                  <p className="text-[12px] text-ink/45">
                    {loading ? "Refreshing your activity..." : `${filtered.length} notification${filtered.length === 1 ? "" : "s"} showing`}
                  </p>
                </div>
                <div className="inline-flex items-center gap-1 rounded-pill bg-paper-cool px-2 py-1 text-[11px] font-semibold text-ink/55">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Live refresh every 15s
                </div>
              </div>

              <ul className="divide-y divide-paper-line">
                {loading && (
                  <li className="p-10 sm:p-12">
                    <div className="mx-auto flex max-w-sm flex-col items-center text-center">
                      <span className="relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-ink text-paper">
                        <span className="absolute inset-0 rounded-full border border-ink animate-pulse-ring" />
                        <Icon.Bell size={19} />
                      </span>
                      <p className="mt-4 text-[13px] font-semibold text-ink/55">Loading notifications...</p>
                    </div>
                  </li>
                )}
                {error && !loading && (
                  <li className="p-10 text-center">
                    <div className="mx-auto max-w-sm rounded-[20px] border border-red-100 bg-red-50 px-5 py-4 text-[13px] font-semibold text-red-700">
                      {error}
                    </div>
                  </li>
                )}
                {!loading && !error && filtered.length === 0 && (
                  <li className="p-10 sm:p-14 text-center">
                    <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-lime-200 via-sky-200 to-fuchsia-200 text-ink">
                      <Icon.Check size={24} />
                    </div>
                    <h3 className="mt-4 font-display text-[22px] font-semibold tracking-tight">All caught up</h3>
                    <p className="mx-auto mt-2 max-w-sm text-[13px] leading-5 text-ink/55">
                      Nothing is waiting in this lane. Switch filters or go start something fun.
                    </p>
                  </li>
                )}
                {!loading && !error && filtered.map((n) => {
                  const Ico = Icon[kindIcons[n.type] || "Bell"];
                  const meta = kindMeta[n.type] || {
                    label: "Update",
                    tone: "bg-paper-cool text-ink/65 border-paper-line",
                    accent: "from-zinc-300 via-stone-200 to-neutral-100",
                  };
                  return (
                    <li
                      key={n._id}
                      className={clsx(
                        "group relative transition",
                        !n.read ? "bg-paper" : "bg-[#fcfbf7] hover:bg-paper"
                      )}
                    >
                      {!n.read && (
                        <span className={clsx("absolute left-0 top-0 h-full w-1 bg-gradient-to-b", meta.accent)} />
                      )}
                      <div className="flex gap-3 p-4 sm:gap-4 sm:p-5">
                        <div className="relative pt-0.5">
                          <Avatar
                            size={50}
                            hue={hueFromString(n.actorId || n._id)}
                            label={(n.metadata?.actorName || n.title || "?").slice(0, 1).toUpperCase()}
                          />
                          <span className={clsx("absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-paper bg-gradient-to-br text-ink shadow-soft", meta.accent)}>
                            <Ico size={12} />
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => openNotification(n)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={clsx("rounded-pill border px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.08em]", meta.tone)}>
                              {meta.label}
                            </span>
                            {!n.read && (
                              <span className="rounded-pill bg-ink px-2 py-0.5 text-[10px] font-bold text-paper">New</span>
                            )}
                            <span className="text-[11px] font-semibold text-ink/42">{relativeTime(n.createdAt)}</span>
                          </div>
                          <div className="mt-2 text-[14px] sm:text-[15px] leading-snug">
                            <span className="font-bold tracking-tight group-hover:underline">{n.title}</span>
                            {n.body && <span className="text-ink/68"> {n.body}</span>}
                          </div>
                        </button>

                        <div className="flex shrink-0 flex-col items-end justify-between gap-3">
                          {!n.read ? <span className="h-2.5 w-2.5 rounded-full bg-ink" /> : <span className="h-2.5 w-2.5 rounded-full bg-paper-line" />}
                          <button
                            type="button"
                            onClick={() => openNotification(n)}
                            className="btn-press inline-flex h-8 items-center gap-1.5 rounded-pill border border-paper-line px-3 text-[11.5px] font-bold text-ink/65 hover:border-ink/30 hover:text-ink"
                          >
                            Open
                            <Icon.Send size={12} />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
