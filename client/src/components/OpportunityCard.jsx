import { Link } from "react-router-dom";
import RegionPill from "./RegionPill";
import StatusBadge from "./StatusBadge";
import { countryLabel, formatRelativeTime } from "../utils/format";

export default function OpportunityCard({
  opportunity,
  isOwner,
  onEdit,
  onClose,
  onDelete,
  onShare
}) {
  const clampStyle = {
    display: "-webkit-box",
    WebkitLineClamp: 3,
    WebkitBoxOrient: "vertical",
    overflow: "hidden"
  };

  return (
    <div className="glass gradient-border relative overflow-hidden rounded-2xl p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-mist">{opportunity.orgName}</p>
          <h3 className="mt-1.5 text-base leading-5 text-sand">{opportunity.title}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <StatusBadge label={opportunity.type} tone="slate" />
            <span className="text-xs text-mist">{opportunity.locationMode}</span>
            <span className="text-xs text-mist">
              {countryLabel(opportunity.country)}
              {opportunity.city ? ` · ${opportunity.city}` : ""}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <RegionPill region={opportunity.visibilityRegion} />
          <span className="text-xs text-mist">{formatRelativeTime(opportunity.createdAt)}</span>
        </div>
      </div>
      <p className="mt-3 text-sm text-mist" style={clampStyle}>
        {opportunity.description}
      </p>
      {opportunity.tags?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {opportunity.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="rounded-full bg-white/10 px-3 py-1 text-xs text-mist">
              {tag}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-3 flex items-center justify-between text-xs text-mist">
        <span className="uppercase tracking-wide">{opportunity.status}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={onShare}
            className="rounded-full border border-white/10 px-3 py-1 uppercase tracking-wide hover:border-teal"
          >
            Share
          </button>
          {isOwner && (
            <>
              <button
                onClick={onEdit}
                className="rounded-full border border-white/10 px-3 py-1 uppercase tracking-wide hover:border-teal"
              >
                Edit
              </button>
              <button
                onClick={onClose}
                className="rounded-full border border-white/10 px-3 py-1 uppercase tracking-wide hover:border-teal"
              >
                Close
              </button>
              <button
                onClick={onDelete}
                className="rounded-full border border-white/10 px-3 py-1 uppercase tracking-wide hover:border-teal"
              >
                Delete
              </button>
            </>
          )}
          <Link
            to={`/opportunities/${opportunity._id}`}
            className="rounded-full border border-white/10 px-3 py-1 uppercase tracking-wide hover:border-teal"
          >
            View details
          </Link>
        </div>
      </div>
    </div>
  );
}
