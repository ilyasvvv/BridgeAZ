"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/Button";
import { circlesApi } from "@/lib/circles";

type Visibility = "public" | "request" | "private";

const STEPS = ["Identity", "Place", "Rules", "Review"] as const;

export default function NewCirclePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [hue, setHue] = useState(150);
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [minAge, setMinAge] = useState(false);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuto = useMemo(
    () =>
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "")
        .slice(0, 24),
    [name]
  );
  const effectiveHandle = handle || handleAuto;

  const canContinue =
    (step === 0 && name.trim().length >= 3 && effectiveHandle.length >= 3) ||
    (step === 1 && city.trim() && country.trim()) ||
    step === 2 ||
    step === 3;

  const submit = async () => {
    if (creating) return;
    setCreating(true);
    setError(null);
    try {
      const circle = await circlesApi.create({
        name: name.trim(),
        handle: effectiveHandle.trim(),
        bio: bio.trim(),
        currentRegion: country.trim(),
        location: { city: city.trim(), country: country.trim() },
        visibility,
        minAge,
      });
      setCreated(true);
      router.push(`/circle/${circle.handle}`);
    } catch (err: any) {
      setError(err?.message || "Failed to create circle");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper-warm">
      <TopBar />
      <main className="max-w-[820px] mx-auto px-6 py-10">
        <header className="space-y-2 mb-8">
          <div className="text-[10.5px] tracking-[0.18em] text-ink/45 uppercase">
            Start a circle
          </div>
          <h1 className="font-display text-[36px] font-semibold leading-none">
            A new home, in one circle.
          </h1>
          <p className="text-[13.5px] text-ink/60 max-w-prose">
            Circles are safe spaces for Azerbaijanis around a city, a
            cause, or a craft. Be specific — the best circles feel
            small at first.
          </p>
        </header>

        <Stepper step={step} />

        <div className="mt-6 rounded-[22px] bg-paper border border-paper-line p-6 md:p-8 space-y-6">
          {step === 0 && (
            <div className="grid md:grid-cols-[140px_1fr] gap-6 items-start">
              <div className="flex flex-col items-center gap-3">
                <Avatar size={120} hue={hue} kind="circle" />
                <div className="flex items-center gap-1.5">
                  {[20, 150, 220, 300, 40].map((h) => (
                    <button
                      key={h}
                      onClick={() => setHue(h)}
                      aria-label={`Palette ${h}`}
                      className={clsx(
                        "w-6 h-6 rounded-full border",
                        hue === h ? "border-ink" : "border-paper-line"
                      )}
                      style={{
                        background: `conic-gradient(from 0deg, hsl(${h},60%,18%), hsl(${
                          h + 40
                        },40%,60%), hsl(${h},60%,18%))`,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <Field label="Circle name">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Azerbaijanis in Hamburg"
                    className="w-full h-11 px-4 rounded-[14px] bg-paper-warm border border-paper-line text-[14px] outline-none focus:border-ink/40"
                  />
                </Field>
                <Field label="Handle" hint="Lowercase letters and numbers. Used in URLs.">
                  <div className="flex items-center gap-2 h-11 px-4 rounded-[14px] bg-paper-warm border border-paper-line focus-within:border-ink/40">
                    <span className="text-ink/40 text-[13px]">bizim.circle/</span>
                    <input
                      value={handle || handleAuto}
                      onChange={(e) =>
                        setHandle(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9]/g, "")
                            .slice(0, 24)
                        )
                      }
                      placeholder="hamburg"
                      className="flex-1 bg-transparent outline-none text-[14px]"
                    />
                  </div>
                </Field>
                <Field label="Short bio" hint="One or two lines, under 140 chars.">
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value.slice(0, 140))}
                    rows={3}
                    placeholder="A tiny circle of Azerbaijanis finding each other in Hamburg — picnics, çay, opportunities."
                    className="w-full px-4 py-3 rounded-[14px] bg-paper-warm border border-paper-line text-[13.5px] outline-none focus:border-ink/40 resize-none"
                  />
                  <div className="mt-1 text-right text-[10.5px] text-ink/45">
                    {bio.length}/140
                  </div>
                </Field>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4 max-w-lg">
              <Field label="City">
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Hamburg"
                  className="w-full h-11 px-4 rounded-[14px] bg-paper-warm border border-paper-line text-[14px] outline-none focus:border-ink/40"
                />
              </Field>
              <Field label="Country">
                <input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Germany"
                  className="w-full h-11 px-4 rounded-[14px] bg-paper-warm border border-paper-line text-[14px] outline-none focus:border-ink/40"
                />
              </Field>
              <p className="text-[12px] text-ink/55 leading-relaxed pt-2">
                Circles are searchable by location. Members can opt
                out of showing their city — only the circle's location
                is always visible.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="text-[11px] tracking-[0.14em] text-ink/55 uppercase">
                Who can join
              </div>
              <div className="grid gap-2">
                {(
                  [
                    {
                      key: "public",
                      label: "Public",
                      hint: "Anyone can join and post.",
                    },
                    {
                      key: "request",
                      label: "By request",
                      hint: "You approve each member.",
                    },
                    {
                      key: "private",
                      label: "Private",
                      hint: "Invite-only. Hidden from search.",
                    },
                  ] as const
                ).map((opt) => (
                  <label
                    key={opt.key}
                    className={clsx(
                      "flex items-start gap-3 p-4 rounded-[18px] border cursor-pointer transition",
                      visibility === opt.key
                        ? "border-ink bg-paper"
                        : "border-paper-line bg-paper-warm hover:border-ink/30"
                    )}
                  >
                    <input
                      type="radio"
                      name="vis"
                      checked={visibility === opt.key}
                      onChange={() => setVisibility(opt.key)}
                      className="mt-1 accent-black"
                    />
                    <div>
                      <div className="text-[13.5px] font-semibold">
                        {opt.label}
                      </div>
                      <div className="text-[12px] text-ink/55">
                        {opt.hint}
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              <label className="flex items-start gap-3 p-4 rounded-[18px] border border-paper-line bg-paper-warm">
                <input
                  type="checkbox"
                  checked={minAge}
                  onChange={() => setMinAge((v) => !v)}
                  className="mt-1 accent-black"
                />
                <div>
                  <div className="text-[13.5px] font-semibold">
                    18+ circle
                  </div>
                  <div className="text-[12px] text-ink/55">
                    Minors can't see or join. Recommended for
                    nightlife, dating, certain housing.
                  </div>
                </div>
              </label>

              <div className="p-4 rounded-[18px] bg-paper-cool text-[12px] text-ink/65 leading-relaxed">
                <b className="text-ink">Community guidelines</b> apply
                automatically. You'll be able to write a circle-specific
                charter after creation.
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid md:grid-cols-[120px_1fr] gap-5">
              <Avatar size={100} hue={hue} kind="circle" />
              <div className="space-y-3">
                <div>
                  <div className="font-display text-[26px] font-semibold leading-none">
                    {name || "Untitled circle"}
                  </div>
                  <div className="text-[12px] text-ink/50 mt-1">
                    bizim.circle/{effectiveHandle || "handle"}
                  </div>
                </div>
                <p className="text-[13px] text-ink/75 leading-relaxed">
                  {bio || "A new home, in one circle."}
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Chip icon="Pin">
                    {city || "City"}, {country || "Country"}
                  </Chip>
                  <Chip icon="Globe">
                    {visibility === "public"
                      ? "Public"
                      : visibility === "request"
                      ? "By request"
                      : "Private"}
                  </Chip>
                  {minAge && <Chip icon="User">18+</Chip>}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            {error && (
              <div className="mr-4 text-[12px] text-red-700">
                {error}
              </div>
            )}
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className={clsx(
                "text-[12.5px] font-semibold text-ink/60 hover:text-ink",
                step === 0 && "invisible"
              )}
            >
              ← Back
            </button>
            {step < STEPS.length - 1 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canContinue}
              >
                Continue
              </Button>
            ) : (
              <Button
                onClick={submit}
                loading={creating}
                success={created}
                successLabel="Created"
              >
                Create circle
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-2 flex-1">
          <div
            className={clsx(
              "w-7 h-7 rounded-full inline-flex items-center justify-center text-[11.5px] font-semibold transition",
              i < step && "bg-ink text-paper",
              i === step && "bg-ink text-paper ring-4 ring-ink/10",
              i > step && "bg-paper-cool text-ink/50"
            )}
          >
            {i < step ? <Icon.Check size={13} /> : i + 1}
          </div>
          <div
            className={clsx(
              "text-[11.5px] font-semibold",
              i === step ? "text-ink" : "text-ink/50"
            )}
          >
            {s}
          </div>
          {i < STEPS.length - 1 && (
            <div className="flex-1 h-px bg-paper-line" />
          )}
        </div>
      ))}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[11px] tracking-[0.14em] text-ink/55 uppercase font-semibold">
          {label}
        </label>
        {hint && (
          <span className="text-[10.5px] text-ink/40">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function Chip({
  icon,
  children,
}: {
  icon: keyof typeof Icon;
  children: React.ReactNode;
}) {
  const Ico = Icon[icon];
  return (
    <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-pill bg-paper-cool text-[11.5px] font-semibold text-ink/75">
      <Ico size={12} />
      {children}
    </span>
  );
}
