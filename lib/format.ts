export function profileHref(
  kind: "user" | "circle" | "personal",
  handle: string | undefined | null,
  id?: string | null
): string {
  const safe = encodeURIComponent(handle || id || "");
  return kind === "circle" ? `/circle/${safe}` : `/user/${safe}`;
}

export function relativeTime(iso?: string): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Math.max(0, Date.now() - t);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w`;
  return new Date(iso).toLocaleDateString();
}

export function extractHashtags(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/#([a-zA-Z0-9_]{2,30})/g);
  if (!matches) return [];
  return Array.from(new Set(matches.map((t) => t.slice(1))));
}

export function hueFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}

export function avatarFromAuthor(a: {
  avatarUrl?: string;
  photoUrl?: string;
  profilePhoto?: string;
  profilePhotoUrl?: string;
  profilePictureUrl?: string;
}): string | undefined {
  return (
    a.avatarUrl ||
    a.profilePictureUrl ||
    a.profilePhotoUrl ||
    a.photoUrl ||
    a.profilePhoto ||
    undefined
  );
}
