"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import clsx from "clsx";
import { AnimatedLogo, type LogoMotion } from "@/components/AnimatedLogo";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/Button";
import { CityCombobox } from "@/components/CityCombobox";
import { useAuth } from "@/lib/auth";
import { warmApi } from "@/lib/api";
import { emitPlayfulBurst } from "@/lib/playful";
import { cityLabel, type CityOption } from "@/lib/cities";

type Step = 1 | 2 | 3;

const INTENT_OPTIONS = [
  "Meet nearby Azerbaijanis",
  "Find events",
  "Career help",
  "Student life",
  "Housing",
  "Family community",
];

const HELP_OPTIONS = [
  "Local tips",
  "Career referrals",
  "University advice",
  "Translation",
  "Events",
  "Housing leads",
];

const LANGUAGE_OPTIONS = ["Azerbaijani", "English", "Turkish", "Russian", "French", "German"];

export default function SignupPage({
  initialTab = "signup",
}: {
  initialTab?: "login" | "signup";
}) {
  const router = useRouter();
  const { login, register } = useAuth();

  const [tab, setTab] = useState<"login" | "signup">(initialTab);
  const [step, setStep] = useState<Step>(1);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [selectedCity, setSelectedCity] = useState<CityOption | null>(null);
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [canHelpWith, setCanHelpWith] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [mascotMotion, setMascotMotion] = useState<LogoMotion>("full-sway");

  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void warmApi();
  }, []);

  function exciteMascot() {
    setMascotMotion("full-party");
    window.setTimeout(() => setMascotMotion("full-sway"), 1400);
  }

  async function handleSignup(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selectedCity) {
      setError("Choose a city from the list.");
      setStep(1);
      return;
    }
    if (!name.trim() || username.trim().length < 3 || !email.trim() || password.length < 10) {
      setError("Please complete all fields with a valid email and a 10+ character password.");
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError("Password must include at least one letter and one number.");
      return;
    }
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
        currentRegion: cityLabel(selectedCity),
        locationNow: {
          city: selectedCity.city,
          country: selectedCity.country,
          region: selectedCity.region,
          lat: selectedCity.lat,
          lon: selectedCity.lon,
        },
        lookingFor,
        canHelpWith,
        languages,
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
    if (!loginId.trim() || !loginPassword) {
      setError("Please enter your email or username and password.");
      return;
    }
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

      <div className="relative max-w-[1400px] mx-auto px-6 lg:px-10 py-10 grid lg:grid-cols-[1.05fr,1fr] gap-10 items-center min-h-screen">
        <div>
          <Link href="/"><Logo /></Link>
          <span className="mt-10 inline-flex items-center px-3 py-1 rounded-pill bg-white border border-paper-line shadow-soft text-[10.5px] font-semibold tracking-[0.18em]">
            BIZIMCIRCLE
          </span>
          <h1 className="mt-5 font-display text-[clamp(44px,6.2vw,88px)] leading-[0.92] tracking-[-0.035em] font-medium">
            Find your <span className="italic font-light">circle</span>
            <br />
            by city.
          </h1>
          <div className="mt-12 hidden lg:flex items-center gap-7">
            <div className="relative flex h-[300px] w-[300px] items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-ink/10" />
              <div className="absolute inset-8 rounded-full border border-ink/10 animate-spin-slower" />
              <AnimatedLogo size={210} motion={mascotMotion} title="bizim circle mascot" />
            </div>
            <button
              type="button"
              onClick={(event) => {
                exciteMascot();
                emitPlayfulBurst("xoş gəldin", event.clientX, event.clientY);
              }}
              className="btn-press max-w-[260px] rounded-[22px] border border-paper-line bg-paper p-5 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-ink/20"
              aria-label="Greet the bizim circle mascot"
            >
              <div className="text-[11px] font-bold tracking-[0.16em] text-ink/45">XOŞ GƏLMİSƏN</div>
              <div className="mt-3 text-[22px] font-semibold leading-tight tracking-tight">
                Salam, xoş gəldin.
              </div>
              <p className="mt-3 text-[13px] leading-5 text-ink/55">Buyur, öz evindir.</p>
            </button>
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
                aria-label="Auth tab: Log in"
                onClick={(event) => {
                  setTab("login");
                  setError(null);
                  emitPlayfulBurst("login", event.clientX, event.clientY);
                }}
                className={clsx("relative h-10 rounded-pill", tab === "login" ? "text-ink" : "text-ink/50")}
              >
                Log in
              </button>
              <button
                type="button"
                aria-label="Auth tab: Sign up"
                onClick={(event) => {
                  setTab("signup");
                  setError(null);
                  emitPlayfulBurst("signup", event.clientX, event.clientY);
                }}
                className={clsx("relative h-10 rounded-pill", tab === "signup" ? "text-ink" : "text-ink/50")}
              >
                Sign up
              </button>
            </div>

            {tab === "signup" && (
              <>
                <div className="mt-6 flex items-center gap-2">
                  {[
                    { n: 1, label: "CITY" },
                    { n: 2, label: "BASICS" },
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
                        Choose your city
                      </h2>

                      <div className="mt-6 grid gap-3">
                        <CityCombobox selected={selectedCity} onSelect={setSelectedCity} />
                      </div>

                      {error && <div className="mt-4"><ErrorText>{error}</ErrorText></div>}

                      <div className="mt-6">
                        <Button
                          type="button"
                          size="lg"
                          onClick={() => {
                            if (!selectedCity) {
                              setError("Choose a city from the list.");
                              return;
                            }
                            setError(null);
                            setStep(2);
                          }}
                        >
                          Continue
                          <Arrow />
                        </Button>
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="mt-8">
                      <h2 className="font-display text-[30px] leading-tight tracking-[-0.02em] font-medium">
                        Your profile
                      </h2>

                      <div className="mt-6 grid gap-3">
                        <Field label="Your name" placeholder="Leyla Mammadova" value={name} onChange={setName} />
                        <Field
                          label="Username"
                          placeholder="leyla"
                          value={username}
                          onChange={(v) => setUsername(v.toLowerCase().replace(/[^a-z0-9._]/g, ""))}
                        />
                      </div>

                      <ChipGroup title="Looking for (optional)" values={lookingFor} options={INTENT_OPTIONS} onChange={setLookingFor} />
                      <ChipGroup title="Can help with (optional)" values={canHelpWith} options={HELP_OPTIONS} onChange={setCanHelpWith} />
                      <ChipGroup title="Languages (optional)" values={languages} options={LANGUAGE_OPTIONS} onChange={setLanguages} />

                      {error && <div className="mt-4"><ErrorText>{error}</ErrorText></div>}

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

                      <div className="mt-6 grid gap-3">
                        <Field label="Email" placeholder="you@mail.com" type="email" value={email} onChange={setEmail} required autoComplete="email" />
                        <Field label="Password" placeholder="At least 10 characters" type="password" value={password} onChange={setPassword} required minLength={10} autoComplete="new-password" />
                        <PasswordStrength value={password} />
                      </div>

                      <label className="mt-4 flex items-start gap-3 text-[12px] text-ink/60">
                        <input
                          type="checkbox"
                          className="mt-0.5 accent-ink"
                          checked={agreed}
                          onChange={(e) => setAgreed(e.target.checked)}
                        />
                        <span>
                          I agree to the terms and confirm I'm using this platform to meet real people, not to spam.
                        </span>
                      </label>

                      {error && <div className="mt-4"><ErrorText>{error}</ErrorText></div>}

                      <div className="mt-6 flex items-center gap-2">
                        <Button type="button" variant="ghost" size="lg" onClick={() => setStep(2)}>
                          Back
                        </Button>
                        <Button type="submit" size="lg" disabled={submitting}>
                          {submitting ? "Creating..." : "Create account"}
                          {!submitting && <Arrow />}
                        </Button>
                      </div>
                    </div>
                  )}
                </form>
              </>
            )}

            {tab === "login" && (
              <form onSubmit={handleLogin} className="mt-8">
                <h2 className="font-display text-[30px] leading-tight tracking-[-0.02em] font-medium">
                  Welcome back
                </h2>

                <div className="mt-6 grid gap-3">
                  <Field label="Email or username" placeholder="you@mail.com" type="text" value={loginId} onChange={setLoginId} required autoComplete="username" />
                  <Field label="Password" placeholder="Password" type="password" value={loginPassword} onChange={setLoginPassword} required autoComplete="current-password" />
                </div>

                {error && <div className="mt-4"><ErrorText>{error}</ErrorText></div>}

                <div className="mt-6">
                  <Button type="submit" size="lg" disabled={submitting}>
                    {submitting ? "Logging in..." : "Log in"}
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

function ChipGroup({
  title,
  values,
  options,
  onChange,
}: {
  title: string;
  values: string[];
  options: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <section className="mt-5">
      <div className="text-[11px] font-semibold tracking-[0.14em] text-ink/50 uppercase">{title}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const active = values.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(toggleOption(values, option))}
              className={clsx(
                "btn-press h-8 rounded-pill px-3 text-[12px] font-semibold transition",
                active
                  ? "bg-ink text-paper shadow-soft"
                  : "bg-paper-cool text-ink/65 hover:text-ink"
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Field({
  label,
  placeholder,
  type = "text",
  value,
  onChange,
  required,
  minLength,
  autoComplete,
}: {
  label: string;
  placeholder: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold tracking-[0.14em] text-ink/50 uppercase">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        className="mt-1.5 w-full h-12 rounded-pill border border-paper-line bg-paper px-5 text-[14px] outline-none focus:border-ink/40 focus:ring-4 focus:ring-ink/[0.04] transition"
      />
    </label>
  );
}

function scorePassword(value: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  if (!value) return { score: 0, label: "" };
  let score = 0;
  if (value.length >= 10) score++;
  if (value.length >= 12) score++;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
  if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) score++;
  const label =
    value.length < 10 ? "Too short" : ["Weak", "Okay", "Good", "Strong"][Math.max(0, score - 1)] || "Weak";
  return { score: Math.min(4, score) as 0 | 1 | 2 | 3 | 4, label };
}

function PasswordStrength({ value }: { value: string }) {
  if (!value) return null;
  const { score, label } = scorePassword(value);
  const bars = [0, 1, 2, 3];
  return (
    <div className="mt-1">
      <div className="flex gap-1">
        {bars.map((i) => (
          <span
            key={i}
            className={clsx("h-1.5 flex-1 rounded-full transition-colors", i < score ? "bg-ink" : "bg-paper-cool")}
          />
        ))}
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px] text-ink/55">
        <span>{label}</span>
      </div>
    </div>
  );
}

function ErrorText({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 py-2.5 rounded-[14px] bg-[#fbeaea] border border-[#e6c3c3] text-[12.5px] text-[#b02a2a]">
      {children}
    </div>
  );
}

function toggleOption(values: string[], option: string): string[] {
  return values.includes(option)
    ? values.filter((value) => value !== option)
    : [...values, option];
}

function Arrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M1 7h12m0 0L8 2m5 5l-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
