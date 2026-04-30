"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

export function Avatar({
  size = 40,
  hue = 220,
  kind = "personal",
  src,
  alt = "",
  className,
}: {
  size?: number;
  hue?: number;
  kind?: "personal" | "circle";
  label?: string;
  src?: string;
  alt?: string;
  className?: string;
}) {
  const face = avatarFacePalette(hue);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const visibleSrc = src && failedSrc !== src ? src : undefined;

  useEffect(() => {
    setFailedSrc(null);
  }, [src]);

  return (
    <span
      className={clsx(
        "inline-flex items-center justify-center shrink-0 relative overflow-hidden font-semibold",
        kind === "circle" ? "rounded-full ring-2 ring-paper shadow-soft" : "rounded-full",
        className
      )}
      style={{
        width: size,
        height: size,
        background: visibleSrc
          ? `hsl(${hue} 28% 20%)`
          : `radial-gradient(circle at 30% 24%, rgba(255,255,255,0.38), transparent 38%), ${face.fill}`,
        fontSize: size * 0.34,
      }}
      aria-hidden={!visibleSrc}
    >
      {visibleSrc ? (
        <img
          src={visibleSrc}
          alt={alt}
          className="h-full w-full object-cover"
          onError={() => setFailedSrc(visibleSrc)}
        />
      ) : (
        <svg
          viewBox="0 0 100 100"
          width={size}
          height={size}
          className="absolute inset-0"
          aria-hidden
        >
          <circle
            cx="50"
            cy="50"
            r="46"
            fill={face.fill}
            stroke="#0A0A0A"
            strokeWidth={kind === "circle" ? 6 : 5}
          />
          <circle cx="35" cy="43" r="5.8" fill="#0A0A0A" />
          <circle cx="52" cy="43" r="5.8" fill="#0A0A0A" />
        </svg>
      )}
    </span>
  );
}

function avatarFacePalette(hue: number) {
  const colors = [
    "#C1FF72",
    "#B8E8C9",
    "#B8D8E8",
    "#D5C8E8",
    "#F0C8C8",
    "#F5C9A8",
    "#F5E58A",
    "#CCD8B8",
  ];
  const index = Math.abs(Math.round(hue)) % colors.length;
  return { fill: colors[index] };
}
