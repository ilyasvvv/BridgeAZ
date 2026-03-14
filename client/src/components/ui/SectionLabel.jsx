export default function SectionLabel({ children, accent = false, className = "" }) {
  return (
    <p
      className={[
        "industrial-label industrial-kicker inline-flex items-center gap-2 rounded-full px-3 py-2",
        accent ? "bg-[rgba(255,71,87,0.12)] text-[var(--industrial-accent)]" : "bg-white/40",
        className
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span
        aria-hidden="true"
        className={`h-2 w-2 rounded-full ${accent ? "bg-[var(--industrial-accent)]" : "bg-[var(--industrial-deep)]"}`}
      />
      {children}
    </p>
  );
}
