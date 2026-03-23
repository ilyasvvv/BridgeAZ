import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { apiClient, uploadViaPresign } from "../api/client";
import { useAuth } from "../utils/auth";
import StatusBadge from "../components/StatusBadge";
import RegionPill from "../components/RegionPill";
import UserChip, { USER_CHIP_SIZES } from "../components/UserChip";
import ShareSheet from "../components/ShareSheet";
import { buildSharePayload } from "../utils/share";

const tabs = ["Overview", "Experience", "Education", "Projects", "Verification", "Settings"];

export default function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token, setUser } = useAuth();
  const isOwner = user?._id && id && String(user._id) === String(id);
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState("Overview");
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({});
  const [docFile, setDocFile] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [resumeFile, setResumeFile] = useState(null);
  const [mentorInfo, setMentorInfo] = useState({ universityEmail: "", linkedinUrl: "", note: "" });
  const [message, setMessage] = useState("");
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const allowedTypes = ["application/pdf", "image/png", "image/jpeg"];
  const maxSizeBytes = 5 * 1024 * 1024;

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
        links: data.links || [],
        socialLinks: data.socialLinks || { linkedin: "", github: "", website: "" },
        experience: data.experience || [],
        locationNow: data.locationNow || { country: "", city: "" },
        isPrivate: data.isPrivate || data.profileVisibility === "private",
        avatarUrl: data.avatarUrl || data.profilePhotoUrl || data.profilePictureUrl || "",
        resumeUrl: data.resumeUrl || ""
      });
    } catch (err) {
      console.error("Failed to load profile", err);
    }
  };

  useEffect(() => {
    if (!token) return;
    if (id && user?._id && String(id) !== String(user._id)) {
      navigate(`/profile/${user._id}/edit`, { replace: true });
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
        links: form.links,
        socialLinks: form.socialLinks,
        experience: form.experience,
        locationNow: form.locationNow,
        isPrivate: form.isPrivate,
        avatarUrl: form.avatarUrl,
        resumeUrl: form.resumeUrl
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

  const handlePresignUpload = async (file, purpose) => {
    if (!file) return null;
    if (!allowedTypes.includes(file.type)) {
      setMessage("Unsupported file type");
      return null;
    }
    if (file.size > maxSizeBytes) {
      setMessage("File must be 5MB or less");
      return null;
    }
    const presign = await uploadViaPresign({ file, purpose }, token);
    return presign.documentUrl;
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessage("");
    try {
      const url = await handlePresignUpload(file, "avatar");
      if (url) {
        setForm((prev) => ({ ...prev, avatarUrl: url }));
        setMessage("Avatar ready to save.");
      }
    } catch (error) {
      setMessage(error.message || "Failed to upload avatar");
    }
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessage("");
    try {
      const url = await handlePresignUpload(file, "resume");
      if (url) {
        setForm((prev) => ({ ...prev, resumeUrl: url }));
        setMessage("Resume uploaded and linked.");
      }
    } catch (error) {
      setMessage(error.message || "Failed to upload resume");
    }
  };

  const addExperience = () => {
    setForm((prev) => ({
      ...prev,
      experience: [
        ...(prev.experience || []),
        { company: "", role: "", startDate: "", endDate: "", description: "" }
      ]
    }));
  };

  const updateExperience = (index, field, value) => {
    setForm((prev) => {
      const next = [...(prev.experience || [])];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, experience: next };
    });
  };

  const removeExperience = (index) => {
    setForm((prev) => {
      const next = [...(prev.experience || [])];
      next.splice(index, 1);
      return { ...prev, experience: next };
    });
  };

  const handleStudentVerification = async () => {
    setMessage("");
    try {
      if (!(docFile instanceof File)) {
        setMessage("Verification document is required");
        return;
      }
      const presign = await uploadViaPresign({ file: docFile, purpose: "verification" }, token);
      await apiClient.post(
        "/verification/student",
        { documentUrl: presign.documentUrl, objectKey: presign.objectKey },
        token
      );
      setMessage("Student verification request submitted.");
      loadProfile();
    } catch (error) {
      setMessage(error.message || "Failed to submit verification");
    }
  };

  const handleMentorVerification = async () => {
    setMessage("");
    try {
      if (!(docFile instanceof File)) {
        setMessage("Verification document is required");
        return;
      }
      if (!mentorInfo.universityEmail && !mentorInfo.linkedinUrl && !mentorInfo.note) {
        setMessage("Provide at least one mentor detail (email, LinkedIn, or note).");
        return;
      }
      const presign = await uploadViaPresign({ file: docFile, purpose: "verification" }, token);
      await apiClient.post(
        "/verification/mentor",
        {
          documentUrl: presign.documentUrl,
          objectKey: presign.objectKey,
          ...mentorInfo
        },
        token
      );
      setMessage("Mentor verification request submitted.");
      loadProfile();
    } catch (error) {
      setMessage(error.message || "Failed to submit mentor verification");
    }
  };

  const skillsList = useMemo(() => profile?.skills || [], [profile]);
  const studentStatus = profile?.studentVerificationStatus || "none";
  const mentorStatus = profile?.mentorVerificationStatus || "none";
  const isPendingVerification =
    (profile?.userType === "student" && studentStatus === "pending") ||
    (profile?.userType === "professional" && mentorStatus === "pending");

  if (!profile) {
    return <div className="p-20 text-center text-text-secondary animate-pulse">Loading your profile...</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 py-6">
      {/* Top Profile Card */}
      <div className="apple-card overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-brand-blue/20 to-brand-blue/5 md:h-48" />
        <div className="relative px-6 pb-8 md:px-10">
          <div className="relative -mt-12 flex flex-col items-start justify-between gap-6 md:-mt-16 md:flex-row md:items-end">
            <div className="flex flex-col items-start gap-4 md:flex-row md:items-end">
              <div className="group relative">
                <div className="rounded-full border-4 border-white shadow-apple overflow-hidden">
                  <UserChip
                    user={form.avatarUrl ? { ...profile, avatarUrl: form.avatarUrl } : profile}
                    size={128}
                    className="!gap-0"
                    nameClassName="hidden"
                  />
                </div>
                <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="text-white text-xs font-bold uppercase">Change</span>
                  <input type="file" className="hidden" onChange={handleAvatarUpload} accept="image/*" />
                </label>
              </div>
              <div className="mb-2">
                <h1 className="text-3xl font-extrabold text-text-main">{profile.name}</h1>
                <p className="text-lg font-medium text-text-secondary">{profile.headline || "BridgeAZ Member"}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <RegionPill region={profile.currentRegion} />
                  <StatusBadge label={profile.userType} tone={profile.userType === "professional" ? "blue" : "slate"} />
                  {profile.mentorVerified && <StatusBadge label="Verified Mentor" tone="success" />}
                  {profile.studentVerified && <StatusBadge label="Verified Student" tone="success" />}
                </div>
              </div>
            </div>
            <div className="mb-2 flex gap-3">
              <Link to={`/profile/${profile._id}`} className="apple-button-secondary">
                View Public Profile
              </Link>
              <button
                onClick={() => setEditMode(true)}
                className="apple-button-primary"
              >
                Edit Basic Info
              </button>
            </div>
          </div>
        </div>
      </div>

      {message && (
        <div className="rounded-apple bg-brand-blue/10 p-4 text-center text-sm font-semibold text-brand-blue">
          {message}
        </div>
      )}

      {/* Edit Mode Modal / Section */}
      {editMode && (
        <div className="apple-card p-8 animate-fade-in border-brand-blue/30 bg-white/50 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Edit Basic Info</h2>
            <button onClick={() => setEditMode(false)} className="text-text-muted hover:text-text-main text-sm font-medium">Cancel</button>
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-tight text-text-muted px-1">Full Name</label>
              <input
                className="w-full rounded-apple border border-black/[0.08] bg-white px-4 py-2 text-text-main outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Name"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-tight text-text-muted px-1">Headline</label>
              <input
                className="w-full rounded-apple border border-black/[0.08] bg-white px-4 py-2 text-text-main outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                value={form.headline}
                onChange={(e) => setForm({ ...form, headline: e.target.value })}
                placeholder="Headline (e.g. Software Engineer at Google)"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-bold uppercase tracking-tight text-text-muted px-1">Bio</label>
              <textarea
                className="w-full rounded-apple border border-black/[0.08] bg-white px-4 py-2 text-text-main outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Tell the community about yourself..."
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-tight text-text-muted px-1">Current Region</label>
              <input
                className="w-full rounded-apple border border-black/[0.08] bg-white px-4 py-2 text-text-main outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                value={form.currentRegion}
                onChange={(e) => setForm({ ...form, currentRegion: e.target.value })}
                placeholder="e.g. Europe, North America"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-tight text-text-muted px-1">Skills</label>
              <input
                className="w-full rounded-apple border border-black/[0.08] bg-white px-4 py-2 text-text-main outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                value={form.skills}
                onChange={(e) => setForm({ ...form, skills: e.target.value })}
                placeholder="React, Design, Python..."
              />
            </div>
            <div className="flex items-center gap-3 pt-4 md:col-span-2">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="apple-button-primary px-10"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => setEditMode(false)}
                className="apple-button-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-black/[0.05] overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap px-6 py-4 text-sm font-bold transition-colors ${
              activeTab === tab 
                ? "border-b-2 border-brand-blue text-brand-blue" 
                : "text-text-muted hover:text-text-main"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in">
        {activeTab === "Overview" && (
          <div className="grid gap-8 md:grid-cols-[1fr_320px]">
            <div className="space-y-8">
              <section className="apple-card p-8">
                <h3 className="text-xl font-bold">About</h3>
                <p className="mt-4 text-[15px] leading-relaxed text-text-secondary">
                  {profile.bio || "No bio yet. Add one to help others know you better."}
                </p>
                <div className="mt-8">
                  <h4 className="text-[11px] font-bold uppercase tracking-tight text-text-muted">Current Location</h4>
                  <div className="mt-2 flex gap-4">
                    <input
                      className="rounded-apple border border-black/[0.08] bg-white px-4 py-1.5 text-sm text-text-main outline-none focus:border-brand-blue"
                      placeholder="Country"
                      value={form.locationNow?.country || ""}
                      onChange={(e) => setForm({...form, locationNow: {...form.locationNow, country: e.target.value}})}
                    />
                    <input
                      className="rounded-apple border border-black/[0.08] bg-white px-4 py-1.5 text-sm text-text-main outline-none focus:border-brand-blue"
                      placeholder="City"
                      value={form.locationNow?.city || ""}
                      onChange={(e) => setForm({...form, locationNow: {...form.locationNow, city: e.target.value}})}
                    />
                    <button onClick={handleSave} className="text-xs font-bold text-brand-blue hover:underline">Update</button>
                  </div>
                </div>
              </section>

              <section className="apple-card p-8">
                <h3 className="text-xl font-bold">Social & Links</h3>
                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  {Object.keys(form.socialLinks || {}).map((key) => (
                    <div key={key} className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-tight text-text-muted capitalize">{key}</label>
                      <input
                        className="w-full rounded-apple border border-black/[0.08] bg-white px-4 py-2 text-sm text-text-main outline-none focus:border-brand-blue"
                        value={form.socialLinks?.[key] || ""}
                        onChange={(e) => setForm({
                          ...form, 
                          socialLinks: { ...form.socialLinks, [key]: e.target.value }
                        })}
                        placeholder={`Your ${key} URL`}
                      />
                    </div>
                  ))}
                  <div className="md:col-span-2">
                    <button onClick={handleSave} className="apple-button-primary text-xs">Update Links</button>
                  </div>
                </div>
              </section>
            </div>

            <div className="space-y-8">
              <section className="apple-card p-6">
                <h3 className="text-[11px] font-bold uppercase tracking-tight text-text-muted">Your Resume</h3>
                <div className="mt-4">
                  {profile.resumeUrl ? (
                    <div className="flex flex-col gap-3">
                      <a href={profile.resumeUrl} target="_blank" rel="noreferrer" className="apple-button-secondary w-full justify-center">View Current Resume</a>
                      <p className="text-[10px] text-center text-text-muted italic">Replace by uploading below</p>
                    </div>
                  ) : (
                    <p className="text-sm text-text-secondary italic mb-4">No resume uploaded yet.</p>
                  )}
                  <div className="mt-4 flex flex-col gap-3">
                    <input type="file" onChange={handleResumeUpload} className="text-xs text-text-muted" accept=".pdf" />
                    <p className="text-[10px] text-text-muted">PDF only, max 5MB</p>
                  </div>
                </div>
              </section>

              <section className="apple-card p-6">
                <h3 className="text-[11px] font-bold uppercase tracking-tight text-text-muted">Skills</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {skillsList.map((skill) => (
                    <span key={skill} className="rounded-apple bg-bg-app px-2.5 py-1 text-[11px] font-bold text-text-main border border-black/[0.03]">
                      {skill}
                    </span>
                  ))}
                  {skillsList.length === 0 && <p className="text-sm text-text-secondary italic">No skills added.</p>}
                </div>
                <button onClick={() => {setEditMode(true); setActiveTab("Overview")}} className="mt-4 text-xs font-bold text-brand-blue hover:underline">Edit Skills</button>
              </section>
            </div>
          </div>
        )}

        {activeTab === "Experience" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Professional Experience</h3>
              <button onClick={addExperience} className="apple-button-primary text-xs font-bold">+ Add New</button>
            </div>
            {(form.experience || []).map((exp, index) => (
              <div key={index} className="apple-card p-6 space-y-4 relative group">
                <button 
                  onClick={() => removeExperience(index)}
                  className="absolute top-4 right-4 text-accent-error opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold uppercase"
                >
                  Remove
                </button>
                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    className="rounded-apple border border-black/[0.08] bg-white px-4 py-2 text-sm text-text-main"
                    value={exp.company || ""}
                    onChange={(e) => updateExperience(index, "company", e.target.value)}
                    placeholder="Company"
                  />
                  <input
                    className="rounded-apple border border-black/[0.08] bg-white px-4 py-2 text-sm text-text-main"
                    value={exp.role || ""}
                    onChange={(e) => updateExperience(index, "role", e.target.value)}
                    placeholder="Role"
                  />
                  <textarea
                    className="md:col-span-2 rounded-apple border border-black/[0.08] bg-white px-4 py-2 text-sm text-text-main"
                    value={exp.description || ""}
                    onChange={(e) => updateExperience(index, "description", e.target.value)}
                    placeholder="Describe your impact and responsibilities..."
                    rows={2}
                  />
                </div>
              </div>
            ))}
            {(form.experience || []).length > 0 && (
              <button onClick={handleSave} className="apple-button-primary">Save Experience</button>
            )}
            {(form.experience || []).length === 0 && (
              <div className="apple-card p-12 text-center">
                <p className="text-text-secondary">Showcase your professional journey.</p>
                <button onClick={addExperience} className="mt-4 text-brand-blue font-bold hover:underline">Add your first experience</button>
              </div>
            )}
          </div>
        )}

        {activeTab === "Education" && (
          <div className="apple-card p-12 text-center">
            <div className="text-4xl mb-4">🎓</div>
            <h3 className="text-lg font-bold">Education Tracking</h3>
            <p className="mt-2 text-text-secondary max-w-sm mx-auto">
              This feature is being refined to help you better connect with alumni. Coming very soon.
            </p>
          </div>
        )}

        {activeTab === "Projects" && (
          <div className="apple-card p-12 text-center">
            <div className="text-4xl mb-4">🚀</div>
            <h3 className="text-lg font-bold">Project Showcase</h3>
            <p className="mt-2 text-text-secondary max-w-sm mx-auto">
              Share what you've built. We're building a beautiful way to display your creative and technical work.
            </p>
          </div>
        )}

        {activeTab === "Verification" && (
          <div className="max-w-3xl mx-auto space-y-8">
            <section className="apple-card p-8 text-center">
              <h3 className="text-2xl font-bold">Build Trust with Verification</h3>
              <p className="mt-3 text-text-secondary">
                Verified badges increase your credibility by 3x and help you stand out to mentors and employers.
              </p>
              
              <div className="mt-8 flex justify-center items-center gap-12">
                <div className="flex flex-col items-center">
                  <div className={`h-16 w-16 rounded-full flex items-center justify-center text-2xl mb-2 ${profile.studentVerified ? 'bg-accent-success/10 text-accent-success' : 'bg-bg-app text-text-muted'}`}>
                    {profile.studentVerified ? "✓" : "🎓"}
                  </div>
                  <span className="text-xs font-bold uppercase tracking-tight">Student</span>
                </div>
                <div className="h-px w-20 bg-black/[0.05]" />
                <div className="flex flex-col items-center">
                  <div className={`h-16 w-16 rounded-full flex items-center justify-center text-2xl mb-2 ${profile.mentorVerified ? 'bg-accent-success/10 text-accent-success' : 'bg-bg-app text-text-muted'}`}>
                    {profile.mentorVerified ? "✓" : "👨‍🏫"}
                  </div>
                  <span className="text-xs font-bold uppercase tracking-tight">Mentor</span>
                </div>
              </div>

              <div className="mt-12 p-6 rounded-apple bg-bg-app border border-black/[0.03]">
                <p className="text-sm font-semibold mb-4">Current Status: 
                  <span className="ml-2">
                    <StatusBadge 
                      label={profile.userType === "student" ? studentStatus : mentorStatus} 
                      tone={
                        (profile.userType === "student" ? studentStatus : mentorStatus) === "approved" ? "success" :
                        (profile.userType === "student" ? studentStatus : mentorStatus) === "pending" ? "warning" : "slate"
                      }
                    />
                  </span>
                </p>

                {profile.userType === "student" ? (
                  <div className="space-y-4">
                    <div className="flex flex-col items-center gap-4">
                      <input
                        type="file"
                        id="verification-doc"
                        onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                        className="hidden"
                        accept="image/*,.pdf"
                      />
                      <label htmlFor="verification-doc" className="apple-button-secondary cursor-pointer">
                        {docFile ? docFile.name : "Select Student ID or Enrollment Doc"}
                      </label>
                      <button
                        onClick={handleStudentVerification}
                        disabled={isPendingVerification || profile.studentVerified}
                        className="apple-button-primary disabled:opacity-50"
                      >
                        {isPendingVerification ? "Review in progress..." : profile.studentVerified ? "Verified" : "Submit for Review"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 max-w-md mx-auto text-left">
                    <div className="space-y-4">
                      <input
                        className="w-full rounded-apple border border-black/[0.08] bg-white px-4 py-2 text-sm"
                        placeholder="University or Professional Email"
                        value={mentorInfo.universityEmail}
                        onChange={(e) => setMentorInfo(prev => ({ ...prev, universityEmail: e.target.value }))}
                      />
                      <input
                        className="w-full rounded-apple border border-black/[0.08] bg-white px-4 py-2 text-sm"
                        placeholder="LinkedIn Profile URL"
                        value={mentorInfo.linkedinUrl}
                        onChange={(e) => setMentorInfo(prev => ({ ...prev, linkedinUrl: e.target.value }))}
                      />
                      <textarea
                        className="w-full rounded-apple border border-black/[0.08] bg-white px-4 py-2 text-sm"
                        placeholder="Additional notes for our verification team..."
                        value={mentorInfo.note}
                        onChange={(e) => setMentorInfo(prev => ({ ...prev, note: e.target.value }))}
                        rows={2}
                      />
                      <div className="flex flex-col items-center gap-4 border-t border-black/[0.05] pt-4">
                        <input type="file" onChange={(e) => setDocFile(e.target.files?.[0] || null)} className="text-xs" />
                        <button
                          onClick={handleMentorVerification}
                          disabled={isPendingVerification || profile.mentorVerified}
                          className="apple-button-primary w-full"
                        >
                          {isPendingVerification ? "Request Pending" : profile.mentorVerified ? "Verified" : "Request Mentor Status"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === "Settings" && (
          <div className="max-w-2xl mx-auto space-y-8">
            <section className="apple-card p-8">
              <h3 className="text-xl font-bold">Privacy & Visibility</h3>
              <div className="mt-6 space-y-4">
                <label className="flex items-center justify-between p-4 rounded-apple border border-black/[0.05] bg-bg-app/50">
                  <div>
                    <p className="text-[15px] font-bold">Private Profile</p>
                    <p className="text-xs text-text-secondary">Hide your profile from non-members and search engines.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!form.isPrivate}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, isPrivate: e.target.checked }));
                      handleSave();
                    }}
                    className="h-5 w-5 rounded-full border-black/[0.1] text-brand-blue focus:ring-brand-blue"
                  />
                </label>
                
                <div className="p-4 rounded-apple border border-black/[0.05]">
                  <p className="text-xs font-bold uppercase tracking-tight text-text-muted mb-1">Email Address</p>
                  <p className="text-sm font-medium text-text-main">{profile.email}</p>
                </div>

                <div className="p-4 rounded-apple border border-black/[0.05]">
                  <p className="text-xs font-bold uppercase tracking-tight text-text-muted mb-1">Account Type</p>
                  <p className="text-sm font-medium text-text-main capitalize">{profile.userType}</p>
                </div>
              </div>
            </section>

            <section className="apple-card p-8 border-accent-error/20">
              <h3 className="text-xl font-bold text-accent-error">Danger Zone</h3>
              <p className="mt-2 text-sm text-text-secondary">Permanently delete your account and all associated data.</p>
              <button className="apple-button-secondary mt-6 border-accent-error/20 text-accent-error hover:bg-accent-error/5">
                Delete My BridgeAZ Account
              </button>
            </section>
          </div>
        )}
      </div>

      <ShareSheet
        open={showShareSheet}
        onClose={() => setShowShareSheet(false)}
        shareInput={buildSharePayload({
          entityType: "profile",
          entityId: profile._id,
          url: `/profile/${profile._id}`,
          title: profile.name || "Profile",
          subtitle: profile.headline || "BridgeAZ member",
          imageUrl:
            profile.avatarUrl || profile.profilePhotoUrl || profile.profilePictureUrl || "",
          meta: { profileId: profile._id }
        })}
      />
    </div>
  );
}
