"use client";

import { useState } from "react";
import clsx from "clsx";
import { TopBar } from "@/components/TopBar";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import Link from "next/link";

type Kind = "like" | "comment" | "follow" | "mention" | "circle" | "event" | "message";

type Notification = {
  id: string;
  kind: Kind;
  actor: string;
  actorHue: number;
  body: string;
  meta?: string;
  time: string;
  unread?: boolean;
};

const NOTIFS: Notification[] = [
  { id: "1", kind: "like", actor: "Leyla Mammadova", actorHue: 210, body: "liked your post", meta: "\"Weekend football pickup at Tempelhofer Feld…\"", time: "2m", unread: true },
  { id: "2", kind: "follow", actor: "Rashad Aliyev", actorHue: 60, body: "started following you", time: "14m", unread: true },
  { id: "3", kind: "comment", actor: "Nigar Huseynova", actorHue: 320, body: "commented on your post", meta: "\"Love this — can I share it with my team?\"", time: "1h", unread: true },
  { id: "4", kind: "circle", actor: "Azerbaijanis in Berlin", actorHue: 180, body: "invited you to join", time: "3h" },
  { id: "5", kind: "event", actor: "London Diaspora", actorHue: 120, body: "is hosting an event near you", meta: "Culture Night · Sat 7pm · London", time: "5h" },
  { id: "6", kind: "mention", actor: "Elvin Kazimov", actorHue: 30, body: "mentioned you in a comment", meta: "\"@leyla you should bring your team along\"", time: "1d" },
  { id: "7", kind: "message", actor: "Aysel Jabbarova", actorHue: 340, body: "sent you a message request", time: "2d" },
];

const kindIcons: Record<Kind, keyof typeof Icon> = {
  like: "Heart",
  comment: "Chat",
  follow: "User",
  mention: "Note",
  circle: "Globe",
  event: "Calendar",
  message: "Send",
};

export default function NotificationsPage() {
  const [filter, setFilter] = useState<"all" | "unread" | "mentions">("all");
  const [items, setItems] = useState(NOTIFS);

  const filtered = items.filter((n) =>
    filter === "unread" ? n.unread : filter === "mentions" ? n.kind === "mention" : true
  );

  function markAllRead() {
    setItems((xs) => xs.map((n) => ({ ...n, unread: false })));
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
          {filtered.length === 0 && (
            <li className="p-12 text-center text-[13px] text-ink/50">You're all caught up.</li>
          )}
          {filtered.map((n, i) => {
            const Ico = Icon[kindIcons[n.kind]];
            return (
              <li
                key={n.id}
                className={clsx(
                  "flex items-start gap-3 p-4 transition",
                  i !== filtered.length - 1 && "border-b border-paper-line",
                  n.unread ? "bg-paper" : "bg-paper-warm/50 hover:bg-paper"
                )}
              >
                <div className="relative">
                  <Avatar size={44} hue={n.actorHue} />
                  <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-ink text-paper border-2 border-paper flex items-center justify-center">
                    <Ico size={11} />
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] leading-snug">
                    <Link href="#" className="font-semibold hover:underline">{n.actor}</Link>
                    <span className="text-ink/70"> {n.body}</span>
                  </div>
                  {n.meta && <div className="text-[12px] text-ink/55 mt-0.5 italic">{n.meta}</div>}
                  <div className="text-[11px] text-ink/40 mt-1">{n.time}</div>
                </div>
                <div className="flex items-center gap-2">
                  {n.kind === "follow" && (
                    <button className="btn-press h-8 px-3 rounded-pill bg-ink text-paper text-[11.5px] font-semibold">Follow back</button>
                  )}
                  {n.kind === "circle" && (
                    <button className="btn-press h-8 px-3 rounded-pill bg-ink text-paper text-[11.5px] font-semibold">Join</button>
                  )}
                  {n.kind === "event" && (
                    <button className="btn-press h-8 px-3 rounded-pill border border-paper-line text-[11.5px] font-semibold hover:border-ink/40">RSVP</button>
                  )}
                  {n.kind === "message" && (
                    <button className="btn-press h-8 px-3 rounded-pill border border-paper-line text-[11.5px] font-semibold hover:border-ink/40">View</button>
                  )}
                  {n.unread && <span className="w-2 h-2 rounded-full bg-ink" />}
                </div>
              </li>
            );
          })}
        </ul>

        <p className="mt-5 text-center text-[11px] text-ink/45">
          You control the noise. <Link href="/settings" className="underline hover:text-ink">Tune notifications →</Link>
        </p>
      </main>
    </div>
  );
}
