"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { TopBar } from "@/components/TopBar";
import { ProfileHeader, ProfileTabs } from "@/components/ProfileHeader";
import { PostCard, type Post } from "@/components/PostCard";
import { Icon } from "@/components/Icon";
import { AnimatedLogo } from "@/components/AnimatedLogo";
import { useAuth } from "@/lib/auth";
import { circlesApi } from "@/lib/circles";
import { apiPostToUiPost, circleToProfileMeta } from "@/lib/mappers";
import { relativeTime } from "@/lib/format";
import type { ApiCircle, ApiCircleChannel, ApiCircleChannelMessage } from "@/lib/types";

export default function CircleProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = use(params);
  const router = useRouter();
  const { status } = useAuth();
  const [circle, setCircle] = useState<ApiCircle | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [tab, setTab] = useState("posts");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [channels, setChannels] = useState<ApiCircleChannel[]>([]);
  const [channelsError, setChannelsError] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ApiCircleChannelMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [channelBusy, setChannelBusy] = useState(false);
  const [messageBusy, setMessageBusy] = useState(false);
  const [newChannel, setNewChannel] = useState({
    name: "",
    description: "",
    visibility: "members" as ApiCircleChannel["visibility"],
    postingRole: "members" as NonNullable<ApiCircleChannel["postingRole"]>,
  });

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/signin");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [nextCircle, rawPosts] = await Promise.all([
          circlesApi.get(handle),
          circlesApi.posts(handle),
        ]);
        if (cancelled) return;
        setCircle(nextCircle);
        setPosts(rawPosts.map(apiPostToUiPost));
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Failed to load circle.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [handle, status]);

  const profile = useMemo(() => (circle ? circleToProfileMeta(circle) : null), [circle]);
  const selectedChannel = channels.find((channel) => channel._id === selectedChannelId) || channels[0];
  const canManageChannels = !!circle && (circle.isOwner || circle.isAdmin || circle.memberRole === "owner" || circle.memberRole === "admin");
  const canUseChannels = !!circle && (canManageChannels || circle.membershipStatus === "active");

  useEffect(() => {
    if (!circle || !canUseChannels) return;
    let cancelled = false;
    const circleKey = circle.handle || circle._id;
    async function loadChannels() {
      setChannelsError(null);
      try {
        const next = await circlesApi.channels(circleKey);
        if (cancelled) return;
        setChannels(next);
        setSelectedChannelId((current) => current || next[0]?._id || null);
      } catch (err: any) {
        if (!cancelled) setChannelsError(err?.message || "Circle channels are not available yet.");
      }
    }
    loadChannels();
    return () => {
      cancelled = true;
    };
  }, [canUseChannels, circle]);

  useEffect(() => {
    if (!circle || !selectedChannel) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    const circleKey = circle.handle || circle._id;
    const channelId = selectedChannel._id;
    async function loadMessages() {
      try {
        const next = await circlesApi.channelMessages(circleKey, channelId);
        if (!cancelled) setMessages(next);
      } catch {
        if (!cancelled) setMessages([]);
      }
    }
    loadMessages();
    return () => {
      cancelled = true;
    };
  }, [circle, selectedChannel]);

  async function toggleCircleMembership() {
    if (!circle || joining) return;
    const wasActive = circle.membershipStatus === "active";
    setJoining(true);
    setError(null);
    setCircle((current) =>
      current
        ? {
            ...current,
            membershipStatus: wasActive ? "none" : current.visibility === "request" ? "pending" : "active",
            memberCount: Math.max(0, (current.memberCount ?? 0) + (wasActive ? -1 : 1)),
          }
        : current
    );
    try {
      if (wasActive) {
        await circlesApi.leave(circle.handle);
        setCircle((current) =>
          current
            ? {
                ...current,
                membershipStatus: "none",
                memberRole: undefined,
              }
            : current
        );
      } else {
        const updated = await circlesApi.join(circle.handle);
        setCircle(updated);
      }
    } catch (err: any) {
      setCircle(circle);
      setError(err?.message || "Failed to join circle.");
    } finally {
      setJoining(false);
    }
  }

  const joinLabel = circle?.membershipStatus === "active"
    ? "Leave"
    : circle?.membershipStatus === "pending"
    ? "Pending"
    : circle?.visibility === "request"
    ? "Request join"
    : "Join";

  const tabs = [
    { key: "posts", label: "Posts", count: posts.length },
    { key: "channels", label: "Channels", count: channels.length || undefined },
    { key: "about", label: "About" },
  ];

  if (status === "loading" || loading) {
    return <PageShell>Loading circle...</PageShell>;
  }

  if (error || !circle || !profile) {
    return <PageShell>{error || "Circle not found."}</PageShell>;
  }

  return (
    <div className="min-h-screen bg-paper-warm">
      <TopBar />
      <main className="max-w-[1100px] mx-auto px-6 py-8 space-y-5">
        <ProfileHeader
          profile={profile}
          onPrimaryAction={toggleCircleMembership}
          primaryActionLabel={joinLabel}
          primaryActionBusy={joining || circle.membershipStatus === "pending"}
        />

        {error && (
          <div className="rounded-[18px] border border-paper-line bg-paper p-4 text-[13px] text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-[22px] bg-paper border border-paper-line overflow-hidden">
          <ProfileTabs tabs={tabs} active={tab} onChange={setTab} />
          <div className="p-5">
            {tab === "posts" &&
              (posts.length === 0 ? (
                <EmptyWall />
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              ))}

            {tab === "about" && <AboutPanel circle={circle} />}
            {tab === "channels" && (
              <CircleChannelsPanel
                circle={circle}
                channels={channels}
                channelsError={channelsError}
                selectedChannel={selectedChannel}
                messages={messages}
                draft={messageDraft}
                canUseChannels={canUseChannels}
                canManageChannels={canManageChannels}
                channelBusy={channelBusy}
                messageBusy={messageBusy}
                newChannel={newChannel}
                onSelectChannel={(id) => setSelectedChannelId(id)}
                onDraftChange={setMessageDraft}
                onNewChannelChange={(key, value) =>
                  setNewChannel((current) => ({ ...current, [key]: value }))
                }
                onCreateChannel={async () => {
                  if (!circle || !newChannel.name.trim() || channelBusy) return;
                  setChannelBusy(true);
                  setChannelsError(null);
                  try {
                    const created = await circlesApi.createChannel(circle.handle || circle._id, {
                      name: newChannel.name.trim(),
                      description: newChannel.description.trim(),
                      visibility: newChannel.visibility,
                      postingRole: newChannel.postingRole,
                    });
                    setChannels((current) => [...current, created]);
                    setSelectedChannelId(created._id);
                    setNewChannel({
                      name: "",
                      description: "",
                      visibility: "members",
                      postingRole: "members",
                    });
                  } catch (err: any) {
                    setChannelsError(err?.message || "Failed to create channel.");
                  } finally {
                    setChannelBusy(false);
                  }
                }}
                onSendMessage={async () => {
                  if (!circle || !selectedChannel || !messageDraft.trim() || messageBusy) return;
                  const body = messageDraft.trim();
                  setMessageBusy(true);
                  setMessageDraft("");
                  try {
                    const sent = await circlesApi.sendChannelMessage(circle.handle || circle._id, selectedChannel._id, body);
                    setMessages((current) => [...current, sent]);
                  } catch (err: any) {
                    setMessageDraft(body);
                    setChannelsError(err?.message || "Failed to send message.");
                  } finally {
                    setMessageBusy(false);
                  }
                }}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function CircleChannelsPanel({
  circle,
  channels,
  channelsError,
  selectedChannel,
  messages,
  draft,
  canUseChannels,
  canManageChannels,
  channelBusy,
  messageBusy,
  newChannel,
  onSelectChannel,
  onDraftChange,
  onNewChannelChange,
  onCreateChannel,
  onSendMessage,
}: {
  circle: ApiCircle;
  channels: ApiCircleChannel[];
  channelsError: string | null;
  selectedChannel?: ApiCircleChannel;
  messages: ApiCircleChannelMessage[];
  draft: string;
  canUseChannels: boolean;
  canManageChannels: boolean;
  channelBusy: boolean;
  messageBusy: boolean;
  newChannel: {
    name: string;
    description: string;
    visibility: ApiCircleChannel["visibility"];
    postingRole: NonNullable<ApiCircleChannel["postingRole"]>;
  };
  onSelectChannel: (id: string) => void;
  onDraftChange: (value: string) => void;
  onNewChannelChange: (key: keyof typeof newChannel, value: string) => void;
  onCreateChannel: () => void;
  onSendMessage: () => void;
}) {
  if (!canUseChannels) {
    return (
      <div className="rounded-[18px] border border-paper-line bg-paper-warm p-5 text-[13px] text-ink/60">
        Join {circle.name} to see its community channels.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <aside className="rounded-[18px] border border-paper-line bg-paper-warm p-3">
        <div className="mb-2 px-2 text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink/45">
          Channels
        </div>
        {channels.length === 0 ? (
          <div className="rounded-[14px] bg-paper px-3 py-4 text-[12.5px] text-ink/52">
            No channels yet.
          </div>
        ) : (
          <div className="space-y-1">
            {channels.map((channel) => (
              <button
                key={channel._id}
                type="button"
                onClick={() => onSelectChannel(channel._id)}
                className={clsx(
                  "flex w-full items-center gap-2 rounded-[14px] px-3 py-2 text-left text-[12.5px] font-semibold",
                  selectedChannel?._id === channel._id
                    ? "bg-ink text-paper"
                    : "hover:bg-paper"
                )}
              >
                <span className="text-ink/45">#</span>
                <span className="min-w-0 flex-1 truncate">{channel.name}</span>
              </button>
            ))}
          </div>
        )}

        {canManageChannels && (
          <div className="mt-3 border-t border-paper-line pt-3">
            <input
              value={newChannel.name}
              onChange={(event) => onNewChannelChange("name", event.target.value)}
              placeholder="New channel"
              className="h-9 w-full rounded-[12px] border border-paper-line bg-paper px-3 text-[12.5px] outline-none focus:border-ink/35"
            />
            <input
              value={newChannel.description}
              onChange={(event) => onNewChannelChange("description", event.target.value)}
              placeholder="Description"
              className="mt-2 h-9 w-full rounded-[12px] border border-paper-line bg-paper px-3 text-[12.5px] outline-none focus:border-ink/35"
            />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <select
                value={newChannel.visibility}
                onChange={(event) => onNewChannelChange("visibility", event.target.value)}
                className="h-9 rounded-[12px] border border-paper-line bg-paper px-2 text-[11.5px] font-semibold outline-none"
              >
                <option value="members">Members</option>
                <option value="admins">Admins</option>
                <option value="public">Public</option>
              </select>
              <select
                value={newChannel.postingRole}
                onChange={(event) => onNewChannelChange("postingRole", event.target.value)}
                className="h-9 rounded-[12px] border border-paper-line bg-paper px-2 text-[11.5px] font-semibold outline-none"
              >
                <option value="members">Members post</option>
                <option value="admins">Admins post</option>
              </select>
            </div>
            <button
              type="button"
              onClick={onCreateChannel}
              disabled={!newChannel.name.trim() || channelBusy}
              className="btn-press mt-2 h-9 w-full rounded-pill bg-ink text-[12px] font-semibold text-paper disabled:opacity-45"
            >
              {channelBusy ? "Creating..." : "Create channel"}
            </button>
          </div>
        )}
      </aside>

      <section className="min-h-[360px] rounded-[18px] border border-paper-line bg-paper-warm p-4">
        {channelsError && (
          <div className="mb-3 rounded-[14px] border border-paper-line bg-paper px-3 py-2 text-[12px] text-ink/60">
            {channelsError}
          </div>
        )}
        {selectedChannel ? (
          <>
            <div className="flex items-start justify-between gap-3 border-b border-paper-line pb-3">
              <div>
                <h3 className="font-display text-[20px] font-semibold">#{selectedChannel.name}</h3>
                <p className="mt-1 text-[12.5px] text-ink/55">
                  {selectedChannel.description || "Circle community chat"}
                </p>
              </div>
              <span className="rounded-pill bg-paper px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink/45">
                {selectedChannel.visibility}
              </span>
            </div>
            <div className="mt-4 max-h-[320px] space-y-3 overflow-y-auto pr-1 scroll-clean">
              {messages.length === 0 ? (
                <div className="rounded-[14px] bg-paper px-3 py-6 text-center text-[12.5px] text-ink/48">
                  No messages yet.
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message._id} className="rounded-[14px] bg-paper px-3 py-2">
                    <div className="flex items-center gap-2 text-[11.5px]">
                      <span className="font-bold">{message.author?.name || "Member"}</span>
                      <span className="text-ink/40">{relativeTime(message.createdAt)}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-[13px] text-ink/75">{message.body}</p>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4 flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(event) => onDraftChange(event.target.value)}
                rows={2}
                placeholder="Message this channel"
                className="min-h-10 flex-1 resize-none rounded-[14px] border border-paper-line bg-paper px-3 py-2 text-[13px] outline-none focus:border-ink/35"
              />
              <button
                type="button"
                onClick={onSendMessage}
                disabled={!draft.trim() || messageBusy}
                className="btn-press h-10 rounded-pill bg-ink px-4 text-[12px] font-semibold text-paper disabled:opacity-45"
              >
                {messageBusy ? "..." : "Send"}
              </button>
            </div>
          </>
        ) : (
          <div className="rounded-[14px] bg-paper px-3 py-10 text-center text-[12.5px] text-ink/48">
            Select or create a channel.
          </div>
        )}
      </section>
    </div>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper-warm">
      <TopBar />
      <main className="max-w-[900px] mx-auto px-6 py-16 text-[14px] text-ink/60">
        {children}
      </main>
    </div>
  );
}

function EmptyWall() {
  return (
    <div className="py-16 text-center">
      <div className="relative mx-auto w-40 h-40 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-ink/10" />
        <div className="absolute inset-4 rounded-full border border-ink/10 animate-spin-slower" />
        <div className="absolute inset-10 rounded-full border border-ink/10" />
        <div className="w-16 h-16 rounded-full bg-[#C1FF72] text-ink flex items-center justify-center shadow-soft">
          <AnimatedLogo size={48} motion="full-dance" />
        </div>
      </div>
      <h3 className="mt-6 font-display text-[22px] font-semibold">
        No posts here yet.
      </h3>
      <p className="mt-1.5 text-[13px] text-ink/55 max-w-sm mx-auto">
        When members share, everything lands in this space.
      </p>
    </div>
  );
}

function AboutPanel({ circle }: { circle: ApiCircle }) {
  const location = [circle.location?.city, circle.location?.country].filter(Boolean).join(", ") || circle.currentRegion || "Global";

  return (
    <div className="max-w-prose text-[13.5px] text-ink/75 leading-relaxed space-y-4">
      <p>{circle.bio || "No circle bio yet."}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-paper-line text-[13px]">
        <Meta icon="Pin" label="Location" value={location} />
        <Meta icon="Calendar" label="Founded" value={formatJoined(circle.createdAt)} />
        <Meta icon="User" label="Members" value={String(circle.memberCount ?? 0)} />
        <Meta icon="Globe" label="Visibility" value={circle.visibility || "public"} />
      </div>
    </div>
  );
}

function Meta({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Icon;
  label: string;
  value: string;
}) {
  const Ico = Icon[icon];
  return (
    <div className="flex items-center gap-3">
      <span className="w-9 h-9 rounded-full bg-paper-cool flex items-center justify-center text-ink/70">
        <Ico size={14} />
      </span>
      <div>
        <div className="text-[10.5px] tracking-[0.14em] text-ink/45 uppercase">
          {label}
        </div>
        <div className="text-[13px] font-semibold capitalize">{value}</div>
      </div>
    </div>
  );
}

function formatJoined(value?: string) {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
