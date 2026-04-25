import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import { apiClient, uploadViaPresign } from "../api/client";
import { useAuth } from "../utils/auth";
import BizimHeader from "../components/BizimHeader";

const TABS = ["Posts", "Circles", "Opportunities"];

export default function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token, setUser } = useAuth();
  const isOwner = user?._id && id && String(user._id) === String(id);
  const isEditRoute = location.pathname.endsWith("/edit");

  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState("Posts");
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({});
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);

  const loadProfile = async () => {
    try {
      const data = await apiClient.get(isOwner ? "/users/me" : `/users/${id}`, token);
      setProfile(data);
      setForm({
        name: data.name || "",
        headline: data.headline || "",
        bio: data.bio || "",
        currentRegion: data.currentRegion || "",
        skills: data.skills?.join(", ") || "",
        socialLinks: data.socialLinks || { linkedin: "", github: "", website: "" },
        avatarUrl: data.avatarUrl || data.profilePhotoUrl || data.profilePictureUrl || "",
      });
    } catch (err) {
      console.error("Failed to load profile", err);
    }
  };

  useEffect(() => {
    if (!token) return;
    if (isEditRoute && id && user?._id && String(id) !== String(user._id)) {
      navigate(`/profile/${id}`, { replace: true });
      return;
    }
    loadProfile();
  }, [id, token, user?._id, isEditRoute]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        name: form.name,
        headline: form.headline,
        bio: form.bio,
        currentRegion: form.currentRegion,
        skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
        socialLinks: form.socialLinks,
      };
      const updated = await apiClient.put("/users/me", payload, token);
      setProfile(updated);
      setUser(updated);
      setEditMode(false);
      setMessage("Profile updated successfully");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage(err.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMessage = async () => {
    if (!profile?._id || isOwner) return;
    setMessageLoading(true);
    setMessage("");
    try {
      const thread = await apiClient.post("/chats/threads", { userId: profile._id }, token);
      navigate(`/chats?thread=${thread._id}`);
    } catch (err) {
      setMessage(err.message || "Failed to start chat");
    } finally {
      setMessageLoading(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const presign = await uploadViaPresign({ file, purpose: "avatar" }, token);
      if (presign.documentUrl) {
        setForm((prev) => ({ ...prev, avatarUrl: presign.documentUrl }));
        setMessage("Avatar ready to save.");
      }
    } catch (err) {
      setMessage(err.message || "Failed to upload avatar");
    }
  };

  if (!profile) {
    return (
      <>
        <BizimHeader />
        <div className="flex items-center justify-center py-32 text-mist">Loading profile...</div>
      </>
    );
  }

  const avatarUrl = form.avatarUrl || profile.avatarUrl || profile.profilePhotoUrl || "";

  return (
    <>
      <BizimHeader />

      <div className="mx-auto max-w-4xl px-4 md:px-6 py-8 space-y-8">
        {/* ─── Profile Header Card ─── */}
        <div className="rounded-2xl bg-white border border-grey-300 p-8 md:p-10">
          <div className="flex flex-col items-center text-center">
            {/* Avatar */}
            <div className="relative mb-6">
              <div className="w-36 h-36 rounded-full bg-gradient-to-br from-grey-300 to-grey-400 overflow-hidden ring-4 ring-white shadow-elevated">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-16 h-16 text-grey-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
              </div>
              {isOwner && (
                <label className="absolute bottom-1 right-1 w-10 h-10 rounded-full bg-sand text-white shadow-elevated flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <input type="file" hidden accept="image/*" onChange={handleAvatarUpload} />
                </label>
              )}
            </div>

            {/* Name + Edit */}
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-display text-3xl text-sand">{profile.name}</h1>
              {isOwner && (
                <button
                  onClick={() => setEditMode(!editMode)}
                  className="rounded-full border border-grey-400 px-4 py-1 text-xs font-medium text-sand hover:bg-grey-100 transition-colors"
                >
                  {editMode ? "Cancel" : "Edit Profile"}
                </button>
              )}
              {isOwner && (
                <button className="w-8 h-8 rounded-full border border-grey-400 flex items-center justify-center text-mist hover:bg-grey-100 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              )}
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-6 mt-4 mb-5">
              {[
                { n: "247", label: "Posts" },
                { n: "1.2K", label: "Followers" },
                { n: "856", label: "Following" },
                { n: "12", label: "Circles" },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <p className="text-lg font-bold text-sand">{s.n}</p>
                  <p className="text-xs text-mist">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Bio */}
            <p className="text-sm text-sand font-medium">
              {profile.headline || "Product Designer | Azerbaijani in Berlin"}
            </p>
            {profile.bio && <p className="text-sm text-mist mt-2 max-w-md">{profile.bio}</p>}

            {/* Details */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-4 text-xs text-mist">
              {profile.currentRegion && (
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {profile.currentRegion}
                </span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 mt-6 w-full max-w-md">
              {!isOwner ? (
                <>
                  <button
                    type="button"
                    onClick={handleMessage}
                    disabled={messageLoading}
                    className="circular-btn flex-1 flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {messageLoading ? "Opening..." : "Message"}
                  </button>
                  <button className="circular-btn-outline flex-1 flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Following
                  </button>
                </>
              ) : null}
            </div>
          </div>

          {/* ─── Edit Mode ─── */}
          {editMode && (
            <div className="mt-8 space-y-5 border-t border-grey-300 pt-8 text-left">
              {message && (
                <div className={`p-3 rounded-lg text-sm ${message.includes("success") ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                  {message}
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-sand mb-1.5">Name</label>
                <input
                  type="text" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-grey-300 p-3 text-sm focus:ring-2 focus:ring-sand focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-sand mb-1.5">Headline</label>
                <input
                  type="text" value={form.headline}
                  onChange={(e) => setForm({ ...form, headline: e.target.value })}
                  className="w-full rounded-lg border border-grey-300 p-3 text-sm focus:ring-2 focus:ring-sand focus:outline-none"
                  placeholder="e.g. Designer in Berlin"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-sand mb-1.5">Bio</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  className="w-full rounded-lg border border-grey-300 p-3 text-sm focus:ring-2 focus:ring-sand focus:outline-none resize-none"
                  rows={3} placeholder="Tell us about yourself"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-sand mb-1.5">Skills (comma-separated)</label>
                <input
                  type="text" value={form.skills}
                  onChange={(e) => setForm({ ...form, skills: e.target.value })}
                  className="w-full rounded-lg border border-grey-300 p-3 text-sm focus:ring-2 focus:ring-sand focus:outline-none"
                  placeholder="Design, Product, Marketing"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} disabled={isSaving} className="circular-btn flex-1 disabled:opacity-50">
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
                <button onClick={() => setEditMode(false)} className="circular-btn-outline flex-1">Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* ─── Tabs ─── */}
        <div>
          <div className="flex gap-8 border-b border-grey-300 mb-6">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-semibold transition-colors ${
                  activeTab === tab
                    ? "text-sand border-b-2 border-sand"
                    : "text-mist hover:text-sand"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === "Posts" && (
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 9 }, (_, i) => (
                <div key={i} className="aspect-square rounded-xl bg-grey-200 hover:opacity-80 cursor-pointer transition-opacity" />
              ))}
            </div>
          )}

          {activeTab === "Circles" && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {["Baku Friends", "Tech Community", "Diaspora Network"].map((c, i) => (
                <div key={i} className="rounded-2xl bg-white border border-grey-300 p-6 text-center hover:shadow-elevated transition-shadow">
                  <div className="w-14 h-14 rounded-full bg-grey-200 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-sand">{c}</p>
                  <p className="text-xs text-mist mt-1">Members</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === "Opportunities" && (
            <div className="space-y-3">
              {["Frontend Developer", "Product Designer", "Community Manager"].map((opp, i) => (
                <div key={i} className="rounded-2xl bg-white border border-grey-300 p-5 hover:shadow-elevated transition-shadow">
                  <p className="text-sm font-semibold text-sand">{opp}</p>
                  <p className="text-xs text-mist mt-1">Company &middot; Location</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
