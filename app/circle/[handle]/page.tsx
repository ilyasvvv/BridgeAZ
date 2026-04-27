"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { ProfileHeader, ProfileTabs } from "@/components/ProfileHeader";
import { PostCard, type Post } from "@/components/PostCard";
import { Icon } from "@/components/Icon";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import { useAuth } from "@/lib/auth";
import { circlesApi } from "@/lib/circles";
import { apiPostToUiPost, circleToProfileMeta } from "@/lib/mappers";
import type { ApiCircle } from "@/lib/types";

export default function CircleProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = use(params);
  const router = useRouter();
  const { status } = useAuth();
  const [circle, setCircle] = useState<ApiCircle | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [tab, setTab] = useState("posts");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/signin");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [nextCircle, rawPosts] = await Promise.all([
          circlesApi.get(handle),
          circlesApi.posts(handle),
        ]);
        if (cancelled) return;
        setCircle(nextCircle);
        setPosts(rawPosts.map(apiPostToUiPost));
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load circle.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [handle, status]);

  const profile = useMemo(() => (circle ? circleToProfileMeta(circle) : null), [circle]);

  async function joinCircle() {
    if (!circle || joining) return;
    setJoining(true);
    try {
      const updated = await circlesApi.join(circle.handle);
      setCircle(updated);
    } catch (err: any) {
      setError(err?.message || "Failed to join circle.");
    } finally {
      setJoining(false);
    }
  }

  const joinLabel = circle?.membershipStatus === "active"
    ? "Joined"
    : circle?.membershipStatus === "pending"
    ? "Pending"
    : circle?.visibility === "request"
    ? "Request join"
    : "Join";

  const tabs = [
    { key: "posts", label: "Posts", count: posts.length },
    { key: "about", label: "About" },
  ];

  if (status === "loading" || loading) {
    return <PageShell>Loading circle...</PageShell>;
  }

  if (error || !circle || !profile) {
    return <PageShell>{error || "Circle not found."}</PageShell>;
  }

  return (
    <div className="min-h-screen bg-paper-warm">
      <TopBar />
      <main className="max-w-[1100px] mx-auto px-6 py-8 space-y-5">
        <ProfileHeader
          profile={profile}
          onPrimaryAction={joinCircle}
          primaryActionLabel={joinLabel}
          primaryActionBusy={joining || circle.membershipStatus === "active" || circle.membershipStatus === "pending"}
        />

        {error && (
          <div className="rounded-[18px] border border-paper-line bg-paper p-4 text-[13px] text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-[22px] bg-paper border border-paper-line overflow-hidden">
          <ProfileTabs tabs={tabs} active={tab} onChange={setTab} />
          <div className="p-5">
            {tab === "posts" &&
              (posts.length === 0 ? (
                <EmptyWall />
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              ))}

            {tab === "about" && <AboutPanel circle={circle} />}
          </div>
        </div>
      </main>
    </div>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper-warm">
      <TopBar />
      <main className="max-w-[900px] mx-auto px-6 py-16 text-[14px] text-ink/60">
        {children}
      </main>
    </div>
  );
}

function EmptyWall() {
  return (
    <div className="py-16 text-center">
      <div className="relative mx-auto w-40 h-40 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-ink/10" />
        <div className="absolute inset-4 rounded-full border border-ink/10 animate-spin-slower" />
        <div className="absolute inset-10 rounded-full border border-ink/10" />
        <div className="w-16 h-16 rounded-full bg-[#C1FF72] text-ink flex items-center justify-center shadow-soft">
          <AnimatedLogo size={48} motion="full-dance" />
        </div>
      </div>
      <h3 className="mt-6 font-display text-[22px] font-semibold">
        No posts here yet.
      </h3>
      <p className="mt-1.5 text-[13px] text-ink/55 max-w-sm mx-auto">
        When members share, everything lands in this space.
      </p>
    </div>
  );
}

function AboutPanel({ circle }: { circle: ApiCircle }) {
  const location = [circle.location?.city, circle.location?.country].filter(Boolean).join(", ") || circle.currentRegion || "Global";

  return (
    <div className="max-w-prose text-[13.5px] text-ink/75 leading-relaxed space-y-4">
      <p>{circle.bio || "No circle bio yet."}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-paper-line text-[13px]">
        <Meta icon="Pin" label="Location" value={location} />
        <Meta icon="Calendar" label="Founded" value={formatJoined(circle.createdAt)} />
        <Meta icon="User" label="Members" value={String(circle.memberCount ?? 0)} />
        <Meta icon="Globe" label="Visibility" value={circle.visibility || "public"} />
      </div>
    </div>
  );
}

function Meta({
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
    <div className="flex items-center gap-3">
      <span className="w-9 h-9 rounded-full bg-paper-cool flex items-center justify-center text-ink/70">
        <Ico size={14} />
      </span>
      <div>
        <div className="text-[10.5px] tracking-[0.14em] text-ink/45 uppercase">
          {label}
        </div>
        <div className="text-[13px] font-semibold capitalize">{value}</div>
      </div>
    </div>
  );
}

function formatJoined(value?: string) {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
