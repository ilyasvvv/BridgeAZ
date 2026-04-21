"use client";

import { useState } from "react";
import clsx from "clsx";
import { Icon } from "./Icon";
import { Avatar } from "./Avatar";

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
}[] = [
  { key: "note", label: "Note", icon: "Note", hint: "What's on your mind?" },
  { key: "announcement", label: "Announcement", icon: "Mic", hint: "Share news with the circle…" },
  { key: "event", label: "Event", icon: "Calendar", hint: "Host something. Date, venue, RSVP." },
  { key: "opportunity", label: "Opportunity", icon: "Briefcase", hint: "Jobs, internships, gigs, scholarships." },
  { key: "searching", label: "Searching for", icon: "Search", hint: "Roommate? Tutor? Ride? Advice?" },
  { key: "poll", label: "Poll", icon: "Poll", hint: "Ask the circle a quick question." },
];

export function Composer() {
  const [tpl, setTpl] = useState<Template>("note");
  const [text, setText] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [pollDuration, setPollDuration] = useState("1 day");
  const active = TEMPLATES.find((t) => t.key === tpl)!;
  const ActiveIcon = Icon[active.icon];

  const pollValid =
    tpl !== "poll" ||
    pollOptions.filter((o) => o.trim()).length >= 2;
  const canPost = !!text && pollValid;

  return (
    <div className="rounded-[22px] bg-paper border border-paper-line p-4 shadow-soft">
      {/* Template pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {TEMPLATES.map((t) => {
          const Ico = Icon[t.icon];
          const isActive = t.key === tpl;
          return (
            <button
              key={t.key}
              onClick={() => setTpl(t.key)}
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
        <Avatar size={38} hue={200} />
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
            <div className="grid grid-cols-3 gap-2 mt-2">
              <MiniField icon="Calendar" placeholder="Date" />
              <MiniField icon="Pin" placeholder="Venue" />
              <MiniField icon="Note" placeholder="Capacity" />
            </div>
          )}
          {tpl === "opportunity" && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              <MiniField icon="Briefcase" placeholder="Role / Title" />
              <MiniField icon="Pin" placeholder="Location" />
              <MiniField icon="Link" placeholder="Apply link" />
            </div>
          )}
          {tpl === "searching" && (
            <div className="grid grid-cols-2 gap-2 mt-2">
              <MiniField icon="Search" placeholder="What are you looking for?" />
              <MiniField icon="Pin" placeholder="Where?" />
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

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-1 text-ink/60">
              <ToolBtn icon="Image" />
              <ToolBtn icon="Link" />
              <ToolBtn icon="Pin" />
              <ToolBtn icon="Calendar" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-ink/45 hidden sm:inline">Posting as <b className="text-ink/70">You</b> to <b className="text-ink/70">Berlin</b></span>
              <button
                disabled={!canPost}
                className={clsx(
                  "btn-press h-9 px-5 rounded-pill text-[12.5px] font-semibold inline-flex items-center gap-1.5 transition",
                  canPost ? "bg-ink text-paper shadow-soft" : "bg-paper-cool text-ink/40"
                )}
              >
                Post
                <ActiveIcon size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolBtn({ icon }: { icon: keyof typeof Icon }) {
  const Ico = Icon[icon];
  return (
    <button className="btn-press w-8 h-8 rounded-full hover:bg-paper-cool flex items-center justify-center">
      <Ico size={15} />
    </button>
  );
}

function MiniField({ icon, placeholder }: { icon: keyof typeof Icon; placeholder: string }) {
  const Ico = Icon[icon];
  return (
    <label className="flex items-center gap-2 h-9 px-3 rounded-pill bg-paper-cool text-[12.5px]">
      <Ico size={13} className="text-ink/50" />
      <input
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none placeholder:text-ink/40"
      />
    </label>
  );
}
