"use client";

import clsx from "clsx";
import Link from "next/link";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import { MiniProfileCard, MiniProfile } from "./MiniProfileCard";

export function CirclesForYou({ items }: { items: MiniProfile[] }) {
  return (
    <section className="rail-card rail-card-left rounded-[22px] bg-paper border border-paper-line p-4 circle-ripple [--rail-compact:112px] [--rail-expanded:340px]">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold tracking-[0.18em] text-ink/55">CIRCLES FOR YOU</h3>
        <Link href="/search?scope=circles" className="text-[11px] text-ink/50 hover:text-ink">see all</Link>
      </div>
      <ul className="mt-3 space-y-2.5">
        {items.map((c, i) => (
          <li key={c.handle} className={clsx("rail-row flex items-center gap-3", i > 0 && "rail-extra")}>
            <MiniProfileCard profile={c}>
              <Avatar size={36} hue={180 + i * 40} kind="circle" />
            </MiniProfileCard>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold leading-tight truncate">{c.name}</div>
              <div className="text-[11px] text-ink/50 truncate">{c.location} · {c.stats[0].value}</div>
            </div>
            <button className="btn-press brand-glow h-7 px-3 rounded-pill bg-[#C1FF72] text-ink text-[11px] font-semibold hover:bg-[#B4F25F]">
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
    <section className="rail-card rail-card-left rounded-[22px] bg-paper border border-paper-line p-4 [--rail-compact:226px] [--rail-expanded:520px]">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold tracking-[0.18em] text-ink/55">PEOPLE FOR YOU</h3>
        <Link href="/search?scope=people" className="text-[11px] text-ink/50 hover:text-ink">see all</Link>
      </div>
      <ul className="mt-3 space-y-2.5">
        {items.map((p, i) => (
          <li key={p.handle} className={clsx("rail-row flex items-center gap-3", i > 2 && "rail-extra")}>
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

export function TodayNearYou({ region }: { region: string }) {
  return (
    <section className="rail-card rail-card-left rounded-[22px] border border-paper-line bg-paper p-4 [--rail-compact:134px] [--rail-expanded:360px]">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-paper">
          <Icon.Pin size={13} />
        </span>
        <div>
          <h3 className="text-[13px] font-bold tracking-tight">Today near you</h3>
          <p className="text-[11px] text-ink/48">{region}</p>
        </div>
      </div>
      <div className="mt-3 grid gap-2">
        {[
          ["Tea window", "2 after 18:00"],
          ["Quick help", "1 unanswered"],
          ["Weekend pulse", "3 plans"],
        ].map(([title, body], i) => (
          <button
            key={title}
            type="button"
            className={clsx(
              "rail-row btn-press flex items-center justify-between rounded-[14px] border border-paper-line bg-paper-warm px-3 py-2 text-left hover:border-[#8FC23A] hover:bg-[#EAFCC4]",
              i > 0 && "rail-extra"
            )}
          >
            <span>
              <span className="block text-[12.5px] font-semibold">{title}</span>
              <span className="block text-[11px] text-ink/52">{body}</span>
            </span>
            <Icon.Plus size={13} className="text-ink/45" />
          </button>
        ))}
      </div>
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
          aria-label={`Feed category: ${i}`}
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
