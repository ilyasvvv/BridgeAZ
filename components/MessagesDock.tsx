"use client";

import { useState } from "react";
import clsx from "clsx";
import Link from "next/link";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";

type Contact = {
  id: string;
  name: string;
  last: string;
  at: string;
  unread?: number;
  hue: number;
  online?: boolean;
};

const CONTACTS: Contact[] = [
  { id: "1", name: "Leyla Mammadova", last: "Berlin pickup game Saturday? ⚽", at: "2m", unread: 2, hue: 210, online: true },
  { id: "2", name: "Rashad Aliyev", last: "thanks for the intro 🙏", at: "14m", hue: 60 },
  { id: "3", name: "Nigar Huseynova", last: "sharing the deck now", at: "1h", hue: 320, online: true },
  { id: "4", name: "Elvin Kazimov", last: "Novruz planning thread on the circle", at: "3h", hue: 150, unread: 1 },
  { id: "5", name: "Aysel Jabbarova", last: "hafta sonu çay içirik?", at: "1d", hue: 20 },
  { id: "6", name: "Farid Mustafayev", last: "kept notes from the meetup", at: "2d", hue: 280 },
];

const MESSAGES = [
  { from: "them", text: "Heyy — are you around this weekend?" },
  { from: "me", text: "Yep! What's the plan?" },
  { from: "them", text: "Berlin circle is organizing a pickup football game at Tempelhof Saturday 2pm. Rashad and Elvin are in too." },
  { from: "me", text: "Count me in. Should I bring anything?" },
  { from: "them", text: "Just cleats. Water + snacks covered." },
];

/**
 * Controlled messages dock. Two states:
 *  - collapsed: compact pill at bottom-right of the right rail
 *  - expanded: occupies the whole right rail, while the TrendingCard slides
 *    up and out of view
 *
 * The expansion is driven from the Home page via the `open` prop so the
 * Trending card can react to it with a transform.
 */
export function MessagesDock({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  const [selected, setSelected] = useState<Contact | null>(CONTACTS[0]);
  const [query, setQuery] = useState("");

  if (!open) {
    return (
      <button
        onClick={onToggle}
        className="w-full group rounded-[22px] bg-paper border border-paper-line hover:border-ink/30 hover:shadow-pop transition-all btn-press flex items-center justify-between p-4"
      >
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-ink text-paper inline-flex items-center justify-center relative">
            <Icon.Chat size={16} />
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-paper text-ink text-[10px] font-bold flex items-center justify-center border-2 border-paper">
              3
            </span>
          </span>
          <div className="text-left">
            <div className="text-[13px] font-bold tracking-tight">Messages</div>
            <div className="text-[11px] text-ink/50">3 unread · click to open</div>
          </div>
        </div>
        <Icon.Plus size={16} className="text-ink/50 rotate-45 group-hover:text-ink transition" />
      </button>
    );
  }

  return (
    <div className="rounded-[22px] bg-paper border border-paper-line shadow-pop overflow-hidden flex flex-col h-[min(720px,calc(100dvh-8rem))] min-h-[560px]">
      <div className="flex items-center justify-between p-3 border-b border-paper-line">
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
            className="w-7 h-7 rounded-full hover:bg-paper-cool flex items-center justify-center text-ink/60"
          >
            <Icon.Close size={13} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Contacts list */}
        <div className="w-[42%] border-r border-paper-line flex flex-col min-h-0">
          <div className="p-2.5 border-b border-paper-line">
            <div className="flex items-center gap-2 h-9 px-3 rounded-pill bg-paper-cool">
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
            {CONTACTS.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())).map((c) => {
              const active = selected?.id === c.id;
              return (
                <li key={c.id}>
                  <button
                    onClick={() => setSelected(c)}
                    className={clsx(
                      "w-full flex items-center gap-2.5 p-2.5 text-left hover:bg-paper-cool transition",
                      active && "bg-paper-cool"
                    )}
                  >
                    <div className="relative">
                      <Avatar size={36} hue={c.hue} />
                      {c.online && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-ink rounded-full border-2 border-paper" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[12.5px] font-semibold truncate">{c.name}</div>
                        <div className="text-[10px] text-ink/40">{c.at}</div>
                      </div>
                      <div className="text-[11.5px] text-ink/55 truncate">{c.last}</div>
                    </div>
                    {c.unread && (
                      <span className="w-4 h-4 text-[9px] rounded-full bg-ink text-paper inline-flex items-center justify-center font-bold">
                        {c.unread}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="p-2 border-t border-paper-line">
            <button className="btn-press w-full h-9 rounded-pill bg-ink text-paper text-[12px] font-semibold inline-flex items-center justify-center gap-1.5">
              <Icon.Plus size={13} />
              New message
            </button>
          </div>
        </div>

        {/* Conversation pane */}
        <div className="flex-1 flex flex-col min-h-0 bg-paper-warm">
          <div className="p-3 border-b border-paper-line bg-paper flex items-center gap-2.5">
            {selected && <Avatar size={32} hue={selected.hue} />}
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-semibold leading-tight truncate">{selected?.name}</div>
              <div className="text-[10.5px] text-ink/50">
                {selected?.online ? "online now" : "offline"} · replies optional
              </div>
            </div>
            <button className="w-8 h-8 rounded-full hover:bg-paper-cool flex items-center justify-center text-ink/60">
              <Icon.More size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-auto scroll-clean p-3 space-y-2">
            {MESSAGES.map((m, i) => (
              <div
                key={i}
                className={clsx(
                  "max-w-[80%] px-3 py-2 rounded-[14px] text-[13px] leading-snug",
                  m.from === "me"
                    ? "ml-auto bg-ink text-paper rounded-br-[4px]"
                    : "bg-paper border border-paper-line rounded-bl-[4px]"
                )}
              >
                {m.text}
              </div>
            ))}
          </div>

          <div className="p-2.5 bg-paper border-t border-paper-line">
            <div className="flex items-center gap-2 h-11 px-2 rounded-pill bg-paper-cool">
              <button className="w-8 h-8 rounded-full hover:bg-paper flex items-center justify-center text-ink/50">
                <Icon.Plus size={14} />
              </button>
              <input
                placeholder="Message…"
                className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-ink/40"
              />
              <button className="btn-press w-9 h-9 rounded-full bg-ink text-paper flex items-center justify-center">
                <Icon.Send size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
