import { useEffect, useState } from "react";
import { apiClient } from "../api/client";
import { useAuth } from "../utils/auth";

export default function Chats() {
  const { token } = useAuth();
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  const loadThreads = async () => {
    setError("");
    try {
      const data = await apiClient.get("/chats/threads", token);
      setThreads(data);
      if (data.length && !activeThread) {
        setActiveThread(data[0]);
      }
    } catch (err) {
      setError(err.message || "Failed to load threads");
    }
  };

  const loadMessages = async (threadId) => {
    try {
      const data = await apiClient.get(`/chats/threads/${threadId}/messages`, token);
      setMessages(data);
    } catch (err) {
      setError(err.message || "Failed to load messages");
    }
  };

  useEffect(() => {
    if (token) {
      loadThreads();
    }
  }, [token]);

  useEffect(() => {
    if (activeThread?._id) {
      loadMessages(activeThread._id);
    }
  }, [activeThread]);

  const handleSend = async (event) => {
    event.preventDefault();
    if (!body || !activeThread) return;
    try {
      const message = await apiClient.post(
        `/chats/threads/${activeThread._id}/messages`,
        { body },
        token
      );
      setMessages((prev) => [...prev, message]);
      setBody("");
    } catch (err) {
      setError(err.message || "Failed to send message");
    }
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-[1fr_2fr]">
      <section className="glass rounded-2xl p-4 space-y-3">
        <h2 className="font-display text-xl">Threads</h2>
        {threads.length === 0 ? (
          <p className="text-sm text-mist">No conversations yet.</p>
        ) : (
          threads.map((thread) => (
            <button
              key={thread._id}
              onClick={() => setActiveThread(thread)}
              className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                activeThread?._id === thread._id
                  ? "border-teal bg-teal/10 text-teal"
                  : "border-white/10 text-mist hover:border-teal"
              }`}
            >
              Thread {thread._id.slice(-6)}
            </button>
          ))
        )}
      </section>
      <section className="glass rounded-2xl p-4 space-y-4">
        <h2 className="font-display text-xl">Messages</h2>
        {error && <p className="text-sm text-coral">{error}</p>}
        <div className="min-h-[200px] space-y-2">
          {messages.length === 0 ? (
            <p className="text-sm text-mist">Select a thread to view messages.</p>
          ) : (
            messages.map((message) => (
              <div key={message._id} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-sand">
                {message.body}
              </div>
            ))
          )}
        </div>
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            value={body}
            onChange={(event) => setBody(event.target.value)}
            className="flex-1 rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sm text-sand"
            placeholder="Type a message..."
          />
          <button
            type="submit"
            className="rounded-full bg-teal px-4 py-2 text-xs font-semibold uppercase tracking-wide text-charcoal"
          >
            Send
          </button>
        </form>
      </section>
    </div>
  );
}
