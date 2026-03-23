import { Link, NavLink, useLocation } from "react-router-dom";
import { useEffect, useState, useRef, useCallback, useLayoutEffect } from "react";
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
  const linkRefs = useRef({});
  const [pill, setPill] = useState({ left: 0, width: 0, ready: false });

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
    if (user) loadNotifications();
  }, [user, token]);

  const links = user ? LOGGED_IN_LINKS : LOGGED_OUT_LINKS;
  const adminVisible = user && (user.isAdmin || (user.roles || []).some((role) => ["staffC", "staffB", "adminA"].includes(role)));

  const isLinkActive = useCallback(
    (to) => {
      if (to === "/") return location.pathname === "/";
      return location.pathname.startsWith(to);
    },
    [location.pathname]
  );

  // Find the active link key
  const activeKey = links.find((l) => isLinkActive(l.to))?.to || (adminVisible && isLinkActive("/admin") ? "/admin" : null);

  // Measure active link and update pill position
  const updatePill = useCallback(() => {
    if (!navRef.current || !activeKey) {
      setPill((p) => ({ ...p, ready: false }));
      return;
    }
    const el = linkRefs.current[activeKey];
    if (!el) return;
    const navRect = navRef.current.getBoundingClientRect();
    const linkRect = el.getBoundingClientRect();
    setPill({
      left: linkRect.left - navRect.left,
      width: linkRect.width,
      ready: true,
    });
  }, [activeKey]);

  useLayoutEffect(() => {
    updatePill();
  }, [updatePill]);

  useEffect(() => {
    window.addEventListener("resize", updatePill);
    return () => window.removeEventListener("resize", updatePill);
  }, [updatePill]);

  return (
    <header className="relative z-20 border-b border-border bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="font-display text-2xl text-sand">
          BridgeAZ
        </Link>
        <nav ref={navRef} className="relative hidden items-center gap-1 md:flex">
          {/* Sliding pill */}
          <span
            className="pointer-events-none absolute rounded-full bg-brand/10"
            style={{
              left: pill.left,
              width: pill.width,
              top: "50%",
              height: 32,
              transform: "translateY(-50%)",
              opacity: pill.ready ? 1 : 0,
              transition: "left 0.35s cubic-bezier(0.34,1.56,0.64,1), width 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease",
            }}
          />
          {links.map((link) => {
            const active = isLinkActive(link.to);
            return (
              <NavLink
                key={link.to}
                ref={(el) => { linkRefs.current[link.to] = el; }}
                to={link.to}
                end={link.to === "/"}
                className={`relative z-10 rounded-full px-4 py-1.5 text-sm uppercase tracking-wide transition-colors duration-200 ${
                  active
                    ? "text-brand font-semibold"
                    : "text-mist hover:text-sand"
                }`}
              >
                {link.label}
              </NavLink>
            );
          })}
          {adminVisible && (
            <NavLink
              ref={(el) => { linkRefs.current["/admin"] = el; }}
              to="/admin"
              className={`relative z-10 rounded-full px-4 py-1.5 text-sm uppercase tracking-wide transition-colors duration-200 ${
                isLinkActive("/admin")
                  ? "text-brand font-semibold"
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
