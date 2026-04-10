import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { apiClient, uploadViaPresign } from "../api/client";
import { useAuth } from "../utils/auth";

const tabs = ["Posts", "Circles", "Opportunities"];

export default function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token, setUser } = useAuth();
  const isOwner = user?._id && id && String(user._id) === String(id);
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState("Posts");
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({});
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [posts, setPosts] = useState([]);
  const [circles, setCircles] = useState([]);

  const loadProfile = async () => {
    try {
      const data = await apiClient.get("/users/me", token);
      setProfile(data);
      setForm({
        name: data.name || "",
        headline: data.headline || "",
        bio: data.bio || "",
        currentRegion: data.currentRegion || "",
        skills: data.skills?.join(", ") || "",
        socialLinks: data.socialLinks || { linkedin: "", github: "", website: "" },
      });
    } catch (err) {
      console.error("Failed to load profile", err);
    }
  };

  useEffect(() => {
    if (!token) return;
    if (id && user?._id && String(id) !== String(user._id)) {
      navigate(`/profile/${user._id}`, { replace: true });
      return;
    }
    loadProfile();
  }, [id, token, user?._id]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        name: form.name,
        headline: form.headline,
        bio: form.bio,
        currentRegion: form.currentRegion,
        skills: form.skills.split(",").map((item) => item.trim()).filter(Boolean),
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

  // Mock data for display
  const mockPosts = [
    { id: 1, title: "Post 1", image: "https://via.placeholder.com/200" },
    { id: 2, title: "Post 2", image: "https://via.placeholder.com/200" },
    { id: 3, title: "Post 3", image: "https://via.placeholder.com/200" },
    { id: 4, title: "Post 4", image: "https://via.placeholder.com/200" },
    { id: 5, title: "Post 5", image: "https://via.placeholder.com/200" },
    { id: 6, title: "Post 6", image: "https://via.placeholder.com/200" },
  ];

  const mockCircles = [
    { id: 1, name: "Baku Friends", members: 245 },
    { id: 2, name: "Tech Community", members: 182 },
    { id: 3, name: "Diaspora Network", members: 89 },
  ];

  const mockOpportunities = [
    { id: 1, title: "Opportunity 1", company: "Company A" },
    { id: 2, title: "Opportunity 2", company: "Company B" },
    { id: 3, title: "Opportunity 3", company: "Company C" },
  ];

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-mist">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ─── Profile Header ─── */}
      <div className="mx-auto max-w-4xl px-4 md:px-6">
        <div className="circular-card p-8 md:p-12">
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
            {/* Avatar */}
            <div className="flex-shrink-0 relative group">
              <div className="w-40 h-40 rounded-full bg-gradient-to-br from-grey-300 to-grey-400 flex items-center justify-center ring-4 ring-sand/10 shadow-floating">
                <span className="text-6xl">👤</span>
              </div>
              {isOwner && (
                <button className="absolute bottom-0 right-0 w-12 h-12 rounded-full bg-sand text-white shadow-elevated flex items-center justify-center hover:opacity-90 transition-opacity">
                  📸
                </button>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h1 className="font-display text-4xl md:text-5xl text-sand">{profile.name}</h1>
                  <p className="text-mist mt-1">{profile.headline || "Add a headline to stand out"}</p>
                </div>
                {isOwner && (
                  <button
                    onClick={() => setEditMode(!editMode)}
                    className="circular-btn-outline text-sm px-5 py-2"
                  >
                    {editMode ? "Cancel" : "Edit Profile"}
                  </button>
                )}
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-4 gap-4 py-6 border-y border-grey-300">
                <div className="text-center">
                  <p className="font-display text-3xl font-bold text-sand">247</p>
                  <p className="text-xs text-mist mt-1">Following</p>
                </div>
                <div className="text-center">
                  <p className="font-display text-3xl font-bold text-sand">1.2K</p>
                  <p className="text-xs text-mist mt-1">Followers</p>
                </div>
                <div className="text-center">
                  <p className="font-display text-3xl font-bold text-sand">856</p>
                  <p className="text-xs text-mist mt-1">Likes</p>
                </div>
                <div className="text-center">
                  <p className="font-display text-3xl font-bold text-sand">12</p>
                  <p className="text-xs text-mist mt-1">Circles</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                {!isOwner && (
                  <>
                    <button className="circular-btn flex-1 text-sm">Message</button>
                    <button className="circular-btn-outline flex-1 text-sm">Following</button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Bio & Details */}
          {editMode ? (
            <div className="mt-8 space-y-6 border-t border-grey-300 pt-8">
              {message && (
                <div className={`p-3 rounded-lg text-sm ${message.includes("successfully") ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                  {message}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-sand mb-2">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-grey-300 p-3 focus:ring-2 focus:ring-sand focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-sand mb-2">Headline</label>
                <input
                  type="text"
                  value={form.headline}
                  onChange={(e) => setForm({ ...form, headline: e.target.value })}
                  className="w-full rounded-lg border border-grey-300 p-3 focus:ring-2 focus:ring-sand focus:outline-none"
                  placeholder="e.g., Designer in Berlin"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-sand mb-2">Bio</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  className="w-full rounded-lg border border-grey-300 p-3 focus:ring-2 focus:ring-sand focus:outline-none resize-none"
                  rows={4}
                  placeholder="Tell us about yourself"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-sand mb-2">Skills (comma-separated)</label>
                <input
                  type="text"
                  value={form.skills}
                  onChange={(e) => setForm({ ...form, skills: e.target.value })}
                  className="w-full rounded-lg border border-grey-300 p-3 focus:ring-2 focus:ring-sand focus:outline-none"
                  placeholder="e.g., Design, Product, Marketing"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-grey-300">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="circular-btn flex-1 disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  onClick={() => setEditMode(false)}
                  className="circular-btn-outline flex-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 border-t border-grey-300 pt-6">
              {profile.bio && (
                <p className="text-mist mb-4">{profile.bio}</p>
              )}
              {profile.skills && profile.skills.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-sand mb-2">Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill) => (
                      <span key={skill} className="circular-badge text-xs px-3 py-1 rounded-full">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Tabs & Content ─── */}
      <div className="mx-auto max-w-4xl px-4 md:px-6">
        {/* Tab Navigation */}
        <div className="flex gap-8 border-b border-grey-300 mb-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-sm font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? "text-sand border-b-2 border-sand"
                  : "text-mist hover:text-sand"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div>
          {/* Posts Tab */}
          {activeTab === "Posts" && (
            <div className="grid grid-cols-3 gap-4">
              {mockPosts.map((post) => (
                <div
                  key={post.id}
                  className="aspect-square rounded-xl bg-grey-200 overflow-hidden group cursor-pointer"
                >
                  <div className="w-full h-full bg-gradient-to-br from-grey-300 to-grey-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <p className="text-white font-semibold">View Post</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Circles Tab */}
          {activeTab === "Circles" && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {mockCircles.map((circle) => (
                <div key={circle.id} className="circular-card p-6 text-center group cursor-pointer">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-grey-300 to-grey-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                  <p className="font-semibold text-sand text-sm">{circle.name}</p>
                  <p className="text-xs text-mist mt-1">{circle.members} members</p>
                  <button className="mt-3 circular-btn-outline text-xs py-1.5 w-full">
                    View
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Opportunities Tab */}
          {activeTab === "Opportunities" && (
            <div className="space-y-4">
              {mockOpportunities.map((opp) => (
                <div key={opp.id} className="circular-card p-6 group cursor-pointer">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-grey-300 flex-shrink-0 group-hover:scale-110 transition-transform" />
                    <div className="flex-1">
                      <p className="font-semibold text-sand">{opp.title}</p>
                      <p className="text-sm text-mist mt-1">{opp.company}</p>
                      <button className="mt-3 text-xs font-semibold text-sand hover:text-sand/70">
                        Learn More →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
