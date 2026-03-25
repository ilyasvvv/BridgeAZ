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
  const [verificationForm, setVerificationForm] = useState(null); // null | "student" | "mentor"
  const [expiresAt, setExpiresAt] = useState("");
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
      const payload = { documentUrl: presign.documentUrl, objectKey: presign.objectKey };
      if (expiresAt) payload.expiresAt = new Date(expiresAt).toISOString();
      await apiClient.post("/verification/student", payload, token);
      setMessage("Student verification request submitted.");
      setVerificationForm(null);
      setExpiresAt("");
      setDocFile(null);
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
      const payload = {
        documentUrl: presign.documentUrl,
        objectKey: presign.objectKey,
        ...mentorInfo
      };
      if (expiresAt) payload.expiresAt = new Date(expiresAt).toISOString();
      await apiClient.post("/verification/mentor", payload, token);
      setMessage("Mentor verification request submitted.");
      setVerificationForm(null);
      setExpiresAt("");
      setDocFile(null);
      setMentorInfo({ universityEmail: "", linkedinUrl: "", note: "" });
      loadProfile();
    } catch (error) {
      setMessage(error.message || "Failed to submit mentor verification");
    }
  };

  const handleTerminateVerification = async (type) => {
    setMessage("");
    try {
      await apiClient.post("/verification/terminate", { type }, token);
      setMessage(`${type === "student" ? "Student" : "Mentor"} verification terminated.`);
      loadProfile();
    } catch (error) {
      setMessage(error.message || "Failed to terminate verification");
    }
  };

  const skillsList = useMemo(() => profile?.skills || [], [profile]);
  const studentStatus = profile?.studentVerificationStatus || "none";
  const mentorStatus = profile?.mentorVerificationStatus || "none";
  const isPendingVerification =
    (profile?.userType === "student" && studentStatus === "pending") ||
    (profile?.userType === "professional" && mentorStatus === "pending");

  if (!profile) {
    return <div className="p-20 text-center text-mist animate-pulse">Loading your profile...</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 py-6" style={{ "--accent": "70 100 140", "--accent-soft": "209 207 201" }}>
      {/* Top Profile Card */}
      <div className="apple-card overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-accent-soft/40 to-accent-soft/10 md:h-48" />
        <div className="relative px-6 pb-8 md:px-10">
          <div className="relative -mt-12 flex flex-col items-start justify-between gap-6 md:-mt-16 md:flex-row md:items-end">
            <div className="flex flex-col items-start gap-4 md:flex-row md:items-end">
              <div className="group relative">
                <div className="rounded-full border-4 border-slate shadow-card overflow-hidden">
                  <UserChip
                    user={form.avatarUrl ? { ...profile, avatarUrl: form.avatarUrl } : profile}
                    size={128}
                    className="!gap-0"
                    nameClassName="hidden"
                  />
                </div>
                <label className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-sand/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="text-slate text-xs font-bold uppercase">Change</span>
                  <input type="file" className="hidden" onChange={handleAvatarUpload} accept="image/*" />
                </label>
              </div>
              <div className="mb-2">
                <h1 className="text-3xl font-extrabold text-sand">{profile.name}</h1>
                <p className="text-lg font-medium text-mist">{profile.headline || "BridgeAZ Member"}</p>
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
        <div className="rounded-md bg-accent-soft/30 p-4 text-center text-sm font-semibold text-accent border border-accent-soft/50">
          {message}
        </div>
      )}

      {/* Edit Mode Modal / Section */}
      {editMode && (
        <div className="apple-card p-8 animate-fade-in border-accent/30 bg-slate/50 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-sand">Edit Basic Info</h2>
            <button onClick={() => setEditMode(false)} className="text-mist hover:text-sand text-sm font-medium">Cancel</button>
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-tight text-mist px-1 opacity-70">Full Name</label>
              <input
                className="w-full rounded-md border border-border bg-slate px-4 py-2 text-sand outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Name"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-tight text-mist px-1 opacity-70">Headline</label>
              <input
                className="w-full rounded-md border border-border bg-slate px-4 py-2 text-sand outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                value={form.headline}
                onChange={(e) => setForm({ ...form, headline: e.target.value })}
                placeholder="Headline (e.g. Software Engineer at Google)"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-bold uppercase tracking-tight text-mist px-1 opacity-70">Bio</label>
              <textarea
                className="w-full rounded-md border border-border bg-slate px-4 py-2 text-sand outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Tell the community about yourself..."
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-tight text-mist px-1 opacity-70">Current Region</label>
              <input
                className="w-full rounded-md border border-border bg-slate px-4 py-2 text-sand outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                value={form.currentRegion}
                onChange={(e) => setForm({ ...form, currentRegion: e.target.value })}
                placeholder="e.g. Europe, North America"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-tight text-mist px-1 opacity-70">Skills</label>
              <input
                className="w-full rounded-md border border-border bg-slate px-4 py-2 text-sand outline-none focus:border-accent focus:ring-1 focus:ring-accent"
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
      <div className="flex border-b border-border overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap px-6 py-4 text-sm font-bold transition-colors ${
              activeTab === tab 
                ? "border-b-2 border-accent text-accent" 
                : "text-mist hover:text-sand"
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
                <h3 className="text-xl font-bold text-sand">About</h3>
                <p className="mt-4 text-[15px] leading-relaxed text-mist">
                  {profile.bio || "No bio yet. Add one to help others know you better."}
                </p>
                <div className="mt-8">
                  <h4 className="text-[11px] font-bold uppercase tracking-tight text-mist opacity-70">Current Location</h4>
                  <div className="mt-2 flex gap-4">
                    <input
                      className="rounded-md border border-border bg-slate px-4 py-1.5 text-sm text-sand outline-none focus:border-accent"
                      placeholder="Country"
                      value={form.locationNow?.country || ""}
                      onChange={(e) => setForm({...form, locationNow: {...form.locationNow, country: e.target.value}})}
                    />
                    <input
                      className="rounded-md border border-border bg-slate px-4 py-1.5 text-sm text-sand outline-none focus:border-accent"
                      placeholder="City"
                      value={form.locationNow?.city || ""}
                      onChange={(e) => setForm({...form, locationNow: {...form.locationNow, city: e.target.value}})}
                    />
                    <button onClick={handleSave} className="text-xs font-bold text-accent hover:underline">Update</button>
                  </div>
                </div>
              </section>

              <section className="apple-card p-8">
                <h3 className="text-xl font-bold text-sand">Social & Links</h3>
                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  {Object.keys(form.socialLinks || {}).map((key) => (
                    <div key={key} className="space-y-1">
                      <label className="text-[11px] font-bold uppercase tracking-tight text-mist capitalize opacity-70">{key}</label>
                      <input
                        className="w-full rounded-md border border-border bg-slate px-4 py-2 text-sm text-sand outline-none focus:border-accent"
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
                <h3 className="text-[11px] font-bold uppercase tracking-tight text-mist opacity-70">Your Resume</h3>
                <div className="mt-4">
                  {profile.resumeUrl ? (
                    <div className="flex flex-col gap-3">
                      <a href={profile.resumeUrl} target="_blank" rel="noreferrer" className="apple-button-secondary w-full justify-center">View Current Resume</a>
                      <p className="text-[10px] text-center text-mist italic">Replace by uploading below</p>
                    </div>
                  ) : (
                    <p className="text-sm text-mist italic mb-4">No resume uploaded yet.</p>
                  )}
                  <div className="mt-4 flex flex-col gap-3">
                    <input type="file" onChange={handleResumeUpload} className="text-xs text-mist" accept=".pdf" />
                    <p className="text-[10px] text-mist">PDF only, max 5MB</p>
                  </div>
                </div>
              </section>

              <section className="apple-card p-6">
                <h3 className="text-[11px] font-bold uppercase tracking-tight text-mist opacity-70">Skills</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {skillsList.map((skill) => (
                    <span key={skill} className="rounded-md bg-charcoal px-2.5 py-1 text-[11px] font-bold text-sand border border-border">
                      {skill}
                    </span>
                  ))}
                  {skillsList.length === 0 && <p className="text-sm text-mist italic">No skills added.</p>}
                </div>
                <button onClick={() => {setEditMode(true); setActiveTab("Overview")}} className="mt-4 text-xs font-bold text-accent hover:underline">Edit Skills</button>
              </section>
            </div>
          </div>
        )}

        {activeTab === "Experience" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-sand">Professional Experience</h3>
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
                    className="rounded-md border border-border bg-slate px-4 py-2 text-sm text-sand"
                    value={exp.company || ""}
                    onChange={(e) => updateExperience(index, "company", e.target.value)}
                    placeholder="Company"
                  />
                  <input
                    className="rounded-md border border-border bg-slate px-4 py-2 text-sm text-sand"
                    value={exp.role || ""}
                    onChange={(e) => updateExperience(index, "role", e.target.value)}
                    placeholder="Role"
                  />
                  <textarea
                    className="md:col-span-2 rounded-md border border-border bg-slate px-4 py-2 text-sm text-sand"
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
                <p className="text-mist">Showcase your professional journey.</p>
                <button onClick={addExperience} className="mt-4 text-accent font-bold hover:underline">Add your first experience</button>
              </div>
            )}
          </div>
        )}

        {activeTab === "Education" && (
          <div className="apple-card p-12 text-center">
            <div className="text-4xl mb-4">🎓</div>
            <h3 className="text-lg font-bold text-sand">Education Tracking</h3>
            <p className="mt-2 text-mist max-w-sm mx-auto">
              This feature is being refined to help you better connect with alumni. Coming very soon.
            </p>
          </div>
        )}

        {activeTab === "Projects" && (
          <div className="apple-card p-12 text-center">
            <div className="text-4xl mb-4">🚀</div>
            <h3 className="text-lg font-bold text-sand">Project Showcase</h3>
            <p className="mt-2 text-mist max-w-sm mx-auto">
              Share what you've built. We're building a beautiful way to display your creative and technical work.
            </p>
          </div>
        )}

        {activeTab === "Verification" && (
          <div className="max-w-3xl mx-auto space-y-8">
            {/* ── Status Overview ── */}
            <section className="apple-card p-8 text-center">
              <h3 className="text-2xl font-bold text-sand">Verification Status</h3>
              <p className="mt-3 text-mist">
                Verified badges increase your credibility and help you stand out to mentors and employers.
              </p>

              <div className="mt-8 flex justify-center items-center gap-12">
                <div className="flex flex-col items-center">
                  <div className={`h-16 w-16 rounded-full flex items-center justify-center text-2xl mb-2 ${profile.studentVerified ? 'bg-accent-success/10 text-accent-success' : 'bg-charcoal text-mist border border-border'}`}>
                    {profile.studentVerified ? "✓" : "🎓"}
                  </div>
                  <span className="text-xs font-bold uppercase tracking-tight text-mist">Student</span>
                </div>
                <div className="h-px w-20 bg-border" />
                <div className="flex flex-col items-center">
                  <div className={`h-16 w-16 rounded-full flex items-center justify-center text-2xl mb-2 ${profile.mentorVerified ? 'bg-accent-success/10 text-accent-success' : 'bg-charcoal text-mist border border-border'}`}>
                    {profile.mentorVerified ? "✓" : "👨‍🏫"}
                  </div>
                  <span className="text-xs font-bold uppercase tracking-tight text-mist">Mentor</span>
                </div>
              </div>
            </section>

            {/* ── Student Verification Status Card ── */}
            <section className="apple-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-bold text-sand">Student Verification</h4>
                <StatusBadge
                  label={studentStatus}
                  tone={studentStatus === "approved" ? "success" : studentStatus === "pending" ? "warning" : studentStatus === "rejected" ? "danger" : "slate"}
                />
              </div>

              {profile.studentVerified ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-6 text-sm text-mist">
                    {profile.studentVerifiedAt && (
                      <span>Verified: <span className="text-sand">{new Date(profile.studentVerifiedAt).toLocaleDateString()}</span></span>
                    )}
                    {profile.studentVerificationExpiresAt && (
                      <span>Expires: <span className="text-sand">{new Date(profile.studentVerificationExpiresAt).toLocaleDateString()}</span></span>
                    )}
                  </div>
                  <button
                    onClick={() => { if (window.confirm("Are you sure you want to terminate your student verification?")) handleTerminateVerification("student"); }}
                    className="text-sm text-red-400 hover:text-red-300 underline"
                  >
                    Terminate student verification early
                  </button>
                </div>
              ) : studentStatus === "pending" ? (
                <p className="text-sm text-mist">Your student verification is under review. We'll notify you when it's decided.</p>
              ) : (
                <>
                  {verificationForm !== "student" ? (
                    <button
                      onClick={() => { setVerificationForm("student"); setExpiresAt(""); setDocFile(null); }}
                      className="apple-button-secondary"
                    >
                      {studentStatus === "rejected" ? "Re-apply as Student" : "Become a Verified Student"}
                    </button>
                  ) : (
                    <div className="space-y-4 mt-2">
                      <div className="flex flex-col items-center gap-4">
                        <input
                          type="file"
                          id="verification-doc-student"
                          onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                          className="hidden"
                          accept="image/*,.pdf"
                        />
                        <label htmlFor="verification-doc-student" className="apple-button-secondary cursor-pointer">
                          {docFile ? docFile.name : "Select Student ID or Enrollment Doc"}
                        </label>
                        <div className="w-full max-w-xs">
                          <label className="block text-xs text-mist mb-1">End date (optional — e.g. graduation)</label>
                          <input
                            type="date"
                            value={expiresAt}
                            onChange={(e) => setExpiresAt(e.target.value)}
                            min={new Date().toISOString().split("T")[0]}
                            className="w-full rounded-md border border-border bg-slate px-4 py-2 text-sm text-sand"
                          />
                        </div>
                        <div className="flex gap-3">
                          <button onClick={handleStudentVerification} className="apple-button-primary">
                            Submit for Review
                          </button>
                          <button onClick={() => { setVerificationForm(null); setDocFile(null); setExpiresAt(""); }} className="apple-button-secondary">
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* ── Mentor Verification Status Card ── */}
            <section className="apple-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-bold text-sand">Mentor Verification</h4>
                <StatusBadge
                  label={mentorStatus}
                  tone={mentorStatus === "approved" ? "success" : mentorStatus === "pending" ? "warning" : mentorStatus === "rejected" ? "danger" : "slate"}
                />
              </div>

              {profile.mentorVerified ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-6 text-sm text-mist">
                    {profile.mentorVerifiedAt && (
                      <span>Verified: <span className="text-sand">{new Date(profile.mentorVerifiedAt).toLocaleDateString()}</span></span>
                    )}
                    {profile.mentorVerificationExpiresAt && (
                      <span>Expires: <span className="text-sand">{new Date(profile.mentorVerificationExpiresAt).toLocaleDateString()}</span></span>
                    )}
                  </div>
                  <button
                    onClick={() => { if (window.confirm("Are you sure you want to terminate your mentor verification?")) handleTerminateVerification("mentor"); }}
                    className="text-sm text-red-400 hover:text-red-300 underline"
                  >
                    Terminate mentor verification early
                  </button>
                </div>
              ) : mentorStatus === "pending" ? (
                <p className="text-sm text-mist">Your mentor verification is under review. We'll notify you when it's decided.</p>
              ) : (
                <>
                  {verificationForm !== "mentor" ? (
                    <button
                      onClick={() => { setVerificationForm("mentor"); setExpiresAt(""); setDocFile(null); setMentorInfo({ universityEmail: "", linkedinUrl: "", note: "" }); }}
                      className="apple-button-secondary"
                    >
                      {mentorStatus === "rejected" ? "Re-apply as Mentor" : "Become a Verified Mentor"}
                    </button>
                  ) : (
                    <div className="space-y-4 mt-2 max-w-md mx-auto text-left">
                      <input
                        className="w-full rounded-md border border-border bg-slate px-4 py-2 text-sm text-sand"
                        placeholder="University or Professional Email"
                        value={mentorInfo.universityEmail}
                        onChange={(e) => setMentorInfo(prev => ({ ...prev, universityEmail: e.target.value }))}
                      />
                      <input
                        className="w-full rounded-md border border-border bg-slate px-4 py-2 text-sm text-sand"
                        placeholder="LinkedIn Profile URL"
                        value={mentorInfo.linkedinUrl}
                        onChange={(e) => setMentorInfo(prev => ({ ...prev, linkedinUrl: e.target.value }))}
                      />
                      <textarea
                        className="w-full rounded-md border border-border bg-slate px-4 py-2 text-sm text-sand"
                        placeholder="Additional notes for our verification team..."
                        value={mentorInfo.note}
                        onChange={(e) => setMentorInfo(prev => ({ ...prev, note: e.target.value }))}
                        rows={2}
                      />
                      <div className="border-t border-border pt-4 space-y-4">
                        <input type="file" onChange={(e) => setDocFile(e.target.files?.[0] || null)} className="text-xs text-mist" accept="image/*,.pdf" />
                        <div>
                          <label className="block text-xs text-mist mb-1">End date (optional — when should this expire?)</label>
                          <input
                            type="date"
                            value={expiresAt}
                            onChange={(e) => setExpiresAt(e.target.value)}
                            min={new Date().toISOString().split("T")[0]}
                            className="w-full rounded-md border border-border bg-slate px-4 py-2 text-sm text-sand"
                          />
                        </div>
                        <div className="flex gap-3 justify-center">
                          <button onClick={handleMentorVerification} className="apple-button-primary">
                            Request Mentor Status
                          </button>
                          <button onClick={() => { setVerificationForm(null); setDocFile(null); setExpiresAt(""); }} className="apple-button-secondary">
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        )}

        {activeTab === "Settings" && (
          <div className="max-w-2xl mx-auto space-y-8">
            <section className="apple-card p-8">
              <h3 className="text-xl font-bold text-sand">Privacy & Visibility</h3>
              <div className="mt-6 space-y-4">
                <label className="flex items-center justify-between p-4 rounded-md border border-border bg-charcoal/50">
                  <div>
                    <p className="text-[15px] font-bold text-sand">Private Profile</p>
                    <p className="text-xs text-mist">Hide your profile from non-members and search engines.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!form.isPrivate}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, isPrivate: e.target.checked }));
                      handleSave();
                    }}
                    className="h-5 w-5 rounded-full border-border text-accent focus:ring-accent"
                  />
                </label>
                
                <div className="p-4 rounded-md border border-border">
                  <p className="text-xs font-bold uppercase tracking-tight text-mist opacity-70 mb-1">Email Address</p>
                  <p className="text-sm font-medium text-sand">{profile.email}</p>
                </div>

                <div className="p-4 rounded-md border border-border">
                  <p className="text-xs font-bold uppercase tracking-tight text-mist opacity-70 mb-1">Account Type</p>
                  <p className="text-sm font-medium text-sand capitalize">{profile.userType}</p>
                </div>
              </div>
            </section>

            <section className="apple-card p-8 border-accent-error/20">
              <h3 className="text-xl font-bold text-accent-error">Danger Zone</h3>
              <p className="mt-2 text-sm text-mist">Permanently delete your account and all associated data.</p>
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
