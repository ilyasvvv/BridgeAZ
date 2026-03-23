import { Link, NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../utils/auth";
import { apiClient } from "../api/client";

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

  const navClass = ({ isActive }) =>
    `text-[13px] font-medium transition ${
      isActive ? "text-brand-blue" : "text-text-secondary hover:text-text-main"
    }`;

  return (
    <header className="glass-effect relative z-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link to="/" className="font-display text-xl font-bold text-text-main">
          BridgeAZ
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
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
                Feed
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
            </>
          )}
          {user && (user.isAdmin || (user.roles || []).some((role) => ["staffC", "staffB", "adminA"].includes(role))) && (
            <NavLink className={navClass} to="/admin">
              Admin
            </NavLink>
          )}
        </nav>
        <div className="flex items-center gap-5">
          {user ? (
            <>
              <Link to="/notifications" className="relative text-text-secondary hover:text-text-main">
                <span className="text-xl">🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute -right-2 -top-1 rounded-full bg-accent-error px-1.5 py-0.5 text-[9px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </Link>
              <Link to={`/profile/${user._id}/edit`} className="text-[13px] font-medium text-text-secondary hover:text-text-main">
                Hi, {user.name.split(" ")[0]}
              </Link>
              <button
                onClick={logout}
                className="apple-button-secondary py-1.5 px-4 text-xs"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-[13px] font-medium text-text-secondary hover:text-text-main">
                Log in
              </Link>
              <Link
                to="/join"
                className="apple-button-primary py-1.5 px-5 text-xs"
              >
                Join Now
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
