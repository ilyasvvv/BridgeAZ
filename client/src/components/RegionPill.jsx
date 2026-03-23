import { regionLabel } from "../utils/format";

export default function RegionPill({ region }) {
  const label = regionLabel(region) || "—";
  return (
    <span className="rounded-full border border-border bg-charcoal px-3 py-1 text-xs uppercase tracking-wide text-mist">
      {label}
    </span>
  );
}
