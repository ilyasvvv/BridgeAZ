import { useEffect, useMemo, useState } from "react";

const RELATIONSHIP_STYLES = {
  bridge: "shadow-glow-bridge ring-2 ring-brand/30",
  mentor: "shadow-glow-mentor ring-2 ring-coral/30",
  mentee: "shadow-glow-mentee ring-2 ring-emerald-400/30",
  follow: "shadow-glow-follow ring-1 ring-mist/20",
};

export default function Avatar({ url, alt, size = 24, className = "", relationship }) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [url]);

  const dimensions = useMemo(() => {
    if (typeof size === "number") {
      return { width: `${size}px`, height: `${size}px` };
    }
    return { width: size, height: size };
  }, [size]);

  const showImage = !!url && !imageFailed;
  const glowClass = relationship ? RELATIONSHIP_STYLES[relationship] || "" : "";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-gray-100 text-mist transition-shadow duration-300 ${glowClass} ${className}`}
      style={dimensions}
      aria-hidden="true"
    >
      {showImage ? (
        <img
          src={url}
          alt={alt || "User avatar"}
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <svg
          viewBox="0 0 24 24"
          className="h-[62%] w-[62%]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
        </svg>
      )}
    </span>
  );
}
