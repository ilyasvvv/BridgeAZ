const statusColors = {
  online: { color: "#22c55e", glow: "0 0 10px rgba(34,197,94,0.9)" },
  warning: { color: "#f59e0b", glow: "0 0 10px rgba(245,158,11,0.9)" },
  alert: { color: "#ff4757", glow: "0 0 10px rgba(255,71,87,0.95)" }
};

export default function StatusLamp({ status = "online", label, pulse = true }) {
  const tone = statusColors[status] || statusColors.online;

  return (
    <div className="industrial-status-lamp">
      <span
        aria-hidden="true"
        className={`industrial-status-dot ${pulse ? "animate-pulse" : ""}`}
        style={{ backgroundColor: tone.color, boxShadow: tone.glow }}
      />
      <span className="industrial-label">{label}</span>
    </div>
  );
}
