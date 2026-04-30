import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata = {
  title: "About — bizim circle",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-paper-warm text-ink">
      <header className="max-w-[1100px] mx-auto px-6 lg:px-10 h-20 flex items-center justify-between">
        <Logo />
        <Link href="/" className="text-[13px] text-ink/60 hover:text-ink">← Back</Link>
      </header>

      <section className="max-w-[760px] mx-auto px-6 lg:px-10 pt-10 pb-24">
        <span className="inline-flex items-center px-3 py-1 rounded-pill bg-paper border border-paper-line shadow-soft text-[10.5px] font-semibold tracking-[0.18em]">
          ABOUT
        </span>
        <h1 className="mt-5 font-display text-[clamp(40px,5vw,72px)] leading-[0.95] tracking-[-0.035em] font-medium">
          Azerbaijanis abroad, <span className="italic font-light">in one circle.</span>
        </h1>
        <div className="mt-8 space-y-5 text-[15px] leading-relaxed text-ink/75">
          <p>
            bizim circle is a meeting place for Azerbaijanis living, studying, and working
            outside of Azerbaijan. We believe distance shouldn't dilute community.
          </p>
          <p>
            Whether you've just moved to a new city, run a community of your own, or want to
            mentor newcomers — there's a circle for you here.
          </p>
          <p>
            We're early. The product, the team, the rules — all still being shaped. If you
            want to help shape it, write to us at{" "}
            <a className="underline hover:text-ink" href="mailto:support@bizimcircle.com">
              support@bizimcircle.com
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
