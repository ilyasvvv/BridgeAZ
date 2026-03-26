import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../utils/auth";
import RegionPill from "../components/RegionPill";
import StatusBadge from "../components/StatusBadge";
import { countryLabel, formatRelativeTime } from "../utils/format";
import ShareSheet from "../components/ShareSheet";
import { buildSharePayload } from "../utils/share";

export default function OpportunityDetail() {
  const { id } = useParams();
  const { token } = useAuth();
  const [opportunity, setOpportunity] = useState(null);
  const [error, setError] = useState("");
  const [showShareSheet, setShowShareSheet] = useState(false);

  useEffect(() => {
    const loadOpportunity = async () => {
      try {
        const data = await apiClient.get(`/opportunities/${id}`, token);
        setOpportunity(data);
      } catch (err) {
        setError(err.message || "Failed to load opportunity");
      }
    };

    if (token) {
      loadOpportunity();
    }
  }, [id, token]);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12" >
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 rounded-2xl bg-coral/5 p-4">
            <svg className="h-8 w-8 text-coral/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="font-sans text-sm text-coral">{error}</p>
          <Link to="/opportunities" className="mt-4 font-sans text-xs font-semibold text-sand hover:underline">
            Back to opportunities
          </Link>
        </div>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 space-y-6" >
        <div className="opp-skeleton h-4 w-32 rounded-full" />
        <div className="rounded-2xl border border-border bg-white p-8 space-y-6">
          <div className="space-y-3">
            <div className="opp-skeleton h-3 w-28" />
            <div className="opp-skeleton h-8 w-3/4" />
            <div className="flex gap-3">
              <div className="opp-skeleton h-6 w-20 rounded-full" />
              <div className="opp-skeleton h-6 w-24 rounded-full" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="opp-skeleton h-3 w-full" />
            <div className="opp-skeleton h-3 w-full" />
            <div className="opp-skeleton h-3 w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mx-auto max-w-3xl space-y-5 px-4"
      style={{ "--accent": "16 185 129", animation: "opp-card-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)" }}
    >
      {/* Back link */}
      <Link
        to="/opportunities"
        className="group inline-flex items-center gap-1.5 font-sans text-xs font-semibold text-sand transition-all hover:gap-2.5"
      >
        <svg className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        All Opportunities
      </Link>

      {/* Main card */}
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-card">
        {/* Accent header bar */}
        <div className="h-1 bg-gradient-to-r from-transparent via-sand to-transparent" />

        <div className="p-7 sm:p-8 space-y-7">
          {/* Header section */}
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3 min-w-0">
              <div className="flex items-center gap-2.5">
                <span className="font-sans text-xs font-bold uppercase tracking-[0.2em] text-accent/80">
                  {opportunity.orgName}
                </span>
                <span className="h-0.5 w-0.5 rounded-full bg-mist/30" />
                <span className="font-sans text-xs text-mist/50">
                  {formatRelativeTime(opportunity.createdAt)}
                </span>
              </div>
              <h1 className="font-display text-3xl leading-tight text-sand sm:text-4xl">
                {opportunity.title}
              </h1>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <StatusBadge label={opportunity.type} tone="slate" />
                <div className="flex items-center gap-1.5 text-mist/60">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="font-sans text-xs">
                    {countryLabel(opportunity.country)}
                    {opportunity.city ? ` · ${opportunity.city}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-mist/60">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="font-sans text-xs">{opportunity.locationMode}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <RegionPill region={opportunity.visibilityRegion} />
              <div className="flex items-center gap-1.5 rounded-lg bg-surface-alt px-2.5 py-1">
                <span className={`h-1.5 w-1.5 rounded-full ${opportunity.status === "open" ? "bg-accent shadow-[0_0_6px_rgb(var(--accent)/0.25)]" : "bg-mist/25"}`} />
                <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-mist">
                  {opportunity.status}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <section className="space-y-3">
            <h4 className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-mist/50">Description</h4>
            <p className="font-sans text-[15px] leading-relaxed text-sand/85 whitespace-pre-wrap">
              {opportunity.description}
            </p>
          </section>

          {/* Requirements */}
          {opportunity.requirements?.length ? (
            <section className="space-y-3">
              <h4 className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-mist/50">Requirements</h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {opportunity.requirements.map((item) => (
                  <div key={item} className="flex items-start gap-2.5 rounded-xl bg-surface-alt/60 p-3.5">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-sand" />
                    <span className="font-sans text-sm text-sand/80">{item}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* Tags */}
          {opportunity.tags?.length ? (
            <section className="space-y-3">
              <h4 className="font-sans text-[11px] font-bold uppercase tracking-[0.2em] text-mist/50">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {opportunity.tags.map((tag) => (
                  <span key={tag} className="rounded-lg bg-surface-alt px-3 py-1 font-sans text-[11px] font-medium text-mist">
                    {tag}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
            {opportunity.applyUrl && (
              <a
                href={opportunity.applyUrl}
                target="_blank"
                rel="noreferrer"
                className="group/apply inline-flex items-center gap-2 rounded-xl bg-sand px-7 py-3 font-sans text-xs font-bold text-white shadow-card transition-all hover:opacity-90 hover:shadow-elevated active:scale-[0.98]"
              >
                Apply Now
                <svg className="h-3.5 w-3.5 transition-transform group-hover/apply:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
            {opportunity.contactEmail && (
              <a
                href={`mailto:${opportunity.contactEmail}`}
                className="inline-flex items-center gap-2 rounded-xl border border-coral/30 bg-coral/8 px-7 py-3 font-sans text-xs font-bold text-coral/90 transition-all hover:bg-coral/12"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Contact via Email
              </a>
            )}
            <button
              type="button"
              onClick={() => setShowShareSheet(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 font-sans text-xs font-semibold text-mist transition-all hover:border-mist/30 hover:text-sand"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 100-2.684 3 3 0 000 2.684zm0 9a3 3 0 100-2.684 3 3 0 000 2.684z" />
              </svg>
              Share
            </button>
          </div>
        </div>
      </div>

      <ShareSheet
        open={showShareSheet}
        onClose={() => setShowShareSheet(false)}
        shareInput={buildSharePayload({
          entityType: "opportunity",
          entityId: opportunity._id,
          url: `/opportunities/${opportunity._id}`,
          title: opportunity.title || "Opportunity",
          subtitle: opportunity.orgName || "Opportunity",
          meta: { opportunityId: opportunity._id }
        })}
      />
    </div>
  );
}
