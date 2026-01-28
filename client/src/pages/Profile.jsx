import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../utils/auth";
import StatusBadge from "../components/StatusBadge";
import RegionPill from "../components/RegionPill";

const tabs = ["Overview", "Experience", "Education", "Projects", "Activity"];

export default function Profile() {
  const { userId } = useParams();
  const { user, token, setUser } = useAuth();
  const isOwner = user?._id === userId;
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState("Overview");
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({});
  const [docFile, setDocFile] = useState(null);
  const [mentorInfo, setMentorInfo] = useState({ universityEmail: "", linkedinUrl: "", note: "" });
  const [message, setMessage] = useState("");
  const allowedTypes = ["application/pdf", "image/png", "image/jpeg"];
  const maxSizeBytes = 5 * 1024 * 1024;

  const loadProfile = async () => {
    const data = await apiClient.get(`/users/${userId}`, token);
    setProfile(data);
    setForm({
      name: data.name || "",
      headline: data.headline || "",
      bio: data.bio || "",
      currentRegion: data.currentRegion || "AZ",
      skills: data.skills?.join(", ") || "",
      links: data.links || []
    });
  };

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const handleSave = async () => {
    const payload = {
      name: form.name,
      headline: form.headline,
      bio: form.bio,
      currentRegion: form.currentRegion,
      skills: form.skills.split(",").map((item) => item.trim()).filter(Boolean),
      links: form.links
    };

    const updated = await apiClient.put("/users/me", payload, token);
    setProfile(updated);
    setUser(updated);
    setEditMode(false);
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

      const presign = await apiClient.post(
        "/uploads/presign",
        {
          originalName: docFile.name,
          mimeType: docFile.type,
          sizeBytes: docFile.size,
          purpose: "verification"
        },
        token
      );

      const uploadResponse = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: presign.headers || { "Content-Type": docFile.type },
        body: docFile
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

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

      if (!allowedTypes.includes(docFile.type)) {
        setMessage("Unsupported file type");
        return;
      }

      if (docFile.size > maxSizeBytes) {
        setMessage("File must be 5MB or less");
        return;
      }

      const presign = await apiClient.post(
        "/uploads/presign",
        {
          originalName: docFile.name,
          mimeType: docFile.type,
          sizeBytes: docFile.size,
          purpose: "verification"
        },
        token
      );

      const uploadResponse = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: presign.headers || { "Content-Type": docFile.type },
        body: docFile
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

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

  if (!profile) {
    return <p className="text-sm text-mist">Loading profile...</p>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="glass rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-2xl text-sand">{profile.name}</p>
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
            {/* TODO: Render structured experience entries from the profile model. */}
            <p className="text-sm text-mist">Experience entries coming soon.</p>
          </>
        )}
        {activeTab === "Education" && (
          <>
            {/* TODO: Render education history with school metadata. */}
            <p className="text-sm text-mist">Education entries coming soon.</p>
          </>
        )}
        {activeTab === "Projects" && (
          <>
            {/* TODO: Add project cards once project entries are stored on the profile. */}
            <p className="text-sm text-mist">Project showcase coming soon.</p>
          </>
        )}
        {activeTab === "Activity" && (
          <>
            {/* TODO: Filter posts authored by this user and display here. */}
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
          {profile.userType === "student" ? (
            <button
              onClick={handleStudentVerification}
              className="rounded-full bg-coral px-5 py-2 text-xs font-semibold uppercase tracking-wide text-charcoal"
            >
              Request student verification
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
                className="rounded-full bg-coral px-5 py-2 text-xs font-semibold uppercase tracking-wide text-charcoal"
              >
                Request mentor verification
              </button>
              <p className="text-xs text-mist">TODO: Add automated verification options.</p>
            </div>
          )}
          {message && <p className="text-sm text-teal">{message}</p>}
        </div>
      )}
    </div>
  );
}
