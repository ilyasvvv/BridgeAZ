"use client";

import { use, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { ProfileHeader, ProfileTabs } from "@/components/ProfileHeader";
import { PostCard, type Post } from "@/components/PostCard";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/lib/auth";
import { postsApi } from "@/lib/posts";
import { resolveHandle } from "@/lib/users";
import { chatsApi } from "@/lib/chats";
import { apiPostToUiPost, userToProfileMeta } from "@/lib/mappers";
import type { ApiUser } from "@/lib/types";

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = use(params);
  const router = useRouter();
  const { user, status } = useAuth();
  const [profileUser, setProfileUser] = useState<ApiUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [tab, setTab] = useState("posts");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messageBusy, setMessageBusy] = useState(false);

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
        const resolved = await resolveHandle(handle);
        if (!resolved) {
          setError("Profile not found.");
          setProfileUser(null);
          setPosts([]);
          return;
        }

        const rawPosts = await postsApi.list({ authorId: resolved._id, limit: 40 });
        if (cancelled) return;
        setProfileUser(resolved);
        setPosts(
          rawPosts
            .filter((post) => post.author?._id === resolved._id)
            .map(apiPostToUiPost)
        );
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load profile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [handle, status]);

  const isOwner = !!user && !!profileUser && user._id === profileUser._id;
  const profile = useMemo(
    () => (profileUser ? userToProfileMeta(profileUser, isOwner) : null),
    [profileUser, isOwner]
  );

  async function startMessage() {
    if (!profileUser || messageBusy) return;
    setMessageBusy(true);
    try {
      const thread = await chatsApi.startThread(profileUser._id);
      router.push(`/messages?thread=${thread._id}`);
    } finally {
      setMessageBusy(false);
    }
  }

  const tabs = [
    { key: "posts", label: "Posts", count: posts.length },
    { key: "about", label: "About" },
  ];

  if (status === "loading" || loading) {
    return <PageShell>Loading profile...</PageShell>;
  }

  if (error || !profileUser || !profile) {
    return <PageShell>{error || "Profile not found."}</PageShell>;
  }

  return (
    <div className="min-h-screen bg-paper-warm">
      <TopBar />
      <main className="max-w-[1100px] mx-auto px-6 py-8 space-y-5">
        <ProfileHeader
          profile={profile}
          onMessage={isOwner ? undefined : startMessage}
          primaryActionLabel="Follow"
          primaryActionBusy={messageBusy}
        />

        <div className="rounded-[22px] bg-paper border border-paper-line overflow-hidden">
          <ProfileTabs tabs={tabs} active={tab} onChange={setTab} />
          <div className="p-5">
            {tab === "posts" &&
              (posts.length === 0 ? (
                <EmptyFeed isOwner={isOwner} />
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              ))}

            {tab === "about" && <AboutPanel user={profileUser} />}
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

function EmptyFeed({ isOwner }: { isOwner: boolean }) {
  return (
    <div className="py-16 text-center">
      <div className="relative mx-auto w-40 h-40 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-ink/10" />
        <div className="absolute inset-4 rounded-full border border-ink/10 animate-spin-slower" />
        <div className="absolute inset-10 rounded-full border border-ink/10" />
        <div className="w-12 h-12 rounded-full bg-ink text-paper flex items-center justify-center">
          <Icon.Plus size={20} />
        </div>
      </div>
      <h3 className="mt-6 font-display text-[22px] font-semibold">
        {isOwner ? "Your feed lives here." : "Nothing here yet."}
      </h3>
      <p className="mt-1.5 text-[13px] text-ink/55 max-w-sm mx-auto">
        {isOwner
          ? "Posts you publish will appear right here."
          : "When they post something, you'll see it here."}
      </p>
    </div>
  );
}

function AboutPanel({ user }: { user: ApiUser }) {
  const links = [
    ...(user.links || []).map((link) => ({ label: link.label || link.type || "Link", url: link.url })),
    ...Object.entries(user.socialLinks || {})
      .filter(([, url]) => !!url)
      .map(([label, url]) => ({ label, url: url as string })),
  ];

  return (
    <div className="max-w-prose text-[13.5px] text-ink/75 leading-relaxed space-y-5">
      <p>{user.bio || "No bio yet."}</p>
      {user.skills?.length ? (
        <div className="flex flex-wrap gap-2">
          {user.skills.map((skill) => (
            <span key={skill} className="rounded-pill bg-paper-cool px-3 py-1 text-[11.5px] font-semibold">
              {skill}
            </span>
          ))}
        </div>
      ) : null}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-paper-line">
        <Fact icon="Pin" label="Location" value={user.currentRegion || user.locationNow?.country || "Not set"} />
        <Fact icon="Globe" label="Origin" value={user.originCountry || "Not set"} />
        <Fact icon="User" label="Account" value={user.isMentor ? "Mentor" : "Member"} />
        <Fact icon="Calendar" label="Joined" value={formatJoined(user.createdAt)} />
      </div>
      {links.length ? (
        <div className="flex flex-wrap gap-2">
          {links.map((link) => (
            <a
              key={`${link.label}-${link.url}`}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 h-8 rounded-pill border border-paper-line px-3 text-[12px] font-semibold hover:border-ink/30"
            >
              <Icon.Link size={12} />
              {link.label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Fact({
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
      <span
        className={clsx(
          "w-9 h-9 rounded-full bg-paper-cool flex items-center justify-center text-ink/70"
        )}
      >
        <Ico size={14} />
      </span>
      <div>
        <div className="text-[10.5px] tracking-[0.14em] text-ink/45 uppercase">
          {label}
        </div>
        <div className="text-[13px] font-semibold">{value}</div>
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
