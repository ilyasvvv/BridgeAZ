import { useState, useRef, useEffect } from "react";
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
  onShare,
  style
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  const clampStyle = {
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden"
  };

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-border bg-white shadow-card transition-all duration-300 hover:shadow-elevated hover:-translate-y-0.5"
      style={style}
    >
      {/* Top bar — revealed on hover */}
      <div className="h-[3px] bg-gradient-to-r from-transparent via-sand to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="flex flex-col gap-3 p-5">
        {/* Row 1: org + status + time */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-sans text-[11px] font-bold uppercase tracking-widest text-accent/80 truncate">
              {opportunity.orgName}
            </span>
            <span className="h-0.5 w-0.5 rounded-full bg-mist/30 shrink-0" />
            <span className="font-sans text-[10px] text-mist/50 shrink-0 whitespace-nowrap">
              {formatRelativeTime(opportunity.createdAt)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`h-1.5 w-1.5 rounded-full transition-colors ${opportunity.status === "open" ? "bg-accent shadow-[0_0_6px_rgb(var(--accent)/0.25)]" : "bg-mist/25"}`} />
            <span className="font-sans text-[9px] font-bold uppercase tracking-widest text-mist/50">
              {opportunity.status}
            </span>
          </div>
        </div>

        {/* Row 2: title */}
        <h3 className="font-display text-xl leading-snug text-sand decoration-accent/20 decoration-1 underline-offset-4 transition-colors duration-200 group-hover:text-sand">
          {opportunity.title}
        </h3>

        {/* Row 3: meta chips */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <StatusBadge label={opportunity.type} tone="slate" />
          <div className="flex items-center gap-1 text-mist/60">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="font-sans text-xs">
              {countryLabel(opportunity.country)}{opportunity.city ? ` · ${opportunity.city}` : ""}
            </span>
          </div>
          <div className="flex items-center gap-1 text-mist/60">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="font-sans text-xs">{opportunity.locationMode}</span>
          </div>
          <RegionPill region={opportunity.visibilityRegion} />
        </div>

        {/* Row 4: description */}
        <p className="font-sans text-[13px] leading-relaxed text-mist/80" style={clampStyle}>
          {opportunity.description}
        </p>

        {/* Row 5: tags */}
        {opportunity.tags?.length ? (
          <div className="flex flex-wrap gap-1.5">
            {opportunity.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-md bg-surface-alt px-2 py-0.5 font-sans text-[10px] font-medium text-mist/60">
                {tag}
              </span>
            ))}
            {opportunity.tags.length > 3 && (
              <span className="px-1 py-0.5 font-sans text-[10px] text-mist/35">
                +{opportunity.tags.length - 3}
              </span>
            )}
          </div>
        ) : null}

        {/* Row 6: footer actions */}
        <div className="mt-1 flex items-center justify-between border-t border-border/50 pt-3">
          <div className="flex items-center gap-1">
            {/* Share button */}
            <button
              onClick={onShare}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-mist/40 transition-all hover:bg-surface-alt hover:text-sand"
              title="Share"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 100-2.684 3 3 0 000 2.684zm0 9a3 3 0 100-2.684 3 3 0 000 2.684z" />
              </svg>
            </button>

            {/* Owner actions dropdown */}
            {isOwner && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((p) => !p)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-mist/40 transition-all hover:bg-surface-alt hover:text-sand"
                  title="Manage"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
                {menuOpen && (
                  <div
                    className="absolute bottom-full left-0 z-30 mb-2 w-40 overflow-hidden rounded-xl border border-border bg-white shadow-floating"
                    style={{ animation: "opp-dropdown 0.15s ease-out" }}
                  >
                    <button
                      onClick={() => { onEdit(); setMenuOpen(false); }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left font-sans text-xs font-medium text-sand transition-colors hover:bg-surface-alt"
                    >
                      <svg className="h-3.5 w-3.5 text-mist" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                    <button
                      onClick={() => { onClose(); setMenuOpen(false); }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left font-sans text-xs font-medium text-sand transition-colors hover:bg-surface-alt"
                    >
                      <svg className="h-3.5 w-3.5 text-mist" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      Close
                    </button>
                    <div className="mx-3 border-t border-border" />
                    <button
                      onClick={() => { onDelete(); setMenuOpen(false); }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left font-sans text-xs font-medium text-coral transition-colors hover:bg-coral/5"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <Link
            to={`/opportunities/${opportunity._id}`}
            className="group/btn inline-flex items-center gap-1.5 rounded-full bg-sand/5 px-4 py-1.5 font-sans text-[11px] font-semibold text-sand transition-all duration-200 hover:bg-sand hover:text-white hover:shadow-sm"
          >
            View Details
            <svg className="h-3 w-3 transition-transform duration-200 group-hover/btn:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
