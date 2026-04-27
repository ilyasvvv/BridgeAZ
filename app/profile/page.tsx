"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { ProfileHeader, ProfileTabs } from "@/components/ProfileHeader";
import { PostCard, type Post } from "@/components/PostCard";
import { Icon } from "@/components/Icon";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import { useAuth } from "@/lib/auth";
import { postsApi } from "@/lib/posts";
import { usersApi } from "@/lib/users";
import { apiPostToUiPost, userToProfileMeta } from "@/lib/mappers";
import type { ApiUser } from "@/lib/types";

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileLoading />}>
      <ProfilePageContent />
    </Suspense>
  );
}

function ProfilePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "posts";
  const { user, status, refresh } = useAuth();
  const [profileUser, setProfileUser] = useState<ApiUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [tab, setTab] = useState(initialTab);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    name: "",
    username: "",
    headline: "",
    bio: "",
    currentRegion: "",
    city: "",
    country: "",
    skills: "",
    website: "",
    linkedin: "",
    github: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/signin");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;

    async function load() {
      try {
        const [me, rawPosts] = await Promise.all([
          usersApi.me(),
          postsApi.list({ authorId: user?._id, limit: 40 }),
        ]);
        if (cancelled) return;
        setProfileUser(me);
        setPosts(rawPosts.filter((post) => post.author?._id === me._id).map(apiPostToUiPost));
        setForm({
          name: me.name || "",
          username: me.username || "",
          headline: me.headline || "",
          bio: me.bio || "",
          currentRegion: me.currentRegion || "",
          city: me.locationNow?.city || "",
          country: me.locationNow?.country || "",
          skills: (me.skills || []).join(", "),
          website: me.socialLinks?.website || "",
          linkedin: me.socialLinks?.linkedin || "",
          github: me.socialLinks?.github || "",
        });
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load profile.");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [status, user?._id]);

  const profile = useMemo(
    () => (profileUser ? userToProfileMeta(profileUser, true) : null),
    [profileUser]
  );

  async function saveProfile() {
    if (saving) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await usersApi.updateMe({
        name: form.name.trim(),
        username: form.username.trim(),
        headline: form.headline.trim(),
        bio: form.bio.trim(),
        currentRegion: form.currentRegion.trim(),
        locationNow: {
          city: form.city.trim(),
          country: form.country.trim(),
        },
        skills: form.skills
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean),
        socialLinks: {
          website: form.website.trim() || undefined,
          linkedin: form.linkedin.trim() || undefined,
          github: form.github.trim() || undefined,
        },
      });
      setProfileUser(updated);
      setSaved(true);
      await refresh();
    } catch (err: any) {
      setError(err?.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  const tabs = [
    { key: "posts", label: "Posts", count: posts.length },
    { key: "edit", label: "Edit profile" },
    { key: "about", label: "About" },
  ];

  if (status === "loading" || !profileUser || !profile) {
    return <ProfileLoading />;
  }

  return (
    <div className="min-h-screen bg-paper-warm">
      <TopBar />
      <main className="max-w-[1100px] mx-auto px-6 py-8 space-y-5">
        <ProfileHeader profile={profile} onEditProfile={() => setTab("edit")} />

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
                <EmptyState />
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              ))}

            {tab === "edit" && (
              <ProfileForm
                form={form}
                onChange={(key, value) => setForm((current) => ({ ...current, [key]: value }))}
                onSave={saveProfile}
                saving={saving}
                saved={saved}
              />
            )}

            {tab === "about" && <AboutPanel user={profileUser} />}
          </div>
        </div>
      </main>
    </div>
  );
}

function ProfileLoading() {
  return (
    <div className="min-h-screen bg-paper-warm">
      <TopBar />
      <main className="max-w-[900px] mx-auto px-6 py-16 text-[14px] text-ink/60">
        Loading profile...
      </main>
    </div>
  );
}

function ProfileForm({
  form,
  onChange,
  onSave,
  saving,
  saved,
}: {
  form: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
}) {
  return (
    <div className="grid gap-4 max-w-2xl">
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Name" value={form.name} onChange={(value) => onChange("name", value)} />
        <Field label="Username" value={form.username} onChange={(value) => onChange("username", value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} />
      </div>
      <Field label="Headline" value={form.headline} onChange={(value) => onChange("headline", value)} />
      <Textarea label="Bio" value={form.bio} onChange={(value) => onChange("bio", value)} />
      <div className="grid md:grid-cols-3 gap-4">
        <Field label="Region" value={form.currentRegion} onChange={(value) => onChange("currentRegion", value)} />
        <Field label="City" value={form.city} onChange={(value) => onChange("city", value)} />
        <Field label="Country" value={form.country} onChange={(value) => onChange("country", value)} />
      </div>
      <Field label="Skills" hint="Comma separated" value={form.skills} onChange={(value) => onChange("skills", value)} />
      <div className="grid md:grid-cols-3 gap-4">
        <Field label="Website" value={form.website} onChange={(value) => onChange("website", value)} />
        <Field label="LinkedIn" value={form.linkedin} onChange={(value) => onChange("linkedin", value)} />
        <Field label="GitHub" value={form.github} onChange={(value) => onChange("github", value)} />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !form.name.trim() || !form.username.trim()}
          className="btn-press h-10 px-5 rounded-pill bg-ink text-paper text-[12.5px] font-semibold disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save profile"}
        </button>
        {saved && <span className="text-[12px] text-ink/55">Saved.</span>}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-[11px] tracking-[0.14em] text-ink/55 uppercase font-semibold">
        {label}
        {hint && <span className="text-[10px] normal-case tracking-normal text-ink/40">{hint}</span>}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full h-11 px-4 rounded-[14px] bg-paper-warm border border-paper-line text-[14px] outline-none focus:border-ink/40"
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] tracking-[0.14em] text-ink/55 uppercase font-semibold">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={5}
        className="w-full px-4 py-3 rounded-[14px] bg-paper-warm border border-paper-line text-[14px] outline-none focus:border-ink/40 resize-none"
      />
    </label>
  );
}

function AboutPanel({ user }: { user: ApiUser }) {
  return (
    <div className="max-w-prose text-[13.5px] text-ink/75 leading-relaxed space-y-4">
      <p>{user.bio || "No bio yet."}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-paper-line">
        <Fact icon="Pin" label="Location" value={user.currentRegion || user.locationNow?.country || "Not set"} />
        <Fact icon="Globe" label="From" value={user.originCountry || "Not set"} />
        <Fact icon="Calendar" label="Joined" value={formatJoined(user.createdAt)} />
        <Fact icon="User" label="Type" value={user.isMentor ? "Mentor" : "Member"} />
      </div>
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
      <span className="w-9 h-9 rounded-full bg-paper-cool flex items-center justify-center text-ink/70">
        <Ico size={14} />
      </span>
      <div>
        <div className="text-[10.5px] tracking-[0.14em] text-ink/45 uppercase">{label}</div>
        <div className="text-[13px] font-semibold">{value}</div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-16 text-center">
      <div className="relative mx-auto w-40 h-40 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-ink/10" />
        <div className="absolute inset-4 rounded-full border border-ink/10 animate-spin-slower" />
        <div className="absolute inset-10 rounded-full border border-ink/10" />
        <div className="w-16 h-16 rounded-full bg-[#C1FF72] text-ink flex items-center justify-center shadow-soft">
          <AnimatedLogo size={48} motion="sprout" />
        </div>
      </div>
      <h3 className="mt-6 font-display text-[22px] font-semibold">Your feed lives here.</h3>
    </div>
  );
}

function formatJoined(value?: string) {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
