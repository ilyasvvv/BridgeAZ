import { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import { useAuth } from "../utils/auth";
import { useNavigate } from "react-router-dom";
import { formatRelativeTime } from "../utils/format";
import BizimHeader from "../components/BizimHeader";

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

  const markAllRead = async () => {
    try {
      await apiClient.patch("/notifications/read-all", {}, token);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      setError(err.message || "Failed to mark all as read");
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
    <>
      <BizimHeader />
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl">Notifications</h1>
          {notifications.some((n) => !n.read) && (
            <button
              onClick={markAllRead}
              className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-wide text-sand hover:border-sand/30"
            >
              Mark all as read
            </button>
          )}
        </div>
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
                    {note.createdAt && (
                      <p className="mt-1 text-[10px] text-mist/50">{formatRelativeTime(note.createdAt)}</p>
                    )}
                  </button>
                  {!note.read && (
                    <button
                      onClick={() => markRead(note._id)}
                      className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-wide text-mist hover:border-sand/30"
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
    </>
  );
}
