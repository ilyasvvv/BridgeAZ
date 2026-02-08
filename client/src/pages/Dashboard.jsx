import { useEffect, useState } from "react";
import { apiClient, uploadViaPresign } from "../api/client";
import { useAuth } from "../utils/auth";
import PostCard from "../components/PostCard";
import StatusBadge from "../components/StatusBadge";

export default function Dashboard() {
  const { user, token, setUser } = useAuth();
  const [posts, setPosts] = useState([]);
  const [region, setRegion] = useState("");
  const [content, setContent] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const allowedTypes = ["application/pdf", "image/png", "image/jpeg"];
  const maxSizeBytes = 5 * 1024 * 1024;

  const loadPosts = async (regionFilter) => {
    setLoading(true);
    try {
      const query = regionFilter ? `?region=${encodeURIComponent(regionFilter)}` : "";
      const data = await apiClient.get(`/posts${query}`, token);
      setPosts(data);
    } catch (err) {
      setError(err.message || "Failed to load feed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts(region);
  }, [region]);

  const handlePost = async (event) => {
    event.preventDefault();
    setError("");
    try {
      let attachmentUrl;
      let attachmentContentType;
      if (attachment) {
        if (!allowedTypes.includes(attachment.type)) {
          setError("Unsupported file type");
          return;
        }
        if (attachment.size > maxSizeBytes) {
          setError("File must be 5MB or less");
          return;
        }

        const upload = await uploadViaPresign({ file: attachment, purpose: "attachment" }, token);
        attachmentUrl = upload.documentUrl;
        attachmentContentType = attachment.type || "application/octet-stream";
      }
      const created = await apiClient.post(
        "/posts",
        {
          content,
          attachmentUrl,
          attachmentContentType,
          visibilityRegion: region || "ALL"
        },
        token
      );
      setPosts((prev) => [created, ...prev]);
      setContent("");
      setAttachment(null);
    } catch (err) {
      setError(err.message || "Failed to create post");
    }
  };

  const handleLike = async (postId) => {
    try {
      const response = await apiClient.post(`/posts/${postId}/like`, {}, token);
      setPosts((prev) =>
        prev.map((post) =>
          post._id === postId
            ? {
                ...post,
                likesCount: response.likesCount,
                likedByMe: response.likedByMe
              }
            : post
        )
      );
    } catch (err) {
      setError(err.message || "Failed to like");
    }
  };

  const handleMentorToggle = async () => {
    try {
      const updated = await apiClient.put(
        "/users/me",
        { isMentor: !user.isMentor },
        token
      );
      setUser(updated);
    } catch (err) {
      setError(err.message || "Failed to update mentor preference");
    }
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-[2fr_1fr]">
      <section className="space-y-6">
        <form onSubmit={handlePost} className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">Share an update</h2>
            <input
              value={region}
              onChange={(event) => setRegion(event.target.value)}
              className="rounded-full border border-white/10 bg-slate/40 px-4 py-2 text-xs tracking-wide text-sand"
              placeholder="Visibility (leave empty for all)"
            />
          </div>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={3}
            className="mt-4 w-full rounded-xl border border-white/10 bg-slate/40 px-4 py-3 text-sm text-sand"
            placeholder="Share what you're working on..."
            required
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <input
              type="file"
              onChange={(event) => setAttachment(event.target.files?.[0] || null)}
              className="text-xs text-mist"
            />
            <button
              type="submit"
              className="rounded-full bg-teal px-5 py-2 text-xs font-semibold uppercase tracking-wide text-charcoal"
            >
              Post update
            </button>
          </div>
        </form>

        {error && <p className="text-sm text-coral">{error}</p>}

        <div className="space-y-4">
          {loading ? (
            <p className="text-sm text-mist">Loading feed...</p>
          ) : posts.length === 0 ? (
            <p className="text-sm text-mist">No posts yet. Start the conversation.</p>
          ) : (
            posts.map((post) => <PostCard key={post._id} post={post} onLike={handleLike} />)
          )}
        </div>
      </section>

      <aside className="space-y-6">
        <div className="glass rounded-2xl p-5">
          <p className="text-sm uppercase tracking-wide text-mist">Your status</p>
          <p className="mt-2 text-lg text-sand">{user.name}</p>
          <p className="text-sm text-mist">{user.headline || "Add a headline to stand out."}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {user.studentVerified && <StatusBadge label="Student Verified" tone="teal" />}
            {user.mentorVerified && <StatusBadge label="Mentor Verified" tone="coral" />}
            {!user.studentVerified && user.userType === "student" && (
              <StatusBadge label="Student Unverified" tone="ember" />
            )}
          </div>
          <p className="mt-4 text-xs text-mist">
            Verification status: {user.verificationStatus || "unverified"}
          </p>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="font-display text-lg">Mentorship track</h3>
          <p className="mt-2 text-sm text-mist">
            Professionals can opt-in to mentor and request verification.
          </p>
          {user.userType === "professional" ? (
            <button
              onClick={handleMentorToggle}
              className="mt-4 rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-wide text-sand hover:border-teal"
            >
              {user.isMentor ? "Mentor mode on" : "Become a mentor"}
            </button>
          ) : (
            <p className="mt-4 text-sm text-mist">Students can browse mentors in Explore.</p>
          )}
          <p className="mt-3 text-xs text-mist">Mentor verification tools are available in profile verification.</p>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="font-display text-lg">Quick links</h3>
          <div className="mt-3 space-y-2 text-sm text-mist">
            <a href="/fyp" className="block hover:text-sand">
              For You feed
            </a>
            <a href="/opportunities" className="block hover:text-sand">
              Jobs & opportunities
            </a>
            <a href="/explore" className="block hover:text-sand">
              Browse members
            </a>
            <a href={`/profile/${user._id}/edit`} className="block hover:text-sand">
              View your profile
            </a>
            {(user.isAdmin || (user.roles || []).some((role) => ["staffC", "staffB", "adminA"].includes(role))) && (
              <a href="/admin" className="block hover:text-sand">
                Admin panel
              </a>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
