"use client";

import { useState } from "react";
import { TopBar } from "@/components/TopBar";
import { Button, LinkButton } from "@/components/Button";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-paper-warm">
      <TopBar />
      <main className="max-w-[1100px] mx-auto px-6 py-10 space-y-10">
        <header className="space-y-2">
          <div className="text-[10.5px] tracking-[0.18em] text-ink/45 uppercase">
            Internal
          </div>
          <h1 className="font-display text-[38px] font-semibold leading-none">
            Motion & Material
          </h1>
          <p className="text-[13.5px] text-ink/60 max-w-prose">
            Every surface in bizim circle moves from the same seven
            motions: press, ripple, magnet, morph, draw, orbit, and
            rise. This page is a living reference.
          </p>
        </header>

        <Section title="Buttons · variants">
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
