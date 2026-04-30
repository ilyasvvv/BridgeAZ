import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata = {
  title: "Privacy — bizim circle",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-paper-warm text-ink">
      <header className="max-w-[1100px] mx-auto px-6 lg:px-10 h-20 flex items-center justify-between">
        <Logo />
        <Link href="/" className="text-[13px] text-ink/60 hover:text-ink">← Back</Link>
      </header>

      <section className="max-w-[760px] mx-auto px-6 lg:px-10 pt-10 pb-24">
        <span className="inline-flex items-center px-3 py-1 rounded-pill bg-paper border border-paper-line shadow-soft text-[10.5px] font-semibold tracking-[0.18em]">
          PRIVACY
        </span>
        <h1 className="mt-5 font-display text-[clamp(40px,5vw,72px)] leading-[0.95] tracking-[-0.035em] font-medium">
          Your data, <span className="italic font-light">your call.</span>
        </h1>
        <p className="mt-3 text-[12.5px] text-ink/45 tracking-[0.04em]">Last updated April 2026</p>

        <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-ink/75">
          <Section title="What we collect">
            Account basics (name, email, username, region), the content you publish on bizim
            circle, and minimal technical signals needed to keep the service working
            (sessions, device, IP).
          </Section>
          <Section title="What we don't do">
            We don't sell your data. We don't run third-party advertising trackers. We don't
            mine your messages.
          </Section>
          <Section title="Your controls">
            You can update or remove most of your information from{" "}
            <Link href="/settings" className="underline hover:text-ink">Settings</Link>. To
            delete your account, email{" "}
            <a href="mailto:privacy@bizimcircle.com" className="underline hover:text-ink">
              privacy@bizimcircle.com
            </a>{" "}
            — self-serve deletion is on the way.
          </Section>
          <Section title="Where data lives">
            Data is stored on infrastructure operated for us by reputable providers. We
            apply industry-standard security but no system is perfect — be thoughtful about
            what you post.
          </Section>
          <Section title="Changes">
            If we materially change how we handle data, we'll update this page and notify
            active accounts.
          </Section>
        </div>

      </section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-[20px] font-semibold tracking-[-0.01em]">{title}</h2>
      <p className="mt-2">{children}</p>
    </div>
  );
}
