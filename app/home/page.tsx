"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { TopBar } from "@/components/TopBar";
import { Composer } from "@/components/Composer";
import { PostCard, type Post, type PostCategory } from "@/components/PostCard";
import { CirclesForYou, PeopleForYou, TodayNearYou } from "@/components/SideRail";
import { TrendingCard } from "@/components/TrendingCard";
import { MessagesDock } from "@/components/MessagesDock";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/lib/auth";
import { postsApi } from "@/lib/posts";
import { circlesApi } from "@/lib/circles";
import { usersApi } from "@/lib/users";
import { apiPostToUiPost, circleToMiniProfile, userToMiniProfile } from "@/lib/mappers";
import type { MiniProfile } from "@/components/MiniProfileCard";
import type { ApiCircle, ApiPost, ApiUser } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const { user, status } = useAuth();

  const [selectedCategories, setSelectedCategories] = useState<PostCategory[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [messagesOpen, setMessagesOpen] = useState(false);

  const [posts, setPosts] = useState<Post[] | null>(null);
  const [circles, setCircles] = useState<MiniProfile[]>([]);
  const [people, setPeople] = useState<MiniProfile[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const regionLabel = user?.currentRegion || "your region";
  const tagOptions = useMemo(() => buildTagOptions(posts), [posts]);
  const locationOptions = useMemo(
    () => buildLocationOptions(posts, regionLabel),
    [posts, regionLabel]
  );
  const filtered = useMemo(
    () =>
      filterPosts(posts ?? [], {
        categories: selectedCategories,
        tags: selectedTags,
        locations: selectedLocations,
      }),
    [posts, selectedCategories, selectedLocations, selectedTags]
  );
  const activeFilterCount =
    selectedCategories.length + selectedTags.length + selectedLocations.length;

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
        setPosts(
          rawPosts.map((post) =>
            apiPostToUiPost(post, {
              originLocation: postOriginLocation(post, usersById),
            })
          )
        );
        setCircles(rawCircles.slice(0, 5).map(circleToMiniProfile));
        setPeople(rawPeople.filter((p) => p._id !== user?._id).slice(0, 5).map(userToMiniProfile));
      } catch (err: any) {
        if (cancelled) return;
        setLoadError(err?.message || "Failed to load feed");
      }
    };
    load();
    return () => { cancelled = true; };
  }, [status, user?._id]);

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

      <main className="max-w-[1400px] mx-auto px-6 pt-6 pb-20">
        <div className="home-layout grid grid-cols-12 gap-6 items-start">
          <aside className="home-rail home-rail-left order-2 col-span-12 lg:order-1 lg:col-span-3 space-y-3 lg:sticky lg:top-[88px]">
            <TodayNearYou region={regionLabel} />
            {circles.length > 0 && <CirclesForYou items={circles} />}
            {people.length > 0 && <PeopleForYou items={people} />}
            <div className="rail-card rail-card-left rounded-[22px] bg-ink text-paper p-5 relative overflow-hidden [--rail-compact:108px] [--rail-expanded:260px] [--rail-fade:#0A0A0A]">
              <div className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full border border-paper/15 animate-spin-slower" />
              <div className="absolute -right-16 -bottom-16 w-60 h-60 rounded-full border border-paper/10" />
              <h4 className="font-display text-[18px] font-medium leading-tight">Start your own circle</h4>
              <button
                onClick={() => router.push("/circles/new")}
                className="mt-4 h-8 px-3.5 rounded-pill bg-paper text-ink text-[11.5px] font-semibold btn-press"
              >
                Create circle →
              </button>
            </div>
          </aside>

          <div className="home-feed order-1 col-span-12 lg:order-2 lg:col-span-6 space-y-4">
            <SmartFilterBar
              tagOptions={tagOptions}
              locationOptions={locationOptions}
              selectedCategories={selectedCategories}
              selectedTags={selectedTags}
              selectedLocations={selectedLocations}
              activeCount={activeFilterCount}
              onCategoryToggle={(category) =>
                setSelectedCategories((current) => toggleValue(current, category))
              }
              onTagToggle={(tag) =>
                setSelectedTags((current) => toggleValue(current, tag))
              }
              onLocationToggle={(location) =>
                setSelectedLocations((current) => toggleValue(current, location))
              }
              onLocationAdd={(location) =>
                setSelectedLocations((current) =>
                  current.some((item) => sameLabel(item, location))
                    ? current
                    : [...current, location]
                )
              }
              onClear={() => {
                setSelectedCategories([]);
                setSelectedTags([]);
                setSelectedLocations([]);
              }}
            />
            <Composer onPosted={(post) => setPosts((current) => current ? [post, ...current] : [post])} />
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
              {posts && filtered.length === 0 && (
                <div className="rounded-[22px] border border-paper-line bg-paper p-8 text-center text-[13px] text-ink/60">
                  No posts match these filters yet.
                </div>
              )}
              {filtered.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          </div>

          <aside className="home-rail home-rail-right order-3 col-span-12 lg:col-span-3 lg:sticky lg:top-[88px] space-y-3 relative">
            <div
              className={clsx(
                "transition-all duration-500 ease-[cubic-bezier(0.6,0.05,0.3,1)]",
                messagesOpen
                  ? "-translate-y-[120%] opacity-0 pointer-events-none max-h-0 overflow-hidden"
                  : "translate-y-0 opacity-100 max-h-[2000px]"
              )}
            >
              <TrendingCard />
            </div>

            <div
              className={clsx(
                "transition-all duration-500 ease-[cubic-bezier(0.6,0.05,0.3,1)]",
                messagesOpen
                  ? "fixed left-4 right-4 top-[78px] z-30 md:left-auto md:right-6 md:top-[88px] md:w-[min(680px,calc(100vw-3rem))]"
                  : "lg:-mt-2"
              )}
            >
              <MessagesDock
                open={messagesOpen}
                onToggle={() => setMessagesOpen((v) => !v)}
              />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

const CATEGORY_OPTIONS: {
  key: PostCategory;
  label: string;
  icon: keyof typeof Icon;
}[] = [
  { key: "Announcement", label: "Announcements", icon: "Mic" },
  { key: "Opportunity", label: "Opportunities", icon: "Briefcase" },
  { key: "Event", label: "Events", icon: "Calendar" },
  { key: "Searching for", label: "Searching", icon: "Search" },
  { key: "Note", label: "Notes", icon: "Note" },
];

const LOCATION_PRESETS = [
  "Fairfax, VA",
  "Washington, DC",
  "California",
  "Azerbaijan",
  "Germany",
];

function SmartFilterBar({
  tagOptions,
  locationOptions,
  selectedCategories,
  selectedTags,
  selectedLocations,
  activeCount,
  onCategoryToggle,
  onTagToggle,
  onLocationToggle,
  onLocationAdd,
  onClear,
}: {
  tagOptions: string[];
  locationOptions: string[];
  selectedCategories: PostCategory[];
  selectedTags: string[];
  selectedLocations: string[];
  activeCount: number;
  onCategoryToggle: (value: PostCategory) => void;
  onTagToggle: (value: string) => void;
  onLocationToggle: (value: string) => void;
  onLocationAdd: (value: string) => void;
  onClear: () => void;
}) {
  const [locationsOpen, setLocationsOpen] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");
  const allLocationChoices = uniqueLabels([...selectedLocations, ...locationOptions]);
  const visibleLocations = allLocationChoices.filter((location) =>
    normalizeLabel(location).includes(normalizeLabel(locationQuery))
  );
  const canAddLocation =
    locationQuery.trim().length > 1 &&
    !locationOptions.some((item) => sameLabel(item, locationQuery)) &&
    !selectedLocations.some((item) => sameLabel(item, locationQuery));

  return (
    <div className="rounded-[18px] border border-paper-line bg-paper px-2.5 py-2 shadow-soft">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1 overflow-x-auto scroll-clean">
          <div className="flex w-max items-center gap-1.5 pr-1">
            <button
              type="button"
              onClick={onClear}
              disabled={activeCount === 0}
              className={clsx(
                "signature-btn inline-flex h-8 items-center justify-center gap-1.5 rounded-pill px-3 text-[12px] font-semibold transition",
                activeCount > 0
                  ? "bg-ink text-paper shadow-soft"
                  : "bg-paper-cool text-ink/45"
              )}
              aria-label="Clear feed filters"
            >
              <Icon.Filter size={13} />
              {activeCount > 0 ? activeCount : "Filters"}
            </button>

            <span className="h-6 w-px bg-paper-line" aria-hidden />

            {CATEGORY_OPTIONS.map((item) => {
              const Ico = Icon[item.icon];
              const active = selectedCategories.includes(item.key);
              return (
                <FilterChip
                  key={item.key}
                  active={active}
                  onClick={() => onCategoryToggle(item.key)}
                  ariaLabel={`Category: ${item.label}`}
                >
                  <Ico size={12} />
                  {item.label}
                </FilterChip>
              );
            })}

            {tagOptions.length > 0 && (
              <span className="h-6 w-px bg-paper-line" aria-hidden />
            )}

            {tagOptions.map((tag) => (
              <FilterChip
                key={tag}
                active={selectedTags.some((item) => sameLabel(item, tag))}
                onClick={() => onTagToggle(tag)}
                ariaLabel={`Tag: ${tag}`}
              >
                #{tag}
              </FilterChip>
            ))}
          </div>
        </div>

        <div className="relative z-30 shrink-0">
          <button
            type="button"
            onClick={() => setLocationsOpen((open) => !open)}
            aria-haspopup="dialog"
            aria-expanded={locationsOpen}
            className={clsx(
              "signature-btn inline-flex h-8 items-center justify-center gap-1.5 rounded-pill px-3 text-[12px] font-semibold transition",
              selectedLocations.length > 0
                ? "bg-[#C1FF72] text-ink shadow-soft"
                : "bg-paper-cool text-ink/70 hover:text-ink"
            )}
          >
            <Icon.Pin size={12} />
            {selectedLocations.length > 0
              ? `${selectedLocations.length} locations`
              : "Locations"}
          </button>

          {locationsOpen && (
            <div
              role="dialog"
              aria-label="Location filters"
              className="absolute right-full top-0 z-50 mr-2 w-[min(340px,calc(100vw-7rem))]"
            >
              <div
                aria-hidden
                className="absolute -inset-2 rounded-[26px] bg-paper/35 shadow-[0_18px_50px_-26px_rgba(10,10,10,0.45)] backdrop-blur-sm"
              />
              <div className="relative overflow-hidden rounded-[20px] border border-paper-line bg-paper/95 p-3 shadow-[0_24px_70px_-28px_rgba(10,10,10,0.42)] backdrop-blur-xl">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[12px] font-bold tracking-tight">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-paper">
                      <Icon.Pin size={12} />
                    </span>
                    Locations
                  </div>
                  <button
                    type="button"
                    onClick={() => setLocationsOpen(false)}
                    className="btn-press flex h-7 w-7 items-center justify-center rounded-full text-ink/55 hover:bg-paper-cool hover:text-ink"
                    aria-label="Close location filters"
                  >
                    <Icon.Close size={12} />
                  </button>
                </div>

                <label className="mt-3 flex h-9 items-center gap-2 rounded-pill border border-paper-line bg-paper-cool px-3 text-[12.5px]">
                  <Icon.Search size={13} className="text-ink/45" />
                  <input
                    value={locationQuery}
                    onChange={(event) => setLocationQuery(event.target.value)}
                    placeholder="City, region, or country"
                    className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink/38"
                  />
                </label>

                <div className="mt-3 flex max-h-[210px] flex-wrap gap-1.5 overflow-y-auto pr-1 scroll-clean">
                  {visibleLocations.map((location) => (
                    <FilterChip
                      key={location}
                      active={selectedLocations.some((item) => sameLabel(item, location))}
                      onClick={() => onLocationToggle(location)}
                      ariaLabel={`Location: ${location}`}
                    >
                      {selectedLocations.some((item) => sameLabel(item, location)) && (
                        <Icon.Check size={12} />
                      )}
                      {location}
                    </FilterChip>
                  ))}

                  {canAddLocation && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = locationQuery.trim();
                        onLocationAdd(next);
                        setLocationQuery("");
                      }}
                      className="btn-press inline-flex h-8 items-center gap-1.5 rounded-pill border border-dashed border-ink/24 px-3 text-[12px] font-semibold text-ink/70 hover:border-ink hover:text-ink"
                    >
                      <Icon.Plus size={12} />
                      {locationQuery.trim()}
                    </button>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-paper-line pt-3">
                  <span className="truncate text-[11px] font-semibold text-ink/45">
                    {selectedLocations.length
                      ? selectedLocations.join(", ")
                      : "Everywhere"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setLocationsOpen(false)}
                    className="btn-press h-8 rounded-pill bg-ink px-3.5 text-[11.5px] font-semibold text-paper"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterChip({
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
        "btn-press inline-flex h-8 shrink-0 items-center gap-1.5 rounded-pill px-3 text-[12px] font-semibold transition",
        active
          ? "bg-ink text-paper shadow-soft"
          : "bg-paper-cool text-ink/64 hover:bg-paper-cool/80 hover:text-ink"
      )}
    >
      {children}
    </button>
  );
}

function buildTagOptions(posts: Post[] | null): string[] {
  const counts = new Map<string, { label: string; count: number }>();
  posts?.forEach((post) => {
    post.tags.forEach((tag) => {
      const key = normalizeLabel(tag);
      const current = counts.get(key);
      counts.set(key, { label: current?.label || tag, count: (current?.count || 0) + 1 });
    });
  });
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .map((item) => item.label);
}

function buildLocationOptions(posts: Post[] | null, regionLabel: string): string[] {
  return uniqueLabels([
    ...LOCATION_PRESETS,
    ...(posts?.map((post) => post.location) ?? []),
    regionLabel,
  ]).filter((location) => location && location !== "—" && location !== "your region");
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
  const country = user.locationNow?.country?.trim();
  if (city && country) return `${city}, ${country}`;
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
    categories: PostCategory[];
    tags: string[];
    locations: string[];
  }
): Post[] {
  return posts.filter((post) => {
    const categoryMatch =
      filters.categories.length === 0 || filters.categories.includes(post.category);
    const tagMatch =
      filters.tags.length === 0 ||
      filters.tags.some((tag) =>
        post.tags.some((postTag) => sameLabel(postTag, tag))
      );
    const locationMatch =
      filters.locations.length === 0 ||
      filters.locations.some((location) => locationMatches(post.location, location));

    return categoryMatch && tagMatch && locationMatch;
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
