import Link from "next/link";
import { Logo } from "@/components/Logo";
import { CircleMark } from "@/components/CircleMark";
import { LinkButton } from "@/components/Button";

export default function Landing() {
  return (
    <main className="min-h-screen bg-paper-warm text-ink relative overflow-hidden">
      {/* Decorative concentric rings */}
      <div
        aria-hidden
        className="absolute -top-[30vw] -left-[18vw] w-[80vw] h-[80vw] rounded-full border border-ink/[0.06] pointer-events-none"
      />
      <div
        aria-hidden
        className="absolute -bottom-[40vw] -right-[20vw] w-[85vw] h-[85vw] rounded-full border border-ink/[0.05] pointer-events-none"
      />
      <div
        aria-hidden
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[60vw] h-[60vw] rounded-full border border-ink/[0.04] pointer-events-none"
      />

      {/* Top bar */}
      <header className="relative z-20">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 h-20 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <Link
              href="/signin"
              className="text-[13px] font-medium text-ink/70 hover:text-ink h-10 px-4 inline-flex items-center rounded-pill"
            >
              Log in
            </Link>
            <LinkButton href="/signup" variant="primary" size="md">
              Sign up
            </LinkButton>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 pt-6 lg:pt-10 pb-24 grid lg:grid-cols-[1.1fr,1fr] gap-10 lg:gap-16 items-center min-h-[82vh]">
          {/* Left — narrative */}
          <div className="relative">
            <span className="inline-flex items-center px-3.5 py-1.5 rounded-pill bg-paper border border-paper-line shadow-soft text-[10.5px] font-semibold tracking-[0.22em]">
              BIZIMCIRCLE
            </span>

            <h1 className="mt-7 font-display font-medium tracking-[-0.035em] text-[clamp(52px,8.2vw,128px)] leading-[0.92]">
              Find your <span className="italic font-light">circle</span>
              <br />
              abroad.
            </h1>

            <p className="mt-6 text-[16px] text-ink/55 max-w-md leading-relaxed">
              Fast sign up. Less typing. Better matching.
            </p>

            <div className="mt-8 flex flex-wrap gap-2">
              {[
                { label: "People", active: true },
                { label: "Circles", active: false },
                { label: "Mentors", active: false },
                { label: "Advice", active: true },
              ].map((p) => (
                <span
                  key={p.label}
                  className={
                    p.active
                      ? "px-4 h-10 inline-flex items-center rounded-pill bg-ink text-paper text-[12px] font-semibold tracking-[0.02em]"
                      : "px-4 h-10 inline-flex items-center rounded-pill bg-paper border border-paper-line text-[12px] font-semibold tracking-[0.02em]"
                  }
                >
                  {p.label}
                </span>
              ))}
            </div>

            <div className="mt-10 flex items-center gap-4">
              <LinkButton href="/signup" size="lg">
                Join bizim circle
                <Arrow />
              </LinkButton>
              <span className="text-[12px] text-ink/45">Free — no credit card</span>
            </div>
          </div>

          {/* Right — the CircleMark */}
          <div className="relative flex items-center justify-center h-[62vh] min-h-[520px]">
            <CircleMark
              size={560}
              rings={3}
              orbiting={["PEOPLE", "CIRCLES", "MENTORS", "EVENTS", "ADVICE"]}
              centerLabel={{ top: "bizim", bottom: "circle" }}
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-paper-line bg-paper-warm">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-8 flex items-center justify-between flex-wrap gap-4">
          <Logo />
          <p className="text-[12px] text-ink/45">
            © 2026 bizim circle · connecting Azerbaijanis worldwide
          </p>
          <div className="flex items-center gap-4 text-[12px] text-ink/55">
            <Link href="/about" className="hover:text-ink">About</Link>
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
            <Link href="/terms" className="hover:text-ink">Terms</Link>
          </div>
        </div>
      </footer>
    </main>
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
