import { regionLabel } from "../utils/format";

export default function RegionPill({ region }) {
  const label = regionLabel(region) || "—";
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-wide text-mist">
      {label}
    </span>
  );
}
