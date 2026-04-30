"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { ProfileHeader, ProfileTabs } from "@/components/ProfileHeader";
import { ProfileAbout } from "@/components/ProfileAbout";
import { PostCard, type Post } from "@/components/PostCard";
import { Avatar } from "@/components/Avatar";
import { CityCombobox } from "@/components/CityCombobox";
import { Icon } from "@/components/Icon";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import { useAuth } from "@/lib/auth";
import { postsApi } from "@/lib/posts";
import { usersApi } from "@/lib/users";
import { circlesApi } from "@/lib/circles";
import { uploadFile } from "@/lib/uploads";
import { apiPostToUiPost, userToProfileMeta } from "@/lib/mappers";
import { cityLabel, type CityOption } from "@/lib/cities";
import { hueFromString, profileHref } from "@/lib/format";
import type { ApiCircle, ApiUser } from "@/lib/types";

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
  const initialTab = parseProfileTab(searchParams.get("tab"));
  const initialEditOpen =
    searchParams.get("edit") === "profile" || searchParams.get("tab") === "edit";
  const { user, status, refresh } = useAuth();
  const [profileUser, setProfileUser] = useState<ApiUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [myCircles, setMyCircles] = useState<ApiCircle[]>([]);
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
    avatarUrl: "",
    bannerUrl: "",
    currentRegion: "",
    city: "",
    region: "",
    country: "",
    lat: "",
    lon: "",
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
    setTab(parseProfileTab(nextTab));
    if (searchParams.get("edit") === "profile" || nextTab === "edit") setEditOpen(true);
  }, [searchParams]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;

    async function load() {
      try {
        const [me, rawPosts, rawSavedPosts, circles] = await Promise.all([
          usersApi.me(),
          postsApi.list({ authorId: user?._id, limit: 40 }),
          postsApi.saved().catch(() => []),
          circlesApi.list({ mine: true, limit: 100 }).catch(() => []),
        ]);
        if (cancelled) return;
        setProfileUser(me);
        setPosts(rawPosts.filter((post) => post.author?._id === me._id).map(apiPostToUiPost));
        setSavedPosts(rawSavedPosts.map(apiPostToUiPost));
        setMyCircles(circles);
        setForm({
          name: me.name || "",
          username: me.username || "",
          headline: me.headline || "",
          bio: me.bio || "",
          avatarUrl: me.avatarUrl || me.profilePictureUrl || me.profilePhotoUrl || me.profilePhoto || me.photoUrl || "",
          bannerUrl: me.bannerUrl || me.profileBannerUrl || me.coverPhotoUrl || "",
          currentRegion: me.currentRegion || "",
          city: me.locationNow?.city || "",
          region: me.locationNow?.region || "",
          country: me.locationNow?.country || "",
          lat: me.locationNow?.lat != null ? String(me.locationNow.lat) : "",
          lon: (me.locationNow?.lon ?? me.locationNow?.lng) != null ? String(me.locationNow?.lon ?? me.locationNow?.lng) : "",
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
      const avatarUrl = form.avatarUrl.trim();
      const bannerUrl = form.bannerUrl.trim();
      const updated = await usersApi.updateMe({
        name: form.name.trim(),
        username: form.username.trim(),
        headline: form.headline.trim(),
        bio: form.bio.trim(),
        avatarUrl,
        profilePictureUrl: avatarUrl,
        profilePhotoUrl: avatarUrl,
        bannerUrl,
        profileBannerUrl: bannerUrl,
        coverPhotoUrl: bannerUrl,
        currentRegion: form.city && form.country ? cityLabel(profileCityFromForm(form)) : form.currentRegion.trim(),
        locationNow: {
          city: form.city.trim(),
          country: form.country.trim(),
          region: form.region.trim() || undefined,
          lat: parseCoordinate(form.lat),
          lon: parseCoordinate(form.lon),
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
      setProfileUser({
        ...updated,
        avatarUrl: avatarUrl || updated.avatarUrl,
        profilePictureUrl: avatarUrl || updated.profilePictureUrl,
        bannerUrl: bannerUrl || updated.bannerUrl,
        profileBannerUrl: bannerUrl || updated.profileBannerUrl,
        coverPhotoUrl: bannerUrl || updated.coverPhotoUrl,
      });
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
    { key: "saved", label: "Saved", count: savedPosts.length },
    { key: "circles", label: "Circles", count: myCircles.length },
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
          <ProfileTabs tabs={tabs} active={tab} onChange={(key) => setTab(parseProfileTab(key))} />
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
            {tab === "saved" &&
              (savedPosts.length === 0 ? (
                <EmptyState title="No saved posts yet." />
              ) : (
                <div className="space-y-4">
                  {savedPosts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              ))}
            {tab === "circles" && <ProfileCircles circles={myCircles} />}
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
          onCityChange={(city) => {
            setSaved(false);
            setForm((current) => ({
              ...current,
              currentRegion: city ? cityLabel(city) : "",
              city: city?.city || "",
              region: city?.region || "",
              country: city?.country || "",
              lat: city ? String(city.lat) : "",
              lon: city ? String(city.lon) : "",
            }));
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
  onCityChange,
  onClose,
  onSave,
  saving,
  saved,
}: {
  form: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onCityChange: (city: CityOption | null) => void;
  onClose: () => void;
  onSave: () => Promise<boolean>;
  saving: boolean;
  saved: boolean;
}) {
  const [uploading, setUploading] = useState<"avatarUrl" | "bannerUrl" | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function uploadImage(file: File, target: "avatarUrl" | "bannerUrl") {
    if (!file.type.startsWith("image/")) {
      setUploadError("Choose an image file.");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setUploadError("Images must be under 6 MB.");
      return;
    }

    setUploading(target);
    setUploadError(null);
    try {
      const uploaded = await uploadFile(file, "avatar");
      onChange(target, uploaded.documentUrl);
    } catch (err: any) {
      setUploadError(err?.message || "Upload failed. Try another image.");
    } finally {
      setUploading(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 px-4 py-5 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-editor-title"
    >
      <div className="max-h-[92vh] w-full max-w-[1040px] overflow-hidden rounded-[24px] border border-paper-line bg-paper shadow-pop">
        <div className="flex items-center gap-4 border-b border-paper-line bg-paper px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#C1FF72] text-ink">
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

        <div className="grid max-h-[calc(92vh-74px)] overflow-y-auto lg:grid-cols-[360px_1fr]">
          <aside className="border-b border-paper-line bg-paper-warm p-5 lg:border-b-0 lg:border-r">
            <div className="overflow-hidden rounded-[22px] border border-paper-line bg-paper">
              <div className="relative h-28 bg-ink">
                {form.bannerUrl ? (
                  <img src={form.bannerUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-ink via-ink/70 to-ink/90" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-ink/30 to-transparent" />
              </div>
              <div className="px-5 pb-5">
                <div className="-mt-10">
                  <div className="h-20 w-20 overflow-hidden rounded-full border-4 border-paper bg-paper shadow-soft">
                    {form.avatarUrl ? (
                      <img src={form.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-ink text-paper">
                        <Icon.User size={24} />
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-3 min-w-0">
                  <div className="truncate font-display text-[22px] font-semibold tracking-[-0.015em]">
                    {form.name || "Your name"}
                  </div>
                  <div className="mt-0.5 text-[12.5px] text-ink/50">
                    @{form.username || "handle"}
                  </div>
                  {form.headline && (
                    <div className="mt-2 text-[13px] text-ink/70">{form.headline}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              <ImageControl
                label="Profile photo"
                value={form.avatarUrl}
                busy={uploading === "avatarUrl"}
                onUrlChange={(value) => onChange("avatarUrl", value)}
                onFile={(file) => uploadImage(file, "avatarUrl")}
              />
              <ImageControl
                label="Banner photo"
                value={form.bannerUrl}
                busy={uploading === "bannerUrl"}
                onUrlChange={(value) => onChange("bannerUrl", value)}
                onFile={(file) => uploadImage(file, "bannerUrl")}
              />
              {uploadError && (
                <div className="rounded-[14px] border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
                  {uploadError}
                </div>
              )}
            </div>

            <div className="mt-4 rounded-[18px] border border-paper-line bg-paper p-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/45">
                Public preview
              </div>
              <p className="mt-2 text-[12.5px] leading-relaxed text-ink/60">
                These photos, your name, handle, role, location, and About fields are visible on your profile.
              </p>
            </div>
          </aside>

          <div className="grid gap-6 p-5">
            <EditorSection title="Identity">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Name" value={form.name} onChange={(value) => onChange("name", value)} />
                <Field label="Username" value={form.username} onChange={(value) => onChange("username", value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} />
              </div>
              <Field label="Role / title" value={form.headline} onChange={(value) => onChange("headline", value)} />
              <Textarea label="Bio" value={form.bio} onChange={(value) => onChange("bio", value)} rows={4} />
            </EditorSection>

            <EditorSection title="Location">
              <CityCombobox
                selected={form.city && form.country ? profileCityFromForm(form) : null}
                onSelect={onCityChange}
              />
            </EditorSection>

            <EditorSection title="About">
              <Field label="Skills" hint="Comma separated" value={form.skills} onChange={(value) => onChange("skills", value)} />
              <Textarea label="What I can help with" value={form.canHelpWith} onChange={(value) => onChange("canHelpWith", value)} rows={3} />
              <Textarea label="What I need help with" value={form.needHelpWith} onChange={(value) => onChange("needHelpWith", value)} rows={3} />
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Looking for" hint="Comma separated" value={form.lookingFor} onChange={(value) => onChange("lookingFor", value)} />
                <Field label="Languages" hint="Comma separated" value={form.languages} onChange={(value) => onChange("languages", value)} />
              </div>
            </EditorSection>

            <EditorSection title="Links">
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Website" value={form.website} onChange={(value) => onChange("website", value)} />
                <Field label="LinkedIn" value={form.linkedin} onChange={(value) => onChange("linkedin", value)} />
                <Field label="GitHub" value={form.github} onChange={(value) => onChange("github", value)} />
              </div>
            </EditorSection>

            <div className="sticky bottom-0 -mx-5 -mb-5 flex items-center gap-3 border-t border-paper-line bg-paper/95 px-5 py-4 backdrop-blur">
              <button
                type="button"
                onClick={onSave}
                disabled={saving || !!uploading || !form.name.trim() || !form.username.trim()}
                className="btn-press h-10 rounded-pill bg-ink px-5 text-[12.5px] font-semibold text-paper disabled:opacity-50"
              >
                {saving ? "Saving..." : uploading ? "Uploading..." : "Save profile"}
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
    </div>
  );
}

function EditorSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-4">
      <div className="flex items-center gap-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/45">
          {title}
        </h3>
        <div className="h-px flex-1 bg-paper-line" />
      </div>
      {children}
    </section>
  );
}

function ImageControl({
  label,
  value,
  busy,
  onUrlChange,
  onFile,
}: {
  label: string;
  value: string;
  busy: boolean;
  onUrlChange: (value: string) => void;
  onFile: (file: File) => void;
}) {
  return (
    <div className="rounded-[16px] border border-paper-line bg-paper p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[12.5px] font-semibold">{label}</div>
          <div className="text-[11.5px] text-ink/45">
            {value ? "Image set" : "No image yet"}
          </div>
        </div>
        <label className="btn-press inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-pill border border-paper-line px-3 text-[11.5px] font-semibold hover:border-ink/30">
          <Icon.Image size={13} />
          {busy ? "Uploading" : "Upload"}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) onFile(file);
            }}
          />
        </label>
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={value}
          onChange={(event) => onUrlChange(event.target.value)}
          placeholder="Paste image URL"
          className="h-9 min-w-0 flex-1 rounded-[12px] border border-paper-line bg-paper-warm px-3 text-[12.5px] outline-none focus:border-ink/40"
        />
        {value && (
          <button
            type="button"
            onClick={() => onUrlChange("")}
            className="btn-press h-9 rounded-pill border border-paper-line px-3 text-[11.5px] font-semibold hover:border-ink/30"
          >
            Remove
          </button>
        )}
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

function EmptyState({ title = "Your feed lives here." }: { title?: string }) {
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
      <h3 className="mt-6 font-display text-[22px] font-semibold">{title}</h3>
    </div>
  );
}

function ProfileCircles({ circles }: { circles: ApiCircle[] }) {
  if (circles.length === 0) {
    return <EmptyState title="No circles joined yet." />;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {circles.map((circle) => {
        const hue = hueFromString(circle._id || circle.handle);
        const role = circle.memberRole || (circle.isOwner ? "owner" : circle.isAdmin ? "admin" : "member");
        return (
          <Link
            key={circle._id}
            href={profileHref("circle", circle.handle, circle._id)}
            className="group flex items-center gap-3 rounded-[18px] border border-paper-line bg-paper-warm p-4 transition hover:border-ink/30 hover:bg-paper"
          >
            <Avatar size={46} kind="circle" hue={hue} src={circle.avatarUrl} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-bold">{circle.name}</span>
              <span className="mt-0.5 block truncate text-[12px] text-ink/50">
                @{circle.handle} · {circle.memberCount ?? 0} members
              </span>
            </span>
            <span className="rounded-pill bg-paper px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-ink/45 group-hover:bg-paper-cool">
              {role}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

function parseProfileTab(value: string | null): "posts" | "saved" | "circles" | "about" {
  return value === "about" || value === "saved" || value === "circles" ? value : "posts";
}

function parseList(value: string) {
  return value
    .split(/,|\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function profileCityFromForm(form: Record<string, string>): CityOption {
  return {
    value: `profile-${form.city}-${form.region}-${form.country}`.toLowerCase(),
    city: form.city,
    region: form.region || undefined,
    country: form.country,
    lat: parseCoordinate(form.lat) || 0,
    lon: parseCoordinate(form.lon) || 0,
  };
}

function parseCoordinate(value: string): number | undefined {
  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : undefined;
}
