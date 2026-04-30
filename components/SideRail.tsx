"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import { MiniProfileCard, MiniProfile } from "./MiniProfileCard";
import { circlesApi } from "@/lib/circles";
import { profileHref } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { usersApi } from "@/lib/users";

export function CirclesForYou({ items }: { items: MiniProfile[] }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const suggested = useMemo(
    () =>
      items.filter(
        (item) =>
          !hidden.has(item.id || item.handle) &&
          item.membershipStatus !== "active" &&
          item.membershipStatus !== "pending"
      ),
    [hidden, items]
  );
  const visible = suggested.slice(0, 3);
  const extra = suggested.slice(3);
  return (
    <section className="rail-card rail-card-left rounded-[22px] bg-paper border border-paper-line p-4 [--rail-compact:230px] [--rail-expanded:520px]">
      <div className="flex items-center justify-between">
        <h3 className="text-[10.5px] font-bold tracking-[0.18em] text-ink/55">CIRCLES FOR YOU</h3>
        <span className="text-[10px] text-ink/35 font-semibold">{suggested.length}</span>
      </div>
      <ul className="mt-3 space-y-3">
        {visible.map((c, i) => (
          <CircleRow
            key={c.handle}
            circle={c}
            hue={180 + i * 40}
            onJoined={() =>
              setHidden((current) => new Set(current).add(c.id || c.handle))
            }
          />
        ))}
      </ul>
      {extra.length > 0 && (
        <ul className="space-y-3 mt-3 rail-extra">
          {extra.map((c, i) => (
            <CircleRow
              key={c.handle}
              circle={c}
              hue={180 + (i + 3) * 40}
              onJoined={() =>
                setHidden((current) => new Set(current).add(c.id || c.handle))
              }
            />
          ))}
        </ul>
      )}
      <Link
        href="/search?scope=circles"
        className="rail-extra mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-ink/60 hover:text-ink"
      >
        See all circles <span aria-hidden>→</span>
      </Link>
    </section>
  );
}

function CircleRow({
  circle,
  hue,
  onJoined,
}: {
  circle: MiniProfile;
  hue: number;
  onJoined: () => void;
}) {
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  async function join() {
    if (joining || joined) return;
    setJoining(true);
    setJoined(true);
    try {
      await circlesApi.join(circle.id || circle.handle);
      onJoined();
    } catch {
      setJoined(false);
    } finally {
      setJoining(false);
    }
  }

  return (
    <li className="flex items-center gap-3">
      <MiniProfileCard profile={circle}>
        <Link href={profileHref("circle", circle.handle, circle.id)}>
          <Avatar
            size={38}
            hue={circle.hue ?? hue}
            kind="circle"
            src={circle.avatarUrl}
            alt={`${circle.name} avatar`}
          />
        </Link>
      </MiniProfileCard>
      <div className="flex-1 min-w-0">
        <Link
          href={profileHref("circle", circle.handle, circle.id)}
          className="block truncate text-[13px] font-semibold leading-tight hover:underline"
        >
          {circle.name}
        </Link>
        <div className="text-[11px] text-ink/50 truncate">
          {circle.location} · {circle.stats[0]?.value}
        </div>
      </div>
      <button
        type="button"
        onClick={join}
        disabled={joining || joined}
        className="btn-press btn-lime h-7 px-3 rounded-pill bg-lime text-ink text-[11px] font-semibold hover:bg-lime-deep disabled:opacity-60"
      >
        {joining ? "..." : joined ? "Joined" : "Join"}
      </button>
    </li>
  );
}

export function PeopleForYou({ items }: { items: MiniProfile[] }) {
  const { user } = useAuth();
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    const candidates = items.filter((item) => item.id && item.id !== user?._id);
    if (candidates.length === 0) return;
    Promise.all(
      candidates.map((item) =>
        usersApi
          .relationship(item.id!)
          .then((relationship) => ({ key: item.id || item.handle, following: relationship.following }))
          .catch(() => ({ key: item.id || item.handle, following: false }))
      )
    ).then((relationships) => {
      if (cancelled) return;
      setHidden((current) => {
        const next = new Set(current);
        relationships.forEach((relationship) => {
          if (relationship.following) next.add(relationship.key);
        });
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [items, user?._id]);

  const suggested = useMemo(
    () =>
      items.filter(
        (item) =>
          item.id !== user?._id &&
          !item.following &&
          !hidden.has(item.id || item.handle)
      ),
    [hidden, items, user?._id]
  );
  const visible = suggested.slice(0, 3);
  const extra = suggested.slice(3);
  return (
    <section className="people-for-you-card rail-card rail-card-left rounded-[22px] bg-paper border border-paper-line p-3.5 [--rail-compact:228px] [--rail-expanded:430px] [--rail-extra-max:190px]">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[10.5px] font-bold tracking-[0.18em] text-ink/55">PEOPLE FOR YOU</h3>
          <p className="mt-0.5 text-[10px] font-semibold text-ink/38">closest first</p>
        </div>
        <span className="text-[10px] text-ink/35 font-semibold">{suggested.length}</span>
      </div>
      <ul className="mt-3 space-y-2.5">
        {visible.map((p, i) => (
          <PersonRow
            key={p.handle}
            person={p}
            hue={40 + i * 60}
            onFollowed={() =>
              setHidden((current) => new Set(current).add(p.id || p.handle))
            }
          />
        ))}
      </ul>
      {extra.length > 0 && (
        <ul className="space-y-2.5 mt-3 rail-extra">
          {extra.map((p, i) => (
            <PersonRow
              key={p.handle}
              person={p}
              hue={40 + (i + 3) * 60}
              onFollowed={() =>
                setHidden((current) => new Set(current).add(p.id || p.handle))
              }
            />
          ))}
        </ul>
      )}
      <Link
        href="/search?scope=people"
        className="rail-extra mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-ink/60 hover:text-ink"
      >
        See all people <span aria-hidden>→</span>
      </Link>
    </section>
  );
}

function PersonRow({
  person,
  hue,
  onFollowed,
}: {
  person: MiniProfile;
  hue: number;
  onFollowed: () => void;
}) {
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function follow() {
    if (!person.id || busy || following) return;
    setBusy(true);
    setFollowing(true);
    try {
      await usersApi.follow(person.id);
      onFollowed();
    } catch {
      setFollowing(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex items-center gap-2.5">
      <MiniProfileCard profile={person}>
        <Link href={profileHref("user", person.handle, person.id)}>
          <Avatar
            size={36}
            hue={person.hue ?? hue}
            src={person.avatarUrl}
            alt={`${person.name} avatar`}
          />
        </Link>
      </MiniProfileCard>
      <div className="flex-1 min-w-0">
        <Link
          href={profileHref("user", person.handle, person.id)}
          className="block truncate text-[13px] font-semibold leading-tight hover:underline"
        >
          {person.name}
        </Link>
        <div className="text-[11px] text-ink/50 truncate">{person.location}</div>
      </div>
      <button
        type="button"
        onClick={follow}
        disabled={!person.id || busy || following}
        className="btn-press btn-lime h-7 shrink-0 px-2.5 rounded-pill bg-lime text-ink text-[11px] font-semibold hover:bg-lime-deep disabled:opacity-60"
      >
        {busy ? "..." : following ? "Following" : "Follow"}
      </button>
    </li>
  );
}

export function StartYourOwnCircle() {
  const router = useRouter();
  return (
    <section className="rail-card rail-card-left rounded-[22px] bg-ink text-paper p-4 relative overflow-hidden [--rail-compact:88px] [--rail-expanded:220px] [--rail-fade:#0A0A0A]">
      <div className="flex items-center gap-3">
        <span className="w-8 h-8 rounded-full bg-lime text-ink inline-flex items-center justify-center shrink-0">
          <Icon.Sparkle size={13} />
        </span>
        <div className="flex-1 min-w-0">
          <h4 className="font-display text-[14px] font-semibold leading-tight">Start your own circle</h4>
          <p className="text-[11px] text-paper/55 leading-snug truncate">It takes a minute.</p>
        </div>
        <button
          onClick={() => router.push("/circles/new")}
          className="btn-press btn-lime h-8 px-3 rounded-pill bg-lime text-ink text-[11.5px] font-bold inline-flex items-center gap-1"
        >
          New <span aria-hidden>→</span>
        </button>
      </div>
      <ul className="rail-extra mt-3 text-[12px] text-paper/70 space-y-1.5">
        <li>· Invite-only or open to all</li>
        <li>· Pin events, posts, opportunities</li>
        <li>· Free for any community size</li>
      </ul>
    </section>
  );
}

export function TodayNearYou({ region }: { region: string }) {
  return (
    <section className="rail-card rail-card-left rounded-[20px] border border-paper-line bg-paper p-3 [--rail-compact:152px] [--rail-expanded:236px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-paper">
            <Icon.Pin size={12} />
          </span>
          <div>
            <h3 className="text-[12.5px] font-bold tracking-tight">Today near you</h3>
            <p className="text-[11px] text-ink/48">{region}</p>
          </div>
        </div>
        <span className="text-[10px] text-ink/35 font-semibold">3</span>
      </div>
      <div className="mt-2 grid gap-1.5">
        {[
          ["Tea window", "2 after 18:00"],
          ["Quick help", "1 unanswered"],
          ["Weekend pulse", "3 plans"],
        ].map(([title, body], i) => (
          <button
            key={title}
            type="button"
            className={clsx(
              "btn-press flex items-center justify-between rounded-[12px] border border-paper-line bg-paper-warm px-2.5 py-1.5 text-left hover:border-[#8FC23A] hover:bg-[#EAFCC4]",
              i > 0 && "rail-extra"
            )}
          >
            <span>
              <span className="block text-[12px] font-semibold">{title}</span>
              <span className="block text-[10.5px] text-ink/52">{body}</span>
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
