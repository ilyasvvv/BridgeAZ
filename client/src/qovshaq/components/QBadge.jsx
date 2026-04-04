// Qovshaq Phase 0 — Category/tag badge
const colorMap = {
  "q-primary": "bg-q-primary-light text-q-primary",
  "q-secondary": "bg-q-secondary-light text-q-secondary",
  "q-accent": "bg-q-accent-light text-q-accent",
  "q-success": "bg-emerald-50 text-q-success",
  "q-danger": "bg-red-50 text-q-danger",
  "q-text-muted": "bg-q-surface-alt text-q-text-muted",
  default: "bg-q-surface-alt text-q-text-muted",
};

export default function QBadge({ children, color = "default", icon, className = "", onClick }) {
  const colorClass = colorMap[color] || colorMap.default;

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${colorClass} ${
        onClick ? "cursor-pointer hover:opacity-80 transition-opacity" : ""
      } ${className}`}
    >
      {icon && <span className="text-xs">{icon}</span>}
      {children}
    </span>
  );
}
