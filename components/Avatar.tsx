import clsx from "clsx";

export function Avatar({
  size = 40,
  hue = 220,
  kind = "personal",
  label,
  className,
  src,
  alt = "",
  accent,
}: {
  size?: number;
  hue?: number;
  kind?: "personal" | "circle";
  label?: string;
  className?: string;
  src?: string;
  alt?: string;
  accent?: string;
}) {
  const fallbackBackground = accent
    ? `radial-gradient(circle at 30% 24%, rgba(255,255,255,0.88), transparent 30%), linear-gradient(135deg, ${accent}, #0A0A0A 120%)`
    : `conic-gradient(from ${hue}deg, #0A0A0A, #6B6B6B, #2B2B2B, #0A0A0A)`;

  return (
    <span
      className={clsx(
        "inline-flex items-center justify-center shrink-0 relative overflow-hidden text-paper font-semibold",
        kind === "circle" ? "rounded-full ring-2 ring-paper shadow-soft" : "rounded-full",
        className
      )}
      style={{
        width: size,
        height: size,
        background: fallbackBackground,
        fontSize: size * 0.34,
      }}
      aria-hidden={src ? undefined : true}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : label ? (
        <span className="relative z-10 tracking-tight">{label}</span>
      ) : null}
    </span>
  );
}
