export default function StatusBadge({ label, tone = "teal" }) {
  const colors = {
    teal: "bg-teal/20 text-teal border-teal/40",
    coral: "bg-coral/20 text-coral border-coral/40",
    ember: "bg-ember/20 text-ember border-ember/40",
    slate: "bg-white/10 text-mist border-white/10"
  };

  return (
    <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-wide ${colors[tone]}`}>
      {label}
    </span>
  );
}
