"use client";

import Link from "next/link";
import {
  type CSSProperties,
  type FormEvent,
  type ReactNode,
  useState,
} from "react";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import { CircleMark } from "@/components/CircleMark";
import { OfficialLogo } from "@/components/OfficialLogo";

const brandAccent = {
  bg: "#C1FF72",
  hover: "#B4F25F",
  ring: "rgba(193,255,114,0.55)",
  ink: "#0A0A0A",
};

const supportEmail = "support@bizimcircle.com";
const contactInputClass =
  "h-12 w-full rounded-[14px] border border-paper-line bg-paper-cool px-4 text-[13px] font-medium text-ink outline-none transition placeholder:text-ink/32 focus:border-ink/30 focus:bg-paper focus:shadow-soft";

const conceptPills = [
  {
    key: "people",
    label: "People",
    title: "Real people, shared paths",
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
  const [contactStatus, setContactStatus] = useState("");
  const activeConcept = conceptPills.find((pill) => pill.key === activePill);

  function toggleConcept(key: PillKey) {
    setActivePill((current) => (current === key ? null : key));
  }

  function handleContactSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const topic = String(formData.get("topic") || "General question").trim();
    const message = String(formData.get("message") || "").trim();
    const subject = `[BizimCircle] ${topic}`;
    const body = [
      `Name: ${name}`,
      `Email: ${email}`,
      `Topic: ${topic}`,
      "",
      message,
    ].join("\n");

    setContactStatus("Opening your email app...");
    window.location.href = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 h-[84px] pt-1 flex items-center justify-between">
          <Link href="/" aria-label="Home" className="inline-flex items-center">
            <OfficialLogo width={154} className="max-h-12" />
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
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 pt-8 lg:pt-10 pb-20 grid lg:grid-cols-[0.98fr_1.02fr] gap-10 lg:gap-12 items-center min-h-[78vh]">
          <div className="relative max-w-[620px]">
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

          <div className="relative flex min-h-[420px] items-center justify-center lg:justify-end">
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

      <section id="contact" className="relative z-10 scroll-mt-10 bg-ink text-paper">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-6 py-16 lg:grid-cols-[0.78fr_1.22fr] lg:px-10 lg:py-20">
          <div>
            <div className="text-[10px] font-semibold tracking-[0.22em] text-paper/45 uppercase">
              Contact
            </div>
            <h2 className="mt-3 max-w-sm text-[clamp(34px,4vw,54px)] font-semibold leading-none tracking-[-0.04em]">
              Tell us what you need.
            </h2>
            <p className="mt-4 max-w-md text-[14px] leading-relaxed text-paper/58">
              Questions, partnerships, student groups, and early community
              requests go straight to support.
            </p>
            <p className="mt-6 text-[12px] font-semibold text-paper/45">
              {supportEmail}
            </p>
          </div>

          <form
            className="grid gap-4 text-left"
            onSubmit={handleContactSubmit}
          >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Your name">
                  <input
                    name="name"
                    required
                    autoComplete="name"
                    className={contactInputClass}
                    placeholder="Full name"
                  />
                </Field>
                <Field label="Email address">
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    className={contactInputClass}
                    placeholder="you@example.com"
                  />
                </Field>
              </div>

              <Field label="What is this about?">
                <select
                  name="topic"
                  className={contactInputClass}
                  defaultValue="General question"
                >
                  <option>General question</option>
                  <option>Community or circle request</option>
                  <option>Partnership</option>
                  <option>Mentorship</option>
                  <option>Support issue</option>
                </select>
              </Field>

              <Field label="Message">
                <textarea
                  name="message"
                  required
                  rows={5}
                  className={`${contactInputClass} min-h-32 resize-y py-3 leading-relaxed`}
                  placeholder="Tell us a little about what you need."
                />
              </Field>

              <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-[12px] font-semibold text-paper/45">
                  Usually replies from the founding team.
                </span>
                <button
                  type="submit"
                  className="brand-accent-btn relative inline-flex h-12 items-center justify-center gap-2 rounded-pill px-6 text-[14px] font-semibold tracking-[0.01em] shadow-soft"
                  style={
                    {
                      background: brandAccent.bg,
                      color: brandAccent.ink,
                      "--accent-hover": brandAccent.hover,
                      "--accent-ring": brandAccent.ring,
                    } as CSSProperties
                  }
                >
                  Send message
                  <Arrow />
                </button>
              </div>

              {contactStatus && (
                <p className="text-[12px] font-semibold text-paper/50">
                  {contactStatus}
                </p>
              )}
            </form>
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
    <div className="relative h-[340px] w-[340px] sm:h-[400px] sm:w-[400px] lg:h-[480px] lg:w-[480px]">
      <div
        aria-hidden
        className="absolute inset-3 rounded-full border border-ink/[0.06]"
      />
      <div
        aria-hidden
        className="absolute left-1/2 top-8 h-[290px] w-[290px] -translate-x-1/2 rounded-full bg-paper shadow-pop sm:h-[340px] sm:w-[340px] lg:h-[410px] lg:w-[410px]"
      />
      <div className="absolute left-1/2 top-12 -translate-x-1/2 sm:top-14 lg:top-16">
        <AnimatedLogo size={310} motion="landing-loop" className="hidden lg:inline-flex" />
        <AnimatedLogo size={270} motion="landing-loop" className="hidden sm:inline-flex lg:hidden" />
        <AnimatedLogo size={232} motion="landing-loop" className="inline-flex sm:hidden" />
      </div>
      <div
        aria-hidden
        className="absolute bottom-5 left-1/2 h-6 w-56 -translate-x-1/2 rounded-full bg-ink/10 blur-md lg:w-72"
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

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-semibold tracking-[0.12em] text-paper/55 uppercase">
        {label}
      </span>
      {children}
    </label>
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
