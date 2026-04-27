"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/Button";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import { circlesApi } from "@/lib/circles";
import { accentSwatches, brandAccent, mascotAccentSwatches } from "@/lib/design-tokens";
import { emitPlayfulBurst } from "@/lib/playful";
import { uploadFile } from "@/lib/uploads";

type Visibility = "public" | "request" | "private";

const STEPS = ["Identity", "Place", "Rules", "Review"] as const;

const PALETTES = accentSwatches;

const PURPOSES = [
  "Newcomer help",
  "Tea meetups",
  "Career leads",
  "Student support",
  "Weekend events",
  "Family circle",
];

const MASCOT_ACCENTS = mascotAccentSwatches.slice(0, 8);
const MASCOT_MOTIONS = [
  "drift",
  "bop",
  "pulse",
  "spark",
  "jelly",
  "wink",
  "bounce",
  "full-sway",
] as const;

export default function NewCirclePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [accentHex, setAccentHex] = useState<string>(brandAccent.bg);
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [purpose, setPurpose] = useState(PURPOSES[0]);
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [picturePreview, setPicturePreview] = useState("");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedAccent = useMemo(
    () => PALETTES.find((item) => item.hex === accentHex) || PALETTES[0],
    [accentHex]
  );
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

  useEffect(() => {
    if (!pictureFile) {
      setPicturePreview("");
      return;
    }

    const previewUrl = URL.createObjectURL(pictureFile);
    setPicturePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [pictureFile]);

  const choosePicture = (file?: File) => {
    if (!file) return;
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Choose an image file for the circle picture.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Choose an image under 5 MB for the circle picture.");
      return;
    }

    setPictureFile(file);
  };

  const clearPicture = () => {
    setPictureFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submit = async () => {
    if (creating) return;
    setCreating(true);
    setError(null);
    try {
      let avatarUrl: string | undefined;
      if (pictureFile) {
        const uploaded = await uploadFile(pictureFile, "avatar");
        avatarUrl = uploaded.documentUrl;
      }

      const circle = await circlesApi.create({
        name: name.trim(),
        handle: effectiveHandle.trim(),
        bio: bio.trim(),
        currentRegion: country.trim(),
        location: { city: city.trim(), country: country.trim() },
        visibility,
        avatarUrl,
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
                <Field label="Palette" hint="From /design">
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {PALETTES.map((palette) => (
                      <button
                        key={palette.name}
                        type="button"
                        onClick={() => setAccentHex(palette.hex)}
                        className={clsx(
                          "btn-press flex min-h-16 items-center gap-3 rounded-[18px] border p-3 text-left transition",
                          accentHex === palette.hex
                            ? "bg-paper"
                            : "border-paper-line bg-paper-warm hover:border-ink/30"
                        )}
                        style={
                          accentHex === palette.hex
                            ? {
                                borderColor: palette.hex,
                                background: `linear-gradient(0deg, ${palette.hex}55, ${palette.hex}55), #fff`,
                              }
                            : undefined
                        }
                      >
                        <span
                          className="h-9 w-9 shrink-0 rounded-full border border-ink/10 shadow-soft"
                          style={{
                            background: palette.hex,
                          }}
                        />
                        <span className="min-w-0">
                          <span className="block text-[12.5px] font-semibold leading-tight">
                            {palette.name}
                          </span>
                          <span className="mt-0.5 block text-[10.5px] font-mono text-ink/45">
                            {palette.hex}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Picture" hint="Optional">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                      <Avatar
                        size={64}
                        kind="circle"
                        accent={selectedAccent.hex}
                        src={picturePreview}
                        alt={name ? `${name} circle picture` : "Circle picture preview"}
                      />
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-semibold">
                          {pictureFile ? pictureFile.name : "No picture selected"}
                        </div>
                        <div className="mt-0.5 text-[11px] text-ink/45">
                          PNG, JPG, or WebP under 5 MB
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:ml-auto">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => choosePicture(e.target.files?.[0])}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn-press inline-flex h-9 items-center gap-1.5 rounded-pill border border-paper-line bg-paper-warm px-3 text-[12px] font-semibold text-ink/70 hover:border-ink/30"
                      >
                        <Icon.Image size={13} />
                        {pictureFile ? "Change" : "Add picture"}
                      </button>
                      {pictureFile && (
                        <button
                          type="button"
                          onClick={clearPicture}
                          className="btn-press inline-flex h-9 items-center gap-1.5 rounded-pill border border-paper-line bg-paper-warm px-3 text-[12px] font-semibold text-ink/60 hover:border-ink/30"
                        >
                          <Icon.Close size={12} />
                          Remove
                        </button>
                      )}
                    </div>
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
                            ? "text-ink"
                            : "border-paper-line bg-paper-warm text-ink/62 hover:border-ink/30"
                        )}
                        style={
                          purpose === item
                            ? {
                                borderColor: selectedAccent.hex,
                                background: `linear-gradient(0deg, ${selectedAccent.hex}66, ${selectedAccent.hex}66), #fff`,
                              }
                            : undefined
                        }
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
              <Avatar
                size={100}
                accent={selectedAccent.hex}
                kind="circle"
                src={picturePreview}
                alt={name ? `${name} circle picture` : "Circle picture"}
              />
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
            accentHex={selectedAccent.hex}
            picturePreview={picturePreview}
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
  accentHex,
  picturePreview,
  city,
  country,
  visibility,
  purpose,
  step,
}: {
  name: string;
  handle: string;
  bio: string;
  accentHex: string;
  picturePreview: string;
  city: string;
  country: string;
  visibility: Visibility;
  purpose: string;
  step: number;
}) {
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

      <div className="relative mt-5 flex h-60 items-center justify-center overflow-hidden rounded-[22px] bg-paper-warm">
        <div className="absolute h-72 w-72 rounded-full border border-ink/10" />
        <div className="absolute h-52 w-52 rounded-full border border-ink/10 animate-spin-slower" />
        <div className="absolute h-32 w-32 rounded-full border border-ink/10" />
        <OrbitingMascots />
        <Avatar
          size={122}
          accent={accentHex}
          kind="circle"
          src={picturePreview}
          alt={name ? `${name} circle picture` : "Circle picture"}
          className="relative z-10 shadow-pop"
        />
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

function OrbitingMascots() {
  return (
    <div className="orbit-field pointer-events-none absolute inset-0 z-[1]" aria-hidden>
      {MASCOT_ACCENTS.map((accent, index) => {
        const angle = -92 + index * (360 / MASCOT_ACCENTS.length);
        const radians = (angle * Math.PI) / 180;
        const x = Math.cos(radians) * 122;
        const y = Math.sin(radians) * 82;
        const mascotSize = index % 2 === 0 ? 31 : 27;

        return (
          <span
            key={accent.name}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `calc(50% + ${x.toFixed(1)}px)`,
              top: `calc(50% + ${y.toFixed(1)}px)`,
            }}
          >
            <span className="orbit-keyword-counter-shell inline-flex drop-shadow-sm">
              <AnimatedLogo
                size={mascotSize}
                motion={MASCOT_MOTIONS[index % MASCOT_MOTIONS.length]}
                faceColor={accent.hex}
                title={`${accent.name} mascot`}
              />
            </span>
          </span>
        );
      })}
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
