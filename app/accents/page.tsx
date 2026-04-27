"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";

type Accent = {
  name: string;
  note: string;
  bg: string;
  text: string;
  hover: string;
  ring: string;
  // Optional deeper shade used wherever bg-as-text would be unreadable
  // (chip label, italic emphasis). Defaults to bg when omitted.
  darkText?: string;
};

const accents: Accent[] = [
  // ── Lime spectrum (lightest → deepest) ──
  {
    name: "Lime · Mist",
    note: "Lightest — pale wash of chartreuse",
    bg: "#EAFCC4",
    text: "#0A0A0A",
    hover: "#DEF7AE",
    ring: "rgba(190,225,140,0.6)",
    darkText: "#5C7A24",
  },
  {
    name: "Lime · Soft",
    note: "Lighter — soft pastel chartreuse",
    bg: "#DBFB9E",
    text: "#0A0A0A",
    hover: "#CDF488",
    ring: "rgba(180,220,120,0.6)",
    darkText: "#557220",
  },
  {
    name: "Lime",
    note: "Base — your original chartreuse",
    bg: "#C1FF72",
    text: "#0A0A0A",
    hover: "#B4F25F",
    ring: "rgba(193,255,114,0.55)",
    darkText: "#4A7018",
  },
  {
    name: "Lime · Bright",
    note: "Darker — saturated, springier",
    bg: "#B0E558",
    text: "#0A0A0A",
    hover: "#9FD746",
    ring: "rgba(155,200,75,0.55)",
    darkText: "#3F5C18",
  },
  {
    name: "Lime · Deep",
    note: "Deepest — close to white-text territory",
    bg: "#8FC23A",
    text: "#0A0A0A",
    hover: "#80B12C",
    ring: "rgba(130,180,55,0.5)",
    darkText: "#2F4810",
  },
  {
    name: "Mint",
    note: "Pale green — soft, calming",
    bg: "#B8E8C9",
    text: "#0A0A0A",
    hover: "#A4DCB7",
    ring: "rgba(184,232,201,0.4)",
    darkText: "#2D6A45",
  },
  {
    name: "Pistachio",
    note: "Light yellow-green — nutty, soft",
    bg: "#C8DBA0",
    text: "#0A0A0A",
    hover: "#B7CC8C",
    ring: "rgba(200,219,160,0.4)",
    darkText: "#4E6A2A",
  },
  {
    name: "Sky",
    note: "Pale blue — open, airy",
    bg: "#B8D8E8",
    text: "#0A0A0A",
    hover: "#A4CADD",
    ring: "rgba(184,216,232,0.4)",
    darkText: "#2A5A78",
  },
  {
    name: "Powder",
    note: "Pale blue-gray — soft, neutral",
    bg: "#C8D8E5",
    text: "#0A0A0A",
    hover: "#B5C9D9",
    ring: "rgba(200,216,229,0.4)",
    darkText: "#3A5878",
  },
  {
    name: "Ice",
    note: "Pale icy blue — clean, crisp",
    bg: "#DCEAF0",
    text: "#0A0A0A",
    hover: "#C9DBE3",
    ring: "rgba(220,234,240,0.4)",
    darkText: "#2F5570",
  },
  {
    name: "Lavender",
    note: "Pale purple — gentle",
    bg: "#D5C8E8",
    text: "#0A0A0A",
    hover: "#C4B5DC",
    ring: "rgba(213,200,232,0.4)",
    darkText: "#4A3A78",
  },
  {
    name: "Blush",
    note: "Pale pink — warm, romantic",
    bg: "#F0C8C8",
    text: "#0A0A0A",
    hover: "#E5B5B5",
    ring: "rgba(240,200,200,0.4)",
    darkText: "#8C3A3A",
  },
  {
    name: "Peach",
    note: "Pale orange — sun-warmed",
    bg: "#F5C9A8",
    text: "#0A0A0A",
    hover: "#EBB892",
    ring: "rgba(245,201,168,0.4)",
    darkText: "#8C5128",
  },
  {
    name: "Apricot",
    note: "Soft warm orange — slightly richer than peach",
    bg: "#F0B888",
    text: "#0A0A0A",
    hover: "#E5A672",
    ring: "rgba(240,184,136,0.4)",
    darkText: "#8C4F1E",
  },
  {
    name: "Lemon",
    note: "Pale yellow — light, sunny",
    bg: "#F5E58A",
    text: "#0A0A0A",
    hover: "#EDD971",
    ring: "rgba(245,229,138,0.4)",
    darkText: "#6E5C1A",
  },
  {
    name: "Buttercream",
    note: "Soft cream-yellow — vanilla, paper",
    bg: "#F4E8B5",
    text: "#0A0A0A",
    hover: "#E9DC9F",
    ring: "rgba(244,232,181,0.4)",
    darkText: "#7A6A28",
  },
  {
    name: "Cream",
    note: "Pale beige — unbleached, archival",
    bg: "#F0E8D0",
    text: "#0A0A0A",
    hover: "#E5DCBF",
    ring: "rgba(240,232,208,0.4)",
    darkText: "#6A5A28",
  },
  {
    name: "Sand-Light",
    note: "Pale tan — desert at noon",
    bg: "#E8D7B5",
    text: "#0A0A0A",
    hover: "#DCC9A2",
    ring: "rgba(232,215,181,0.4)",
    darkText: "#7A5C2E",
  },
  {
    name: "Rose-Light",
    note: "Dusty pink — softer, more grown-up than blush",
    bg: "#E8B8C0",
    text: "#0A0A0A",
    hover: "#DDA5AE",
    ring: "rgba(232,184,192,0.4)",
    darkText: "#8E3A4F",
  },
  {
    name: "Sage-Light",
    note: "Pale dusty olive — herb garden",
    bg: "#CCD8B8",
    text: "#0A0A0A",
    hover: "#BCC9A4",
    ring: "rgba(204,216,184,0.4)",
    darkText: "#4E6A35",
  },
];

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

function AccentCard({ accent }: { accent: Accent }) {
  // For light backgrounds, accent.bg itself is too pale to read as text.
  // darkText falls back to bg for traditional dark accents.
  const inkColor = accent.darkText ?? accent.bg;
  return (
    <div className="rounded-card border border-paper-line bg-paper shadow-soft p-6 flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="w-3.5 h-3.5 rounded-full"
              style={{ background: accent.bg }}
            />
            <h3 className="font-display text-[18px] font-semibold leading-none">
              {accent.name}
            </h3>
          </div>
          <p className="mt-2 text-[12.5px] text-ink/55 leading-relaxed">
            {accent.note}
          </p>
        </div>
        <code className="text-[11px] text-ink/45 tracking-[0.02em]">
          {accent.bg}
        </code>
      </div>

      {/* Primary CTA */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          className="accent-btn relative inline-flex items-center justify-center gap-2 rounded-pill font-semibold select-none h-12 px-6 text-[14px] tracking-[0.01em] shadow-soft"
          style={
            {
              background: accent.bg,
              color: accent.text,
              "--accent-hover": accent.hover,
              "--accent-ring": accent.ring,
            } as React.CSSProperties
          }
        >
          Join bizim circle
          <Arrow />
        </button>
        <button
          className="accent-btn relative inline-flex items-center justify-center rounded-pill font-semibold select-none h-10 px-5 text-[13px] tracking-[0.02em] shadow-soft"
          style={
            {
              background: accent.bg,
              color: accent.text,
              "--accent-hover": accent.hover,
              "--accent-ring": accent.ring,
            } as React.CSSProperties
          }
        >
          Sign up
        </button>
        {/* Outline variant */}
        <button
          className="accent-btn-outline relative inline-flex items-center justify-center rounded-pill font-semibold select-none h-10 px-5 text-[13px] tracking-[0.02em] bg-transparent"
          style={
            {
              color: inkColor,
              borderColor: `${inkColor}33`,
              "--accent-hover-bg": accent.bg,
              "--accent-hover-text": accent.text,
              "--accent-ring": accent.ring,
            } as React.CSSProperties
          }
        >
          Follow
        </button>
        {/* Ghost chip */}
        <span
          className="inline-flex items-center px-4 h-10 rounded-pill text-[12px] font-semibold tracking-[0.02em]"
          style={{
            background: `${accent.bg}24`,
            color: inkColor,
          }}
        >
          Active chip
        </span>
      </div>

      {/* Mini landing preview */}
      <div className="rounded-2xl border border-paper-line bg-paper-warm p-5 flex items-center justify-between gap-4">
        <div>
          <div
            className="inline-flex items-center px-2.5 py-1 rounded-pill text-[9.5px] font-semibold tracking-[0.22em]"
            style={{
              background: `${accent.bg}24`,
              color: inkColor,
            }}
          >
            BIZIMCIRCLE
          </div>
          <div className="mt-3 font-display text-[22px] leading-[0.95] tracking-[-0.03em]">
            Find your{" "}
            <span className="italic font-light" style={{ color: inkColor }}>
              circle
            </span>{" "}
            abroad.
          </div>
          <div className="mt-2 text-[11.5px] text-ink/50">
            Fast sign up. Less typing.
          </div>
        </div>
        <button
          className="accent-btn shrink-0 inline-flex items-center justify-center gap-2 rounded-pill font-semibold h-10 px-4 text-[12px] tracking-[0.02em] shadow-soft"
          style={
            {
              background: accent.bg,
              color: accent.text,
              "--accent-hover": accent.hover,
              "--accent-ring": accent.ring,
            } as React.CSSProperties
          }
        >
          Join
          <Arrow />
        </button>
      </div>
    </div>
  );
}

export default function AccentsPreview() {
  return (
    <main className="min-h-screen bg-paper-warm text-ink">
      <style jsx global>{`
        .accent-btn {
          /* Thick halo ring on hover, pill-shaped because it follows
             the button's own border-radius via box-shadow. */
          box-shadow: 0 0 0 0 var(--accent-ring, rgba(0, 0, 0, 0.12));
          transition: background-color 220ms ease,
            transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1),
            box-shadow 240ms cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .accent-btn:hover {
          background: var(--accent-hover) !important;
          box-shadow: 0 0 0 6px var(--accent-ring, rgba(0, 0, 0, 0.12));
        }
        .accent-btn:active {
          transform: scale(0.97);
        }
        .accent-btn-outline {
          border-width: 1px;
          border-style: solid;
          box-shadow: 0 0 0 0 var(--accent-ring, rgba(0, 0, 0, 0.12));
          transition: background-color 220ms ease, color 220ms ease,
            border-color 220ms ease,
            box-shadow 240ms cubic-bezier(0.2, 0.8, 0.2, 1),
            transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .accent-btn-outline:hover {
          background: var(--accent-hover-bg);
          color: var(--accent-hover-text);
          border-color: var(--accent-hover-bg);
          box-shadow: 0 0 0 6px var(--accent-ring, rgba(0, 0, 0, 0.12));
        }
        .accent-btn-outline:active {
          transform: scale(0.97);
        }
      `}</style>

      <header className="border-b border-paper-line bg-paper">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-10 h-20 flex items-center justify-between">
          <Logo />
          <Link
            href="/"
            className="text-[12px] font-semibold tracking-[0.02em] text-ink/60 hover:text-ink"
          >
            ← Back to landing
          </Link>
        </div>
      </header>

      <section className="max-w-[1200px] mx-auto px-6 lg:px-10 pt-12 pb-6">
        <span className="inline-flex items-center px-3 py-1 rounded-pill bg-paper border border-paper-line text-[10px] font-semibold tracking-[0.22em]">
          INTERNAL · ACCENT PREVIEW
        </span>
        <h1 className="mt-5 font-display font-medium tracking-[-0.03em] text-[clamp(36px,5vw,56px)] leading-[0.95]">
          Subtle accents for <span className="italic font-light">buttons</span>
        </h1>
        <p className="mt-4 text-[14px] text-ink/55 max-w-xl leading-relaxed">
          The site stays black and white. Only CTAs, active chips, and
          key highlights pick up a single accent. Pick the one that
          feels right and we'll wire it into the Button component.
        </p>
      </section>

      <section className="max-w-[1200px] mx-auto px-6 lg:px-10 pb-24">
        <div className="grid md:grid-cols-2 gap-6">
          {accents.map((a) => (
            <AccentCard key={a.name} accent={a} />
          ))}
        </div>
      </section>
    </main>
  );
}
