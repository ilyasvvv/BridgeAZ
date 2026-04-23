"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import clsx from "clsx";
import { Logo } from "@/components/Logo";
import { CircleMark } from "@/components/CircleMark";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/auth";

type Step = 1 | 2 | 3;
type Role = "personal" | "circle";

export default function SignupPage({
  initialTab = "signup",
}: {
  initialTab?: "login" | "signup";
}) {
  const router = useRouter();
  const { login, register } = useAuth();

  const [tab, setTab] = useState<"login" | "signup">(initialTab);
  const [step, setStep] = useState<Step>(1);
  const [role, setRole] = useState<Role>("personal");

  // Signup form state
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [currentRegion, setCurrentRegion] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);

  // Login form state
  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignup(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!agreed) {
      setError("Please agree to the terms.");
      return;
    }
    setSubmitting(true);
    try {
      await register({
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
        accountType: role,
        currentRegion: currentRegion.trim(),
      });
      router.push("/home");
    } catch (err: any) {
      setError(err?.message || "Signup failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(loginId.trim(), loginPassword);
      router.push("/home");
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper-warm relative overflow-hidden">
      <div className="absolute -top-40 -left-40 w-[720px] h-[720px] rounded-full border border-ink/[0.06]" />
      <div className="absolute -bottom-60 -right-40 w-[820px] h-[820px] rounded-full border border-ink/[0.06]" />

      <div className="relative max-w-[1400px] mx-auto px-6 lg:px-10 py-10 grid lg:grid-cols-[1.1fr,1fr] gap-10 items-center min-h-screen">
        <div>
          <Link href="/"><Logo /></Link>
          <span className="mt-10 inline-flex items-center px-3 py-1 rounded-pill bg-white border border-paper-line shadow-soft text-[10.5px] font-semibold tracking-[0.18em]">
            BIZIMCIRCLE
          </span>
          <h1 className="mt-5 font-display text-[clamp(44px,6.2vw,88px)] leading-[0.92] tracking-[-0.035em] font-medium">
            Find your <span className="italic font-light">circle</span>
            <br />
            abroad.
          </h1>
          <p className="mt-4 text-[15px] text-ink/60 max-w-md">
            Fast sign up. Less typing. Better matching.
          </p>

          <div className="mt-16 hidden lg:flex justify-start">
            <CircleMark size={440} />
          </div>
        </div>

        <div className="relative">
          <div className="rounded-[32px] bg-paper shadow-pop p-6 md:p-8 border border-paper-line">
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
                type="button"
                onClick={() => { setTab("login"); setError(null); }}
                className={clsx(
                  "relative h-10 rounded-pill",
                  tab === "login" ? "text-ink" : "text-ink/50"
                )}
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => { setTab("signup"); setError(null); }}
                className={clsx(
                  "relative h-10 rounded-pill",
                  tab === "signup" ? "text-ink" : "text-ink/50"
                )}
              >
                Sign up
              </button>
            </div>

            {tab === "signup" && (
              <>
                <div className="mt-6 flex items-center gap-2">
                  {[
                    { n: 1, label: "ROLE" },
                    { n: 2, label: "DETAILS" },
                    { n: 3, label: "SECURITY" },
                  ].map((s) => {
                    const active = step === (s.n as Step);
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

                <form onSubmit={handleSignup}>
                  {step === 1 && (
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
                        <Button type="button" size="lg" onClick={() => setStep(2)}>
                          Continue
                          <Arrow />
                        </Button>
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="mt-8">
                      <h2 className="font-display text-[30px] leading-tight tracking-[-0.02em] font-medium">
                        The basics
                      </h2>
                      <p className="mt-1 text-[13px] text-ink/55">Tell us who you are.</p>

                      <div className="mt-6 grid gap-3">
                        <Field
                          label={role === "personal" ? "Your name" : "Circle name"}
                          placeholder={role === "personal" ? "Leyla Mammadova" : "Azerbaijanis in Berlin"}
                          value={name}
                          onChange={setName}
                        />
                        <Field
                          label="Username"
                          placeholder="leyla"
                          value={username}
                          onChange={(v) => setUsername(v.toLowerCase().replace(/[^a-z0-9._]/g, ""))}
                          hint="3–24 chars. Letters, numbers, . or _"
                        />
                        <Field
                          label="Location"
                          placeholder="Berlin, Germany"
                          value={currentRegion}
                          onChange={setCurrentRegion}
                        />
                      </div>

                      <div className="mt-6 flex items-center gap-2">
                        <Button type="button" variant="ghost" size="lg" onClick={() => setStep(1)}>
                          Back
                        </Button>
                        <Button
                          type="button"
                          size="lg"
                          onClick={() => {
                            if (!name.trim() || !username.trim() || username.length < 3) {
                              setError("Please enter a name and valid username (3+ chars).");
                              return;
                            }
                            setError(null);
                            setStep(3);
                          }}
                        >
                          Continue
                          <Arrow />
                        </Button>
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="mt-8">
                      <h2 className="font-display text-[30px] leading-tight tracking-[-0.02em] font-medium">
                        Lock it in
                      </h2>
                      <p className="mt-1 text-[13px] text-ink/55">Email and a password. We'll keep it safe.</p>

                      <div className="mt-6 grid gap-3">
                        <Field label="Email" placeholder="you@mail.com" type="email" value={email} onChange={setEmail} />
                        <Field label="Password" placeholder="At least 8 characters" type="password" value={password} onChange={setPassword} />
                      </div>

                      <label className="mt-4 flex items-start gap-3 text-[12px] text-ink/60">
                        <input
                          type="checkbox"
                          className="mt-0.5 accent-ink"
                          checked={agreed}
                          onChange={(e) => setAgreed(e.target.checked)}
                        />
                        <span>
                          I agree to the terms and confirm I'm using this platform to meet real people — not to spam.
                        </span>
                      </label>

                      {error && <ErrorText>{error}</ErrorText>}

                      <div className="mt-6 flex items-center gap-2">
                        <Button type="button" variant="ghost" size="lg" onClick={() => setStep(2)}>
                          Back
                        </Button>
                        <Button type="submit" size="lg" disabled={submitting}>
                          {submitting ? "Creating…" : "Create account"}
                          {!submitting && <Arrow />}
                        </Button>
                      </div>
                    </div>
                  )}

                  {step !== 3 && error && (
                    <div className="mt-4"><ErrorText>{error}</ErrorText></div>
                  )}
                </form>
              </>
            )}

            {tab === "login" && (
              <form onSubmit={handleLogin} className="mt-8">
                <h2 className="font-display text-[30px] leading-tight tracking-[-0.02em] font-medium">
                  Welcome back
                </h2>
                <p className="mt-1 text-[13px] text-ink/55">Good to see you again.</p>

                <div className="mt-6 grid gap-3">
                  <Field label="Email or username" placeholder="you@mail.com" type="text" value={loginId} onChange={setLoginId} />
                  <Field label="Password" placeholder="••••••••" type="password" value={loginPassword} onChange={setLoginPassword} />
                </div>

                {error && <div className="mt-4"><ErrorText>{error}</ErrorText></div>}

                <div className="mt-6">
                  <Button type="submit" size="lg" disabled={submitting}>
                    {submitting ? "Logging in…" : "Log in"}
                    {!submitting && <Arrow />}
                  </Button>
                </div>
              </form>
            )}
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
      type="button"
      onClick={onClick}
      className={clsx(
        "text-left p-5 rounded-[22px] transition-all duration-200 btn-press min-h-[170px] flex flex-col gap-4",
        selected
          ? "bg-ink text-paper shadow-pop"
          : "bg-paper border border-paper-line text-ink hover:border-ink/30"
      )}
    >
      {bannerKind === "rect" ? (
        <span className={clsx("w-10 h-10 rounded-[10px]", selected ? "bg-paper/15" : "bg-ink/90")} aria-hidden />
      ) : (
        <span className={clsx("w-10 h-10 rounded-full", selected ? "bg-paper/15 border border-paper/30" : "border border-ink/20")} aria-hidden />
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
  value,
  onChange,
  hint,
}: {
  label: string;
  placeholder: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold tracking-[0.14em] text-ink/50 uppercase">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full h-12 rounded-pill border border-paper-line bg-paper px-5 text-[14px] outline-none focus:border-ink/40 focus:ring-4 focus:ring-ink/[0.04] transition"
      />
      {hint && <span className="block mt-1 text-[11px] text-ink/45">{hint}</span>}
    </label>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-2.5 rounded-[14px] bg-[#fbeaea] border border-[#e6c3c3] text-[12.5px] text-[#b02a2a]">
      {children}
    </div>
  );
}

function Arrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M1 7h12m0 0L8 2m5 5l-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
