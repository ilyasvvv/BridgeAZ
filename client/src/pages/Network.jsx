import { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import { useAuth } from "../utils/auth";

export default function Network() {
  const { token } = useAuth();
  const [connections, setConnections] = useState([]);
  const [mentorships, setMentorships] = useState([]);
  const [error, setError] = useState("");

  const loadData = async () => {
    setError("");
    try {
      const [connectionsData, mentorshipData] = await Promise.all([
        apiClient.get("/me/connections", token),
        apiClient.get("/me/mentorships", token)
      ]);
      setConnections(connectionsData);
      setMentorships(mentorshipData);
    } catch (err) {
      setError(err.message || "Failed to load network");
    }
  };

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  const handleAccept = async (id) => {
    try {
      await apiClient.post(`/connections/${id}/accept`, {}, token);
      loadData();
    } catch (err) {
      setError(err.message || "Failed to accept");
    }
  };

  const handleEnd = async (id) => {
    try {
      await apiClient.post(`/mentorships/${id}/end`, {}, token);
      loadData();
    } catch (err) {
      setError(err.message || "Failed to end mentorship");
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <h1 className="font-display text-3xl">My Network</h1>
      {error && <p className="text-sm text-coral">{error}</p>}
      <section className="glass rounded-2xl p-6 space-y-3">
        <h2 className="font-display text-xl">Connections</h2>
        {connections.length === 0 ? (
          <p className="text-sm text-mist">No connections yet.</p>
        ) : (
          connections.map((conn) => {
            const isPending = conn.status === "pending";
            return (
              <div key={conn._id} className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-2 text-sm text-sand">
                <span>{conn.requesterId?.name || conn.addresseeId?.name}</span>
                {isPending && (
                  <button
                    onClick={() => handleAccept(conn._id)}
                    className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-wide text-mist hover:border-teal"
                  >
                    Accept
                  </button>
                )}
              </div>
            );
          })
        )}
      </section>
      <section className="glass rounded-2xl p-6 space-y-3">
        <h2 className="font-display text-xl">Mentorships</h2>
        {mentorships.length === 0 ? (
          <p className="text-sm text-mist">No mentorships yet.</p>
        ) : (
          mentorships.map((item) => (
            <div key={item._id} className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-2 text-sm text-sand">
              <span>
                Mentor: {item.mentorId?.name || "Mentor"} / Mentee: {item.menteeId?.name || "Mentee"}
              </span>
              <button
                onClick={() => handleEnd(item._id)}
                className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-wide text-mist hover:border-teal"
              >
                End
              </button>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
