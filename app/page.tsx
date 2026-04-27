"use client";

import Link from "next/link";
import { type CSSProperties, type ReactNode, useState } from "react";
import { AnimatedLogo, BizimLogoLockup } from "@/components/AnimatedLogo";
import { CircleMark } from "@/components/CircleMark";

const brandAccent = {
  bg: "#C1FF72",
  hover: "#B4F25F",
  ring: "rgba(193,255,114,0.55)",
  ink: "#0A0A0A",
};

const conceptPills = [
  {
    key: "people",
    label: "People",
    title: "Individuals, not profiles",
    description:
      "People are the members who bring different experiences, cities, languages, careers, student paths, and family backgrounds into the same shared network.",
  },
  {
    key: "circles",
    label: "Circles",
    title: "A home for each community",
    description:
      "Circles are the spaces inside the site: local groups, student communities, interest groups, alumni networks, and smaller rooms where members can post, gather, and stay close.",
  },
  {
    key: "mentors",
    label: "Mentors",
    title: "Options for helping others",
    description:
      "Mentors are members who can open mentorship options to help people who are newer to a path, especially students, newcomers, and anyone looking for practical guidance.",
  },
] as const;

type PillKey = (typeof conceptPills)[number]["key"];

export default function Landing() {
  const [activePill, setActivePill] = useState<PillKey | null>(null);
  const activeConcept = conceptPills.find((pill) => pill.key === activePill);

  function toggleConcept(key: PillKey) {
    setActivePill((current) => (current === key ? null : key));
  }

  return (
    <main className="min-h-screen bg-paper-warm text-ink relative overflow-hidden">
      <div
        aria-hidden
        className="absolute -top-[30vw] -left-[18vw] w-[80vw] h-[80vw] rounded-full border border-ink/[0.06] pointer-events-none"
      />
      <div
        aria-hidden
        className="absolute top-[92vh] -right-[20vw] w-[85vw] h-[85vw] rounded-full border border-ink/[0.05] pointer-events-none"
      />
      <div
        aria-hidden
        className="absolute top-[140vh] left-1/2 -translate-x-1/2 w-[60vw] h-[60vw] rounded-full border border-ink/[0.04] pointer-events-none"
      />

      <header className="relative z-10">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 h-20 flex items-center justify-between">
          <Link href="/" aria-label="Home" className="inline-flex items-center">
            <BizimLogoLockup size={46} motion="side-to-side" />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/signin"
              className="brand-accent-btn-outline h-10 px-5 inline-flex items-center justify-center rounded-pill text-[13px] font-semibold"
              style={
                {
                  color: brandAccent.ink,
                  borderColor: "rgba(10,10,10,0.18)",
                  "--accent-hover-bg": brandAccent.bg,
                  "--accent-hover-text": brandAccent.ink,
                  "--accent-ring": brandAccent.ring,
                } as CSSProperties
              }
            >
              Log in
            </Link>
            <AccentLink href="/signup">Sign up</AccentLink>
          </div>
        </div>
      </header>

      <section className="relative z-10">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 pt-8 lg:pt-12 pb-20 grid lg:grid-cols-[0.92fr_1.08fr] gap-12 lg:gap-16 items-center min-h-[82vh]">
          <div className="relative">
            <h1 className="font-display font-medium tracking-[-0.035em] text-[clamp(52px,8.2vw,128px)] leading-[0.92]">
              Find your <span className="italic font-light">circle</span>
              <br />
              abroad.
            </h1>

            <p className="mt-7 max-w-md text-[15px] leading-relaxed text-ink/55">
              A place for Azerbaijanis abroad to meet individuals, join local
              communities, and find mentors who know the path.
            </p>

            <div className="relative z-20 mt-8">
              <div className="flex flex-wrap gap-2">
                {conceptPills.map((pill) => {
                  const isActive = activePill === pill.key;

                  return (
                    <button
                      key={pill.key}
                      type="button"
                      aria-expanded={isActive}
                      className={
                        isActive
                          ? "h-10 px-4 inline-flex items-center rounded-pill border border-[#C1FF72] bg-[#C1FF72] text-ink text-[12px] font-semibold tracking-[0.02em] shadow-soft transition"
                          : "h-10 px-4 inline-flex items-center rounded-pill border border-paper-line bg-paper text-ink text-[12px] font-semibold tracking-[0.02em] shadow-soft transition hover:border-[#C1FF72] hover:bg-[#C1FF72]"
                      }
                      onClick={() => toggleConcept(pill.key)}
                    >
                      {pill.label}
                    </button>
                  );
                })}
              </div>

              {activeConcept && (
                <div className="absolute left-0 top-[calc(100%+0.75rem)] z-30 w-[min(88vw,370px)] rounded-[18px] border border-paper-line bg-paper p-4 shadow-[0_18px_42px_-24px_rgba(0,0,0,0.45)] animate-fade-up">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[10px] font-semibold tracking-[0.2em] text-ink/40 uppercase">
                        {activeConcept.label}
                      </div>
                      <h2 className="mt-2 text-[18px] font-semibold tracking-[-0.02em]">
                        {activeConcept.title}
                      </h2>
                    </div>
                    <button
                      type="button"
                      aria-label="Close information card"
                      className="h-8 w-8 shrink-0 rounded-full border border-paper-line bg-paper-cool inline-flex items-center justify-center text-[13px] font-semibold text-ink/55 hover:text-ink hover:border-ink/20"
                      onClick={() => setActivePill(null)}
                    >
                      x
                    </button>
                  </div>
                  <p className="mt-3 text-[13px] leading-relaxed text-ink/58">
                    {activeConcept.description}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <AccentLink href="/signup" size="lg">
                Create your profile
                <Arrow />
              </AccentLink>
              <OutlineLink href="#terms" size="lg">
                See how it works
              </OutlineLink>
            </div>
          </div>

          <div className="relative flex min-h-[420px] items-center justify-center">
            <CircleMascot />
          </div>
        </div>
      </section>

      <section id="terms" className="relative z-10 scroll-mt-10">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-16 lg:py-24 grid gap-12 lg:grid-cols-[0.9fr_1.1fr] items-center">
          <div className="relative flex justify-center lg:justify-start">
            <div className="lg:sticky lg:top-24">
              <CircleMark
                size={520}
                rings={3}
                orbiting={conceptPills.map((pill) => pill.label.toUpperCase())}
                centerContent={<AnimatedLogo size={132} motion="full-float" />}
              />
            </div>
          </div>

          <div className="space-y-4">
            {conceptPills.map((pill, index) => (
              <article
                key={pill.key}
                id={pill.key}
                className="scroll-mt-32 rounded-[18px] border border-paper-line bg-paper/90 p-5 shadow-soft"
              >
                <div className="flex items-start gap-4">
                  <span className="mt-0.5 h-8 w-8 shrink-0 rounded-full bg-[#C1FF72] text-[12px] font-black inline-flex items-center justify-center">
                    {index + 1}
                  </span>
                  <div>
                    <div className="text-[10px] font-semibold tracking-[0.22em] text-ink/40 uppercase">
                      {pill.label}
                    </div>
                    <h2 className="mt-2 text-[24px] font-semibold tracking-[-0.03em]">
                      {pill.title}
                    </h2>
                    <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-ink/58">
                      {pill.description}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="relative z-10 scroll-mt-10">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 pb-20">
          <div className="mx-auto max-w-2xl rounded-[22px] border border-paper-line bg-paper p-6 text-center shadow-soft sm:p-8">
            <div className="text-[10px] font-semibold tracking-[0.22em] text-ink/40 uppercase">
              Contact
            </div>
            <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.035em]">
              Have a question?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[14px] leading-relaxed text-ink/58">
              Questions, partnerships, or early community requests can come
              straight to the team.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <AccentLink href="mailto:hello@bizim.circle">Email us</AccentLink>
              <span className="text-[12px] font-semibold text-ink/45">
                hello@bizim.circle
              </span>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-paper-line bg-paper-warm">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-8 flex items-center justify-between flex-wrap gap-4">
          <p className="text-[12px] text-ink/45">© 2026</p>
          <div className="flex items-center gap-4 text-[12px] text-ink/55">
            <Link href="/about" className="hover:text-ink">
              About
            </Link>
            <Link href="/privacy" className="hover:text-ink">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-ink">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function CircleMascot() {
  return (
    <div className="relative h-[320px] w-[320px] sm:h-[360px] sm:w-[360px]">
      <div
        aria-hidden
        className="absolute inset-3 rounded-full border border-ink/[0.06]"
      />
      <div
        aria-hidden
        className="absolute left-1/2 top-7 h-72 w-72 -translate-x-1/2 rounded-full bg-paper shadow-pop"
      />
      <div className="absolute left-1/2 top-11 -translate-x-1/2">
        <AnimatedLogo size={250} motion="landing-loop" />
      </div>
      <div
        aria-hidden
        className="absolute bottom-4 left-1/2 h-5 w-44 -translate-x-1/2 rounded-full bg-ink/10 blur-md"
      />
    </div>
  );
}

function AccentLink({
  href,
  children,
  size = "md",
}: {
  href: string;
  children: ReactNode;
  size?: "md" | "lg";
}) {
  return (
    <Link
      href={href}
      className={`brand-accent-btn relative inline-flex items-center justify-center gap-2 rounded-pill font-semibold select-none tracking-[0.01em] shadow-soft ${
        size === "lg" ? "h-12 px-6 text-[14px]" : "h-10 px-5 text-[13px]"
      }`}
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
    </Link>
  );
}

function OutlineLink({
  href,
  children,
  size = "md",
}: {
  href: string;
  children: ReactNode;
  size?: "md" | "lg";
}) {
  return (
    <Link
      href={href}
      className={`brand-accent-btn-outline relative inline-flex items-center justify-center rounded-pill font-semibold select-none tracking-[0.01em] bg-transparent ${
        size === "lg" ? "h-12 px-6 text-[14px]" : "h-10 px-5 text-[13px]"
      }`}
      style={
        {
          color: brandAccent.ink,
          borderColor: "rgba(10,10,10,0.18)",
          "--accent-hover-bg": brandAccent.bg,
          "--accent-hover-text": brandAccent.ink,
          "--accent-ring": brandAccent.ring,
        } as CSSProperties
      }
    >
      {children}
    </Link>
  );
}

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
