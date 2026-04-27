"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "./Icon";
import { Avatar } from "./Avatar";
import { SmartSearchOverlay } from "./SmartSearch";
import { BizimLogoLockup } from "./AnimatedLogo";
import { useAuth } from "@/lib/auth";
import { useLive } from "@/lib/live";
import { hueFromString } from "@/lib/format";

export function TopBar({
  logoVariant = "default",
}: {
  logoVariant?: "default" | "canva";
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);

  const { notifs, threads } = useLive();

  const unreadNotifs = notifs.filter((n) => !n.read).length;
  const unreadChats = threads.reduce((sum, t) => {
    const lastMessageAt = t.lastMessageAt;
    if (!lastMessageAt) return sum;
    const senderId = typeof t.lastMessageSenderId === "string"
      ? t.lastMessageSenderId
      : t.lastMessageSenderId?._id;
    if (senderId && senderId === user?._id) return sum;
    const lastReadAt = t.myLastReadAt;
    if (!lastReadAt || new Date(lastMessageAt).getTime() > new Date(lastReadAt).getTime()) {
      return sum + 1;
    }
    return sum;
  }, 0);
  const hasLiveActivity = unreadNotifs + unreadChats > 0;

  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get("q") ?? "";
    setSearchDraft(next);
    setSearchOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!profileOpen) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest("[data-profile-menu]")) setProfileOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [profileOpen]);

  const userHue = hueFromString(user?._id || user?.username || user?.email || "me");
  const username = user?.username ? `@${user.username}` : user?.email || "Profile";
  const displayName = user?.name || "Profile";

  return (
    <header className="sticky top-0 z-40 bg-paper/85 backdrop-blur-xl border-b border-paper-line">
      <div className="relative mx-auto grid h-16 max-w-[1400px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-6">
        <Link href="/home" className="z-10 flex items-center gap-2.5 shrink-0 group" data-bizim-logo>
          {logoVariant === "canva" ? (
            <BizimLogoLockup size={42} motion="side-to-side" />
          ) : (
            <BizimLogoLockup
              size={42}
              motion={hasLiveActivity ? "spark" : "side-to-side"}
            />
          )}
        </Link>

        {/* Search — hidden on /search where the page has its own primary input */}
        <div className="flex min-w-0 justify-center">
          {pathname !== "/search" ? (
          <div className="w-full max-w-[640px]">
            <div className="group relative flex items-center h-10 rounded-pill bg-paper-cool hover:bg-paper focus-within:bg-paper border border-transparent hover:border-paper-line focus-within:border-ink/30 focus-within:shadow-soft transition">
              <Icon.Search size={15} className="ml-3.5 text-ink/50" />
              <input
                value={searchDraft}
                onFocus={() => setSearchOpen(true)}
                onChange={(event) => {
                  setSearchDraft(event.target.value);
                  setSearchOpen(true);
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;

                  event.preventDefault();
                  const params = new URLSearchParams();
                  if (searchDraft.trim()) params.set("q", searchDraft.trim());
                  router.push(params.toString() ? `/search?${params.toString()}` : "/search");
                }}
                placeholder="Search people, circles, posts, tags…"
                className="flex-1 bg-transparent px-3 text-[13.5px] outline-none placeholder:text-ink/40"
                spellCheck={false}
              />
              <span className="mr-2 inline-flex items-center gap-1 text-[10.5px] text-ink/45 font-semibold">
                <kbd className="px-1.5 h-5 inline-flex items-center rounded border border-paper-line bg-paper/90">⌘K</kbd>
              </span>
            </div>
          </div>
          ) : (
            <div className="h-10 w-full max-w-[640px]" />
          )}
        </div>

        <div className="z-10 flex items-center justify-end gap-2 shrink-0">
          <Link
            href="/messages"
            className="relative w-10 h-10 rounded-full border border-paper-line bg-paper hover:border-ink/30 flex items-center justify-center btn-press"
            aria-label="Messages"
          >
            <Icon.Chat size={16} />
            {unreadChats > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-ink text-paper text-[9px] font-bold flex items-center justify-center">
                {unreadChats > 9 ? "9+" : unreadChats}
              </span>
            )}
          </Link>
          <Link
            href="/notifications"
            className="relative w-10 h-10 rounded-full border border-paper-line bg-paper hover:border-ink/30 flex items-center justify-center btn-press"
            aria-label="Notifications"
          >
            <Icon.Bell size={16} />
            {unreadNotifs > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-ink text-paper text-[9px] font-bold flex items-center justify-center">
                {unreadNotifs > 9 ? "9+" : unreadNotifs}
              </span>
            )}
          </Link>
          <div className="relative" data-profile-menu>
            <button
              type="button"
              onClick={() => setProfileOpen((value) => !value)}
              className="btn-press flex h-10 items-center gap-2 rounded-pill border border-paper-line bg-paper pl-1.5 pr-3 text-left hover:border-ink/30"
              aria-label="Open profile menu"
              aria-expanded={profileOpen}
            >
              <Avatar
                size={30}
                hue={userHue}
                kind={user?.accountType === "circle" ? "circle" : "personal"}
                label={(displayName || username).slice(0, 1).toUpperCase()}
              />
              <span className="hidden max-w-[150px] leading-tight md:block">
                <span className="block truncate text-[12.5px] font-bold text-ink">
                  {displayName}
                </span>
                <span className="block truncate text-[10.5px] font-semibold text-ink/45">
                  {username}
                </span>
              </span>
              <Icon.More size={13} className="hidden text-ink/45 md:block" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-[calc(100%+10px)] w-[260px] overflow-hidden rounded-[20px] border border-paper-line bg-paper shadow-pop">
                <div className="flex items-center gap-3 border-b border-paper-line p-3">
                  <Avatar
                    size={42}
                    hue={userHue}
                    kind={user?.accountType === "circle" ? "circle" : "personal"}
                    label={(displayName || username).slice(0, 1).toUpperCase()}
                  />
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-bold">{displayName}</div>
                    <div className="truncate text-[11.5px] font-semibold text-ink/48">{username}</div>
                  </div>
                </div>
                <div className="p-2">
                  <Link
                    href="/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex h-10 items-center gap-2 rounded-[14px] px-3 text-[12.5px] font-semibold hover:bg-paper-cool"
                  >
                    <Icon.User size={14} />
                    Profile
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex h-10 items-center gap-2 rounded-[14px] px-3 text-[12.5px] font-semibold hover:bg-paper-cool"
                  >
                    <Icon.Filter size={14} />
                    Settings
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      logout();
                      router.replace("/");
                    }}
                    className="flex h-10 w-full items-center gap-2 rounded-[14px] px-3 text-left text-[12.5px] font-semibold hover:bg-paper-cool"
                  >
                    <Icon.SignOut size={14} />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <SmartSearchOverlay
        open={searchOpen}
        initialQuery={searchDraft}
        onClose={(value) => {
          setSearchDraft(value ?? "");
          setSearchOpen(false);
        }}
      />
    </header>
  );
}
