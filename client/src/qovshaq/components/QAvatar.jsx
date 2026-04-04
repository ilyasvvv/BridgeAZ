// Qovshaq Phase 0B — User avatar component
const sizes = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-lg",
  xl: "w-20 h-20 text-2xl",
};

export default function QAvatar({ user, size = "md", className = "" }) {
  const sizeClass = sizes[size] || sizes.md;
  const photoUrl = user?.profilePhotoUrl || user?.profilePictureUrl || user?.avatarUrl;
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={user?.name || "User"}
        className={`${sizeClass} rounded-full object-cover ring-2 ring-q-border ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-q-primary-light text-q-primary font-semibold flex items-center justify-center ring-2 ring-q-border ${className}`}
    >
      {initials}
    </div>
  );
}
