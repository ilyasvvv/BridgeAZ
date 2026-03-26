import { Link } from "react-router-dom";
import RegionPill from "./RegionPill";
import StatusBadge from "./StatusBadge";
import UserChip, { USER_CHIP_SIZES } from "./UserChip";

export default function ProfileCard({ user, style }) {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-border bg-white shadow-card transition-all duration-300 hover:shadow-elevated hover:-translate-y-0.5"
      style={style}
    >
      {/* Top accent bar — revealed on hover */}
      <div className="h-[3px] bg-gradient-to-r from-transparent via-sand to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="flex flex-col gap-4 p-5">
        {/* Header: avatar + name + region */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <UserChip
              user={user}
              size={USER_CHIP_SIZES.LG}
              nameClassName="text-base text-sand"
            />
            <p className="mt-1.5 pl-[68px] font-sans text-[13px] leading-relaxed text-mist/80 line-clamp-2">
              {user.headline || "BridgeAZ member"}
            </p>
          </div>
        </div>

        {/* Badges + region row */}
        <div className="flex flex-wrap items-center gap-2">
          <RegionPill region={user.currentRegion} />
          {user.studentVerified && <StatusBadge label="Student Verified" tone="teal" />}
          {user.mentorVerified && <StatusBadge label="Mentor Verified" tone="coral" />}
          {user.isMentor && !user.mentorVerified && <StatusBadge label="Mentor Pending" tone="ember" />}
          {user.userType && (
            <span className="rounded-md bg-surface-alt px-2 py-0.5 font-sans text-[10px] font-medium capitalize text-mist/60">
              {user.userType}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-border/50 pt-3">
          <Link
            to={`/profile/${user._id}`}
            className="group/btn inline-flex items-center gap-1.5 rounded-full bg-sand/5 px-4 py-1.5 font-sans text-[11px] font-semibold text-sand transition-all duration-200 hover:bg-sand hover:text-white hover:shadow-sm"
          >
            View Profile
            <svg className="h-3 w-3 transition-transform duration-200 group-hover/btn:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
