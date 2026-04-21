"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { CircleMark } from "@/components/CircleMark";
import { Button, LinkButton } from "@/components/Button";
import clsx from "clsx";

type Step = 1 | 2 | 3;
type Role = "personal" | "circle";

export default function SignupPage({
  initialTab = "signup",
}: {
  initialTab?: "login" | "signup";
}) {
  const [tab, setTab] = useState<"login" | "signup">(initialTab);
  const [step, setStep] = useState<Step>(1);
  const [role, setRole] = useState<Role>("personal");

  return (
    <main className="min-h-screen bg-paper-warm relative overflow-hidden">
      {/* decorative circle */}
      <div className="absolute -top-40 -left-40 w-[720px] h-[720px] rounded-full border border-ink/[0.06]" />
      <div className="absolute -bottom-60 -right-40 w-[820px] h-[820px] rounded-full border border-ink/[0.06]" />

      <div className="relative max-w-[1400px] mx-auto px-6 lg:px-10 py-10 grid lg:grid-cols-[1.1fr,1fr] gap-10 items-center min-h-screen">
        {/* Left — brand narrative */}
        <div>
          <Logo />
          <span className="mt-10 inline-flex items-center px-3 py-1 rounded-pill bg-white border border-paper-line shadow-soft text-[10.5px] font-semibold tracking-[0.18em]">
            BIZIMCIRCLE
          </span>
          <h1 className="mt-5 font-display text-[clamp(44px,6.2vw,88px)] leading-[0.92] tracking-[-0.035em] font-medium">
            Find your{" "}
            <span className="italic font-light">circle</span>
            <br />
            abroad.
          </h1>
          <p className="mt-4 text-[15px] text-ink/60 max-w-md">
            Fast sign up. Less typing. Better matching.
          </p>

          <div className="mt-7 flex flex-wrap gap-2">
            {["People", "Circles", "Mentors", "Advice"].map((p, i) => (
              <span
                key={p}
                className={
                  i === 0 || i === 3
                    ? "px-4 h-9 inline-flex items-center rounded-pill bg-ink text-paper text-[12px] font-semibold tracking-[0.04em]"
                    : "px-4 h-9 inline-flex items-center rounded-pill border border-paper-line bg-white text-[12px] font-semibold tracking-[0.04em]"
                }
              >
                {p}
              </span>
            ))}
          </div>

          <div className="mt-16 hidden lg:flex justify-start">
            <CircleMark size={440} />
          </div>
        </div>

        {/* Right — the form card */}
        <div className="relative">
          <div className="rounded-[32px] bg-paper shadow-pop p-6 md:p-8 border border-paper-line">
            {/* segmented tabs */}
            <div className="relative grid grid-cols-2 rounded-pill bg-paper-cool p-1 text-[13px] font-semibold">
              <div
                className={clsx(
                  "absolute top-1 bottom-1 rounded-pill bg-paper shadow-soft transition-transform duration-300",
                  "w-[calc(50%-4px)]",
                  tab === "signup" ? "translate-x-[calc(100%+4px)]" : "translate-x-[2px]"
                )}
                aria-hidden
              />
              <button
                onClick={() => setTab("login")}
                className={clsx(
                  "relative h-10 rounded-pill",
                  tab === "login" ? "text-ink" : "text-ink/50"
                )}
              >
                Log in
              </button>
              <button
                onClick={() => setTab("signup")}
                className={clsx(
                  "relative h-10 rounded-pill",
                  tab === "signup" ? "text-ink" : "text-ink/50"
                )}
              >
                Sign up
              </button>
            </div>

            {/* Progress pills */}
            <div className="mt-6 flex items-center gap-2">
              {[
                { n: 1, label: "ROLE" },
                { n: 2, label: "DETAILS" },
                { n: 3, label: "SECURITY" },
              ].map((s) => {
                const active = step === s.n;
                const done = step > s.n;
                return (
                  <div
                    key={s.n}
                    className={clsx(
                      "inline-flex items-center gap-2 h-8 px-3 rounded-pill text-[11px] font-semibold tracking-[0.12em] transition-colors",
                      active
                        ? "bg-white border border-ink/20 text-ink"
                        : done
                        ? "bg-ink text-paper"
                        : "bg-transparent border border-paper-line text-ink/40"
                    )}
                  >
                    <span
                      className={clsx(
                        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                        active ? "bg-ink text-paper" : done ? "bg-paper text-ink" : "bg-paper-cool text-ink/50"
                      )}
                    >
                      {s.n}
                    </span>
                    {s.label}
                  </div>
                );
              })}
            </div>

            {/* Step content */}
            {tab === "signup" && step === 1 && (
              <div className="mt-8">
                <h2 className="font-display text-[30px] leading-tight tracking-[-0.02em] font-medium">
                  Pick your lane
                </h2>
                <p className="mt-1 text-[13px] text-ink/55">You can change direction later.</p>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <RoleCard
                    selected={role === "personal"}
                    onClick={() => setRole("personal")}
                    title="Personal account"
                    blurb="Meet people, join circles, stay visible."
                    bannerKind="rect"
                  />
                  <RoleCard
                    selected={role === "circle"}
                    onClick={() => setRole("circle")}
                    title="Create a circle"
                    blurb="A community page with members at the center."
                    bannerKind="round"
                  />
                </div>

                <div className="mt-6">
                  <Button size="lg" onClick={() => setStep(2)}>
                    Continue
                    <Arrow />
                  </Button>
                </div>
              </div>
            )}

            {tab === "signup" && step === 2 && (
              <div className="mt-8">
                <h2 className="font-display text-[30px] leading-tight tracking-[-0.02em] font-medium">
                  The basics
                </h2>
                <p className="mt-1 text-[13px] text-ink/55">Two fields. That's it for now.</p>

                <div className="mt-6 grid gap-3">
                  <Field label={role === "personal" ? "Your name" : "Circle name"} placeholder={role === "personal" ? "Leyla Mammadova" : "Azerbaijanis in Berlin"} />
                  <Field label="Location" placeholder="Berlin, Germany" />
                </div>

                <div className="mt-6 flex items-center gap-2">
                  <Button variant="ghost" size="lg" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button size="lg" onClick={() => setStep(3)}>
                    Continue
                    <Arrow />
                  </Button>
                </div>
              </div>
            )}

            {tab === "signup" && step === 3 && (
              <div className="mt-8">
                <h2 className="font-display text-[30px] leading-tight tracking-[-0.02em] font-medium">
                  Lock it in
                </h2>
                <p className="mt-1 text-[13px] text-ink/55">Email and a password. We'll keep it safe.</p>

                <div className="mt-6 grid gap-3">
                  <Field label="Email" placeholder="you@mail.com" type="email" />
                  <Field label="Password" placeholder="••••••••" type="password" />
                </div>

                <label className="mt-4 flex items-start gap-3 text-[12px] text-ink/60">
                  <input type="checkbox" className="mt-0.5 accent-ink" />
                  <span>
                    I agree to the terms and confirm I'm using this platform to meet real people — not to spam.
                  </span>
                </label>

                <div className="mt-6 flex items-center gap-2">
                  <Button variant="ghost" size="lg" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <LinkButton href="/home" size="lg">
                    Create account
                    <Arrow />
                  </LinkButton>
                </div>
              </div>
            )}

            {tab === "login" && (
              <div className="mt-8">
                <h2 className="font-display text-[30px] leading-tight tracking-[-0.02em] font-medium">
                  Welcome back
                </h2>
                <p className="mt-1 text-[13px] text-ink/55">Good to see you again.</p>

                <div className="mt-6 grid gap-3">
                  <Field label="Email" placeholder="you@mail.com" type="email" />
                  <Field label="Password" placeholder="••••••••" type="password" />
                </div>

                <div className="mt-6">
                  <LinkButton href="/home" size="lg">
                    Log in
                    <Arrow />
                  </LinkButton>
                </div>
              </div>
            )}

            {/* divider */}
            <div className="mt-8 flex items-center gap-3 text-[11px] tracking-[0.18em] text-ink/40">
              <div className="flex-1 h-px bg-paper-line" />
              OR
              <div className="flex-1 h-px bg-paper-line" />
            </div>

            <div className="mt-4 text-[13px] text-ink/70 font-semibold">Prefer Google?</div>
            <p className="text-[12px] text-ink/50">Your account type and country will be used for first-time setup.</p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="px-4 h-9 inline-flex items-center rounded-pill bg-ink text-paper text-[11px] font-semibold tracking-[0.14em]">
                PERSONAL ACCOUNT
              </span>
              <span className="px-4 h-9 inline-flex items-center rounded-pill border border-paper-line text-[11px] font-semibold tracking-[0.14em]">
                CREATE A CIRCLE
              </span>
            </div>

            <button className="btn-press mt-4 w-full h-12 rounded-pill border border-paper-line bg-paper flex items-center justify-between px-5 hover:border-ink/30 hover:shadow-soft">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-ink text-paper inline-flex items-center justify-center text-[11px] font-bold">
                  i
                </span>
                <div className="text-left">
                  <div className="text-[13px] font-semibold">Sign in as Ilyas</div>
                  <div className="text-[11px] text-ink/50">vilyas2005@gmail.com</div>
                </div>
              </div>
              <GoogleG />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function RoleCard({
  selected,
  onClick,
  title,
  blurb,
  bannerKind,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  blurb: string;
  bannerKind: "rect" | "round";
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "text-left p-5 rounded-[22px] transition-all duration-200 btn-press min-h-[170px] flex flex-col gap-4",
        selected
          ? "bg-ink text-paper shadow-pop"
          : "bg-paper border border-paper-line text-ink hover:border-ink/30"
      )}
    >
      {bannerKind === "rect" ? (
        <span
          className={clsx(
            "w-10 h-10 rounded-[10px]",
            selected ? "bg-paper/15" : "bg-ink/90"
          )}
          aria-hidden
        />
      ) : (
        <span
          className={clsx(
            "w-10 h-10 rounded-full",
            selected ? "bg-paper/15 border border-paper/30" : "border border-ink/20"
          )}
          aria-hidden
        />
      )}
      <div>
        <div className="font-display text-[19px] font-semibold tracking-tight">{title}</div>
        <div className={clsx("mt-1 text-[12.5px] leading-snug", selected ? "text-paper/70" : "text-ink/55")}>
          {blurb}
        </div>
      </div>
    </button>
  );
}

function Field({
  label,
  placeholder,
  type = "text",
}: {
  label: string;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold tracking-[0.14em] text-ink/50 uppercase">{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        className="mt-1.5 w-full h-12 rounded-pill border border-paper-line bg-paper px-5 text-[14px] outline-none focus:border-ink/40 focus:ring-4 focus:ring-ink/[0.04] transition"
      />
    </label>
  );
}

function Arrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M1 7h12m0 0L8 2m5 5l-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.6 9.2c0-.6 0-1.2-.2-1.7H9v3.3h4.8c-.2 1.1-.8 2-1.8 2.6v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.4z" />
      <path fill="#34A853" d="M9 18c2.4 0 4.4-.8 5.9-2.2l-2.9-2.2c-.8.5-1.8.9-3 .9-2.3 0-4.3-1.6-5-3.7H1v2.3C2.5 16 5.5 18 9 18z" />
      <path fill="#FBBC05" d="M4 10.8c-.2-.5-.3-1.1-.3-1.8 0-.6.1-1.2.3-1.8V5H1c-.6 1.2-1 2.5-1 4s.4 2.8 1 4l3-2.2z" />
      <path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3L15 2.3C13.4.9 11.4 0 9 0 5.5 0 2.5 2 1 5l3 2.3c.7-2.2 2.7-3.7 5-3.7z" />
    </svg>
  );
}
