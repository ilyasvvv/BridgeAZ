"use client";

import { useRef, useState } from "react";
import clsx from "clsx";
import { Icon } from "./Icon";
import { Avatar } from "./Avatar";
import { useAuth } from "@/lib/auth";
import { useIdentity } from "@/lib/identity";
import { postsApi } from "@/lib/posts";
import { uploadFile } from "@/lib/uploads";
import { apiPostToUiPost } from "@/lib/mappers";
import { hueFromString } from "@/lib/format";
import { emitPlayfulBurst } from "@/lib/playful";
import type { Post } from "./PostCard";
import type { ApiUser } from "@/lib/types";

type Template =
  | "note"
  | "announcement"
  | "event"
  | "opportunity"
  | "searching"
  | "poll";

const TEMPLATES: {
  key: Template;
  label: string;
  icon: keyof typeof Icon;
  hint: string;
  cta: string;
  prefix?: string;
}[] = [
  {
    key: "note",
    label: "Note",
    icon: "Note",
    hint: "What's on your mind?",
    cta: "Share note",
  },
  {
    key: "announcement",
    label: "Announcement",
    icon: "Mic",
    hint: "Share news with the circle…",
    cta: "Broadcast",
    prefix: "Announcement: ",
  },
  {
    key: "event",
    label: "Event",
    icon: "Calendar",
    hint: "Host something. Date, venue, RSVP.",
    cta: "Launch event",
    prefix: "Event: ",
  },
  {
    key: "opportunity",
    label: "Opportunity",
    icon: "Briefcase",
    hint: "Jobs, internships, gigs, scholarships.",
    cta: "Post opportunity",
    prefix: "Hiring: ",
  },
  {
    key: "searching",
    label: "Searching for",
    icon: "Search",
    hint: "Roommate? Tutor? Ride? Advice?",
    cta: "Ask the circle",
    prefix: "Looking for: ",
  },
  {
    key: "poll",
    label: "Poll",
    icon: "Poll",
    hint: "Ask the circle a quick question.",
    cta: "Start poll",
  },
];

export function Composer({
  onPosted,
}: {
  onPosted?: (post: Post) => void;
}) {
  const { user } = useAuth();
  const { activeIdentity } = useIdentity();
  const [tpl, setTpl] = useState<Template>("note");
  const [text, setText] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [pollDuration, setPollDuration] = useState("1 day");
  const [meta, setMeta] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const active = TEMPLATES.find((t) => t.key === tpl)!;
  const ActiveIcon = Icon[active.icon];

  const pollValid =
    tpl !== "poll" ||
    pollOptions.filter((o) => o.trim()).length >= 2;
  const canPost = !!text.trim() && pollValid && !submitting;

  const buildContent = () => {
    const lines: string[] = [];
    const prefix = active.prefix || "";
    lines.push(prefix + text.trim());

    if (tpl === "event") {
      const eventDateTime = formatEventDateTime(meta.date, meta.time);
      if (eventDateTime) lines.push(`Date/time: ${eventDateTime}`);
      if (meta.venue) lines.push(`Venue: ${meta.venue}`);
      if (meta.capacity) lines.push(`Capacity: ${meta.capacity}`);
    }
    if (tpl === "opportunity") {
      if (meta.role) lines.push(`Role: ${meta.role}`);
      if (meta.location) lines.push(`Location: ${meta.location}`);
      if (meta.applyLink) lines.push(`Apply: ${meta.applyLink}`);
    }
    if (tpl === "searching") {
      const bits: string[] = [];
      if (meta.what) bits.push(meta.what);
      if (meta.where) bits.push(`in ${meta.where}`);
      if (bits.length) lines.push(bits.join(" "));
    }
    if (tpl === "poll") {
      lines.push(
        "Poll (" + pollDuration + "):\n" +
          pollOptions
            .filter((o) => o.trim())
            .map((o, i) => `${i + 1}. ${o.trim()}`)
            .join("\n")
      );
    }
    return lines.join("\n\n");
  };

  const reset = () => {
    setText("");
    setMeta({});
    setPollOptions(["", ""]);
    setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  async function submit() {
    if (!canPost) return;
    setSubmitting(true);
    setError(null);
    try {
      let attachmentUrl: string | undefined;
      let attachmentContentType: string | undefined;
      if (pendingFile) {
        const uploaded = await uploadFile(pendingFile, "attachment");
        attachmentUrl = uploaded.documentUrl;
        attachmentContentType = uploaded.contentType;
      }
      const created = await postsApi.create({
        content: buildContent(),
        attachmentUrl,
        attachmentContentType,
        circleId: activeIdentity.type === "circle" ? activeIdentity.circle._id : undefined,
        postedAs: activeIdentity.type === "circle" ? "circle" : "user",
      });
      onPosted?.(
        apiPostToUiPost(created, {
          originLocation: userOriginLocation(user),
        })
      );
      emitPlayfulBurst(active.key === "event" ? "event launched" : "posted");
      reset();
    } catch (err: any) {
      setError(err?.message || "Failed to post");
    } finally {
      setSubmitting(false);
    }
  }

  const myHue = activeIdentity.type === "circle"
    ? hueFromString(activeIdentity.circle._id || activeIdentity.circle.handle)
    : hueFromString(user?._id || user?.username || "me");
  const avatarKind = activeIdentity.type === "circle" ? "circle" : "personal";
  const avatarSrc = activeIdentity.type === "circle" ? activeIdentity.circle.avatarUrl : undefined;

  return (
    <div className="rounded-[22px] bg-paper border border-paper-line p-4 shadow-soft circle-ripple">
      <div className="flex items-center gap-1.5 flex-wrap">
        {TEMPLATES.map((t) => {
          const Ico = Icon[t.icon];
          const isActive = t.key === tpl;
          return (
            <button
              key={t.key}
              onClick={() => setTpl(t.key)}
              aria-label={`Post type: ${t.label}`}
              className={clsx(
                "btn-press inline-flex items-center gap-1.5 h-8 px-3 rounded-pill text-[12px] font-semibold tracking-tight transition-all",
                isActive
                  ? "bg-ink text-paper"
                  : "bg-paper-cool text-ink/70 hover:bg-paper-cool/70"
              )}
            >
              <Ico size={13} />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex gap-3 items-start">
        <Avatar size={38} hue={myHue} kind={avatarKind} src={avatarSrc} />
        <div className="flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={active.hint}
            rows={text ? 3 : 1}
            className="w-full resize-none bg-transparent text-[14px] outline-none placeholder:text-ink/40 py-2"
          />

          {/* Smart template fields */}
          {tpl === "event" && (
            <div className="grid grid-cols-2 gap-2 mt-2 sm:grid-cols-4">
              <MiniField icon="Calendar" type="date" placeholder="Date" value={meta.date} onChange={(v) => setMeta((m) => ({ ...m, date: v }))} />
              <MiniField icon="Calendar" type="time" placeholder="Time" value={meta.time} onChange={(v) => setMeta((m) => ({ ...m, time: v }))} />
              <MiniField icon="Pin" placeholder="Venue" value={meta.venue} onChange={(v) => setMeta((m) => ({ ...m, venue: v }))} />
              <MiniField icon="Note" placeholder="Capacity" value={meta.capacity} onChange={(v) => setMeta((m) => ({ ...m, capacity: v }))} />
            </div>
          )}
          {tpl === "opportunity" && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              <MiniField icon="Briefcase" placeholder="Role / Title" value={meta.role} onChange={(v) => setMeta((m) => ({ ...m, role: v }))} />
              <MiniField icon="Pin" placeholder="Location" value={meta.location} onChange={(v) => setMeta((m) => ({ ...m, location: v }))} />
              <MiniField icon="Link" placeholder="Apply link" value={meta.applyLink} onChange={(v) => setMeta((m) => ({ ...m, applyLink: v }))} />
            </div>
          )}
          {tpl === "searching" && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <MiniField icon="Search" placeholder="What are you looking for?" value={meta.what} onChange={(v) => setMeta((m) => ({ ...m, what: v }))} />
              <MiniField icon="Pin" placeholder="Where?" value={meta.where} onChange={(v) => setMeta((m) => ({ ...m, where: v }))} />
            </div>
          )}
          {tpl === "poll" && (
            <div className="mt-2 space-y-2">
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-paper-cool text-[11px] font-semibold inline-flex items-center justify-center">
                    {i + 1}
                  </span>
                  <input
                    value={opt}
                    onChange={(e) => {
                      const next = [...pollOptions];
                      next[i] = e.target.value;
                      setPollOptions(next);
                    }}
                    placeholder={`Option ${i + 1}`}
                    className="flex-1 h-9 px-3 rounded-pill bg-paper-cool text-[12.5px] outline-none placeholder:text-ink/40"
                  />
                  {pollOptions.length > 2 && (
                    <button
                      onClick={() =>
                        setPollOptions(pollOptions.filter((_, idx) => idx !== i))
                      }
                      className="w-7 h-7 rounded-full hover:bg-paper-cool flex items-center justify-center text-ink/50"
                      aria-label="Remove option"
                    >
                      <Icon.Close size={12} />
                    </button>
                  )}
                </div>
              ))}
              <div className="flex items-center justify-between pt-1">
                {pollOptions.length < 5 ? (
                  <button
                    onClick={() => setPollOptions([...pollOptions, ""])}
                    className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-ink/70 hover:text-ink"
                  >
                    <Icon.Plus size={12} />
                    Add option
                  </button>
                ) : (
                  <span className="text-[11px] text-ink/45">Max 5 options</span>
                )}
                <label className="inline-flex items-center gap-2 text-[11px] text-ink/60">
                  Duration
                  <select
                    value={pollDuration}
                    onChange={(e) => setPollDuration(e.target.value)}
                    className="h-7 px-2 rounded-pill bg-paper-cool text-[11.5px] font-semibold outline-none"
                  >
                    <option>6 hours</option>
                    <option>1 day</option>
                    <option>3 days</option>
                    <option>7 days</option>
                  </select>
                </label>
              </div>
            </div>
          )}

          {pendingFile && (
            <div className="mt-2 flex items-center gap-2 text-[11.5px] text-ink/60 bg-paper-cool rounded-[10px] px-3 py-2">
              <Icon.Image size={13} />
              <span className="truncate flex-1">{pendingFile.name}</span>
              <button
                onClick={() => {
                  setPendingFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="text-ink/50 hover:text-ink"
              >
                <Icon.Close size={12} />
              </button>
            </div>
          )}

          {error && (
            <div className="mt-2 text-[11.5px] text-ink/70 bg-paper-warm border border-paper-line rounded-[10px] px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-1 text-ink/60">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setPendingFile(f);
                }}
              />
              <ToolBtn icon="Image" onClick={() => fileInputRef.current?.click()} />
              <ToolBtn icon="Link" />
              <ToolBtn icon="Pin" />
              <ToolBtn icon="Calendar" />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={submit}
                disabled={!canPost}
                className={clsx(
                  "btn-press h-9 px-5 rounded-pill text-[12.5px] font-semibold inline-flex items-center gap-1.5 transition",
                  canPost
                    ? "btn-lime bg-lime text-ink shadow-soft hover:bg-lime-deep"
                    : "bg-paper-cool text-ink/40"
                )}
              >
                {submitting ? "Posting…" : active.cta}
                <ActiveIcon size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolBtn({ icon, onClick }: { icon: keyof typeof Icon; onClick?: () => void }) {
  const Ico = Icon[icon];
  return (
    <button
      onClick={onClick}
      type="button"
      className="btn-press w-8 h-8 rounded-full hover:bg-paper-cool flex items-center justify-center"
    >
      <Ico size={15} />
    </button>
  );
}

function userOriginLocation(user: ApiUser | null): string | undefined {
  const city = user?.locationNow?.city?.trim();
  const region = user?.locationNow?.region?.trim();
  const country = user?.locationNow?.country?.trim();
  if (city && country) return [city, region, country].filter(Boolean).join(", ");
  return city || user?.currentRegion || country || undefined;
}

function MiniField({
  icon,
  placeholder,
  type = "text",
  value,
  onChange,
}: {
  icon: keyof typeof Icon;
  placeholder: string;
  type?: string;
  value?: string;
  onChange?: (v: string) => void;
}) {
  const Ico = Icon[icon];
  return (
    <label className="flex items-center gap-2 h-9 px-3 rounded-pill bg-paper-cool text-[12.5px]">
      <Ico size={13} className="text-ink/50" />
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none placeholder:text-ink/40"
      />
    </label>
  );
}

function formatEventDateTime(date?: string, time?: string): string {
  if (!date && !time) return "";
  if (!date) return time || "";

  const parsed = new Date(`${date}T${time || "00:00"}`);
  if (Number.isNaN(parsed.getTime())) return [date, time].filter(Boolean).join(" ");

  const datePart = parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  if (!time) return datePart;
  const timePart = parsed.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${datePart} at ${timePart}`;
}
