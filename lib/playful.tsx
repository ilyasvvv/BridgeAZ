"use client";

import { useEffect, useState, type ReactNode } from "react";
import clsx from "clsx";

const STORAGE_KEY = "bc_playful_mode";

type Burst = {
  id: number;
  x: number;
  y: number;
  label?: string;
};

export function emitPlayfulBurst(label?: string, x?: number, y?: number) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("bizim:celebrate", {
      detail: { label, x, y },
    })
  );
}

export function isPlayfulEnabled() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(STORAGE_KEY) !== "off";
}

export function setPlayfulEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
  window.dispatchEvent(new CustomEvent("bizim:playful-mode", { detail: { enabled } }));
}

export function PlayfulProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(true);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [party, setParty] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);
  const [, setKeyTrail] = useState<string[]>([]);

  useEffect(() => {
    setEnabled(isPlayfulEnabled());
  }, []);

  useEffect(() => {
    document.documentElement.dataset.playful = enabled ? "on" : "off";
  }, [enabled]);

  useEffect(() => {
    const onMode = (event: Event) => {
      const next = (event as CustomEvent<{ enabled: boolean }>).detail?.enabled;
      if (typeof next === "boolean") setEnabled(next);
    };

    const onCelebrate = (event: Event) => {
      if (!isPlayfulEnabled()) return;
      const detail = (event as CustomEvent<{ label?: string; x?: number; y?: number }>).detail || {};
      const id = Date.now() + Math.random();
      setBursts((current) => [
        ...current,
        {
          id,
          x: detail.x ?? Math.round(window.innerWidth / 2),
          y: detail.y ?? Math.round(window.innerHeight / 2),
          label: detail.label,
        },
      ]);
      window.setTimeout(() => {
        setBursts((current) => current.filter((burst) => burst.id !== id));
      }, 1200);
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest("[data-bizim-logo]")) return;
      setLogoClicks((current) => {
        const next = current + 1;
        if (next >= 5) {
          emitPlayfulBurst("circle unlocked", event.clientX, event.clientY);
          setParty(true);
          window.setTimeout(() => setParty(false), 1800);
          return 0;
        }
        window.setTimeout(() => setLogoClicks(0), 1300);
        return next;
      });
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable='true']")) return;
      const code = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];
      setKeyTrail((current) => {
        const next = [...current, event.key.toLowerCase()].slice(-code.length);
        if (next.join(",") === code.join(",")) {
          emitPlayfulBurst("lime rush", window.innerWidth / 2, window.innerHeight / 2);
          setParty(true);
          window.setTimeout(() => setParty(false), 1800);
          return [];
        }
        return next;
      });
    };

    window.addEventListener("bizim:playful-mode", onMode);
    window.addEventListener("bizim:celebrate", onCelebrate);
    document.addEventListener("click", onClick);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("bizim:playful-mode", onMode);
      window.removeEventListener("bizim:celebrate", onCelebrate);
      document.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <>
      {children}
      <div className={clsx("playful-party-layer", party && enabled && "playful-party-layer-on")} aria-hidden />
      {enabled &&
        bursts.map((burst) => (
          <div
            key={burst.id}
            className="playful-burst"
            style={{ left: burst.x, top: burst.y }}
            aria-hidden
          >
            <span />
            <span />
            <span />
            <span />
            {burst.label && <b>{burst.label}</b>}
          </div>
        ))}
    </>
  );
}
