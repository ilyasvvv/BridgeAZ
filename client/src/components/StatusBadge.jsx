export default function StatusBadge({ label, tone = "blue" }) {
  const tones = {
    blue: "bg-brand-blue/10 text-brand-blue border-brand-blue/20",
    success: "bg-accent-success/10 text-accent-success border-accent-success/20",
    warning: "bg-accent-warning/10 text-accent-warning border-accent-warning/20",
    error: "bg-accent-error/10 text-accent-error border-accent-error/20",
    slate: "bg-bg-app text-text-secondary border-black/[0.05]"
  };

  const currentTone = tones[tone] || tones.blue;

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-tight ${currentTone}`}>
      {label}
    </span>
  );
}
