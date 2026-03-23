import { regionLabel } from "../utils/format";

export default function RegionPill({ region }) {
  const label = regionLabel(region) || "—";
  return (
    <span className="rounded-full border border-black/[0.05] bg-bg-surface px-3 py-0.5 text-[11px] font-semibold uppercase tracking-tight text-text-secondary shadow-sm">
      {label}
    </span>
  );
}
