import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../utils/auth";
import PostCard from "../components/PostCard";

export default function Dashboard() {
  const { user, token, setUser } = useAuth();
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState("");
  const [postingLoading, setPostingLoading] = useState(false);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get("/posts", token);
      setPosts(data);
    } catch (err) {
      setError(err.message || "Failed to load feed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

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

  const handlePostCreate = async () => {
    if (!newPostContent.trim()) return;
    setPostingLoading(true);
    try {
      const newPost = await apiClient.post("/posts", { content: newPostContent }, token);
      setPosts([newPost, ...posts]);
      setNewPostContent("");
    } catch (err) {
      setError(err.message || "Failed to create post");
    } finally {
      setPostingLoading(false);
    }
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-[250px_1fr_300px] px-4 md:px-6">
      {/* ─── Left Sidebar: Circles & People ─── */}
      <aside className="space-y-6 hidden md:block">
        {/* Circles Section */}
        <div className="circular-card p-5 sticky top-20">
          <h3 className="font-display text-lg font-semibold text-sand mb-4">
            <span className="inline-block w-2 h-2 rounded-full bg-sand mr-2" />
            Circles For You
          </h3>
          <div className="space-y-3">
            {[
              { name: "Baku Friends", members: "245" },
              { name: "Tech Community", members: "182" },
              { name: "Diaspora Network", members: "89" }
            ].map((circle, idx) => (
              <div
                key={idx}
                className="group cursor-pointer p-3 rounded-xl bg-grey-100 hover:bg-grey-200 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-grey-300 to-grey-400" />
                  <p className="text-sm font-semibold text-sand group-hover:text-sand transition-colors">
                    {circle.name}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-mist">{circle.members} members</p>
                  <button className="text-xs font-semibold text-sand hover:bg-sand hover:text-white px-3 py-1 rounded-full transition-all">
                    Join
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* People Section */}
        <div className="circular-card p-5">
          <h3 className="font-display text-lg font-semibold text-sand mb-4">
            <span className="inline-block w-2 h-2 rounded-full bg-sand mr-2" />
            People For You
          </h3>
          <div className="space-y-3">
            {[
              { name: "Aylin Oz", role: "Designer in Berlin" },
              { name: "Ramin Hashim", role: "Engineer in SF" },
              { name: "Leyla K.", role: "Founder in London" }
            ].map((person, idx) => (
              <div
                key={idx}
                className="group cursor-pointer p-3 rounded-xl bg-grey-100 hover:bg-grey-200 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-grey-300 to-grey-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-sand truncate">{person.name}</p>
                    <p className="text-xs text-mist truncate">{person.role}</p>
                  </div>
                </div>
                <button className="w-full text-xs font-semibold text-white bg-sand rounded-full py-1.5 hover:opacity-90 transition-opacity">
                  Follow
                </button>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* ─── Center: Feed ─── */}
      <main className="space-y-6">
        {/* Post Creation */}
        <div className="circular-card p-6">
          <div className="flex gap-4 items-start">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-grey-300 to-grey-400 flex-shrink-0" />
            <div className="flex-1">
              <textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="What's on your mind?"
                className="w-full bg-grey-100 rounded-2xl border border-grey-300 p-4 text-sm placeholder-mist focus:outline-none focus:ring-2 focus:ring-sand focus:ring-offset-0 resize-none"
                rows={3}
              />
              <div className="flex items-center justify-between mt-4">
                <div className="flex gap-2">
                  {["📸", "😊", "🎉"].map((icon, idx) => (
                    <button
                      key={idx}
                      className="w-10 h-10 rounded-full bg-grey-100 hover:bg-grey-200 flex items-center justify-center transition-colors"
                    >
                      {icon}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handlePostCreate}
                  disabled={!newPostContent.trim() || postingLoading}
                  className="circular-btn disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                >
                  {postingLoading ? "Posting..." : "Post"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Posts Feed */}
        <div className="space-y-6">
          {error && (
            <div className="circular-card p-4 border border-red-200 bg-red-50">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((idx) => (
                <div key={idx} className="circular-card p-6 animate-pulse">
                  <div className="flex gap-4 items-start">
                    <div className="w-12 h-12 rounded-full bg-grey-200" />
                    <div className="flex-1 space-y-3">
                      <div className="h-4 bg-grey-200 rounded w-1/4" />
                      <div className="h-3 bg-grey-200 rounded w-full" />
                      <div className="h-3 bg-grey-200 rounded w-3/4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="circular-card p-12 text-center">
              <p className="text-mist mb-4">No posts yet. Start the conversation!</p>
              <p className="text-sm text-mist/60">Follow people and circles to see posts in your feed.</p>
            </div>
          ) : (
            posts.map((post) => (
              <PostCard key={post._id} post={post} onLike={handleLike} />
            ))
          )}
        </div>
      </main>

      {/* ─── Right Sidebar: Messages & Profile ─── */}
      <aside className="space-y-6 hidden lg:block">
        {/* Profile Card */}
        <div className="circular-card p-5 sticky top-20">
          <div className="text-center mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-grey-300 to-grey-400 mx-auto mb-3" />
            <p className="font-semibold text-sand text-sm">{user?.name || "User"}</p>
            <p className="text-xs text-mist">{user?.headline || "Add a headline"}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 py-3 border-y border-grey-300 text-center mb-4">
            <div>
              <p className="font-semibold text-sand text-sm">0</p>
              <p className="text-xs text-mist">Followers</p>
            </div>
            <div>
              <p className="font-semibold text-sand text-sm">0</p>
              <p className="text-xs text-mist">Following</p>
            </div>
            <div>
              <p className="font-semibold text-sand text-sm">0</p>
              <p className="text-xs text-mist">Circles</p>
            </div>
          </div>
          <Link
            to={`/profile/${user?._id}`}
            className="w-full block text-center circular-btn-outline text-xs py-2"
          >
            View Profile
          </Link>
        </div>

        {/* Messages */}
        <div className="circular-card p-5">
          <h3 className="font-display text-lg font-semibold text-sand mb-4 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-sand" />
            Messages
          </h3>
          <div className="space-y-2">
            {[
              { name: "Ramin H.", preview: "Sounds good! See you then..." },
              { name: "Aylin", preview: "Just sent you the design files" },
              { name: "Leyla", preview: "Let's catch up soon!" }
            ].map((msg, idx) => (
              <div
                key={idx}
                className="group cursor-pointer p-3 rounded-xl bg-grey-100 hover:bg-grey-200 transition-colors"
              >
                <div className="flex items-start gap-2 mb-1">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-grey-300 to-grey-400 flex-shrink-0" />
                  <p className="text-xs font-semibold text-sand group-hover:text-sand">{msg.name}</p>
                </div>
                <p className="text-xs text-mist truncate ml-10">{msg.preview}</p>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 circular-btn-outline text-xs py-2">
            New Message
          </button>
        </div>

        {/* Quick Links */}
        <div className="circular-card p-5">
          <h3 className="font-semibold text-sand text-sm mb-3">Quick Links</h3>
          <ul className="space-y-2 text-xs">
            <li>
              <Link to="/fyp" className="text-mist hover:text-sand transition-colors">
                → For You Feed
              </Link>
            </li>
            <li>
              <Link to="/opportunities" className="text-mist hover:text-sand transition-colors">
                → Jobs & Opportunities
              </Link>
            </li>
            <li>
              <Link to="/explore" className="text-mist hover:text-sand transition-colors">
                → Browse Members
              </Link>
            </li>
            <li>
              <Link to="/network" className="text-mist hover:text-sand transition-colors">
                → My Network
              </Link>
            </li>
          </ul>
        </div>

        {/* Mentor Section */}
        {user?.userType === "professional" && (
          <div className="circular-card p-5 border-2 border-grey-400">
            <h3 className="font-semibold text-sand text-sm mb-2">Mentorship</h3>
            <p className="text-xs text-mist mb-3">
              Help the next generation by becoming a mentor in your field.
            </p>
            <button
              onClick={handleMentorToggle}
              className={`w-full text-xs font-semibold rounded-full py-2 transition-all ${
                user.isMentor
                  ? "bg-sand text-white hover:opacity-90"
                  : "bg-grey-100 text-sand hover:bg-grey-200 border border-grey-300"
              }`}
            >
              {user.isMentor ? "Mentor Mode ON" : "Become Mentor"}
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
