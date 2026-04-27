"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { ProfileHeader, ProfileTabs } from "@/components/ProfileHeader";
import { ProfileAbout } from "@/components/ProfileAbout";
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
  const initialTab = searchParams.get("tab") === "about" ? "about" : "posts";
  const initialEditOpen =
    searchParams.get("edit") === "profile" || searchParams.get("tab") === "edit";
  const { user, status, refresh } = useAuth();
  const [profileUser, setProfileUser] = useState<ApiUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [tab, setTab] = useState(initialTab);
  const [editOpen, setEditOpen] = useState(initialEditOpen);
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
    canHelpWith: "",
    needHelpWith: "",
    lookingFor: "",
    languages: "",
    website: "",
    linkedin: "",
    github: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/signin");
  }, [status, router]);

  useEffect(() => {
    const nextTab = searchParams.get("tab");
    if (nextTab === "about" || nextTab === "posts") setTab(nextTab);
    if (searchParams.get("edit") === "profile" || nextTab === "edit") setEditOpen(true);
  }, [searchParams]);

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
          canHelpWith: (me.canHelpWith || []).join(", "),
          needHelpWith: (me.needHelpWith || me.needsHelpWith || []).join(", "),
          lookingFor: (me.lookingFor || []).join(", "),
          languages: (me.languages || []).join(", "),
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
    () =>
      profileUser
        ? {
            ...userToProfileMeta(profileUser, true),
            stats: [
              { label: "POSTS", value: String(posts.length) },
              { label: "FOLLOWERS", value: "—" },
              { label: "FOLLOWING", value: "—" },
            ],
          }
        : null,
    [profileUser, posts.length]
  );

  async function saveProfile() {
    if (saving) return false;
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
        canHelpWith: parseList(form.canHelpWith),
        needHelpWith: parseList(form.needHelpWith),
        lookingFor: parseList(form.lookingFor),
        languages: parseList(form.languages),
        socialLinks: {
          website: form.website.trim() || undefined,
          linkedin: form.linkedin.trim() || undefined,
          github: form.github.trim() || undefined,
        },
      });
      setProfileUser(updated);
      setSaved(true);
      await refresh();
      return true;
    } catch (err: any) {
      setError(err?.message || "Failed to save profile.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  const tabs = [
    { key: "posts", label: "Posts", count: posts.length },
    { key: "about", label: "About" },
  ];

  if (status === "loading" || !profileUser || !profile) {
    return <ProfileLoading />;
  }

  return (
    <div className="min-h-screen bg-paper-warm">
      <TopBar />
      <main className="max-w-[1100px] mx-auto px-6 py-8 space-y-5">
        <ProfileHeader profile={profile} onEditProfile={() => setEditOpen(true)} />

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

            {tab === "about" && <ProfileAbout user={profileUser} isOwner />}
          </div>
        </div>
      </main>

      {editOpen && (
        <ProfileEditorDialog
          form={form}
          onChange={(key, value) => {
            setSaved(false);
            setForm((current) => ({ ...current, [key]: value }));
          }}
          onClose={() => setEditOpen(false)}
          onSave={saveProfile}
          saving={saving}
          saved={saved}
        />
      )}
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

function ProfileEditorDialog({
  form,
  onChange,
  onClose,
  onSave,
  saving,
  saved,
}: {
  form: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onClose: () => void;
  onSave: () => Promise<boolean>;
  saving: boolean;
  saved: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/35 px-4 py-5 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-editor-title"
    >
      <div className="max-h-[90vh] w-full max-w-[760px] overflow-y-auto rounded-[24px] border border-paper-line bg-paper shadow-pop">
        <div className="sticky top-0 z-10 flex items-center gap-4 border-b border-paper-line bg-paper/95 px-5 py-4 backdrop-blur">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C1FF72] text-ink">
            <Icon.Edit size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="profile-editor-title" className="font-display text-[20px] font-semibold tracking-[-0.015em]">
              Edit profile
            </h2>
            <p className="text-[12px] text-ink/50">
              Update the details people see on your profile.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-press flex h-9 w-9 items-center justify-center rounded-full border border-paper-line hover:border-ink/30"
            aria-label="Close profile editor"
          >
            <Icon.Close size={14} />
          </button>
        </div>

        <div className="grid gap-5 p-5">
          <section className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Name" value={form.name} onChange={(value) => onChange("name", value)} />
              <Field label="Username" value={form.username} onChange={(value) => onChange("username", value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} />
            </div>
            <Field label="Role / title" value={form.headline} onChange={(value) => onChange("headline", value)} />
            <Textarea label="Bio" value={form.bio} onChange={(value) => onChange("bio", value)} rows={4} />
          </section>

          <section className="grid gap-4 border-t border-paper-line pt-5">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Region" value={form.currentRegion} onChange={(value) => onChange("currentRegion", value)} />
              <Field label="City" value={form.city} onChange={(value) => onChange("city", value)} />
              <Field label="Country" value={form.country} onChange={(value) => onChange("country", value)} />
            </div>
          </section>

          <section className="grid gap-4 border-t border-paper-line pt-5">
            <Field label="Skills" hint="Comma separated" value={form.skills} onChange={(value) => onChange("skills", value)} />
            <Textarea label="What I can help with" value={form.canHelpWith} onChange={(value) => onChange("canHelpWith", value)} rows={3} />
            <Textarea label="What I need help with" value={form.needHelpWith} onChange={(value) => onChange("needHelpWith", value)} rows={3} />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Looking for" hint="Comma separated" value={form.lookingFor} onChange={(value) => onChange("lookingFor", value)} />
              <Field label="Languages" hint="Comma separated" value={form.languages} onChange={(value) => onChange("languages", value)} />
            </div>
          </section>

          <section className="grid gap-4 border-t border-paper-line pt-5">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Website" value={form.website} onChange={(value) => onChange("website", value)} />
              <Field label="LinkedIn" value={form.linkedin} onChange={(value) => onChange("linkedin", value)} />
              <Field label="GitHub" value={form.github} onChange={(value) => onChange("github", value)} />
            </div>
          </section>

          <div className="sticky bottom-0 -mx-5 -mb-5 flex items-center gap-3 border-t border-paper-line bg-paper/95 px-5 py-4 backdrop-blur">
            <button
              type="button"
              onClick={onSave}
              disabled={saving || !form.name.trim() || !form.username.trim()}
              className="btn-press h-10 rounded-pill bg-ink px-5 text-[12.5px] font-semibold text-paper disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save profile"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-press h-10 rounded-pill border border-paper-line px-5 text-[12.5px] font-semibold hover:border-ink/30"
            >
              Done
            </button>
            {saved && <span className="text-[12px] text-ink/55">Saved.</span>}
          </div>
        </div>
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
  rows = 5,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] tracking-[0.14em] text-ink/55 uppercase font-semibold">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        className="w-full px-4 py-3 rounded-[14px] bg-paper-warm border border-paper-line text-[14px] outline-none focus:border-ink/40 resize-none"
      />
    </label>
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

function parseList(value: string) {
  return value
    .split(/,|\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}
