import { Link, NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../utils/auth";
import { apiClient } from "../api/client";

const navClass = ({ isActive }) =>
  `text-sm uppercase tracking-wide transition ${
    isActive ? "text-teal" : "text-mist hover:text-sand"
  }`;

export default function Navbar() {
  const { user, token, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

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
              <NavLink className={navClass} to="/join">
                Join
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
          {user && (user.isAdmin || (user.roles || []).some((role) => ["staffC", "staffB", "adminA"].includes(role))) && (
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
