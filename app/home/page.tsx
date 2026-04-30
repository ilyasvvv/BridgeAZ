"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { TopBar } from "@/components/TopBar";
import { Composer } from "@/components/Composer";
import { PostCard, type Post } from "@/components/PostCard";
import { CirclesForYou, PeopleForYou, StartYourOwnCircle, TodayNearYou } from "@/components/SideRail";
import { TrendingCard } from "@/components/TrendingCard";
import { FloatingMessagesDock } from "@/components/MessagesDock";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/lib/auth";
import { postsApi } from "@/lib/posts";
import { circlesApi } from "@/lib/circles";
import { usersApi } from "@/lib/users";
import { apiPostToUiPost, circleToMiniProfile, userToMiniProfile } from "@/lib/mappers";
import { CITY_OPTIONS, cityLabel, sortUsersByNearestCity, userCityLabel } from "@/lib/cities";
import type { MiniProfile } from "@/components/MiniProfileCard";
import type { ApiCircle, ApiPost, ApiUser } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const { user, status } = useAuth();

  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [savedPostIds, setSavedPostIds] = useState<string[]>([]);
  const [messagesOpen, setMessagesOpen] = useState(false);

  const [posts, setPosts] = useState<Post[] | null>(null);
  const [circles, setCircles] = useState<MiniProfile[]>([]);
  const [people, setPeople] = useState<MiniProfile[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const regionLabel = userCityLabel(user) || "your city";
  const locationOptions = useMemo(
    () => buildLocationOptions(posts, regionLabel),
    [posts, regionLabel]
  );
  const filtered = useMemo(
    () =>
      filterPosts(posts ?? [], {
        locations: selectedLocations,
      }),
    [posts, selectedLocations]
  );
  const visiblePosts = useMemo(
    () =>
      showSaved
        ? filtered.filter((post) => post.savedByMe || savedPostIds.includes(post.id))
        : filtered,
    [filtered, savedPostIds, showSaved]
  );
  const activeFilterCount = selectedLocations.length;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    const load = async () => {
      try {
        const [rawPosts, rawCircles, rawPeople] = await Promise.all([
          postsApi.list(),
          circlesApi.list({ limit: 5 }),
          usersApi.list({ accountType: "personal" }),
        ]);
        if (cancelled) return;
        const usersById = new Map<string, ApiUser>(
          [user, ...rawPeople].filter(Boolean).map((item) => [item!._id, item!])
        );
        const nextPosts = rawPosts.map((post) =>
            apiPostToUiPost(post, {
              originLocation: postOriginLocation(post, usersById),
            })
          );
        setPosts(nextPosts);
        setSavedPostIds(nextPosts.filter((post) => post.savedByMe).map((post) => post.id));
        setCircles(rawCircles.slice(0, 5).map(circleToMiniProfile));
        setPeople(
          sortUsersByNearestCity(
            rawPeople.filter((p) => p._id !== user?._id),
            user
          )
            .slice(0, 5)
            .map(userToMiniProfile)
        );
      } catch (err: any) {
        if (cancelled) return;
        setLoadError(err?.message || "Failed to load feed");
      }
    };
    load();
    return () => { cancelled = true; };
  }, [status, user?._id]);

  async function refreshSavedPosts() {
    try {
      const rawSaved = await postsApi.saved();
      const ids = rawSaved.map((post) => post._id);
      setSavedPostIds(ids);
      setPosts((current) =>
        current
          ? current.map((post) => ({ ...post, savedByMe: ids.includes(post.id) }))
          : current
      );
    } catch {
      // Saving still reports through the post action; keep the current feed state if the saved list is unavailable.
    }
  }

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-paper-warm flex items-center justify-center text-ink/50 text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper-warm">
      <TopBar />

      <main className="max-w-[1440px] mx-auto px-6 pt-8 pb-24">
        <div className="home-layout grid grid-cols-12 gap-6 items-start">
          <aside className="home-rail home-rail-left rail-stack order-2 col-span-12 lg:order-1 lg:col-span-3 space-y-3 lg:sticky lg:top-[88px]">
            <TodayNearYou region={regionLabel} />
            {circles.length > 0 && <CirclesForYou items={circles} />}
            {people.length > 0 && <PeopleForYou items={people} />}
            <StartYourOwnCircle />
          </aside>

          <div className="home-feed order-1 col-span-12 lg:order-2 lg:col-span-6 space-y-4">
            <div id="composer" className="scroll-mt-24">
              <Composer onPosted={(post) => setPosts((current) => current ? [post, ...current] : [post])} />
            </div>
            <SmartFilterBar
              locationOptions={locationOptions}
              selectedLocations={selectedLocations}
              activeCount={activeFilterCount}
              savedCount={savedPostIds.length}
              showSaved={showSaved}
              onLocationsChange={(next) => setSelectedLocations(next)}
              onSavedClick={() => setShowSaved((value) => !value)}
              onClear={() => {
                setSelectedLocations([]);
                setShowSaved(false);
              }}
            />
            <div className="space-y-4">
              {loadError && (
                <div className="rounded-[18px] border border-paper-line bg-paper p-5 text-[13px] text-ink/70">
                  Couldn't load the feed: {loadError}
                </div>
              )}
              {!posts && !loadError && (
                <div className="rounded-[22px] border border-paper-line bg-paper p-5 text-[13px] text-ink/55">
                  Loading posts…
                </div>
              )}
              {posts && visiblePosts.length === 0 && (
                <div className="rounded-[22px] border border-paper-line bg-paper p-8 text-center text-[13px] text-ink/60">
                  {showSaved ? "No saved posts match this location yet." : "No posts match this location yet."}
                </div>
              )}
              {visiblePosts.map((p) => (
                <PostCard key={p.id} post={p} onSavedChange={refreshSavedPosts} />
              ))}
            </div>
          </div>

          <aside className="home-rail home-rail-right order-3 col-span-12 lg:col-span-3 lg:sticky lg:top-[88px] space-y-3 relative">
            <TrendingCard />
          </aside>
        </div>
      </main>

      <FloatingMessagesDock
        open={messagesOpen}
        onToggle={() => setMessagesOpen((v) => !v)}
        onClose={() => setMessagesOpen(false)}
      />
    </div>
  );
}

const LOCATION_PRESETS = CITY_OPTIONS.map(cityLabel);

function SmartFilterBar({
  locationOptions,
  selectedLocations,
  activeCount,
  savedCount,
  showSaved,
  onLocationsChange,
  onSavedClick,
  onClear,
}: {
  locationOptions: string[];
  selectedLocations: string[];
  activeCount: number;
  savedCount: number;
  showSaved: boolean;
  onLocationsChange: (value: string[]) => void;
  onSavedClick: () => void;
  onClear: () => void;
}) {
  const [openPanel, setOpenPanel] = useState<"locations" | null>(null);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationDraft, setLocationDraft] = useState<string[]>(selectedLocations);
  const allLocationChoices = uniqueLabels([...locationDraft, ...selectedLocations, ...locationOptions]);
  const visibleLocations = allLocationChoices.filter((location) =>
    normalizeLabel(location).includes(normalizeLabel(locationQuery))
  );
  const activePanel = openPanel !== null;

  useEffect(() => {
    if (openPanel === "locations") {
      setLocationDraft(selectedLocations);
      setLocationQuery("");
    }
  }, [openPanel, selectedLocations]);

  const closePanel = () => setOpenPanel(null);
  const clearFilters = () => {
    onClear();
    setLocationDraft([]);
    closePanel();
  };

  return (
    <div className="relative z-30">
      {activePanel && (
        <button
          type="button"
          className={clsx(
            "fixed inset-0 z-40 cursor-default",
            openPanel === "locations" ? "bg-ink/10 backdrop-blur-[1px]" : "bg-transparent"
          )}
          aria-label="Close filters"
          onClick={closePanel}
        />
      )}

      <div className="flex items-center justify-between gap-2 rounded-[24px] border border-paper-line bg-paper p-1.5 shadow-soft">
        <button
          type="button"
          onClick={clearFilters}
          disabled={activeCount === 0 && !showSaved}
          className={clsx(
            "signature-btn inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-pill px-3 text-[12px] font-semibold transition",
            activeCount > 0 || showSaved
              ? "bg-ink text-paper shadow-soft"
              : "bg-paper-cool text-ink/45"
          )}
          aria-label="Clear feed filters"
        >
          <Icon.Filter size={13} />
          {activeCount > 0 || showSaved ? `${activeCount + (showSaved ? 1 : 0)} active` : "Feed"}
        </button>

        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1.5">
          <FilterMenuButton
            icon="Pin"
            label={locationSummary(selectedLocations)}
            count={selectedLocations.length}
            active={openPanel === "locations"}
            onClick={() => setOpenPanel(openPanel === "locations" ? null : "locations")}
          />
          <button
            type="button"
            onClick={onSavedClick}
            aria-pressed={showSaved}
            className={clsx(
              "btn-press inline-flex h-9 min-w-0 items-center gap-2 rounded-pill border px-3 text-[12px] font-semibold tracking-tight transition",
              showSaved
                ? "border-ink bg-ink text-paper"
                : "border-paper-line bg-paper hover:border-ink/40"
            )}
          >
            <span className={clsx(
              "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
              showSaved ? "bg-paper text-ink" : "bg-ink text-paper"
            )}>
              <Icon.Bookmark size={10} />
            </span>
            <span className="min-w-0 truncate">Saved posts</span>
            {savedCount > 0 && (
              <span className="inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-lime px-1 text-[10px] font-bold text-ink">
                {savedCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {openPanel === "locations" && (
        <FilterPopover
          title="Locations"
          icon="Pin"
          align="right"
          onClose={closePanel}
          footer={
            <>
              <button
                type="button"
                onClick={() => setLocationDraft([])}
                className="text-[12.5px] font-semibold text-ink/55 hover:text-ink"
              >
                Everywhere
              </button>
              <button
                type="button"
                onClick={() => {
                  onLocationsChange(locationDraft);
                  closePanel();
                }}
                className="btn-press h-9 rounded-pill bg-ink px-5 text-[12px] font-semibold text-paper"
              >
                Done
              </button>
            </>
          }
        >
          <label className="flex h-10 items-center gap-2 rounded-pill bg-paper-cool px-3 text-[12.5px]">
            <Icon.Search size={13} className="text-ink/45" />
            <input
              autoFocus
              value={locationQuery}
              onChange={(event) => setLocationQuery(event.target.value)}
              placeholder="City, region, or country"
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink/38"
            />
          </label>
          <div className="mt-3 flex max-h-[260px] flex-wrap gap-2 overflow-y-auto pr-1 scroll-clean">
            {visibleLocations.map((location) => (
              <ChoiceChip
                key={location}
                active={locationDraft.some((item) => sameLabel(item, location))}
                onClick={() => setLocationDraft((current) => toggleValue(current, location))}
                ariaLabel={`Location: ${location}`}
              >
                {locationDraft.some((item) => sameLabel(item, location)) && <Icon.Check size={12} />}
                {location}
              </ChoiceChip>
            ))}
            {visibleLocations.length === 0 && (
              <div className="w-full rounded-[14px] bg-paper-cool px-3 py-2 text-[12px] text-ink/48">
                No listed cities match.
              </div>
            )}
          </div>
        </FilterPopover>
      )}
    </div>
  );
}

function FilterMenuButton({
  icon,
  label,
  count,
  active,
  disabled,
  onClick,
}: {
  icon: keyof typeof Icon;
  label: string;
  count: number;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const Ico = Icon[icon];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-expanded={active}
      className={clsx(
        "btn-press inline-flex h-9 min-w-0 max-w-[128px] items-center gap-2 rounded-pill border px-3 text-[12px] font-semibold tracking-tight transition sm:max-w-[160px]",
        active
          ? "border-ink/40 bg-paper text-ink shadow-soft"
          : "border-paper-line bg-paper hover:border-ink/40",
        disabled && "cursor-not-allowed opacity-45 hover:border-paper-line"
      )}
    >
      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-paper">
        <Ico size={10} />
      </span>
      <span className="min-w-0 truncate">{label}</span>
      {count > 0 && (
        <span className="inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-lime px-1 text-[10px] font-bold text-ink">
          {count}
        </span>
      )}
    </button>
  );
}

function FilterPopover({
  title,
  icon,
  align,
  footer,
  children,
  onClose,
}: {
  title: string;
  icon: keyof typeof Icon;
  align: "left" | "center" | "right";
  footer: ReactNode;
  children: ReactNode;
  onClose: () => void;
}) {
  const Ico = Icon[icon];
  return (
    <div
      role="dialog"
      aria-label={`${title} filters`}
      className={clsx(
        "absolute top-[calc(100%+8px)] z-50 w-[420px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[24px] border border-paper-line bg-paper shadow-pop",
        align === "left" && "left-0",
        align === "center" && "left-1/2 -translate-x-1/2",
        align === "right" && "right-0"
      )}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-center gap-3 p-4 pb-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-paper">
          <Ico size={14} />
        </span>
        <h3 className="flex-1 font-display text-[18px] font-semibold tracking-tight">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="btn-press flex h-8 w-8 items-center justify-center rounded-full text-ink/55 hover:bg-paper-cool hover:text-ink"
          aria-label={`Close ${title.toLowerCase()} filters`}
        >
          <Icon.Close size={13} />
        </button>
      </div>
      <div className="px-4 pb-4">{children}</div>
      <div className="flex items-center justify-between gap-3 border-t border-paper-line px-4 py-3">
        {footer}
      </div>
    </div>
  );
}

function ChoiceChip({
  active,
  ariaLabel,
  children,
  onClick,
}: {
  active: boolean;
  ariaLabel: string;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={active}
      onClick={onClick}
      className={clsx(
        "btn-press inline-flex h-9 shrink-0 items-center gap-1.5 rounded-pill px-3.5 text-[12.5px] font-semibold transition",
        active
          ? "btn-lime bg-lime text-ink shadow-soft"
          : "bg-paper-cool text-ink/70 hover:bg-paper-cool/80 hover:text-ink"
      )}
    >
      {children}
    </button>
  );
}

function locationSummary(selected: string[]): string {
  if (selected.length === 0) return "Everywhere";
  if (selected.length === 1) return selected[0];
  return `${selected[0]} +${selected.length - 1}`;
}

function buildLocationOptions(posts: Post[] | null, regionLabel: string): string[] {
  return uniqueLabels([
    ...LOCATION_PRESETS,
    ...(posts?.map((post) => post.location) ?? []),
    regionLabel,
  ]).filter(
    (location) =>
      location &&
      location !== "—" &&
      location !== "your city" &&
      isSpecificCityLocation(location)
  );
}

function isSpecificCityLocation(location: string): boolean {
  if (CITY_OPTIONS.some((city) => sameLabel(cityLabel(city), location))) return true;
  return location.split(",").map((part) => part.trim()).filter(Boolean).length >= 2;
}

function postOriginLocation(
  post: ApiPost,
  usersById: Map<string, ApiUser>
): string | undefined {
  if (post.postedAs === "circle") {
    return post.circle ? circleOriginLocation(post.circle) : undefined;
  }

  const fullAuthor = usersById.get(post.author?._id);
  return fullAuthor ? userOriginLocation(fullAuthor) : undefined;
}

function userOriginLocation(user: ApiUser): string {
  const city = user.locationNow?.city?.trim();
  const region = user.locationNow?.region?.trim();
  const country = user.locationNow?.country?.trim();
  if (city && country) return [city, region, country].filter(Boolean).join(", ");
  return city || user.currentRegion || country || "";
}

function circleOriginLocation(circle: ApiCircle): string {
  const city = circle.location?.city?.trim();
  const country = circle.location?.country?.trim();
  if (city && country) return `${city}, ${country}`;
  return city || circle.currentRegion || country || "";
}

function filterPosts(
  posts: Post[],
  filters: {
    locations: string[];
  }
): Post[] {
  return posts.filter((post) => {
    const locationMatch =
      filters.locations.length === 0 ||
      filters.locations.some((location) => locationMatches(post.location, location));

    return locationMatch;
  });
}

function toggleValue<T extends string>(items: T[], value: T): T[] {
  return items.some((item) => sameLabel(item, value))
    ? items.filter((item) => !sameLabel(item, value))
    : [...items, value];
}

function uniqueLabels(items: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  items.forEach((item) => {
    const value = item.trim();
    const key = normalizeLabel(value);
    if (!value || seen.has(key)) return;
    seen.add(key);
    unique.push(value);
  });
  return unique;
}

function sameLabel(a: string, b: string): boolean {
  return normalizeLabel(a) === normalizeLabel(b);
}

function normalizeLabel(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\s+/g, " ")
    .trim();
}

function locationMatches(postLocation: string, selectedLocation: string): boolean {
  const post = normalizeLabel(postLocation);
  const selected = normalizeLabel(selectedLocation);
  if (!post || post === "all" || post === "global") return true;
  if (post.includes(selected) || selected.includes(post)) return true;

  const aliases: Record<string, string[]> = {
    "fairfax, va": ["fairfax"],
    fairfax: ["fairfax"],
    "washington, dc": ["washington", "district of columbia", "dc"],
    dc: ["washington", "district of columbia", "dc"],
    california: ["california", "los angeles", "san francisco", "san jose", "ca"],
    azerbaijan: ["azerbaijan", "baku"],
    germany: ["germany", "berlin"],
    us: ["usa", "united states", "us"],
    usa: ["usa", "united states", "us"],
  };

  return (aliases[selected] || [selected]).some((alias) => {
    if (alias.length <= 2) {
      return new RegExp(`\\b${alias}\\b`).test(post);
    }
    return post.includes(alias);
  });
}
