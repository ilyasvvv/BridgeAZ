"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import Link from "next/link";
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

export default function NotificationsPage() {
  const router = useRouter();
  const { status } = useAuth();
  const [filter, setFilter] = useState<"all" | "unread" | "mentions">("all");
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

  const filtered = items.filter((n) =>
    filter === "unread" ? !n.read : filter === "mentions" ? n.type === "mention" : true
  );

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
    <div className="min-h-screen bg-paper-warm">
      <TopBar />

      <main className="max-w-[760px] mx-auto px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-[32px] font-semibold tracking-[-0.02em]">Notifications</h1>
          <button
            onClick={markAllRead}
            className="text-[12px] font-semibold text-ink/60 hover:text-ink inline-flex items-center gap-1.5"
          >
            <Icon.Check size={13} />
            Mark all read
          </button>
        </div>

        <div className="mt-5 inline-flex items-center p-1 rounded-pill bg-paper border border-paper-line">
          {(["all", "unread", "mentions"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                "h-8 px-4 rounded-pill text-[12px] font-semibold tracking-tight uppercase transition",
                filter === f ? "bg-ink text-paper" : "text-ink/55"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        <ul className="mt-5 bg-paper rounded-[22px] border border-paper-line overflow-hidden">
          {loading && (
            <li className="p-12 text-center text-[13px] text-ink/50">Loading notifications...</li>
          )}
          {error && !loading && (
            <li className="p-12 text-center text-[13px] text-red-700">{error}</li>
          )}
          {!loading && !error && filtered.length === 0 && (
            <li className="p-12 text-center text-[13px] text-ink/50">You're all caught up.</li>
          )}
          {!loading && !error && filtered.map((n, i) => {
            const Ico = Icon[kindIcons[n.type] || "Bell"];
            return (
              <li
                key={n._id}
                className={clsx(
                  "flex items-start gap-3 p-4 transition",
                  i !== filtered.length - 1 && "border-b border-paper-line",
                  !n.read ? "bg-paper" : "bg-paper-warm/50 hover:bg-paper"
                )}
              >
                <div className="relative">
                  <Avatar size={44} hue={hueFromString(n.actorId || n._id)} />
                  <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-ink text-paper border-2 border-paper flex items-center justify-center">
                    <Ico size={11} />
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => openNotification(n)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="text-[13.5px] leading-snug">
                    <span className="font-semibold hover:underline">{n.title}</span>
                    {n.body && <span className="text-ink/70"> {n.body}</span>}
                  </div>
                  <div className="text-[11px] text-ink/40 mt-1">{relativeTime(n.createdAt)}</div>
                </button>
                <div className="flex items-center gap-2">
                  {(n.type === "chat_request" || n.type === "chat_message") && (
                    <Link href={notificationLink(n)} className="btn-press h-8 px-3 rounded-pill border border-paper-line text-[11.5px] font-semibold hover:border-ink/40">
                      View
                    </Link>
                  )}
                  {!n.read && <span className="w-2 h-2 rounded-full bg-ink" />}
                </div>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
