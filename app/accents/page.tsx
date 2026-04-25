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
};

const accents: Accent[] = [
  {
    name: "Ink (current)",
    note: "Pure black — today's baseline",
    bg: "#0A0A0A",
    text: "#FFFFFF",
    hover: "#1A1A1A",
    ring: "rgba(10,10,10,0.12)",
  },
  {
    name: "Graphite",
    note: "Charcoal gray — softer than pure black",
    bg: "#3A3A3A",
    text: "#FFFFFF",
    hover: "#4A4A4A",
    ring: "rgba(58,58,58,0.18)",
  },
  {
    name: "Azure",
    note: "Muted navy — nods to the Azerbaijani flag blue",
    bg: "#1F3A5F",
    text: "#FFFFFF",
    hover: "#2B4E7A",
    ring: "rgba(31,58,95,0.18)",
  },
  {
    name: "Denim",
    note: "Faded workwear blue — approachable, honest",
    bg: "#3E5C76",
    text: "#FFFFFF",
    hover: "#527192",
    ring: "rgba(62,92,118,0.18)",
  },
  {
    name: "Slate",
    note: "Cool blue-gray — quiet and professional",
    bg: "#4A5568",
    text: "#FFFFFF",
    hover: "#5C6879",
    ring: "rgba(74,85,104,0.18)",
  },
  {
    name: "Teal",
    note: "Muted blue-green — fresh without being loud",
    bg: "#2F5D5F",
    text: "#FFFFFF",
    hover: "#3F7274",
    ring: "rgba(47,93,95,0.18)",
  },
  {
    name: "Indigo",
    note: "Deep twilight blue — serious, editorial",
    bg: "#312E5C",
    text: "#FFFFFF",
    hover: "#413E72",
    ring: "rgba(49,46,92,0.18)",
  },
  {
    name: "Cobalt",
    note: "Rich mid blue — confident without being corporate",
    bg: "#2C4E8A",
    text: "#FFFFFF",
    hover: "#3B60A1",
    ring: "rgba(44,78,138,0.18)",
  },
  {
    name: "Plum",
    note: "Muted mauve — quiet, editorial",
    bg: "#5D4157",
    text: "#FFFFFF",
    hover: "#6E506A",
    ring: "rgba(93,65,87,0.18)",
  },
  {
    name: "Aubergine",
    note: "Deep purple — rich, grown-up",
    bg: "#3E2A3E",
    text: "#FFFFFF",
    hover: "#533A54",
    ring: "rgba(62,42,62,0.18)",
  },
  {
    name: "Burgundy",
    note: "Deep wine red — heritage, warmth",
    bg: "#6B2737",
    text: "#FFFFFF",
    hover: "#81354A",
    ring: "rgba(107,39,55,0.18)",
  },
  {
    name: "Ember",
    note: "Subdued brick red — warm, grounded, diasporic",
    bg: "#9E3B2F",
    text: "#FFFFFF",
    hover: "#B3463A",
    ring: "rgba(158,59,47,0.18)",
  },
  {
    name: "Coral",
    note: "Dusty coral — warmer, lighter than ember",
    bg: "#C45D4A",
    text: "#FFFFFF",
    hover: "#D1705D",
    ring: "rgba(196,93,74,0.18)",
  },
  {
    name: "Clay",
    note: "Warm terracotta — softer than ember, earthier",
    bg: "#B36A4A",
    text: "#FFFFFF",
    hover: "#C27A5A",
    ring: "rgba(179,106,74,0.18)",
  },
  {
    name: "Rust",
    note: "Weathered iron — rougher, more masculine",
    bg: "#8B4A2B",
    text: "#FFFFFF",
    hover: "#A15A38",
    ring: "rgba(139,74,43,0.18)",
  },
  {
    name: "Mocha",
    note: "Warm coffee brown — grounded, neutral-adjacent",
    bg: "#5C4033",
    text: "#FFFFFF",
    hover: "#725043",
    ring: "rgba(92,64,51,0.18)",
  },
  {
    name: "Ochre",
    note: "Muted mustard — unexpected, editorial",
    bg: "#A67C3A",
    text: "#FFFFFF",
    hover: "#B88E4B",
    ring: "rgba(166,124,58,0.18)",
  },
  {
    name: "Olive",
    note: "Dry yellow-green — vintage, earthy",
    bg: "#707A3A",
    text: "#FFFFFF",
    hover: "#828D48",
    ring: "rgba(112,122,58,0.18)",
  },
  {
    name: "Sage",
    note: "Dusty olive — calm, matches warm paper tones",
    bg: "#5E7C5F",
    text: "#FFFFFF",
    hover: "#6F8F71",
    ring: "rgba(94,124,95,0.18)",
  },
  {
    name: "Forest",
    note: "Deep evergreen — grounded, serious",
    bg: "#2E4A34",
    text: "#FFFFFF",
    hover: "#3E5F46",
    ring: "rgba(46,74,52,0.18)",
  },
  {
    name: "Midnight",
    note: "Near-black blue — almost ink, with a cool undertone",
    bg: "#14213D",
    text: "#FFFFFF",
    hover: "#1F2F52",
    ring: "rgba(20,33,61,0.18)",
  },
  {
    name: "Steel",
    note: "Cool blue-gray — architectural, neutral-leaning",
    bg: "#55677D",
    text: "#FFFFFF",
    hover: "#677A92",
    ring: "rgba(85,103,125,0.18)",
  },
  {
    name: "Petrol",
    note: "Dark teal — moody, maritime",
    bg: "#1F4E5F",
    text: "#FFFFFF",
    hover: "#2F6478",
    ring: "rgba(31,78,95,0.18)",
  },
  {
    name: "Ocean",
    note: "Mid teal-blue — calm, a touch playful",
    bg: "#2E6F8E",
    text: "#FFFFFF",
    hover: "#3E82A2",
    ring: "rgba(46,111,142,0.18)",
  },
  {
    name: "Pine",
    note: "Dark muted green — quiet forest",
    bg: "#2D4A3E",
    text: "#FFFFFF",
    hover: "#3C6051",
    ring: "rgba(45,74,62,0.18)",
  },
  {
    name: "Fern",
    note: "Medium muted green — alive but restrained",
    bg: "#3E6648",
    text: "#FFFFFF",
    hover: "#517C5C",
    ring: "rgba(62,102,72,0.18)",
  },
  {
    name: "Moss",
    note: "Yellow-green — damp, organic",
    bg: "#4A5D23",
    text: "#FFFFFF",
    hover: "#5C7230",
    ring: "rgba(74,93,35,0.18)",
  },
  {
    name: "Seaweed",
    note: "Dark blue-green — dense, oceanic",
    bg: "#234E46",
    text: "#FFFFFF",
    hover: "#34655C",
    ring: "rgba(35,78,70,0.18)",
  },
  {
    name: "Mulberry",
    note: "Dark pink-red — heritage fruit, unexpected",
    bg: "#7A2E4F",
    text: "#FFFFFF",
    hover: "#8F3D61",
    ring: "rgba(122,46,79,0.18)",
  },
  {
    name: "Rose",
    note: "Dusty pink — romantic but grown-up",
    bg: "#9E5468",
    text: "#FFFFFF",
    hover: "#B16679",
    ring: "rgba(158,84,104,0.18)",
  },
  {
    name: "Mauve",
    note: "Lighter plum — soft, dusk-lit",
    bg: "#886278",
    text: "#FFFFFF",
    hover: "#9A738A",
    ring: "rgba(136,98,120,0.18)",
  },
  {
    name: "Wine",
    note: "Very deep red — bottle-dark, elegant",
    bg: "#4E1E2E",
    text: "#FFFFFF",
    hover: "#652B3F",
    ring: "rgba(78,30,46,0.18)",
  },
  {
    name: "Espresso",
    note: "Dark roast brown — near-black, warm",
    bg: "#3B2A1F",
    text: "#FFFFFF",
    hover: "#503A2C",
    ring: "rgba(59,42,31,0.18)",
  },
  {
    name: "Walnut",
    note: "Mid-tone wood brown — furniture warmth",
    bg: "#6E4A2E",
    text: "#FFFFFF",
    hover: "#845B3C",
    ring: "rgba(110,74,46,0.18)",
  },
  {
    name: "Sand",
    note: "Muted tan — desert, linen",
    bg: "#A88B6C",
    text: "#FFFFFF",
    hover: "#B89B7C",
    ring: "rgba(168,139,108,0.18)",
  },
  {
    name: "Honey",
    note: "Muted gold — warm amber light",
    bg: "#B88A3A",
    text: "#FFFFFF",
    hover: "#C99B4B",
    ring: "rgba(184,138,58,0.18)",
  },
  {
    name: "Paprika",
    note: "Warm orange-red — spice-rack red",
    bg: "#B8452C",
    text: "#FFFFFF",
    hover: "#CA563C",
    ring: "rgba(184,69,44,0.18)",
  },
  {
    name: "Charcoal",
    note: "Warm dark gray — softer than ink, still confident",
    bg: "#2B2B2B",
    text: "#FFFFFF",
    hover: "#3C3C3C",
    ring: "rgba(43,43,43,0.18)",
  },
  {
    name: "Stone",
    note: "Warm neutral gray — weathered, architectural",
    bg: "#6E6A64",
    text: "#FFFFFF",
    hover: "#807B74",
    ring: "rgba(110,106,100,0.18)",
  },
  {
    name: "Taupe",
    note: "Warm gray-brown — linen, unbleached",
    bg: "#7D6E5E",
    text: "#FFFFFF",
    hover: "#8F806F",
    ring: "rgba(125,110,94,0.18)",
  },
  {
    name: "Smoke",
    note: "Cool gray with a blue cast — haze over water",
    bg: "#4B5358",
    text: "#FFFFFF",
    hover: "#5E676C",
    ring: "rgba(75,83,88,0.18)",
  },
  {
    name: "Truffle",
    note: "Deep gray-brown — rich, low-key",
    bg: "#3E342E",
    text: "#FFFFFF",
    hover: "#524540",
    ring: "rgba(62,52,46,0.18)",
  },
  {
    name: "Chocolate",
    note: "Rich mid brown — dessert warmth",
    bg: "#3D2817",
    text: "#FFFFFF",
    hover: "#533827",
    ring: "rgba(61,40,23,0.18)",
  },
  {
    name: "Bronze",
    note: "Metallic warm brown — patina, plaque",
    bg: "#7A5F3A",
    text: "#FFFFFF",
    hover: "#8F7248",
    ring: "rgba(122,95,58,0.18)",
  },
  {
    name: "Copper",
    note: "Reddish metal — aged pipe, roof tiles",
    bg: "#A3623E",
    text: "#FFFFFF",
    hover: "#B6744E",
    ring: "rgba(163,98,62,0.18)",
  },
  {
    name: "Amber",
    note: "Deep honeyed orange — fossil, resin",
    bg: "#9E6B2E",
    text: "#FFFFFF",
    hover: "#B17D3E",
    ring: "rgba(158,107,46,0.18)",
  },
  {
    name: "Mustard",
    note: "Dull gold-yellow — old-world tile",
    bg: "#8E7A2B",
    text: "#FFFFFF",
    hover: "#A18D3B",
    ring: "rgba(142,122,43,0.18)",
  },
  {
    name: "Turmeric",
    note: "Warm spice gold — vivid but still earthy",
    bg: "#C08A2A",
    text: "#FFFFFF",
    hover: "#D19C3E",
    ring: "rgba(192,138,42,0.18)",
  },
  {
    name: "Cinnamon",
    note: "Warm red-brown — baked, dusted",
    bg: "#8C4228",
    text: "#FFFFFF",
    hover: "#A15338",
    ring: "rgba(140,66,40,0.18)",
  },
  {
    name: "Sienna",
    note: "Earthy red-brown — Renaissance palette",
    bg: "#6A331E",
    text: "#FFFFFF",
    hover: "#80432C",
    ring: "rgba(106,51,30,0.18)",
  },
  {
    name: "Cranberry",
    note: "Tart red-pink — bright without shouting",
    bg: "#7F2844",
    text: "#FFFFFF",
    hover: "#963756",
    ring: "rgba(127,40,68,0.18)",
  },
  {
    name: "Cherry",
    note: "Deep ripe red — classic, confident",
    bg: "#8E1F2F",
    text: "#FFFFFF",
    hover: "#A52E3F",
    ring: "rgba(142,31,47,0.18)",
  },
  {
    name: "Raisin",
    note: "Dark purple-red — dried fruit, shadow",
    bg: "#3C1E2E",
    text: "#FFFFFF",
    hover: "#522B3F",
    ring: "rgba(60,30,46,0.18)",
  },
  {
    name: "Iris",
    note: "Deep blue-purple — evening, floral",
    bg: "#433769",
    text: "#FFFFFF",
    hover: "#55477F",
    ring: "rgba(67,55,105,0.18)",
  },
  {
    name: "Amethyst",
    note: "Muted purple — stone, not neon",
    bg: "#5A3A7E",
    text: "#FFFFFF",
    hover: "#6D4A92",
    ring: "rgba(90,58,126,0.18)",
  },
  {
    name: "Violet",
    note: "Mid purple-blue — cooler than amethyst",
    bg: "#4C3D8E",
    text: "#FFFFFF",
    hover: "#5E4FA2",
    ring: "rgba(76,61,142,0.18)",
  },
  {
    name: "Navy",
    note: "Deep classic navy — uniform, timeless",
    bg: "#0E2655",
    text: "#FFFFFF",
    hover: "#1B356C",
    ring: "rgba(14,38,85,0.18)",
  },
  {
    name: "Sapphire",
    note: "Rich jewel blue — polished, formal",
    bg: "#1B3A7E",
    text: "#FFFFFF",
    hover: "#2A4D94",
    ring: "rgba(27,58,126,0.18)",
  },
  {
    name: "Lagoon",
    note: "Tropical teal — fresher than petrol",
    bg: "#2A697A",
    text: "#FFFFFF",
    hover: "#3B7E90",
    ring: "rgba(42,105,122,0.18)",
  },
  {
    name: "Jade",
    note: "Soft blue-green — carved stone",
    bg: "#2D6A5A",
    text: "#FFFFFF",
    hover: "#3D8070",
    ring: "rgba(45,106,90,0.18)",
  },
  {
    name: "Cypress",
    note: "Very dark green — graveyard, garden at dusk",
    bg: "#1F3A2A",
    text: "#FFFFFF",
    hover: "#2E4E3A",
    ring: "rgba(31,58,42,0.18)",
  },
  {
    name: "Juniper",
    note: "Muted blue-green — gin bottle, dried herb",
    bg: "#385049",
    text: "#FFFFFF",
    hover: "#4A655D",
    ring: "rgba(56,80,73,0.18)",
  },
  {
    name: "Khaki",
    note: "Dry green-brown — canvas, uniform",
    bg: "#6E6A3A",
    text: "#FFFFFF",
    hover: "#807D4A",
    ring: "rgba(110,106,58,0.18)",
  },
  {
    name: "Matcha",
    note: "Green-yellow — tea, powder, softer olive",
    bg: "#5F7A3A",
    text: "#FFFFFF",
    hover: "#738E4C",
    ring: "rgba(95,122,58,0.18)",
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
              color: accent.bg,
              borderColor: `${accent.bg}33`,
              "--accent-hover-bg": accent.bg,
              "--accent-hover-text": accent.text,
            } as React.CSSProperties
          }
        >
          Follow
        </button>
        {/* Ghost chip */}
        <span
          className="inline-flex items-center px-4 h-10 rounded-pill text-[12px] font-semibold tracking-[0.02em]"
          style={{
            background: `${accent.bg}14`,
            color: accent.bg,
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
              background: `${accent.bg}12`,
              color: accent.bg,
            }}
          >
            BIZIMCIRCLE
          </div>
          <div className="mt-3 font-display text-[22px] leading-[0.95] tracking-[-0.03em]">
            Find your{" "}
            <span className="italic font-light" style={{ color: accent.bg }}>
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
          transition: background-color 220ms ease, transform 180ms
              cubic-bezier(0.2, 0.8, 0.2, 1),
            box-shadow 220ms ease;
        }
        .accent-btn:hover {
          background: var(--accent-hover) !important;
        }
        .accent-btn:active {
          transform: scale(0.97);
        }
        .accent-btn-outline {
          border-width: 1px;
          border-style: solid;
          transition: background-color 220ms ease, color 220ms ease,
            border-color 220ms ease, transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .accent-btn-outline:hover {
          background: var(--accent-hover-bg);
          color: var(--accent-hover-text);
          border-color: var(--accent-hover-bg);
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
