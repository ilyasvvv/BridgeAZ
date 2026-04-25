"use client";

import clsx from "clsx";
import Link from "next/link";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import { MiniProfileCard, MiniProfile } from "./MiniProfileCard";

export function CirclesForYou({ items }: { items: MiniProfile[] }) {
  return (
    <section className="rounded-[22px] bg-paper border border-paper-line p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold tracking-[0.18em] text-ink/55">CIRCLES FOR YOU</h3>
        <Link href="/search?scope=circles" className="text-[11px] text-ink/50 hover:text-ink">see all</Link>
      </div>
      <ul className="mt-3 space-y-2.5">
        {items.map((c, i) => (
          <li key={c.handle} className="flex items-center gap-3">
            <MiniProfileCard profile={c}>
              <Avatar size={36} hue={180 + i * 40} kind="circle" />
            </MiniProfileCard>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold leading-tight truncate">{c.name}</div>
              <div className="text-[11px] text-ink/50 truncate">{c.location} · {c.stats[0].value}</div>
            </div>
            <button className="btn-press h-7 px-3 rounded-pill bg-ink text-paper text-[11px] font-semibold hover:bg-ink/90">
              Join
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PeopleForYou({ items }: { items: MiniProfile[] }) {
  return (
    <section className="rounded-[22px] bg-paper border border-paper-line p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold tracking-[0.18em] text-ink/55">PEOPLE FOR YOU</h3>
        <Link href="/search?scope=people" className="text-[11px] text-ink/50 hover:text-ink">see all</Link>
      </div>
      <ul className="mt-3 space-y-2.5">
        {items.map((p, i) => (
          <li key={p.handle} className="flex items-center gap-3">
            <MiniProfileCard profile={p}>
              <Avatar size={36} hue={40 + i * 60} />
            </MiniProfileCard>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold leading-tight truncate">{p.name}</div>
              <div className="text-[11px] text-ink/50 truncate">{p.location}</div>
            </div>
            <button className="btn-press h-7 px-3 rounded-pill border border-paper-line text-[11px] font-semibold hover:border-ink">
              Follow
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Filters({ onChange, active }: { onChange?: (v: string) => void; active?: string }) {
  const items = ["All", "Note", "Announcement", "Event", "Opportunity", "Searching"];
  return (
    <div className="flex items-center gap-1.5 flex-wrap p-1 rounded-pill bg-paper border border-paper-line">
      {items.map((i) => (
        <button
          key={i}
          onClick={() => onChange?.(i)}
          className={clsx(
            "btn-press h-8 px-3 rounded-pill text-[12px] font-semibold transition",
            (active ?? "All") === i ? "bg-ink text-paper" : "text-ink/65 hover:bg-paper-cool"
          )}
        >
          {i}
        </button>
      ))}
    </div>
  );
}
