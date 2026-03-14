import { Link, NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../utils/auth";
import { apiClient } from "../api/client";

export default function Navbar() {
  const { user, token, logout } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const isLanding = location.pathname === "/";
  const isAdmin =
    user && (user.isAdmin || (user.roles || []).some((role) => ["staffC", "staffB", "adminA"].includes(role)));

  useEffect(() => {
    const loadNotifications = async () => {
      if (!token) return;
      try {
        const notifications = await apiClient.get("/notifications", token);
        const unread = notifications.filter((note) => !note.read).length;
        setUnreadCount(unread);
      } catch {
        setUnreadCount(0);
      }
    };

    if (user) {
      loadNotifications();
    }
  }, [user, token]);

  const navClass = ({ isActive }) =>
    [
      "text-sm uppercase tracking-wide transition",
      isLanding
        ? isActive
          ? "text-[var(--industrial-accent)]"
          : "text-[var(--industrial-text-muted)] hover:text-[var(--industrial-text)]"
        : isActive
          ? "text-teal"
          : "text-mist hover:text-sand"
    ].join(" ");

  if (isLanding) {
    return (
      <header className="relative z-20 px-4 pt-4 md:px-8 md:pt-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-[28px] border border-white/70 bg-[rgba(240,242,245,0.82)] px-4 py-3 shadow-industrial-card backdrop-blur-sm md:px-6">
          <Link to="/" className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#ff6b76,#ff4757)] text-sm font-extrabold uppercase tracking-[0.2em] text-white shadow-[4px_4px_10px_rgba(166,50,60,0.38),-4px_-4px_10px_rgba(255,112,121,0.42)]">
              BZ
            </span>
            <span>
              <span className="block text-lg font-extrabold tracking-tight text-[var(--industrial-text)]">
                BridgeAZ
              </span>
              <span className="industrial-label">Industrial network console</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {!user ? (
              <>
                <a href="#overview" className="text-sm uppercase tracking-wide text-[var(--industrial-text-muted)] transition hover:text-[var(--industrial-text)]">
                  Overview
                </a>
                <a href="#workflow" className="text-sm uppercase tracking-wide text-[var(--industrial-text-muted)] transition hover:text-[var(--industrial-text)]">
                  Workflow
                </a>
                <a href="#testimonials" className="text-sm uppercase tracking-wide text-[var(--industrial-text-muted)] transition hover:text-[var(--industrial-text)]">
                  Voices
                </a>
                <NavLink className={navClass} to="/contact">
                  Contact
                </NavLink>
              </>
            ) : (
              <>
                <NavLink className={navClass} to="/dashboard">
                  Home
                </NavLink>
                <NavLink className={navClass} to="/fyp">
                  For You
                </NavLink>
                <NavLink className={navClass} to="/explore">
                  Explore
                </NavLink>
                <NavLink className={navClass} to="/network">
                  Network
                </NavLink>
                <NavLink className={navClass} to="/chats">
                  Chats
                </NavLink>
                {isAdmin && (
                  <NavLink className={navClass} to="/admin">
                    Admin
                  </NavLink>
                )}
              </>
            )}
          </nav>

          {user ? (
            <div className="flex items-center gap-2 md:gap-3">
              <Link
                to="/notifications"
                className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#edf2f8,#d9e0ea)] text-[var(--industrial-text)] shadow-industrial-card transition hover:text-[var(--industrial-accent)]"
                aria-label="Notifications"
              >
                <span className="text-base">🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 rounded-full bg-[var(--industrial-accent)] px-1.5 py-0.5 text-[10px] font-bold text-white shadow-[0_0_10px_rgba(255,71,87,0.45)]">
                    {unreadCount}
                  </span>
                )}
              </Link>
              <Link
                to={`/profile/${user._id}/edit`}
                className="hidden rounded-2xl bg-[linear-gradient(145deg,#edf2f8,#d9e0ea)] px-4 py-3 text-xs font-extrabold uppercase tracking-[0.08em] text-[var(--industrial-text)] shadow-industrial-card transition hover:text-[var(--industrial-accent)] sm:inline-flex"
              >
                {user.name.split(" ")[0]}
              </Link>
              <button
                onClick={logout}
                className="industrial-button industrial-button-secondary px-4 py-3 text-[11px]"
              >
                Log out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="hidden rounded-2xl bg-[rgba(255,255,255,0.38)] px-4 py-3 text-xs font-extrabold uppercase tracking-[0.08em] text-[var(--industrial-text-muted)] shadow-[4px_4px_8px_rgba(0,0,0,0.12),-1px_-1px_1px_rgba(255,255,255,0.8)] transition hover:text-[var(--industrial-text)] sm:inline-flex"
              >
                Log in
              </Link>
              <Link
                to="/join"
                className="industrial-button industrial-button-primary px-4 py-3 text-[11px]"
              >
                Join the network
              </Link>
            </div>
          )}
        </div>
      </header>
    );
  }

  return (
    <header className="relative z-20 border-b border-white/10 bg-slate/60 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="font-display text-2xl text-sand">
          BridgeAZ
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          {!user && (
            <>
              <NavLink className={navClass} to="/">
                About
              </NavLink>
              <NavLink className={navClass} to="/contact">
                Contact
              </NavLink>
            </>
          )}
          {user && (
            <>
              <NavLink className={navClass} to="/dashboard">
                Home
              </NavLink>
              <NavLink className={navClass} to="/fyp">
                For You
              </NavLink>
              <NavLink className={navClass} to="/opportunities">
                Opportunities
              </NavLink>
              <NavLink className={navClass} to="/explore">
                Explore
              </NavLink>
              <NavLink className={navClass} to="/network">
                Network
              </NavLink>
              <NavLink className={navClass} to="/chats">
                Chats
              </NavLink>
              <NavLink className={navClass} to={`/profile/${user._id}/edit`}>
                Profile
              </NavLink>
            </>
          )}
          {isAdmin && (
            <NavLink className={navClass} to="/admin">
              Admin
            </NavLink>
          )}
        </nav>
        {user ? (
          <div className="flex items-center gap-3">
            <Link to="/notifications" className="relative text-mist hover:text-sand">
              <span className="text-lg">🔔</span>
              {unreadCount > 0 && (
                <span className="absolute -right-2 -top-1 rounded-full bg-coral px-1.5 text-[10px] text-charcoal">
                  {unreadCount}
                </span>
              )}
            </Link>
            <span className="text-sm text-mist">Hi, {user.name.split(" ")[0]}</span>
            <button
              onClick={logout}
              className="rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-wide text-sand hover:border-teal"
            >
              Log out
            </button>
          </div>
        ) : (
          <Link
            to="/join"
            className="rounded-full bg-coral px-5 py-2 text-xs font-semibold uppercase tracking-wide text-charcoal"
          >
            Join
          </Link>
        )}
      </div>
    </header>
  );
}
