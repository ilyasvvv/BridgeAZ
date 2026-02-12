import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { apiClient } from "../api/client";
import { useAuth } from "../utils/auth";
import UserChip, { USER_CHIP_SIZES } from "./UserChip";
import {
  buildSharePayload,
  rankUsers,
  resolveUserCompany,
  resolveUserCountry,
  resolveUserUniversity
} from "../utils/share";

const initialState = {
  users: [],
  loading: false
};

const defaultError = "";

export default function ShareSheet({ open, onClose, shareInput }) {
  const { token, user } = useAuth();
  const [query, setQuery] = useState("");
  const [searchState, setSearchState] = useState(initialState);
  const [connectionIds, setConnectionIds] = useState(new Set());
  const [mentorshipIds, setMentorshipIds] = useState(new Set());
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState(defaultError);
  const [sending, setSending] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !token) return;
    let cancelled = false;

    const loadRelations = async () => {
      try {
        const [connectionsData, mentorshipData] = await Promise.all([
          apiClient.get("/me/connections", token),
          apiClient.get("/me/mentorships", token)
        ]);

        if (cancelled) return;

        const nextConnections = new Set();
        for (const connection of connectionsData || []) {
          if (connection?.status !== "accepted") continue;
          const requesterId = connection?.requesterId?._id;
          const addresseeId = connection?.addresseeId?._id;
          const otherId = String(requesterId) === String(user?._id) ? addresseeId : requesterId;
          if (otherId) nextConnections.add(String(otherId));
        }

        const nextMentorships = new Set();
        for (const mentorship of mentorshipData || []) {
          const mentorId = mentorship?.mentorId?._id;
          const menteeId = mentorship?.menteeId?._id;
          const otherId = String(mentorId) === String(user?._id) ? menteeId : mentorId;
          if (otherId) nextMentorships.add(String(otherId));
        }

        setConnectionIds(nextConnections);
        setMentorshipIds(nextMentorships);
      } catch (_error) {
        setConnectionIds(new Set());
        setMentorshipIds(new Set());
      }
    };

    loadRelations();
    return () => {
      cancelled = true;
    };
  }, [open, token, user?._id]);

  useEffect(() => {
    if (!open || !token) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearchState((prev) => ({ ...prev, loading: true }));
      try {
        let usersData = [];
        try {
          usersData = await apiClient.get(`/users/search?q=${encodeURIComponent(query)}`, token);
        } catch (_searchError) {
          usersData = await apiClient.get("/users", token);
        }
        if (cancelled) return;
        setSearchState({ users: Array.isArray(usersData) ? usersData : [], loading: false });
      } catch (loadError) {
        if (cancelled) return;
        setSearchState({ users: [], loading: false });
        setError(loadError.message || "Failed to load users");
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, token, query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelectedUsers([]);
    setNote("");
    setError(defaultError);
  }, [open, shareInput?.entityType, shareInput?.entityId]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !sending) onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, sending]);

  useEffect(() => {
    if (!open || !mounted) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open, mounted]);

  const rankedUsers = useMemo(
    () =>
      rankUsers({
        currentUser: user,
        candidates: searchState.users.filter((candidate) => String(candidate?._id) !== String(user?._id)),
        connectionIds,
        mentorshipIds
      }),
    [searchState.users, user, connectionIds, mentorshipIds]
  );

  const selectedIds = useMemo(
    () => new Set(selectedUsers.map((selected) => String(selected._id))),
    [selectedUsers]
  );

  const toggleRecipient = (candidate) => {
    const id = String(candidate?._id || "");
    if (!id) return;
    setSelectedUsers((prev) => {
      if (prev.some((item) => String(item._id) === id)) {
        return prev.filter((item) => String(item._id) !== id);
      }
      return [...prev, candidate];
    });
  };

  const handleSend = async () => {
    if (!token || !shareInput) return;
    if (!selectedUsers.length) {
      setError("Select at least one recipient");
      return;
    }
    setError(defaultError);
    setSending(true);
    try {
      const payload = buildSharePayload(shareInput);
      const existingThreads = await apiClient.get("/chats/threads", token);
      const threadByRecipientId = new Map(
        (existingThreads || [])
          .filter((thread) => thread?.otherParticipant?._id)
          .map((thread) => [String(thread.otherParticipant._id), thread])
      );

      for (const recipient of selectedUsers) {
        const recipientId = String(recipient?._id || "");
        if (!recipientId) continue;
        let thread = threadByRecipientId.get(recipientId);
        if (!thread?._id) {
          thread = await apiClient.post("/chats/threads", { userId: recipientId }, token);
          if (thread?._id) threadByRecipientId.set(recipientId, thread);
        }
        if (!thread?._id) continue;
        await apiClient.post(
          `/chats/threads/${thread._id}/messages`,
          {
            body: note.trim() || undefined,
            share: payload
          },
          token
        );
      }

      onClose?.();
    } catch (sendError) {
      setError(sendError.message || "Failed to share");
    } finally {
      setSending(false);
    }
  };

  if (!open || !mounted) return null;

  const previewSubtitle = [
    shareInput?.subtitle,
    resolveUserUniversity(shareInput),
    resolveUserCompany(shareInput),
    resolveUserCountry(shareInput)
  ]
    .filter(Boolean)
    .join(" · ");

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex min-h-full items-center justify-center px-4 py-6">
        <div
          className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-900/95 p-5 shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-xl text-sand">Share Sheet</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-wide text-mist hover:border-teal"
          >
            Close
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-[11px] uppercase tracking-wide text-mist">
            {shareInput?.entityType || "item"}
          </p>
          <p className="text-sm text-sand">{shareInput?.title || "Shared item"}</p>
          {previewSubtitle ? <p className="text-xs text-mist">{previewSubtitle}</p> : null}
        </div>

        <div className="mt-4 space-y-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search users"
            className="w-full rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sm text-sand"
          />
          <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-2">
            {searchState.loading ? (
              <p className="px-2 py-1 text-xs text-mist">Loading users...</p>
            ) : rankedUsers.length === 0 ? (
              <p className="px-2 py-1 text-xs text-mist">No users found.</p>
            ) : (
              rankedUsers.map((candidate) => {
                const candidateId = String(candidate?._id || "");
                const isSelected = selectedIds.has(candidateId);
                return (
                  <button
                    key={candidateId}
                    type="button"
                    onClick={() => toggleRecipient(candidate)}
                    className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left ${
                      isSelected ? "bg-teal/15" : "hover:bg-white/10"
                    }`}
                  >
                    <UserChip user={candidate} size={USER_CHIP_SIZES.THREAD_LIST} showRole={false} />
                    <span className="text-[11px] uppercase tracking-wide text-mist">
                      {isSelected ? "Selected" : "Add"}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {selectedUsers.map((selected) => (
              <button
                key={selected._id}
                type="button"
                onClick={() => toggleRecipient(selected)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-sand hover:border-teal"
              >
                {selected.name} ×
              </button>
            ))}
          </div>

          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            placeholder="Optional note"
            className="w-full rounded-xl border border-white/10 bg-slate/40 px-4 py-2 text-sm text-sand"
          />
        </div>

        {error ? <p className="mt-2 text-xs text-coral">{error}</p> : null}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-wide text-mist hover:border-teal disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending}
            className="rounded-full bg-teal px-4 py-2 text-xs font-semibold uppercase tracking-wide text-charcoal disabled:opacity-60"
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
    </div>,
    document.body
  );
}
