"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/Button";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import { circlesApi } from "@/lib/circles";
import { emitPlayfulBurst } from "@/lib/playful";

type Visibility = "public" | "request" | "private";

const STEPS = ["Identity", "Place", "Rules", "Review"] as const;

const PALETTES = [
  { hue: 20, name: "Warm room" },
  { hue: 150, name: "Fresh start" },
  { hue: 220, name: "Career pulse" },
  { hue: 300, name: "Creative spark" },
  { hue: 40, name: "Weekend glow" },
];

const PURPOSES = [
  "Newcomer help",
  "Tea meetups",
  "Career leads",
  "Student support",
  "Weekend events",
  "Family circle",
];

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
  const [purpose, setPurpose] = useState(PURPOSES[0]);
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
      });
      setCreated(true);
      emitPlayfulBurst("circle born");
      router.push(`/circle/${encodeURIComponent(circle.handle)}`);
    } catch (err: any) {
      setError(err?.message || "Failed to create circle");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper-warm">
      <TopBar />
      <main className="max-w-[1180px] mx-auto px-6 py-10">
        <header className="space-y-2 mb-8">
          <div className="text-[10.5px] tracking-[0.18em] text-ink/45 uppercase">
            Start a circle
          </div>
          <h1 className="font-display text-[36px] font-semibold leading-none">
            A new home, in one circle.
          </h1>
        </header>

        <Stepper step={step} />

        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="rounded-[22px] bg-paper border border-paper-line p-6 md:p-8 space-y-6">
            {step === 0 && (
              <div className="space-y-5">
                <Field label="Circle name">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Azerbaijanis in Hamburg"
                    className="w-full h-11 px-4 rounded-[14px] bg-paper-warm border border-paper-line text-[14px] outline-none focus:border-ink/40"
                  />
                </Field>
                <Field label="Palette">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {PALETTES.map((palette) => (
                      <button
                        key={palette.hue}
                        type="button"
                        onClick={() => setHue(palette.hue)}
                        className={clsx(
                          "btn-press flex items-center gap-3 rounded-[18px] border p-3 text-left transition",
                          hue === palette.hue
                            ? "border-[#8FC23A] bg-[#EAFCC4]"
                            : "border-paper-line bg-paper-warm hover:border-ink/30"
                        )}
                      >
                        <span
                          className="h-10 w-10 shrink-0 rounded-full border border-ink/10"
                          style={{
                            background: `conic-gradient(from 0deg, hsl(${palette.hue},60%,18%), hsl(${palette.hue + 40},40%,60%), hsl(${palette.hue},60%,18%))`,
                          }}
                        />
                        <span className="min-w-0">
                          <span className="block text-[13px] font-semibold">{palette.name}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Handle">
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
                <Field label="Purpose">
                  <div className="flex flex-wrap gap-1.5">
                    {PURPOSES.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setPurpose(item)}
                        className={clsx(
                          "btn-press h-8 rounded-pill border px-3 text-[12px] font-semibold",
                          purpose === item
                            ? "border-[#8FC23A] bg-[#EAFCC4] text-ink"
                            : "border-paper-line bg-paper-warm text-ink/62 hover:border-ink/30"
                        )}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Short bio">
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
                    { key: "public", label: "Public" },
                    { key: "request", label: "By request" },
                    { key: "private", label: "Private" },
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
                    </div>
                  </label>
                ))}
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
                  <Chip icon="Sparkle">{purpose}</Chip>
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

          <CircleLivePreview
            name={name}
            handle={effectiveHandle}
            bio={bio}
            hue={hue}
            city={city}
            country={country}
            visibility={visibility}
            purpose={purpose}
            step={step}
          />
        </div>
      </main>
    </div>
  );
}

function CircleLivePreview({
  name,
  handle,
  bio,
  hue,
  city,
  country,
  visibility,
  purpose,
  step,
}: {
  name: string;
  handle: string;
  bio: string;
  hue: number;
  city: string;
  country: string;
  visibility: Visibility;
  purpose: string;
  step: number;
}) {
  const palette = PALETTES.find((item) => item.hue === hue) || PALETTES[0];
  const visibilityLabel =
    visibility === "public" ? "Open door" : visibility === "request" ? "Knock first" : "Invite only";

  return (
    <aside className="lg:sticky lg:top-[88px] h-fit rounded-[26px] border border-paper-line bg-paper p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-ink/45">
            Circle seal
          </div>
        </div>
        <AnimatedLogo size={42} motion={step === 3 ? "full-dance" : "full-sway"} />
      </div>

      <div className="relative mt-5 flex h-56 items-center justify-center overflow-hidden rounded-[22px] bg-paper-warm">
        <div className="absolute h-72 w-72 rounded-full border border-ink/10" />
        <div className="absolute h-52 w-52 rounded-full border border-ink/10 animate-spin-slower" />
        <div className="absolute h-32 w-32 rounded-full border border-ink/10" />
        <Avatar size={122} hue={hue} kind="circle" className="relative shadow-pop" />
      </div>

      <div className="mt-5">
        <h2 className="font-display text-[24px] font-semibold leading-none tracking-[-0.02em]">
          {name || "Untitled circle"}
        </h2>
        <div className="mt-1 text-[12px] font-semibold text-ink/45">
          bizim.circle/{handle || "handle"}
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-ink/68">
          {bio || "A warm circle for people finding each other abroad."}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Chip icon="Sparkle">{purpose}</Chip>
        <Chip icon="Globe">{visibilityLabel}</Chip>
        <Chip icon="Pin">{[city || "City", country || "Country"].join(", ")}</Chip>
      </div>

    </aside>
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
