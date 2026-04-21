"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { CONVERSATIONS, REQUESTS, type Conversation } from "@/data/messages";

type Tab = "primary" | "requests" | "archived";

export default function MessagesPage() {
  const [tab, setTab] = useState<Tab>("primary");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>(CONVERSATIONS[0].id);
  const [receiptsOn, setReceiptsOn] = useState(false);
  const [infoOpen, setInfoOpen] = useState(true);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [threadsById, setThreadsById] = useState(() =>
    Object.fromEntries(CONVERSATIONS.map((c) => [c.id, c.messages]))
  );

  const pool: Conversation[] =
    tab === "requests"
      ? REQUESTS
      : tab === "archived"
      ? CONVERSATIONS.filter((c) => c.archived)
      : CONVERSATIONS.filter((c) => !c.archived);

  const list = useMemo(
    () => pool.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())),
    [pool, query]
  );

  const selected =
    CONVERSATIONS.find((c) => c.id === selectedId) ??
    REQUESTS.find((c) => c.id === selectedId) ??
    CONVERSATIONS[0];

  const messages = threadsById[selected.id] ?? selected.messages;

  function send() {
    if (!draft.trim()) return;
    setThreadsById((prev) => ({
      ...prev,
      [selected.id]: [
        ...(prev[selected.id] ?? []),
        { from: "me", text: draft, at: "now" },
      ],
    }));
    setDraft("");
  }

  const unreadCount = CONVERSATIONS.reduce((n, c) => n + (c.unread ?? 0), 0);

  return (
    <div className="min-h-dvh bg-paper-warm">
      <TopBar />

      {/* Decorative rings — subtle, circular theme */}
      <div
        aria-hidden
        className="pointer-events-none fixed -left-[16vw] top-[20vh] w-[40vw] h-[40vw] rounded-full border border-ink/[0.04]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -right-[18vw] bottom-[-18vw] w-[46vw] h-[46vw] rounded-full border border-ink/[0.04]"
      />

      <main className="max-w-[1400px] mx-auto px-6 pt-6 pb-6 md:h-[calc(100dvh-4rem)] md:overflow-hidden md:flex md:flex-col">
        {/* Page header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div>
            <h1 className="font-display text-[30px] font-semibold tracking-[-0.02em]">
              Messages
            </h1>
            <p className="text-[12.5px] text-ink/55 mt-0.5">
              You never have to reply. Silence is fine here.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setReceiptsOn((v) => !v)}
              className={clsx(
                "btn-press h-9 px-3.5 rounded-pill text-[12px] font-semibold inline-flex items-center gap-1.5 border transition",
                receiptsOn
                  ? "bg-ink text-paper border-ink"
                  : "bg-paper text-ink/70 border-paper-line hover:border-ink/30"
              )}
              aria-pressed={receiptsOn}
            >
              <span
                className={clsx(
                  "w-3.5 h-3.5 rounded-full transition",
                  receiptsOn ? "bg-paper" : "bg-ink/15"
                )}
              />
              Read receipts {receiptsOn ? "on" : "off"}
            </button>
            <button className="btn-press h-9 px-4 rounded-pill bg-ink text-paper text-[12px] font-semibold inline-flex items-center gap-1.5">
              <Icon.Plus size={13} />
              New message
            </button>
          </div>
        </div>

        {/* Three-pane shell */}
        <div className="grid grid-cols-12 gap-4 md:flex-1 md:min-h-0">
          {/* Pane 1 — conversations */}
          <section className="col-span-12 md:col-span-4 lg:col-span-3 rounded-[22px] bg-paper border border-paper-line overflow-hidden flex flex-col min-h-[600px] md:h-full md:min-h-0">
            {/* Tabs */}
            <div className="p-2.5 border-b border-paper-line">
              <div className="relative grid grid-cols-3 p-1 rounded-pill bg-paper-cool text-[11.5px] font-semibold">
                <Pill
                  active={tab === "primary"}
                  onClick={() => setTab("primary")}
                  label="Primary"
                  badge={unreadCount || undefined}
                />
                <Pill
                  active={tab === "requests"}
                  onClick={() => setTab("requests")}
                  label="Requests"
                  badge={REQUESTS.length || undefined}
                />
                <Pill
                  active={tab === "archived"}
                  onClick={() => setTab("archived")}
                  label="Archived"
                />
              </div>

              <div className="mt-2.5 flex items-center h-10 px-3 rounded-pill bg-paper-cool">
                <Icon.Search size={14} className="text-ink/50" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search conversations"
                  className="flex-1 ml-2 bg-transparent text-[13px] outline-none placeholder:text-ink/40"
                />
              </div>
            </div>

            {/* Requests explainer */}
            {tab === "requests" && (
              <div className="mx-3 mt-3 p-3 rounded-[14px] bg-paper-warm border border-paper-line text-[11.5px] leading-snug text-ink/65">
                Messages from people outside your circles land here. Accept to
                chat, or simply ignore — no notification is sent.
              </div>
            )}

            <ul className="flex-1 overflow-auto scroll-clean">
              {list.length === 0 && (
                <li className="p-10 text-center text-[12.5px] text-ink/45">
                  Nothing here yet.
                </li>
              )}
              {list.map((c) => {
                const active = c.id === selectedId;
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => setSelectedId(c.id)}
                      className={clsx(
                        "w-full flex items-start gap-3 p-3 text-left transition",
                        active
                          ? "bg-paper-cool"
                          : "hover:bg-paper-cool/70"
                      )}
                    >
                      <div className="relative shrink-0">
                        <Avatar size={42} hue={c.hue} kind={c.kind} />
                        {c.online && (
                          <span className="absolute bottom-0 right-0 w-3 h-3 bg-ink rounded-full ring-2 ring-paper" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[13px] font-semibold truncate">
                              {c.name}
                            </span>
                            {c.kind === "circle" && (
                              <span className="shrink-0 text-[8.5px] font-bold tracking-[0.14em] text-ink/55 uppercase bg-paper px-1.5 py-0.5 rounded-full border border-paper-line">
                                Circle
                              </span>
                            )}
                          </div>
                          <span className="text-[10.5px] text-ink/40 shrink-0">
                            {c.at}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={clsx(
                              "text-[12px] truncate",
                              c.unread ? "text-ink font-semibold" : "text-ink/55"
                            )}
                          >
                            {c.typing ? (
                              <span className="inline-flex items-center gap-1">
                                <TypingDots />
                                <span className="text-ink/55">typing…</span>
                              </span>
                            ) : (
                              c.last
                            )}
                          </span>
                          {c.unread ? (
                            <span className="shrink-0 w-4 h-4 rounded-full bg-ink text-paper text-[9.5px] font-bold inline-flex items-center justify-center">
                              {c.unread}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="p-2.5 border-t border-paper-line">
              <Link
                href="/home"
                className="btn-press w-full h-9 rounded-pill border border-paper-line hover:border-ink/30 text-[12px] font-semibold inline-flex items-center justify-center gap-1.5 text-ink/70"
              >
                <Icon.Note size={13} />
                Back to feed
              </Link>
            </div>
          </section>

          {/* Pane 2 — thread */}
          <section
            className={clsx(
              "col-span-12 md:col-span-8 rounded-[22px] bg-paper border border-paper-line overflow-hidden flex flex-col min-h-[600px] md:h-full md:min-h-0",
              infoOpen ? "lg:col-span-6" : "lg:col-span-9"
            )}
          >
            {/* Header */}
            <div className="flex items-center gap-3 p-3 border-b border-paper-line bg-paper">
              <Avatar size={38} hue={selected.hue} kind={selected.kind} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <div className="text-[13.5px] font-semibold tracking-tight truncate">
                    {selected.name}
                  </div>
                  {selected.kind === "circle" && (
                    <span className="text-[9px] font-bold tracking-[0.14em] text-ink/55 uppercase bg-paper-cool px-1.5 py-0.5 rounded-full">
                      Circle
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-ink/50">
                  {selected.online ? "online now" : "offline"}
                  <span className="mx-1.5">·</span>
                  replies optional
                </div>
              </div>
              <button
                onClick={() => setInfoOpen((v) => !v)}
                className="btn-press w-9 h-9 rounded-full hover:bg-paper-cool flex items-center justify-center text-ink/60"
                title={infoOpen ? "Hide info" : "Show info"}
              >
                <Icon.User size={15} />
              </button>
              <button
                onClick={() => setSafetyOpen(true)}
                className="btn-press w-9 h-9 rounded-full hover:bg-paper-cool flex items-center justify-center text-ink/60"
                title="Safety"
              >
                <Icon.More size={15} />
              </button>
            </div>

            {/* Requests banner */}
            {REQUESTS.some((r) => r.id === selected.id) && (
              <div className="px-4 py-3 bg-paper-warm border-b border-paper-line flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-ink text-paper flex items-center justify-center shrink-0">
                  <Icon.Send size={13} />
                </span>
                <div className="flex-1 text-[12px] leading-snug">
                  <div className="font-semibold text-ink">Message request</div>
                  <div className="text-ink/55">
                    You haven't chatted with {selected.name.split(" ")[0]} before.
                    You don't have to respond.
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button className="btn-press h-8 px-3 rounded-pill border border-paper-line text-[11.5px] font-semibold hover:border-ink/40">
                    Ignore
                  </button>
                  <button className="btn-press h-8 px-3 rounded-pill bg-ink text-paper text-[11.5px] font-semibold">
                    Accept
                  </button>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-auto scroll-clean p-5 space-y-2 bg-paper-warm/40">
              <DayDivider label="Today" />
              {messages.map((m, i) => {
                const prev = messages[i - 1];
                const mine = m.from === "me";
                const group = prev && prev.from === m.from;
                return (
                  <div
                    key={i}
                    className={clsx(
                      "flex items-end gap-2",
                      mine ? "justify-end" : "justify-start"
                    )}
                  >
                    {!mine && !group ? (
                      <Avatar size={26} hue={selected.hue} kind={selected.kind} />
                    ) : !mine ? (
                      <span className="w-[26px]" />
                    ) : null}
                    <div
                      className={clsx(
                        "max-w-[68%] px-3.5 py-2 text-[13.5px] leading-snug shadow-sm",
                        mine
                          ? "bg-ink text-paper rounded-[16px] rounded-br-[4px]"
                          : "bg-paper border border-paper-line rounded-[16px] rounded-bl-[4px]"
                      )}
                    >
                      {m.text}
                      <div
                        className={clsx(
                          "text-[10px] mt-1",
                          mine ? "text-paper/50" : "text-ink/40"
                        )}
                      >
                        {m.at}
                        {mine && receiptsOn && (
                          <span className="ml-1.5 inline-flex items-center gap-0.5">
                            <Icon.Check size={10} />
                            Read
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {selected.typing && (
                <div className="flex items-end gap-2">
                  <Avatar size={26} hue={selected.hue} kind={selected.kind} />
                  <div className="bg-paper border border-paper-line rounded-[16px] rounded-bl-[4px] px-3.5 py-2.5">
                    <TypingDots />
                  </div>
                </div>
              )}
            </div>

            {/* Composer */}
            <div className="p-3 bg-paper border-t border-paper-line">
              <div className="flex items-end gap-2 rounded-[18px] bg-paper-cool px-2 py-1.5">
                <button className="btn-press w-9 h-9 rounded-full hover:bg-paper flex items-center justify-center text-ink/60 shrink-0">
                  <Icon.Plus size={14} />
                </button>
                <button className="btn-press w-9 h-9 rounded-full hover:bg-paper flex items-center justify-center text-ink/60 shrink-0">
                  <Icon.Image size={14} />
                </button>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  rows={1}
                  placeholder="Message — press Enter to send, Shift+Enter for a new line"
                  className="flex-1 bg-transparent outline-none text-[13.5px] py-2 resize-none max-h-32"
                />
                <button
                  onClick={send}
                  disabled={!draft.trim()}
                  className={clsx(
                    "btn-press w-10 h-10 rounded-full inline-flex items-center justify-center transition",
                    draft.trim()
                      ? "bg-ink text-paper shadow-soft"
                      : "bg-paper text-ink/30"
                  )}
                >
                  <Icon.Send size={14} />
                </button>
              </div>
              <p className="mt-1.5 text-center text-[10.5px] text-ink/40">
                Encrypted in transit · your replies are never required
              </p>
            </div>
          </section>

          {/* Pane 3 — info / safety */}
          {infoOpen && (
            <aside className="hidden lg:flex col-span-3 rounded-[22px] bg-paper border border-paper-line overflow-hidden flex-col min-h-[600px] lg:h-full lg:min-h-0">
              <div className="p-5 border-b border-paper-line flex flex-col items-center text-center relative">
                {/* Circular halo */}
                <div className="absolute inset-x-0 top-3 flex justify-center pointer-events-none">
                  <div className="w-48 h-48 rounded-full border border-ink/[0.06]" />
                </div>
                <div className="relative">
                  <Avatar size={72} hue={selected.hue} kind={selected.kind} />
                </div>
                <div className="mt-3 font-display text-[18px] font-semibold tracking-tight">
                  {selected.name}
                </div>
                <div className="text-[11.5px] text-ink/50">
                  @{selected.handle} · {selected.location}
                </div>
                <Link
                  href={`/${selected.kind === "circle" ? "circle" : "user"}/${selected.handle}`}
                  className="btn-press mt-4 h-9 px-4 rounded-pill border border-paper-line hover:border-ink/30 text-[12px] font-semibold"
                >
                  View profile
                </Link>
              </div>

              <div className="flex-1 overflow-auto scroll-clean p-4 space-y-4">
                {/* Shared media */}
                <div>
                  <h4 className="text-[10px] font-bold tracking-[0.18em] text-ink/50 mb-2">
                    SHARED MEDIA
                  </h4>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[30, 110, 200, 270, 50, 340].map((hue, i) => (
                      <div
                        key={i}
                        className="aspect-square rounded-[10px] border border-paper-line"
                        style={{
                          background: `conic-gradient(from ${hue}deg at 50% 50%, #0A0A0A, #6B6B6B, #E8E8E6, #0A0A0A)`,
                        }}
                        aria-hidden
                      />
                    ))}
                  </div>
                </div>

                {/* Safety */}
                <div>
                  <h4 className="text-[10px] font-bold tracking-[0.18em] text-ink/50 mb-2">
                    SAFETY
                  </h4>
                  <div className="rounded-[14px] bg-paper-warm border border-paper-line divide-y divide-paper-line text-[12.5px]">
                    <SafetyRow icon="Bell" label="Mute conversation" />
                    <SafetyRow icon="Close" label="Block this account" danger />
                    <SafetyRow icon="Filter" label="Report" onClick={() => setSafetyOpen(true)} />
                  </div>
                  <p className="mt-2 text-[11px] text-ink/45 leading-snug">
                    Blocking is silent. They won't be notified. You can always
                    ignore a conversation — we won't tell them you read it.
                  </p>
                </div>

                {/* Privacy */}
                <div>
                  <h4 className="text-[10px] font-bold tracking-[0.18em] text-ink/50 mb-2">
                    PRIVACY
                  </h4>
                  <div className="rounded-[14px] bg-paper-warm border border-paper-line p-3 text-[12px] text-ink/65 leading-snug">
                    Only people in your circles can DM you directly. Others land
                    in <b className="text-ink">Requests</b>.
                    <div className="mt-2">
                      <Link
                        href="/settings"
                        className="text-ink font-semibold inline-flex items-center gap-1 hover:underline"
                      >
                        Tune privacy →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          )}
        </div>
      </main>

      {/* Safety sheet */}
      {safetyOpen && (
        <SafetySheet
          name={selected.name}
          onClose={() => setSafetyOpen(false)}
        />
      )}
    </div>
  );
}

function Pill({
  active,
  onClick,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "relative h-8 rounded-pill inline-flex items-center justify-center gap-1.5 transition",
        active ? "bg-paper shadow-soft text-ink" : "text-ink/55 hover:text-ink"
      )}
    >
      {label}
      {badge ? (
        <span
          className={clsx(
            "w-4 h-4 rounded-full text-[9px] font-bold inline-flex items-center justify-center",
            active ? "bg-ink text-paper" : "bg-ink/10 text-ink/70"
          )}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function DayDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-3">
      <div className="flex-1 h-px bg-paper-line" />
      <span className="text-[10.5px] font-bold tracking-[0.18em] text-ink/40">
        {label}
      </span>
      <div className="flex-1 h-px bg-paper-line" />
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-ink/60 animate-bounce" style={{ animationDelay: "0ms" }} />
      <span className="w-1.5 h-1.5 rounded-full bg-ink/60 animate-bounce" style={{ animationDelay: "120ms" }} />
      <span className="w-1.5 h-1.5 rounded-full bg-ink/60 animate-bounce" style={{ animationDelay: "240ms" }} />
    </span>
  );
}

function SafetyRow({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: keyof typeof Icon;
  label: string;
  danger?: boolean;
  onClick?: () => void;
}) {
  const Ico = Icon[icon];
  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full flex items-center gap-2.5 px-3 h-11 text-left hover:bg-paper transition",
        danger ? "text-ink" : "text-ink/75"
      )}
    >
      <span
        className={clsx(
          "w-7 h-7 rounded-full flex items-center justify-center",
          danger ? "bg-ink text-paper" : "bg-paper text-ink/70 border border-paper-line"
        )}
      >
        <Ico size={13} />
      </span>
      <span className="flex-1 font-semibold">{label}</span>
      <span className="text-ink/30">›</span>
    </button>
  );
}

function SafetySheet({
  name,
  onClose,
}: {
  name: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<string | null>(null);
  const reasons = [
    "Spam or scam",
    "Harassment",
    "Hate speech",
    "Impersonation",
    "Inappropriate content",
    "Something else",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-3">
      <div
        className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-md rounded-[24px] bg-paper border border-paper-line shadow-pop overflow-hidden animate-[fadeUp_0.24s_ease-out]">
        <div className="p-5 border-b border-paper-line flex items-start gap-3">
          <span className="w-10 h-10 rounded-full bg-ink text-paper inline-flex items-center justify-center shrink-0">
            <Icon.Filter size={15} />
          </span>
          <div className="flex-1">
            <h3 className="font-display text-[18px] font-semibold tracking-tight">
              Report {name}
            </h3>
            <p className="text-[12px] text-ink/55 mt-0.5">
              Reports are confidential. We review every one within 24h.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-paper-cool flex items-center justify-center text-ink/60"
          >
            <Icon.Close size={14} />
          </button>
        </div>

        <div className="p-5 space-y-1.5">
          {reasons.map((r) => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className={clsx(
                "w-full h-10 px-3.5 rounded-pill border text-left text-[13px] font-semibold flex items-center justify-between transition",
                reason === r
                  ? "bg-ink text-paper border-ink"
                  : "bg-paper border-paper-line hover:border-ink/30"
              )}
            >
              {r}
              {reason === r && <Icon.Check size={14} />}
            </button>
          ))}
        </div>

        <div className="p-5 pt-0 flex items-center gap-2">
          <button
            onClick={onClose}
            className="btn-press h-10 px-4 rounded-pill border border-paper-line text-[12.5px] font-semibold hover:border-ink/30"
          >
            Cancel
          </button>
          <button
            disabled={!reason}
            onClick={onClose}
            className={clsx(
              "btn-press flex-1 h-10 rounded-pill text-[12.5px] font-semibold inline-flex items-center justify-center gap-1.5 transition",
              reason
                ? "bg-ink text-paper shadow-soft"
                : "bg-paper-cool text-ink/40"
            )}
          >
            Submit report
            <Icon.Send size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
