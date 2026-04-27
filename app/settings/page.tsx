"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Icon } from "@/components/Icon";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import { useAuth } from "@/lib/auth";
import { emitPlayfulBurst, isPlayfulEnabled, setPlayfulEnabled } from "@/lib/playful";

type Section =
  | "account"
  | "privacy"
  | "notifications"
  | "safety"
  | "experience"
  | "language"
  | "sessions";

const SECTIONS: { key: Section; label: string; icon: keyof typeof Icon }[] = [
  { key: "account", label: "Account", icon: "User" },
  { key: "privacy", label: "Privacy", icon: "Globe" },
  { key: "notifications", label: "Notifications", icon: "Bell" },
  { key: "safety", label: "Safety & panic", icon: "Filter" },
  { key: "experience", label: "Experience", icon: "Sparkle" },
  { key: "language", label: "Language", icon: "Chat" },
  { key: "sessions", label: "Sessions & 2FA", icon: "SignOut" },
];

export default function SettingsPage() {
  const router = useRouter();
  const { user, status, logout } = useAuth();
  const [active, setActive] = useState<Section>("account");
  const [panic, setPanic] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/signin");
  }, [status, router]);

  return (
    <div className="min-h-screen bg-paper-warm">
      <TopBar />
      <main className="max-w-[1100px] mx-auto px-6 py-8">
        <h1 className="font-display text-[30px] font-semibold tracking-[-0.02em]">
          Settings
        </h1>

        <div className="mt-6 grid grid-cols-12 gap-5">
          <aside className="col-span-12 md:col-span-4 lg:col-span-3">
            <nav className="rounded-[22px] bg-paper border border-paper-line p-2">
              {SECTIONS.map((s) => {
                const Ico = Icon[s.icon];
                const on = active === s.key;
                return (
                  <button
                    key={s.key}
                    onClick={() => setActive(s.key)}
                    className={clsx(
                      "w-full h-11 px-3 rounded-pill text-[13px] font-semibold inline-flex items-center gap-2.5 transition",
                      on
                        ? "bg-ink text-paper"
                        : "text-ink/65 hover:bg-paper-cool"
                    )}
                  >
                    <span
                      className={clsx(
                        "w-7 h-7 rounded-full inline-flex items-center justify-center",
                        on ? "bg-paper/20" : "bg-paper-cool"
                      )}
                    >
                      <Ico size={13} />
                    </span>
                    {s.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          <section className="col-span-12 md:col-span-8 lg:col-span-9 rounded-[22px] bg-paper border border-paper-line p-6 md:p-8">
            {active === "account" && (
              <Panel title="Account">
                <Field label="Display name" value={user?.name || "—"} editHref="/profile?edit=profile" />
                <Field label="Handle" value={user?.username ? `@${user.username}` : "—"} editHref="/profile?edit=profile" />
                <Field label="Email" value={user?.email || "—"} />
                <Field label="Region" value={user?.currentRegion || "—"} editHref="/profile?edit=profile" />
                <div className="mt-4 rounded-[18px] border border-paper-line bg-paper-warm p-4 flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-ink text-paper flex items-center justify-center">
                    <Icon.SignOut size={14} />
                  </span>
                  <div className="flex-1">
                    <div className="text-[13.5px] font-semibold">Sign out</div>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      router.replace("/");
                    }}
                    className="btn-press h-9 px-4 rounded-pill border border-paper-line text-[12px] font-semibold hover:border-ink/40"
                  >
                    Sign out
                  </button>
                </div>
                <Danger
                  title="Delete account"
                  body="Account deletion isn't available yet. Email support if you need this."
                />
              </Panel>
            )}

            {active === "privacy" && (
              <Panel title="Privacy">
                <Toggle
                  label="Show my profile to search engines"
                  defaultOn={false}
                />
                <Toggle
                  label="Let people outside my circles DM me"
                  defaultOn={true}
                />
                <Toggle
                  label="Show my location on my profile"
                  defaultOn={true}
                />
                <Toggle
                  label="Let my circles see when I'm online"
                  defaultOn={false}
                />
                <Toggle
                  label="Read receipts on by default"
                  defaultOn={false}
                />
              </Panel>
            )}

            {active === "notifications" && (
              <Panel title="Notifications">
                <Toggle label="New followers" defaultOn={true} />
                <Toggle label="Likes on my posts" defaultOn={false} />
                <Toggle label="Comments and mentions" defaultOn={true} />
                <Toggle label="Direct messages" defaultOn={true} />
                <Toggle label="Circle invites" defaultOn={true} />
                <Toggle label="Events near me" defaultOn={true} />
                <Toggle label="Weekly digest email" defaultOn={true} />

                <div className="mt-4 rounded-[18px] bg-paper-warm border border-paper-line p-4">
                  <div className="text-[12px] font-bold tracking-[0.14em] text-ink/55 uppercase">
                    Focus hours
                  </div>
                  <div className="mt-2 text-[13px] text-ink/70">
                    10:00 pm → 8:00 am (no pushes, digest only)
                  </div>
                </div>
              </Panel>
            )}

            {active === "safety" && (
              <Panel title="Safety & panic">
                <div
                  className={clsx(
                    "rounded-[22px] p-5 border transition",
                    panic
                      ? "bg-ink text-paper border-ink"
                      : "bg-paper-warm border-paper-line"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className="relative w-14 h-14 shrink-0">
                      <div
                        className={clsx(
                          "absolute inset-0 rounded-full",
                          panic
                            ? "border border-paper/40"
                            : "border border-ink/20"
                        )}
                      />
                      <div
                        className={clsx(
                          "absolute inset-2 rounded-full",
                          panic ? "bg-paper text-ink" : "bg-ink text-paper",
                          "flex items-center justify-center animate-pulse"
                        )}
                      >
                        <Icon.Close size={15} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="font-display text-[18px] font-semibold tracking-tight">
                        Panic mode
                      </div>
                      <button
                        onClick={() => setPanic((v) => !v)}
                        className={clsx(
                          "btn-press mt-3 h-9 px-4 rounded-pill text-[12px] font-semibold",
                          panic
                            ? "bg-paper text-ink"
                            : "bg-ink text-paper"
                        )}
                      >
                        {panic ? "Turn off panic mode" : "Turn on panic mode"}
                      </button>
                    </div>
                  </div>
                </div>

                <Toggle
                  label="Filter messages containing harmful language"
                  defaultOn={true}
                />
                <Toggle
                  label="Require verification to DM me"
                  defaultOn={false}
                />

                <div className="mt-4">
                  <Link
                    href="/messages"
                    className="text-[12.5px] font-semibold text-ink inline-flex items-center gap-1.5 hover:underline"
                  >
                    Manage blocked accounts →
                  </Link>
                </div>
              </Panel>
            )}

            {active === "language" && (
              <Panel title="Language">
                <Radio
                  name="lang"
                  label="English"
                  value="en"
                  defaultChecked
                />
                <Radio
                  name="lang"
                  label="Azərbaycanca"
                  value="az"
                />
                <Toggle
                  label="Auto-translate posts not in my language"
                  defaultOn={true}
                />
              </Panel>
            )}

            {active === "experience" && (
              <Panel title="Experience">
                <PlayfulModeCard />
                <Toggle
                  label="Lime accent on primary social actions"
                  defaultOn={true}
                />
                <Toggle
                  label="Animated empty states"
                  defaultOn={true}
                />
                <div className="rounded-[18px] border border-paper-line bg-paper-warm p-4">
                  <div className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink/55">
                    Easter eggs
                  </div>
                </div>
              </Panel>
            )}

            {active === "sessions" && (
              <Panel title="Sessions & 2FA">
                <div className="rounded-[18px] bg-paper-warm border border-paper-line divide-y divide-paper-line">
                  {[
                    { d: "MacBook Pro · Berlin · this device", t: "active now" },
                    { d: "iPhone 15 · Berlin", t: "2h ago" },
                    { d: "Chrome · Istanbul", t: "3d ago" },
                  ].map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-4 text-[13px]"
                    >
                      <span className="w-9 h-9 rounded-full bg-paper border border-paper-line flex items-center justify-center">
                        <Icon.Globe size={14} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{s.d}</div>
                        <div className="text-[11.5px] text-ink/50">{s.t}</div>
                      </div>
                      {i !== 0 && (
                        <button className="btn-press h-8 px-3 rounded-pill border border-paper-line text-[11.5px] font-semibold hover:border-ink/40">
                          Sign out
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-[18px] bg-paper-warm border border-paper-line p-4 flex items-start gap-3">
                  <span className="w-9 h-9 rounded-full bg-ink text-paper flex items-center justify-center shrink-0">
                    <Icon.Check size={14} />
                  </span>
                  <div className="flex-1">
                    <div className="text-[13px] font-semibold">
                      Two-factor authentication
                    </div>
                  </div>
                  <button className="btn-press h-9 px-4 rounded-pill bg-ink text-paper text-[12px] font-semibold">
                    Set up
                  </button>
                </div>
              </Panel>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function PlayfulModeCard() {
  const [on, setOn] = useState(true);

  useEffect(() => {
    setOn(isPlayfulEnabled());
  }, []);

  return (
    <div
      className={clsx(
        "rounded-[22px] border p-5 transition",
        on ? "border-[#8FC23A]/35 bg-[#EAFCC4]" : "border-paper-line bg-paper-warm"
      )}
    >
      <div className="flex items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-ink/10 bg-paper">
          <AnimatedLogo size={44} motion={on ? "full-dance" : "shy"} />
        </span>
        <div className="flex-1">
          <div className="font-display text-[18px] font-semibold tracking-tight">
            Playful mode
          </div>
          <button
            type="button"
            onClick={(event) => {
              const next = !on;
              setOn(next);
              setPlayfulEnabled(next);
              if (next) emitPlayfulBurst("playful on", event.clientX, event.clientY);
            }}
            className={clsx(
              "btn-press mt-3 h-9 rounded-pill px-4 text-[12px] font-semibold",
              on ? "bg-ink text-paper" : "bg-paper border border-paper-line text-ink"
            )}
          >
            {on ? "Playful mode on" : "Turn playful mode on"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="font-display text-[22px] font-semibold tracking-[-0.015em]">
        {title}
      </h2>
      <div className="mt-5 space-y-3">{children}</div>
    </div>
  );
}

function Toggle({
  label,
  defaultOn,
}: {
  label: string;
  defaultOn?: boolean;
}) {
  const [on, setOn] = useState(!!defaultOn);
  return (
    <label className="flex items-start gap-3 p-3 rounded-[14px] hover:bg-paper-warm transition cursor-pointer">
      <button
        type="button"
        onClick={() => setOn((v) => !v)}
        className={clsx(
          "btn-press shrink-0 w-11 h-6 rounded-full p-0.5 transition-colors",
          on ? "bg-ink" : "bg-paper-cool"
        )}
        aria-pressed={on}
      >
        <span
          className={clsx(
            "block w-5 h-5 rounded-full bg-paper shadow-soft transition-transform",
            on ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
      <div className="flex-1">
        <div className="text-[13.5px] font-semibold">{label}</div>
      </div>
    </label>
  );
}

function Field({ label, value, editHref }: { label: string; value: string; editHref?: string }) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-[14px] hover:bg-paper-warm transition">
      <div className="flex-1 min-w-0">
        <div className="text-[10.5px] font-bold tracking-[0.14em] text-ink/50 uppercase">
          {label}
        </div>
        <div className="text-[13.5px] font-semibold mt-0.5 truncate">
          {value}
        </div>
      </div>
      {editHref && (
        <Link
          href={editHref}
          className="btn-press h-8 px-3 rounded-pill border border-paper-line text-[11.5px] font-semibold hover:border-ink/40"
        >
          Edit
        </Link>
      )}
    </div>
  );
}

function Radio({
  name,
  label,
  value,
  defaultChecked,
}: {
  name: string;
  label: string;
  value: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-start gap-3 p-3 rounded-[14px] hover:bg-paper-warm transition cursor-pointer">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="mt-1 accent-ink"
      />
      <div>
        <div className="text-[13.5px] font-semibold">{label}</div>
      </div>
    </label>
  );
}

function Danger({ title }: { title: string; body: string }) {
  return (
    <div className="mt-6 rounded-[18px] border border-ink/20 p-4 flex items-start gap-3 bg-paper">
      <span className="w-9 h-9 rounded-full bg-ink text-paper flex items-center justify-center shrink-0">
        <Icon.Close size={14} />
      </span>
      <div className="flex-1">
        <div className="text-[13.5px] font-semibold">{title}</div>
      </div>
      <button className="btn-press h-9 px-4 rounded-pill border border-ink/30 text-[12px] font-semibold hover:bg-ink hover:text-paper">
        Delete
      </button>
    </div>
  );
}
