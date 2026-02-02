import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../utils/auth";
import PostCard from "../components/PostCard";

export default function PostDetail() {
  const { id } = useParams();
  const { token } = useAuth();
  const [post, setPost] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPost = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await apiClient.get(`/posts/${id}`, token);
        setPost(data);
      } catch (err) {
        setError(err.message || "Failed to load post");
      } finally {
        setLoading(false);
      }
    };

    if (token && id) {
      loadPost();
    }
  }, [id, token]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/fyp" className="text-xs uppercase tracking-wide text-mist hover:text-sand">
        Back
      </Link>
      {error && <p className="text-sm text-coral">{error}</p>}
      {loading ? (
        <p className="text-sm text-mist">Loading post...</p>
      ) : post ? (
        <PostCard post={post} />
      ) : (
        <p className="text-sm text-mist">Post not found.</p>
      )}
    </div>
  );
}
