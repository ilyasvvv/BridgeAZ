"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import clsx from "clsx";
import { CityCombobox } from "@/components/CityCombobox";
import { OfficialLogo } from "@/components/OfficialLogo";
import { useAuth } from "@/lib/auth";
import { warmApi } from "@/lib/api";
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

  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void warmApi();
  }, []);

  function switchTab(next: "login" | "signup") {
    setTab(next);
    setError(null);
  }

  function continueFromCity() {
    if (!selectedCity) {
      setError("Choose a city from the list.");
      return;
    }
    setError(null);
    setStep(2);
  }

  function continueFromProfile() {
    if (!name.trim() || username.trim().length < 3) {
      setError("Please enter your name and a handle with at least 3 characters.");
      return;
    }
    setError(null);
    setStep(3);
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
      setError("Please complete the required fields.");
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError("Password must include at least one letter and one number.");
      return;
    }
    if (!agreed) {
      setError("Please agree to the Terms of Use and Privacy Policy.");
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
    <main className="min-h-screen bg-paper-warm px-5 py-8">
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[680px] flex-col items-center justify-center gap-8">
        <Link href="/" aria-label="bizim circle home" className="block">
          <OfficialLogo width={220} className="max-w-[72vw]" />
        </Link>

        <section className="w-full rounded-[30px] border border-paper-line bg-paper p-5 shadow-pop sm:p-7 md:p-8">
          <div className="relative grid grid-cols-2 rounded-pill bg-paper-cool p-1 text-[13px] font-semibold">
            <div
              className={clsx(
                "absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-pill bg-paper shadow-soft transition-transform duration-300",
                tab === "signup" ? "translate-x-[calc(100%+4px)]" : "translate-x-[2px]"
              )}
              aria-hidden
            />
            <button
              type="button"
              onClick={() => switchTab("login")}
              className={clsx("relative h-10 rounded-pill", tab === "login" ? "text-ink" : "text-ink/50")}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => switchTab("signup")}
              className={clsx("relative h-10 rounded-pill", tab === "signup" ? "text-ink" : "text-ink/50")}
            >
              Sign up
            </button>
          </div>

          {tab === "signup" ? (
            <SignupForm
              step={step}
              setStep={setStep}
              selectedCity={selectedCity}
              setSelectedCity={setSelectedCity}
              name={name}
              setName={setName}
              username={username}
              setUsername={setUsername}
              lookingFor={lookingFor}
              setLookingFor={setLookingFor}
              canHelpWith={canHelpWith}
              setCanHelpWith={setCanHelpWith}
              languages={languages}
              setLanguages={setLanguages}
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              agreed={agreed}
              setAgreed={setAgreed}
              error={error}
              submitting={submitting}
              onSubmit={handleSignup}
              onContinueCity={continueFromCity}
              onContinueProfile={continueFromProfile}
            />
          ) : (
            <LoginForm
              loginId={loginId}
              setLoginId={setLoginId}
              loginPassword={loginPassword}
              setLoginPassword={setLoginPassword}
              error={error}
              submitting={submitting}
              onSubmit={handleLogin}
            />
          )}
        </section>
      </div>
    </main>
  );
}

function SignupForm({
  step,
  setStep,
  selectedCity,
  setSelectedCity,
  name,
  setName,
  username,
  setUsername,
  lookingFor,
  setLookingFor,
  canHelpWith,
  setCanHelpWith,
  languages,
  setLanguages,
  email,
  setEmail,
  password,
  setPassword,
  agreed,
  setAgreed,
  error,
  submitting,
  onSubmit,
  onContinueCity,
  onContinueProfile,
}: {
  step: Step;
  setStep: (step: Step) => void;
  selectedCity: CityOption | null;
  setSelectedCity: (city: CityOption | null) => void;
  name: string;
  setName: (value: string) => void;
  username: string;
  setUsername: (value: string) => void;
  lookingFor: string[];
  setLookingFor: (value: string[]) => void;
  canHelpWith: string[];
  setCanHelpWith: (value: string[]) => void;
  languages: string[];
  setLanguages: (value: string[]) => void;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  agreed: boolean;
  setAgreed: (value: boolean) => void;
  error: string | null;
  submitting: boolean;
  onSubmit: (event: FormEvent) => void;
  onContinueCity: () => void;
  onContinueProfile: () => void;
}) {
  const canVisitStep = (next: Step) => {
    if (next === 1) return true;
    if (next === 2) return Boolean(selectedCity);
    return Boolean(selectedCity && name.trim() && username.trim().length >= 3);
  };

  return (
    <form onSubmit={onSubmit} className="mt-7">
      <StepDots active={step} onChange={setStep} canVisitStep={canVisitStep} />

      {step === 1 && (
        <div className="mt-7">
          <h1 className="font-display text-[30px] font-semibold tracking-[-0.025em]">Choose your city</h1>
          <div className="mt-6">
            <CityCombobox selected={selectedCity} onSelect={setSelectedCity} />
          </div>
          {error && <div className="mt-4"><ErrorText>{error}</ErrorText></div>}
          <div className="mt-6">
            <PrimaryButton type="button" onClick={onContinueCity} disabled={!selectedCity}>
              Continue <Arrow />
            </PrimaryButton>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mt-7">
          <h1 className="font-display text-[30px] font-semibold tracking-[-0.025em]">Your profile</h1>
          <div className="mt-6 grid gap-3">
            <Field label="Your name" placeholder="Leyla Mammadova" value={name} onChange={setName} autoComplete="name" />
            <Field
              label="Username"
              placeholder="leyla"
              value={username}
              onChange={(value) => setUsername(value.toLowerCase().replace(/[^a-z0-9._]/g, ""))}
              autoComplete="username"
            />
          </div>

          <ChipGroup title="Looking for (optional)" values={lookingFor} options={INTENT_OPTIONS} onChange={setLookingFor} />
          <ChipGroup title="Can help with (optional)" values={canHelpWith} options={HELP_OPTIONS} onChange={setCanHelpWith} />
          <ChipGroup title="Languages (optional)" values={languages} options={LANGUAGE_OPTIONS} onChange={setLanguages} />

          {error && <div className="mt-4"><ErrorText>{error}</ErrorText></div>}
          <div className="mt-6 flex items-center gap-2">
            <SecondaryButton type="button" onClick={() => setStep(1)}>Back</SecondaryButton>
            <PrimaryButton type="button" onClick={onContinueProfile}>
              Continue <Arrow />
            </PrimaryButton>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mt-7">
          <h1 className="font-display text-[30px] font-semibold tracking-[-0.025em]">Create account</h1>
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
              onChange={(event) => setAgreed(event.target.checked)}
            />
            <span>
              By signing up, I agree to the{" "}
              <Link href="/terms" className="font-semibold text-ink underline underline-offset-2">
                Terms of Use
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="font-semibold text-ink underline underline-offset-2">
                Privacy Policy
              </Link>, and confirm I'm using this platform to meet real people, not to spam.
            </span>
          </label>

          {error && <div className="mt-4"><ErrorText>{error}</ErrorText></div>}
          <div className="mt-6 flex items-center gap-2">
            <SecondaryButton type="button" onClick={() => setStep(2)}>Back</SecondaryButton>
            <PrimaryButton type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create account"} {!submitting && <Arrow />}
            </PrimaryButton>
          </div>
        </div>
      )}
    </form>
  );
}

function LoginForm({
  loginId,
  setLoginId,
  loginPassword,
  setLoginPassword,
  error,
  submitting,
  onSubmit,
}: {
  loginId: string;
  setLoginId: (value: string) => void;
  loginPassword: string;
  setLoginPassword: (value: string) => void;
  error: string | null;
  submitting: boolean;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="mt-8">
      <h1 className="font-display text-[30px] font-semibold tracking-[-0.025em]">Welcome back</h1>
      <div className="mt-6 grid gap-3">
        <Field label="Email or username" placeholder="you@mail.com" type="text" value={loginId} onChange={setLoginId} required autoComplete="username" />
        <Field label="Password" placeholder="Password" type="password" value={loginPassword} onChange={setLoginPassword} required autoComplete="current-password" />
      </div>
      {error && <div className="mt-4"><ErrorText>{error}</ErrorText></div>}
      <div className="mt-6">
        <PrimaryButton type="submit" disabled={submitting}>
          {submitting ? "Logging in..." : "Log in"} {!submitting && <Arrow />}
        </PrimaryButton>
      </div>
    </form>
  );
}

function StepDots({
  active,
  onChange,
  canVisitStep,
}: {
  active: Step;
  onChange: (step: Step) => void;
  canVisitStep: (step: Step) => boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-2" aria-label="Signup progress">
      {[
        { n: 1 as Step, label: "City" },
        { n: 2 as Step, label: "Basics" },
        { n: 3 as Step, label: "Security" },
      ].map((step) => (
        <button
          key={step.n}
          type="button"
          disabled={!canVisitStep(step.n)}
          onClick={() => onChange(step.n)}
          className={clsx(
            "group text-left disabled:cursor-not-allowed disabled:opacity-45",
            canVisitStep(step.n) && "cursor-pointer"
          )}
        >
          <span
            className={clsx(
              "block h-1.5 rounded-full transition-colors",
              active >= step.n ? "bg-ink" : "bg-paper-cool",
              canVisitStep(step.n) && active < step.n && "group-hover:bg-ink/25"
            )}
          />
          <span className="mt-2 block text-[10.5px] font-semibold tracking-[0.16em] text-ink/45 uppercase">
            {step.label}
          </span>
        </button>
      ))}
    </div>
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
                active ? "bg-ink text-paper shadow-soft" : "bg-paper-cool text-ink/65 hover:text-ink"
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
  onChange: (value: string) => void;
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
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        className="mt-1.5 h-12 w-full rounded-pill border border-paper-line bg-paper px-5 text-[14px] outline-none transition focus:border-ink/40 focus:ring-4 focus:ring-ink/[0.04]"
      />
    </label>
  );
}

function PrimaryButton({
  children,
  type,
  disabled,
  onClick,
}: {
  children: ReactNode;
  type: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="btn-press inline-flex h-12 items-center justify-center gap-2 rounded-pill bg-ink px-6 text-[14px] font-semibold text-paper disabled:cursor-not-allowed disabled:opacity-55"
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  type,
  onClick,
}: {
  children: ReactNode;
  type: "button";
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="btn-press inline-flex h-12 items-center justify-center rounded-pill border border-paper-line px-5 text-[13px] font-semibold text-ink/70 hover:border-ink/30 hover:text-ink"
    >
      {children}
    </button>
  );
}

function scorePassword(value: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  if (!value) return { score: 0, label: "" };
  let score = 0;
  if (value.length >= 10) score++;
  if (value.length >= 12) score++;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
  if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) score++;
  const label = value.length < 10 ? "Too short" : ["Weak", "Okay", "Good", "Strong"][Math.max(0, score - 1)] || "Weak";
  return { score: Math.min(4, score) as 0 | 1 | 2 | 3 | 4, label };
}

function PasswordStrength({ value }: { value: string }) {
  if (!value) return null;
  const { score, label } = scorePassword(value);
  return (
    <div className="mt-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={clsx("h-1.5 flex-1 rounded-full transition-colors", i < score ? "bg-ink" : "bg-paper-cool")} />
        ))}
      </div>
      <div className="mt-1.5 text-[11px] text-ink/55">{label}</div>
    </div>
  );
}

function ErrorText({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[14px] border border-[#e6c3c3] bg-[#fbeaea] px-4 py-2.5 text-[12.5px] text-[#b02a2a]">
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
