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
    <div className="glass group relative overflow-hidden rounded-2xl border border-border bg-white p-5 transition-all hover:border-sand/30 hover:bg-white">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-accent/80">
                {opportunity.orgName}
              </span>
              <span className="h-1 w-1 rounded-full bg-mist/30" />
              <span className="font-sans text-[10px] font-medium uppercase tracking-widest text-mist">
                {formatRelativeTime(opportunity.createdAt)}
              </span>
            </div>
            <h3 className="font-display text-xl leading-tight text-sand decoration-accent/30 decoration-1 underline-offset-4 group-hover:underline">
              {opportunity.title}
            </h3>
          </div>
          <div className="shrink-0">
            <RegionPill region={opportunity.visibilityRegion} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge label={opportunity.type} tone="slate" />
          <div className="flex items-center gap-1.5 font-sans text-xs text-mist">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>
              {countryLabel(opportunity.country)}
              {opportunity.city ? ` · ${opportunity.city}` : ""}
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-sans text-xs text-mist">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>{opportunity.locationMode}</span>
          </div>
        </div>

        <p className="font-sans text-sm leading-relaxed text-mist/90" style={clampStyle}>
          {opportunity.description}
        </p>

        {opportunity.tags?.length ? (
          <div className="flex flex-wrap gap-1.5">
            {opportunity.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-md bg-charcoal px-2 py-1 font-sans text-[10px] font-medium uppercase tracking-wider text-mist/70">
                #{tag}
              </span>
            ))}
            {opportunity.tags.length > 3 && (
              <span className="px-1 py-1 font-sans text-[10px] text-mist/50">+{opportunity.tags.length - 3}</span>
            )}
          </div>
        ) : null}

        <div className="mt-2 flex items-center justify-between border-t border-border pt-4">
          <div className="flex items-center gap-2">
            <span className={`h-1.5 w-1.5 rounded-full ${opportunity.status === "open" ? "bg-accent shadow-[0_0_8px_rgb(var(--accent)/0.3)]" : "bg-mist/30"}`} />
            <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-mist">
              {opportunity.status}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onShare}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-mist hover:border-sand/30 hover:text-accent transition-colors"
              title="Share"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 100-2.684 3 3 0 000 2.684zm0 9a3 3 0 100-2.684 3 3 0 000 2.684z" />
              </svg>
            </button>
            
            {isOwner && (
              <div className="flex items-center gap-1.5 rounded-full bg-charcoal p-1 border border-border">
                <button
                  onClick={onEdit}
                  className="rounded-full px-2 py-1 font-sans text-[10px] font-bold uppercase tracking-tight text-mist hover:bg-gray-100 hover:text-sand transition-all"
                >
                  Edit
                </button>
                <button
                  onClick={onClose}
                  className="rounded-full px-2 py-1 font-sans text-[10px] font-bold uppercase tracking-tight text-mist hover:bg-gray-100 hover:text-sand transition-all"
                >
                  Close
                </button>
                <button
                  onClick={onDelete}
                  className="rounded-full px-2 py-1 font-sans text-[10px] font-bold uppercase tracking-tight text-coral/80 hover:bg-coral/10 hover:text-coral transition-all"
                >
                  Delete
                </button>
              </div>
            )}
            
            <Link
              to={`/opportunities/${opportunity._id}`}
              className="rounded-full bg-accent px-4 py-1.5 font-sans text-[10px] font-bold uppercase tracking-widest text-charcoal hover:bg-accent/90 transition-all shadow-sm"
            >
              Details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
