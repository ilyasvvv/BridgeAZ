import { Link, NavLink, useLocation } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "../utils/auth";
import { apiClient } from "../api/client";

const LOGGED_OUT_LINKS = [
  { to: "/", label: "About" },
  { to: "/contact", label: "Contact" },
];

const LOGGED_IN_LINKS = [
  { to: "/dashboard", label: "Home" },
  { to: "/fyp", label: "For You" },
  { to: "/opportunities", label: "Opportunities" },
  { to: "/network", label: "Network" },
  { to: "/chats", label: "Chats" },
];

export default function Navbar() {
  const { user, token, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();
  const navRef = useRef(null);
  const pillRef = useRef(null);
  const [pillStyle, setPillStyle] = useState({ width: 0, x: 0, opacity: 0 });

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

  // Sliding pill position calculation
  const updatePill = useCallback(() => {
    if (!navRef.current) return;
    const activeLink = navRef.current.querySelector("a.active-nav-link");
    if (activeLink) {
      const navRect = navRef.current.getBoundingClientRect();
      const linkRect = activeLink.getBoundingClientRect();
      setPillStyle({
        width: linkRect.width + 16,
        x: linkRect.left - navRect.left - 8,
        opacity: 1,
      });
    } else {
      setPillStyle((prev) => ({ ...prev, opacity: 0 }));
    }
  }, []);

  useEffect(() => {
    // Small delay so DOM has settled after route change
    const timer = setTimeout(updatePill, 30);
    return () => clearTimeout(timer);
  }, [location.pathname, user, updatePill]);

  useEffect(() => {
    window.addEventListener("resize", updatePill);
    return () => window.removeEventListener("resize", updatePill);
  }, [updatePill]);

  const links = user ? LOGGED_IN_LINKS : LOGGED_OUT_LINKS;
  const adminVisible = user && (user.isAdmin || (user.roles || []).some((role) => ["staffC", "staffB", "adminA"].includes(role)));

  // Determine if a link is active (for adding the class used by pill detection)
  const isLinkActive = (to) => {
    if (to === "/") return location.pathname === "/";
    return location.pathname.startsWith(to);
  };

  return (
    <header className="relative z-20 border-b border-border bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="font-display text-2xl text-sand">
          BridgeAZ
        </Link>
        <nav ref={navRef} className="relative hidden items-center gap-1 md:flex">
          {/* Sliding pill background */}
          <span
            ref={pillRef}
            className="absolute top-1/2 h-8 -translate-y-1/2 rounded-full bg-brand/10 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
            style={{
              width: pillStyle.width,
              transform: `translateX(${pillStyle.x}px) translateY(-50%)`,
              opacity: pillStyle.opacity,
            }}
          />
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={`relative z-10 rounded-full px-3 py-1.5 text-sm uppercase tracking-wide transition-colors duration-200 ${
                isLinkActive(link.to)
                  ? "active-nav-link text-brand font-medium"
                  : "text-mist hover:text-sand"
              }`}
            >
              {link.label}
            </NavLink>
          ))}
          {adminVisible && (
            <NavLink
              to="/admin"
              className={`relative z-10 rounded-full px-3 py-1.5 text-sm uppercase tracking-wide transition-colors duration-200 ${
                isLinkActive("/admin")
                  ? "active-nav-link text-brand font-medium"
                  : "text-mist hover:text-sand"
              }`}
            >
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
            <Link
              to={`/profile/${user._id}/edit`}
              className="text-sm text-mist transition-colors duration-200 hover:text-brand"
            >
              {user.name.split(" ")[0]}
            </Link>
            <button
              onClick={logout}
              className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-wide text-sand hover:border-teal"
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
