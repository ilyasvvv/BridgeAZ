import { Link } from "react-router-dom";
import RegionPill from "./RegionPill";
import StatusBadge from "./StatusBadge";
import UserChip, { USER_CHIP_SIZES } from "./UserChip";

export default function ProfileCard({ user }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <UserChip
            user={user}
            size={USER_CHIP_SIZES.FEED}
            nameClassName="text-lg text-sand"
          />
          <p className="text-sm text-mist">{user.headline || "BridgeAZ member"}</p>
        </div>
        <RegionPill region={user.currentRegion} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {user.studentVerified && <StatusBadge label="Student Verified" tone="teal" />}
        {user.mentorVerified && <StatusBadge label="Mentor Verified" tone="coral" />}
        {user.isMentor && !user.mentorVerified && <StatusBadge label="Mentor Pending" tone="ember" />}
      </div>
      <Link
        to={`/profile/${user._id}`}
        className="mt-4 inline-flex rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-wide text-sand hover:border-teal"
      >
        View Profile
      </Link>
    </div>
  );
}
