import clsx from "clsx";

export function Avatar({
  size = 40,
  hue = 220,
  kind = "personal",
  label,
  className,
}: {
  size?: number;
  hue?: number;
  kind?: "personal" | "circle";
  label?: string;
  className?: string;
}) {
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
        background: `conic-gradient(from ${hue}deg, #0A0A0A, #6B6B6B, #2B2B2B, #0A0A0A)`,
        fontSize: size * 0.34,
      }}
      aria-hidden
    >
      {label ? <span className="relative z-10 tracking-tight">{label}</span> : null}
    </span>
  );
}
