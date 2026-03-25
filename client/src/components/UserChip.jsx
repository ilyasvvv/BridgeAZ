import { Link } from "react-router-dom";
import Avatar from "./Avatar";

const resolveAvatarUrl = (user) =>
  user?.avatarUrl ||
  user?.photoUrl ||
  user?.profilePhoto ||
  user?.profilePhotoUrl ||
  user?.profilePictureUrl ||
  null;

export const USER_CHIP_SIZES = Object.freeze({
  SM: 32,
  MD: 40,
  LG: 56,
  XL: 96
});

export default function UserChip({
  user,
  size = USER_CHIP_SIZES.MD,
  to,
  onClick,
  showRole = false,
  subtitle,
  className = "",
  nameClassName = "",
  subtitleClassName = "",
  roleClassName = ""
}) {
  const profileTo = to || (user?._id ? `/profile/${user._id}` : null);
  const name = user?.name || "Member";
  const role = showRole ? user?.userType : null;

  const content = (
    <span className={`inline-flex min-w-0 items-center gap-3 ${className}`}>
      <Avatar url={resolveAvatarUrl(user)} alt={`${name} avatar`} size={size} />
      <span className="min-w-0">
        <span
          className={`block truncate text-[15px] font-semibold text-text-main transition-colors group-hover:text-accent ${nameClassName}`}
        >
          {name}
        </span>
        {subtitle ? (
          <span className={`block truncate text-xs text-text-secondary ${subtitleClassName}`}>
            {subtitle}
          </span>
        ) : null}
      </span>
      {role ? (
        <span
          className={`rounded-full border border-black/[0.05] bg-bg-app px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight text-text-secondary ${roleClassName}`}
        >
          {role}
        </span>
      ) : null}
    </span>
  );

  if (profileTo) {
    return (
      <Link to={profileTo} onClick={onClick} className="group inline-flex min-w-0">
        {content}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="group inline-flex min-w-0 text-left">
        {content}
      </button>
    );
  }
  return <span className="group inline-flex min-w-0">{content}</span>;
}
