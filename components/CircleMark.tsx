"use client";

import clsx from "clsx";
import { CSSProperties, useState } from "react";

type Props = {
  size?: number;
  rings?: number;
  orbiting?: string[];
  centerLabel?: { top: string; bottom?: string };
  className?: string;
  animate?: boolean;
};

/**
 * The signature radial mark used across the brand — concentric rings with
 * orbiting pill labels. Renders purely with SVG + absolutely positioned pills
 * so it stays crisp at any size.
 */
export function CircleMark({
  size = 520,
  rings = 3,
  orbiting = ["PEOPLE", "CIRCLES", "MENTORS"],
  centerLabel = { top: "bizim", bottom: "circle" },
  className,
  animate = true,
}: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const radii = Array.from({ length: rings }, (_, i) => (size / 2) * (0.42 + i * 0.18));
  const activeOrbit = orbiting[activeIndex] ?? orbiting[0] ?? centerLabel.bottom ?? centerLabel.top;
  const orbitPresets = [
    { angle: -88, ring: 2, driftX: "14px", driftY: "10px", duration: "17s", delay: "-2s", tilt: "1.4deg" },
    { angle: -20, ring: 1, driftX: "12px", driftY: "14px", duration: "15s", delay: "-7s", tilt: "-1.2deg" },
    { angle: 44, ring: 2, driftX: "16px", driftY: "9px", duration: "18s", delay: "-5s", tilt: "1.7deg" },
    { angle: 160, ring: 2, driftX: "13px", driftY: "12px", duration: "16s", delay: "-11s", tilt: "-1.5deg" },
    { angle: 226, ring: 1, driftX: "11px", driftY: "13px", duration: "19s", delay: "-3s", tilt: "1deg" },
  ];
  const activeRingIndex = Math.min(
    orbitPresets[activeIndex % orbitPresets.length]?.ring ?? radii.length - 1,
    radii.length - 1
  );

  return (
    <div
      className={clsx("relative", className)}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        className={clsx("absolute inset-0", animate && "animate-spin-slower")}
      >
        {radii.map((r, i) => (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(0,0,0,0.08)"
            strokeWidth="1"
          />
        ))}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radii[activeRingIndex]}
          fill="none"
          stroke="rgba(10,10,10,0.16)"
          strokeWidth="1.4"
        />
      </svg>

      {/* Center white disk with brand lockup */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-pop flex items-center justify-center"
        style={{ width: size * 0.34, height: size * 0.34 }}
      >
        <div className="flex flex-col items-center gap-1">
          <span className="block w-1.5 h-1.5 bg-ink rounded-[2px]" />
          <div className="flex items-center gap-2 text-[13px] font-semibold tracking-tight">
            <span>{centerLabel.top}</span>
            {centerLabel.bottom && <span className="text-ink/50 font-light">{centerLabel.bottom}</span>}
          </div>
          <span className="mt-1 text-[9px] font-semibold tracking-[0.24em] text-ink/36">
            {activeOrbit}
          </span>
        </div>
      </div>

      {/* Orbiting pill labels — placed on the orbital field and remain clickable */}
      <div className={clsx("absolute inset-0", animate && "orbit-field")}>
        {orbiting.map((label, i) => {
          const preset = orbitPresets[i % orbitPresets.length];
          const angle = preset.angle;
          const ringIndex = Math.min(preset.ring, radii.length - 1);
          const r = radii[ringIndex];
          const x = size / 2 + r * Math.cos((angle * Math.PI) / 180);
          const y = size / 2 + r * Math.sin((angle * Math.PI) / 180);
          const style = {
            left: x,
            top: y,
            "--orbit-drift-x": preset.driftX,
            "--orbit-drift-y": preset.driftY,
            "--orbit-duration": preset.duration,
            "--orbit-delay": preset.delay,
            "--orbit-tilt": preset.tilt,
          } as CSSProperties;
          const isActive = i === activeIndex;

          return (
            <div
              key={label}
              className="absolute orbit-keyword-anchor"
              style={style}
            >
              <div className={clsx(animate && "orbit-keyword-counter-shell")}>
                <button
                  type="button"
                  aria-pressed={isActive}
                  className={clsx(
                    "orbit-keyword-button",
                    isActive && "orbit-keyword-button-active"
                  )}
                  onMouseEnter={() => setActiveIndex(i)}
                  onFocus={() => setActiveIndex(i)}
                  onClick={() => setActiveIndex(i)}
                >
                  {label}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
