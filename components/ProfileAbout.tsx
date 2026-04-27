"use client";

import { Icon } from "./Icon";
import type { ApiUser } from "@/lib/types";

type ProfileAboutProps = {
  user: ApiUser;
  isOwner?: boolean;
};

export function ProfileAbout({ user, isOwner = false }: ProfileAboutProps) {
  const skills = toList(user.skills);
  const canHelpWith = toList(user.canHelpWith);
  const needHelpWith = toList(user.needHelpWith || user.needsHelpWith);
  const lookingFor = toList(user.lookingFor);
  const languages = toList(user.languages);
  const links = profileLinks(user);
  const role = user.headline || user.mentorshipAvailability || (user.isMentor ? "Mentor" : titleCase(user.userType || "Member"));

  return (
    <div className="space-y-6 text-[13.5px] text-ink/75 leading-relaxed">
      <p className="max-w-prose">{user.bio || "No bio yet."}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ProfileFact icon="User" label="Role" value={role} />
        <ProfileFact icon="Pin" label="Location" value={user.currentRegion || user.locationNow?.country || "Not set"} />
        <ProfileFact icon="Globe" label="From" value={user.originCountry || "Not set"} />
        <ProfileFact icon="Calendar" label="Joined" value={formatJoined(user.createdAt)} />
      </div>

      <TagSection title="Skills" items={skills} showEmpty={isOwner} />
      <TagSection title="What I can help with" items={canHelpWith} showEmpty={isOwner} />
      <TagSection title="What I need help with" items={needHelpWith} showEmpty={isOwner} />
      <TagSection title="Looking for" items={lookingFor} showEmpty={isOwner} />
      <TagSection title="Languages" items={languages} showEmpty={isOwner} />

      {links.length > 0 && (
        <section className="pt-4 border-t border-paper-line">
          <h3 className="text-[10.5px] tracking-[0.14em] text-ink/45 uppercase font-semibold">
            Links
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {links.map((link) => (
              <a
                key={`${link.label}-${link.url}`}
                href={normalizeExternalHref(link.url)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-pill border border-paper-line px-3 text-[12px] font-semibold hover:border-ink/30"
              >
                <Icon.Link size={12} />
                {link.label}
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TagSection({
  title,
  items,
  showEmpty,
}: {
  title: string;
  items: string[];
  showEmpty: boolean;
}) {
  if (!items.length && !showEmpty) return null;

  return (
    <section className="pt-4 border-t border-paper-line">
      <h3 className="text-[10.5px] tracking-[0.14em] text-ink/45 uppercase font-semibold">
        {title}
      </h3>
      {items.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={`${title}-${item}`}
              className="rounded-pill bg-paper-cool px-3 py-1 text-[11.5px] font-semibold text-ink/75"
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-[12.5px] text-ink/45">Not set yet.</p>
      )}
    </section>
  );
}

function ProfileFact({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Icon;
  label: string;
  value: string;
}) {
  const Ico = Icon[icon];
  return (
    <div className="flex items-center gap-3 rounded-[16px] bg-paper-warm border border-paper-line p-3">
      <span className="w-9 h-9 rounded-full bg-paper flex items-center justify-center text-ink/70">
        <Ico size={14} />
      </span>
      <div className="min-w-0">
        <div className="text-[10.5px] tracking-[0.14em] text-ink/45 uppercase">
          {label}
        </div>
        <div className="text-[13px] font-semibold text-ink truncate">{value}</div>
      </div>
    </div>
  );
}

function profileLinks(user: ApiUser) {
  return [
    ...(user.links || []).map((link) => ({
      label: link.label || link.type || "Link",
      url: link.url,
    })),
    ...Object.entries(user.socialLinks || {})
      .filter(([, url]) => !!url)
      .map(([label, url]) => ({ label: titleCase(label), url: url as string })),
  ];
}

function toList(value?: string[] | string | null) {
  const raw = Array.isArray(value) ? value : typeof value === "string" ? value.split(/,|\n/) : [];
  return Array.from(
    new Set(
      raw
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function titleCase(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeExternalHref(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function formatJoined(value?: string) {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
