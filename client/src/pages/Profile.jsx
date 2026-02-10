import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient, uploadViaPresign } from "../api/client";
import { useAuth } from "../utils/auth";
import StatusBadge from "../components/StatusBadge";
import RegionPill from "../components/RegionPill";
import UserChip from "../components/UserChip";

const tabs = ["Overview", "Experience", "Education", "Projects", "Activity"];

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
  const allowedTypes = ["application/pdf", "image/png", "image/jpeg"];
  const maxSizeBytes = 5 * 1024 * 1024;

  const loadProfile = async () => {
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

  const handleAvatarUpload = async () => {
    setMessage("");
    try {
      if (!(avatarFile instanceof File)) {
        setMessage("Select an image to upload.");
        return;
      }
      const url = await handlePresignUpload(avatarFile, "avatar");
      if (url) {
        setForm((prev) => ({ ...prev, avatarUrl: url }));
        setAvatarFile(null);
      }
    } catch (error) {
      setMessage(error.message || "Failed to upload avatar");
    }
  };

  const handleResumeUpload = async () => {
    setMessage("");
    try {
      if (!(resumeFile instanceof File)) {
        setMessage("Select a file to upload.");
        return;
      }
      const url = await handlePresignUpload(resumeFile, "resume");
      if (url) {
        setForm((prev) => ({ ...prev, resumeUrl: url }));
        setResumeFile(null);
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
        setMessage("File is required");
        return;
      }

      if (!allowedTypes.includes(docFile.type)) {
        setMessage("Unsupported file type");
        return;
      }

      if (docFile.size > maxSizeBytes) {
        setMessage("File must be 5MB or less");
        return;
      }

      const presign = await uploadViaPresign({ file: docFile, purpose: "verification" }, token);
      await apiClient.post(
        "/verification/student",
        { documentUrl: presign.documentUrl, objectKey: presign.objectKey },
        token
      );

      setMessage("Verification request submitted.");
    } catch (error) {
      setMessage(error.message || "Failed to submit verification");
    }
  };

  const handleMentorVerification = async () => {
    setMessage("");
    try {
      if (!(docFile instanceof File)) {
        setMessage("File is required");
        return;
      }

      if (!mentorInfo.universityEmail && !mentorInfo.linkedinUrl && !mentorInfo.note) {
        setMessage("Provide at least one mentor detail.");
        return;
      }

      if (!allowedTypes.includes(docFile.type)) {
        setMessage("Unsupported file type");
        return;
      }

      if (docFile.size > maxSizeBytes) {
        setMessage("File must be 5MB or less");
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
    } catch (error) {
      setMessage(error.message || "Failed to submit mentor verification");
    }
  };

  const skills = useMemo(() => profile?.skills || [], [profile]);
  const studentStatus = profile?.studentVerificationStatus || "none";
  const mentorStatus = profile?.mentorVerificationStatus || "none";
  const isPendingVerification =
    (profile?.userType === "student" && studentStatus === "pending") ||
    (profile?.userType === "professional" && mentorStatus === "pending");

  if (!profile) {
    return <p className="text-sm text-mist">Loading profile...</p>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="glass rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <UserChip
              user={profile}
              size={48}
              to={profile?._id ? `/profile/${profile._id}` : undefined}
              nameClassName="text-2xl text-sand"
            />
            <p className="text-sm text-mist">{profile.headline || "BridgeAZ member"}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <RegionPill region={profile.currentRegion} />
              {profile.studentVerified && <StatusBadge label="Student Verified" tone="teal" />}
              {profile.mentorVerified && <StatusBadge label="Mentor Verified" tone="coral" />}
              {profile.isMentor && !profile.mentorVerified && (
                <StatusBadge label="Mentor Pending" tone="ember" />
              )}
            </div>
          </div>
          {isOwner && (
            <button
              onClick={() => setEditMode((prev) => !prev)}
              className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-wide text-sand hover:border-teal"
            >
              {editMode ? "Cancel" : "Edit Profile"}
            </button>
          )}
        </div>

        {editMode && (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <input
              className="rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sand"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Name"
            />
            <input
              className="rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sand"
              value={form.headline}
              onChange={(event) => setForm({ ...form, headline: event.target.value })}
              placeholder="Headline"
            />
            <textarea
              className="rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sand md:col-span-2"
              value={form.bio}
              onChange={(event) => setForm({ ...form, bio: event.target.value })}
              placeholder="Bio"
              rows={3}
            />
            <input
              className="rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sand"
              value={form.currentRegion}
              onChange={(event) => setForm({ ...form, currentRegion: event.target.value })}
              placeholder="Current Region"
            />
            <input
              className="rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sand"
              value={form.skills}
              onChange={(event) => setForm({ ...form, skills: event.target.value })}
              placeholder="Skills (comma separated)"
            />

            <div className="md:col-span-2 space-y-2">
              <p className="text-xs uppercase tracking-wide text-mist">Avatar</p>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="file"
                  onChange={(event) => setAvatarFile(event.target.files?.[0] || null)}
                  className="text-xs text-mist"
                />
                <button
                  type="button"
                  onClick={handleAvatarUpload}
                  className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-wide text-sand hover:border-teal"
                >
                  Upload avatar
                </button>
                {form.avatarUrl && (
                  <span className="text-xs text-mist">Saved</span>
                )}
              </div>
            </div>

            <div className="md:col-span-2 space-y-2">
              <p className="text-xs uppercase tracking-wide text-mist">Resume</p>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="file"
                  onChange={(event) => setResumeFile(event.target.files?.[0] || null)}
                  className="text-xs text-mist"
                />
                <button
                  type="button"
                  onClick={handleResumeUpload}
                  className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-wide text-sand hover:border-teal"
                >
                  Upload resume
                </button>
                {form.resumeUrl && (
                  <span className="text-xs text-mist">Saved</span>
                )}
              </div>
            </div>

            <input
              className="rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sand"
              value={form.socialLinks?.linkedin || ""}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  socialLinks: { ...prev.socialLinks, linkedin: event.target.value }
                }))
              }
              placeholder="LinkedIn URL"
            />
            <input
              className="rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sand"
              value={form.socialLinks?.github || ""}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  socialLinks: { ...prev.socialLinks, github: event.target.value }
                }))
              }
              placeholder="GitHub URL"
            />
            <input
              className="rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sand"
              value={form.socialLinks?.website || ""}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  socialLinks: { ...prev.socialLinks, website: event.target.value }
                }))
              }
              placeholder="Website URL"
            />
            <input
              className="rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sand"
              value={form.locationNow?.country || ""}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  locationNow: { ...prev.locationNow, country: event.target.value }
                }))
              }
              placeholder="Country"
            />
            <input
              className="rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sand"
              value={form.locationNow?.city || ""}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  locationNow: { ...prev.locationNow, city: event.target.value }
                }))
              }
              placeholder="City"
            />
            <label className="md:col-span-2 flex items-center gap-2 text-xs text-mist">
              <input
                type="checkbox"
                checked={!!form.isPrivate}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, isPrivate: event.target.checked }))
                }
              />
              Private profile
            </label>

            <div className="md:col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wide text-mist">Experience</p>
                <button
                  type="button"
                  onClick={addExperience}
                  className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-wide text-mist hover:border-teal"
                >
                  Add
                </button>
              </div>
              {(form.experience || []).map((exp, index) => (
                <div key={index} className="space-y-2 rounded-xl border border-white/10 p-3">
                  <input
                    className="w-full rounded-xl border border-white/10 bg-slate/40 px-3 py-2 text-sm text-sand"
                    value={exp.company || ""}
                    onChange={(event) => updateExperience(index, "company", event.target.value)}
                    placeholder="Company"
                  />
                  <input
                    className="w-full rounded-xl border border-white/10 bg-slate/40 px-3 py-2 text-sm text-sand"
                    value={exp.role || ""}
                    onChange={(event) => updateExperience(index, "role", event.target.value)}
                    placeholder="Role"
                  />
                  <textarea
                    className="w-full rounded-xl border border-white/10 bg-slate/40 px-3 py-2 text-sm text-sand"
                    value={exp.description || ""}
                    onChange={(event) => updateExperience(index, "description", event.target.value)}
                    placeholder="Description"
                    rows={2}
                  />
                  <button
                    type="button"
                    onClick={() => removeExperience(index)}
                    className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-wide text-mist hover:border-teal"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleSave}
              className="md:col-span-2 rounded-full bg-teal px-6 py-2 text-xs font-semibold uppercase tracking-wide text-charcoal"
            >
              Save changes
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-full border px-4 py-2 text-xs uppercase tracking-wide ${
              activeTab === tab ? "border-teal bg-teal/20 text-teal" : "border-white/10 text-mist"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="glass rounded-2xl p-6">
        {activeTab === "Overview" && (
          <div className="space-y-4">
            <p className="text-sm text-mist">{profile.bio || "No bio yet."}</p>
            {profile.locationNow?.country && (
              <p className="text-xs text-mist">
                Based in {profile.locationNow.city ? `${profile.locationNow.city}, ` : ""}
                {profile.locationNow.country}
              </p>
            )}
            {profile.resumeUrl && (
              <a
                href={profile.resumeUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-teal underline"
              >
                View resume
              </a>
            )}
            {(profile.socialLinks?.linkedin ||
              profile.socialLinks?.github ||
              profile.socialLinks?.website) && (
              <div className="flex flex-wrap gap-3 text-xs text-mist">
                {profile.socialLinks?.linkedin && (
                  <a href={profile.socialLinks.linkedin} className="text-teal underline">
                    LinkedIn
                  </a>
                )}
                {profile.socialLinks?.github && (
                  <a href={profile.socialLinks.github} className="text-teal underline">
                    GitHub
                  </a>
                )}
                {profile.socialLinks?.website && (
                  <a href={profile.socialLinks.website} className="text-teal underline">
                    Website
                  </a>
                )}
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-wide text-mist">Skills</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {skills.length ? (
                  skills.map((skill) => (
                    <span key={skill} className="rounded-full bg-white/10 px-3 py-1 text-xs">
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-mist">No skills listed.</span>
                )}
              </div>
            </div>
          </div>
        )}
        {activeTab === "Experience" && (
          <>
            {profile.experience?.length ? (
              <div className="space-y-3">
                {profile.experience.map((item, index) => (
                  <div key={index} className="rounded-xl border border-white/10 p-4">
                    <p className="text-sm text-sand">{item.role || "Role"}</p>
                    <p className="text-xs text-mist">{item.company || item.org}</p>
                    {item.description && (
                      <p className="text-xs text-mist mt-2">{item.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-mist">No experience entries yet.</p>
            )}
          </>
        )}
        {activeTab === "Education" && (
          <>
            {/* Render education history with school metadata. */}
            <p className="text-sm text-mist">Education entries coming soon.</p>
          </>
        )}
        {activeTab === "Projects" && (
          <>
            {/* Add project cards once project entries are stored on the profile. */}
            <p className="text-sm text-mist">Project showcase coming soon.</p>
          </>
        )}
        {activeTab === "Activity" && (
          <>
            {/* Filter posts authored by this user and display here. */}
            <p className="text-sm text-mist">User posts will appear here.</p>
          </>
        )}
      </div>

      {isOwner && (
        <div className="glass rounded-2xl p-6 space-y-4">
          <h3 className="font-display text-xl">Verification</h3>
          <p className="text-sm text-mist">
            Upload a student ID or mentor credential. Admins manually approve requests.
          </p>
          <input
            type="file"
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              setDocFile(f);
              setMessage("");
            }}
            className="text-xs text-mist"
          />
          <p className="text-xs text-mist">
            {docFile ? docFile.name : "No file chosen"}
          </p>
          <p className="text-xs text-mist">
            Status:{" "}
            {profile.userType === "student" ? studentStatus : mentorStatus}
          </p>
          {profile.userType === "student" ? (
            <button
              onClick={handleStudentVerification}
              disabled={isPendingVerification}
              className="rounded-full bg-coral px-5 py-2 text-xs font-semibold uppercase tracking-wide text-charcoal"
            >
              {isPendingVerification ? "Request pending" : "Request student verification"}
            </button>
          ) : (
            <div className="space-y-3">
              <input
                className="w-full rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sand"
                placeholder="University email (optional)"
                value={mentorInfo.universityEmail}
                onChange={(event) =>
                  setMentorInfo((prev) => ({ ...prev, universityEmail: event.target.value }))
                }
              />
              <input
                className="w-full rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sand"
                placeholder="LinkedIn URL (optional)"
                value={mentorInfo.linkedinUrl}
                onChange={(event) =>
                  setMentorInfo((prev) => ({ ...prev, linkedinUrl: event.target.value }))
                }
              />
              <textarea
                className="w-full rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sand"
                rows={2}
                placeholder="Short note for admin"
                value={mentorInfo.note}
                onChange={(event) => setMentorInfo((prev) => ({ ...prev, note: event.target.value }))}
              />
              <button
                onClick={handleMentorVerification}
                disabled={isPendingVerification}
                className="rounded-full bg-coral px-5 py-2 text-xs font-semibold uppercase tracking-wide text-charcoal"
              >
                {isPendingVerification ? "Request pending" : "Request mentor verification"}
              </button>
              <p className="text-xs text-mist">Additional verification options are coming soon.</p>
            </div>
          )}
          {message && <p className="text-sm text-teal">{message}</p>}
        </div>
      )}
    </div>
  );
}
