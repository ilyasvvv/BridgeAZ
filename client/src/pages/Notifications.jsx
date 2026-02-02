import { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import { useAuth } from "../utils/auth";
import { useNavigate } from "react-router-dom";

export default function Notifications() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState("");

  const loadNotifications = async () => {
    setError("");
    try {
      const data = await apiClient.get("/notifications", token);
      setNotifications(data);
    } catch (err) {
      setError(err.message || "Failed to load notifications");
    }
  };

  useEffect(() => {
    if (token) {
      loadNotifications();
    }
  }, [token]);

  const markRead = async (id) => {
    try {
      const updated = await apiClient.patch(`/notifications/${id}/read`, {}, token);
      setNotifications((prev) => prev.map((n) => (n._id === id ? updated : n)));
    } catch (err) {
      setError(err.message || "Failed to update notification");
    }
  };

  const handleOpen = (note) => {
    if (note.link) {
      navigate(note.link);
      return;
    }
    markRead(note._id);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-3xl">Notifications</h1>
      {error && <p className="text-sm text-coral">{error}</p>}
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <p className="text-sm text-mist">No notifications yet.</p>
        ) : (
          notifications.map((note) => (
            <div
              key={note._id}
              className="glass rounded-2xl p-5"
            >
              <div className="flex items-center justify-between gap-4">
                <button
                  onClick={() => handleOpen(note)}
                  className="text-left"
                >
                  <p className="text-sm text-sand">{note.title}</p>
                  <p className="text-xs text-mist">{note.body}</p>
                </button>
                {!note.read && (
                  <button
                    onClick={() => markRead(note._id)}
                    className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-wide text-mist hover:border-teal"
                  >
                    Mark read
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
