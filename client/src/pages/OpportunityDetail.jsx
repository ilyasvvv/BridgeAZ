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
    return <p className="text-sm text-coral">{error}</p>;
  }

  if (!opportunity) {
    return <p className="text-sm text-mist">Loading opportunity...</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to="/opportunities" className="text-xs uppercase tracking-wide text-teal">
        Back to opportunities
      </Link>

      <div className="glass rounded-3xl p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-mist">{opportunity.orgName}</p>
            <h1 className="mt-2 text-3xl text-sand">{opportunity.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-mist">
              <StatusBadge label={opportunity.type} tone="slate" />
              <span>{opportunity.locationMode}</span>
              <span>
                {countryLabel(opportunity.country)}
                {opportunity.city ? ` · ${opportunity.city}` : ""}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <RegionPill region={opportunity.visibilityRegion} />
            <span className="text-xs text-mist">
              {formatRelativeTime(opportunity.createdAt)}
            </span>
          </div>
        </div>

        <p className="text-sm text-mist">{opportunity.description}</p>

        {opportunity.requirements?.length ? (
          <div>
            <p className="text-xs uppercase tracking-wide text-mist">Requirements</p>
            <ul className="mt-2 space-y-1 text-sm text-sand">
              {opportunity.requirements.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {opportunity.tags?.length ? (
          <div className="flex flex-wrap gap-2">
            {opportunity.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-white/10 px-3 py-1 text-xs text-mist">
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setShowShareSheet(true)}
            className="rounded-full border border-white/10 px-4 py-2 text-center text-xs uppercase tracking-wide text-sand hover:border-teal"
          >
            Share
          </button>
          {opportunity.applyUrl && (
            <a
              href={opportunity.applyUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-teal px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide text-charcoal"
            >
              Apply link
            </a>
          )}
          {opportunity.contactEmail && (
            <a
              href={`mailto:${opportunity.contactEmail}`}
              className="rounded-full border border-white/10 px-4 py-2 text-center text-xs uppercase tracking-wide text-sand hover:border-teal"
            >
              Contact via email
            </a>
          )}
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
