"use client";

import { CSSProperties, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { Button, LinkButton } from "@/components/Button";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { AnimatedLogo, BizimLogoLockup } from "@/components/AnimatedLogo";
import type { LogoMotion } from "@/components/AnimatedLogo";
import { accentSwatches, brandAccent } from "@/lib/design-tokens";

type MotionOption = { label: string; motion: LogoMotion; use: string };

const motionCategories: {
  title: string;
  note: string;
  options: MotionOption[];
}[] = [
  {
    title: "Smooth & regular",
    note: "Calmer loops for headers, idle states, and everyday product surfaces.",
    options: [
      { label: "Side to side", motion: "side-to-side", use: "Default friendly header motion" },
      { label: "Drift", motion: "drift", use: "Ambient brand motion" },
      { label: "Pulse", motion: "pulse", use: "Live status and presence" },
      { label: "Carousel", motion: "carousel", use: "Explore tabs and profile browsing" },
      { label: "Ripple", motion: "ripple", use: "Tap feedback and active presence" },
      { label: "Blink", motion: "blink", use: "Idle brand moments" },
      { label: "Wink", motion: "wink", use: "Human idle moment and friendly prompt" },
      { label: "Double blink", motion: "double-blink", use: "Playful idle loop without leaving the face" },
    ],
  },
  {
    title: "Happy motions & excitement",
    note: "Higher-energy motions for delight, celebrations, and youthful feedback.",
    options: [
      { label: "Jelly", motion: "jelly", use: "Youthful brand hover and delight" },
      { label: "Bop", motion: "bop", use: "Youthful CTA hover and tap feedback" },
      { label: "Pop", motion: "pop", use: "Quick celebration and micro-success" },
      { label: "Bounce", motion: "bounce", use: "Success and celebration" },
      { label: "High five", motion: "high-five", use: "Friend requests, follows, and matches" },
      { label: "Spark", motion: "spark", use: "New message and notification energy" },
      { label: "Zoomies", motion: "zoomies", use: "Short youth-forward celebration burst" },
      { label: "Drumroll", motion: "drumroll", use: "Before reveals and generated results" },
    ],
  },
  {
    title: "Main circle moves",
    note: "The full face mark moves, so the outer circle participates instead of only the eyes.",
    options: [
      { label: "Full hop", motion: "full-hop", use: "Button press and cheerful confirmation" },
      { label: "Full dance", motion: "full-dance", use: "Celebration and playful empty states" },
      { label: "Full sway", motion: "full-sway", use: "Header and landing hero idle loop" },
      { label: "Full float", motion: "full-float", use: "Soft waiting, ambient hero motion" },
      { label: "Full party", motion: "full-party", use: "High-energy wins and launches" },
      { label: "Full orbit", motion: "full-orbit", use: "Big loading moments where the whole mark travels" },
    ],
  },
  {
    title: "Landing & page states",
    note: "Longer or more directional loops for page loads, route changes, and transitions.",
    options: [
      { label: "Landing loop", motion: "landing-loop", use: "Hero loop: energetic start, calmer finish" },
      { label: "Orbit", motion: "orbit", use: "Loading screens and wait states" },
      { label: "Slingshot", motion: "slingshot", use: "Pull-to-refresh and long waits" },
      { label: "Portal", motion: "portal", use: "Route changes and page transitions" },
      { label: "Rocket", motion: "rocket", use: "Sending, posting, and launch moments" },
      { label: "Comet", motion: "comet", use: "Sending, posting, and fast transitions" },
      { label: "Sunrise", motion: "sunrise", use: "First load and morning check-in" },
      { label: "Loading", motion: "loading", use: "Compact page loading" },
    ],
  },
  {
    title: "Shape shifting",
    note: "A smaller set where the eyes stretch or melt so the effect stays special.",
    options: [
      { label: "Morph", motion: "morph", use: "Shape-shifting brand moments" },
      { label: "Stretch", motion: "stretch", use: "Shape-shifting playful transition" },
      { label: "Melt", motion: "melt", use: "Shape-shifting relaxed loading moment" },
      { label: "Sprout", motion: "sprout", use: "Empty states that come alive" },
      { label: "Swap", motion: "swap", use: "Matching, friend requests, and handoffs" },
      { label: "Skate", motion: "skate", use: "Fast browsing and swipe moments" },
    ],
  },
  {
    title: "Utility & feedback",
    note: "Functional signals for attention, searching, undo, no-results, and recovery.",
    options: [
      { label: "Attention", motion: "attention", use: "Notifications and prompts" },
      { label: "Gather", motion: "gather", use: "Search results and matching" },
      { label: "Magnet", motion: "magnet", use: "Search convergence and people matching" },
      { label: "Peek", motion: "peek", use: "Empty states and onboarding" },
      { label: "Shy", motion: "shy", use: "No results and gentle empty states" },
      { label: "Moonwalk", motion: "moonwalk", use: "Back, cancel, and playful reversals" },
      { label: "Boomerang", motion: "boomerang", use: "Back navigation and undo feedback" },
      { label: "Escape", motion: "escape", use: "Playful 404s and error recoveries" },
      { label: "Scatter", motion: "scatter", use: "Discovery and exploration" },
    ],
  },
];

const featuredMotionOptions = motionCategories.flatMap((category) =>
  category.options.slice(0, 1)
);

function Arrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M1 7h12m0 0L8 2m5 5l-5 5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-paper-warm">
      <TopBar logoVariant="canva" />
      <main className="max-w-[1100px] mx-auto px-6 py-10 space-y-10">
        <header className="space-y-2">
          <div className="text-[10.5px] tracking-[0.18em] text-ink/45 uppercase">
            Internal
          </div>
          <h1 className="font-display text-[38px] font-semibold leading-none">
            Motion & Material
          </h1>
          <p className="text-[13.5px] text-ink/60 max-w-prose">
            Every surface in bizim circle moves from a shared motion
            language: elastic dots, shape shifts, orbiting, quick pops,
            and soft landing states.
          </p>
        </header>

        <Section title="Canva slide 10 · vector lockup">
          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="design-logo-showcase min-h-72 rounded-[18px] border border-paper-line bg-paper flex items-center justify-center overflow-hidden">
              <BizimLogoLockup size={150} motion="side-to-side" />
            </div>
            <div className="rounded-[18px] border border-paper-line bg-paper-cool p-5 flex flex-col justify-between gap-6">
              <div>
                <div className="text-[10.5px] font-semibold tracking-[0.18em] text-ink/45 uppercase">
                  Source choices
                </div>
                <div className="mt-4 grid gap-3">
                  {[
                    ["Lime original", brandAccent.bg],
                    ["Black outline", "#000000"],
                    ["White field", "#FFFFFF"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-4 w-4 rounded-full border border-ink/10"
                          style={{ background: value }}
                          aria-hidden
                        />
                        <span className="text-[12.5px] font-semibold text-ink/70">
                          {label}
                        </span>
                      </div>
                      <code className="text-[11px] text-ink/45">{value}</code>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[16px] border border-paper-line bg-paper p-4">
                <div className="text-[12.5px] leading-relaxed text-ink/58">
                  Rebuilt as SVG and CSS, so the mark stays crisp in the website and
                  the outer circle remains fixed while the inner dots animate.
                </div>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Header preview · Canva logo">
          <div className="overflow-hidden rounded-[18px] border border-paper-line bg-paper">
            <div className="h-16 px-5 flex items-center gap-5 border-b border-paper-line bg-paper/90">
              <BizimLogoLockup size={42} motion="side-to-side" />
              <div className="hidden md:flex flex-1 max-w-md h-10 items-center rounded-pill bg-paper-cool border border-paper-line px-3 text-[13px] text-ink/35">
                Search people, circles, posts, tags...
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button className="h-10 w-10 rounded-full border border-paper-line bg-paper-cool flex items-center justify-center">
                  <Icon.Chat size={16} />
                </button>
                <button className="h-10 w-10 rounded-full border border-paper-line bg-paper-cool flex items-center justify-center">
                  <Icon.Bell size={16} />
                </button>
                <AccentButton>Join</AccentButton>
              </div>
            </div>
            <div className="p-5 grid gap-4 md:grid-cols-3">
              {[
                { label: "Compact app header", size: 42, motion: "side-to-side" as const },
                { label: "Loading header", size: 42, motion: "loading" as const },
                { label: "Blinking header", size: 42, motion: "wink" as const },
              ].map((item) => (
                <div key={item.label} className="rounded-[16px] border border-paper-line bg-paper-cool p-4">
                  <BizimLogoLockup size={item.size} motion={item.motion} />
                  <div className="mt-3 text-[11px] font-semibold tracking-[0.16em] text-ink/50 uppercase">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Landing preview · Canva logo">
          <div className="relative overflow-hidden rounded-[18px] border border-paper-line bg-paper-warm p-6 md:p-8">
            <div
              aria-hidden
              className="absolute -right-32 -top-32 h-72 w-72 rounded-full border border-ink/[0.06]"
            />
            <div
              aria-hidden
              className="absolute -left-28 bottom-0 h-64 w-64 rounded-full border border-ink/[0.05]"
            />
            <div className="relative z-10 grid gap-8 lg:grid-cols-[0.92fr_1.08fr] items-center">
              <div>
                <BizimLogoLockup size={66} motion="side-to-side" />
                <h3 className="mt-8 font-display text-[clamp(42px,7vw,86px)] font-medium tracking-[-0.04em] leading-[0.9]">
                  Find your <span className="italic font-light">circle</span>
                  <br />
                  abroad.
                </h3>
                <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-ink/55">
                  A long logo loop for hero sections: loud and playful first, then
                  it settles into a calmer idle rhythm.
                </p>
                <div className="mt-7 flex items-center gap-3">
                  <AccentButton size="lg">Join bizim circle <Arrow /></AccentButton>
                  <span className="text-[12px] text-ink/45">Free — no credit card</span>
                </div>
              </div>
              <div className="min-h-72 rounded-[18px] bg-paper border border-paper-line flex items-center justify-center p-8">
                <AnimatedLogo size={210} motion="landing-loop" />
              </div>
            </div>
          </div>
        </Section>

        <Section title="Buttons · variants">
          <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
            <div className="space-y-4">
              <Row>
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
              </Row>
              <Row>
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
              </Row>
            </div>
            <div className="rounded-[18px] border border-paper-line bg-paper-cool p-4">
              <div className="text-[10.5px] font-semibold tracking-[0.18em] text-ink/45 uppercase">
                Lime CTA
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <AccentButton size="lg">Join bizim circle <Arrow /></AccentButton>
                <AccentButton>Sign up</AccentButton>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Logo motion">
          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="design-logo-showcase min-h-64 rounded-[18px] border border-paper-line bg-paper-cool flex items-center justify-center overflow-hidden">
              <div className="flex flex-col items-center gap-7 px-6 py-8">
                <BizimLogoLockup size={150} motion="side-to-side" />
              </div>
            </div>
            <div className="grid gap-3">
              {featuredMotionOptions.map((item) => (
                <div
                  key={item.motion}
                  className="rounded-[18px] border border-paper-line bg-paper-cool flex items-center justify-between gap-4 p-4 overflow-hidden"
                >
                  <AnimatedLogo size={76} motion={item.motion} />
                  <div className="text-right">
                    <div className="text-[10.5px] font-semibold tracking-[0.18em] text-ink/60 uppercase">
                      {item.label}
                    </div>
                    <div className="mt-1 text-[11.5px] text-ink/45">
                      {item.use}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Animation categories">
          <div className="space-y-6">
            {motionCategories.map((category) => (
              <div
                key={category.title}
                className="rounded-[18px] border border-paper-line bg-paper-cool p-4 md:p-5"
              >
                <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h3 className="text-[12px] font-semibold tracking-[0.18em] text-ink/60 uppercase">
                      {category.title}
                    </h3>
                    <p className="mt-1 max-w-xl text-[12px] leading-snug text-ink/48">
                      {category.note}
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-ink/35">
                    {category.options.length} options
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {category.options.map((item) => (
                    <div
                      key={item.motion}
                      className="min-h-44 rounded-[16px] border border-paper-line bg-paper p-4 flex flex-col justify-between"
                    >
                      <AnimatedLogo
                        size={84}
                        motion={item.motion}
                        className="self-center"
                      />
                      <div>
                        <div className="text-[11px] font-semibold tracking-[0.16em] text-ink/60 uppercase">
                          {item.label}
                        </div>
                        <div className="mt-1 text-[12px] leading-snug text-ink/48">
                          {item.use}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Brand accent · Lime original">
          <div className="rounded-[18px] border border-paper-line bg-paper p-6 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className="w-4 h-4 rounded-full"
                    style={{ background: brandAccent.bg }}
                  />
                  <h3 className="font-display text-[22px] font-semibold leading-none">
                    {brandAccent.name}
                  </h3>
                </div>
                <p className="mt-3 text-[13.5px] text-ink/55">
                  {brandAccent.note}
                </p>
              </div>
              <code className="text-[13px] text-ink/45 tracking-[0.02em]">
                {brandAccent.bg}
              </code>
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-4">
              <AccentButton size="lg">Join bizim circle <Arrow /></AccentButton>
              <AccentButton>Sign up</AccentButton>
              <button
                className="brand-accent-btn-outline relative inline-flex items-center justify-center rounded-pill font-semibold select-none h-10 px-5 text-[13px] tracking-[0.02em] bg-transparent"
                style={
                  {
                    color: brandAccent.darkText,
                    borderColor: `${brandAccent.darkText}33`,
                    "--accent-hover-bg": brandAccent.bg,
                    "--accent-hover-text": brandAccent.ink,
                    "--accent-ring": brandAccent.ring,
                  } as CSSProperties
                }
              >
                Follow
              </button>
              <span
                className="inline-flex items-center px-5 h-10 rounded-pill text-[12px] font-semibold tracking-[0.02em]"
                style={{
                  background: `${brandAccent.bg}24`,
                  color: brandAccent.darkText,
                }}
              >
                Active chip
              </span>
            </div>

            <div className="mt-7 rounded-2xl border border-paper-line bg-paper-warm p-6 flex items-center justify-between gap-4">
              <div>
                <div
                  className="inline-flex items-center px-3 py-1.5 rounded-pill text-[10px] font-semibold tracking-[0.22em]"
                  style={{
                    background: `${brandAccent.bg}24`,
                    color: brandAccent.darkText,
                  }}
                >
                  BIZIMCIRCLE
                </div>
                <div className="mt-4 font-display text-[30px] leading-none tracking-[-0.03em]">
                  Find your{" "}
                  <span className="italic font-light" style={{ color: brandAccent.darkText }}>
                    circle
                  </span>{" "}
                  abroad.
                </div>
                <div className="mt-3 text-[13px] text-ink/50">
                  Fast sign up. Less typing.
                </div>
              </div>
              <AccentButton className="shrink-0">Join <Arrow /></AccentButton>
            </div>
          </div>
        </Section>

        <Section title="Accent palette">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {accentSwatches.map((accent) => (
              <div
                key={accent.name}
                className="rounded-[18px] border border-paper-line bg-paper overflow-hidden"
              >
                <div className="h-16 relative" style={{ background: accent.hex }}>
                  {accent.hex === brandAccent.bg && (
                    <span className="absolute right-2 top-2 rounded-pill bg-ink px-2 py-1 text-[9px] font-semibold tracking-[0.12em] text-paper uppercase">
                      Original
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <div className="text-[12px] font-semibold leading-tight">
                    {accent.name}
                  </div>
                  <code className="mt-1 block text-[10.5px] text-ink/45">
                    {accent.hex}
                  </code>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Buttons · states">
          <LoadingDemo />
          <Row>
            <Button disabled>Disabled</Button>
            <LinkButton href="/home" variant="outline">
              LinkButton
            </LinkButton>
          </Row>
        </Section>

        <Section title="Avatars">
          <Row>
            <Avatar size={40} hue={20} />
            <Avatar size={56} hue={120} />
            <Avatar size={72} hue={220} kind="circle" />
            <Avatar size={88} hue={300} kind="circle" />
          </Row>
        </Section>

        <Section title="Icons">
          <div className="grid grid-cols-6 md:grid-cols-10 gap-3">
            {(Object.keys(Icon) as (keyof typeof Icon)[]).map((key) => {
              const Ico = Icon[key];
              return (
                <div
                  key={key}
                  className="aspect-square rounded-[14px] border border-paper-line bg-paper flex flex-col items-center justify-center gap-1.5"
                >
                  <Ico size={18} />
                  <span className="text-[9.5px] tracking-[0.08em] text-ink/45 uppercase">
                    {key}
                  </span>
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="Tokens">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: "ink", hex: "#0A0A0A", fg: "paper" },
              { name: "paper", hex: "#FFFFFF", fg: "ink" },
              { name: "paper-warm", hex: "#FAFAF8", fg: "ink" },
              { name: "paper-cool", hex: "#F4F4F2", fg: "ink" },
            ].map((t) => (
              <div
                key={t.name}
                className="rounded-[18px] border border-paper-line overflow-hidden"
              >
                <div
                  className="h-20"
                  style={{ background: t.hex, borderBottom: "1px solid #E8E8E6" }}
                />
                <div className="p-3 bg-paper">
                  <div className="text-[12.5px] font-semibold">{t.name}</div>
                  <div className="text-[10.5px] text-ink/50 font-mono">
                    {t.hex}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Shapes">
          <Row>
            {[
              { r: "rounded-pill", label: "pill" },
              { r: "rounded-[22px]", label: "card" },
              { r: "rounded-[18px]", label: "tile" },
              { r: "rounded-[14px]", label: "chip" },
            ].map((s) => (
              <div
                key={s.label}
                className={`w-24 h-16 ${s.r} bg-ink text-paper flex items-center justify-center text-[11px] tracking-[0.12em] uppercase`}
              >
                {s.label}
              </div>
            ))}
          </Row>
        </Section>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-[11px] tracking-[0.18em] text-ink/55 uppercase font-semibold">
        {title}
      </h2>
      <div className="rounded-[22px] bg-paper border border-paper-line p-5 space-y-4">
        {children}
      </div>
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

function AccentButton({
  children,
  size = "md",
  className,
}: {
  children: React.ReactNode;
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <button
      className={`brand-accent-btn relative inline-flex items-center justify-center gap-2 rounded-pill font-semibold select-none tracking-[0.01em] shadow-soft ${
        size === "lg" ? "h-12 px-6 text-[14px]" : "h-10 px-5 text-[13px]"
      } ${className ?? ""}`}
      style={
        {
          background: brandAccent.bg,
          color: brandAccent.ink,
          "--accent-hover": brandAccent.hover,
          "--accent-ring": brandAccent.ring,
        } as CSSProperties
      }
    >
      {children}
    </button>
  );
}

function LoadingDemo() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const trigger = () => {
    setLoading(true);
    setSuccess(false);
    window.setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      window.setTimeout(() => setSuccess(false), 1400);
    }, 1100);
  };

  return (
    <Row>
      <Button onClick={trigger} loading={loading} success={success} successLabel="Sent">
        Send request
      </Button>
      <Button variant="outline" loading>
        Working
      </Button>
      <Button variant="secondary" success successLabel="Saved">
        Save
      </Button>
    </Row>
  );
}
