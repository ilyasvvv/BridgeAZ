import { Link, NavLink, useLocation } from "react-router-dom";
import { useEffect, useState, useRef, useCallback, useLayoutEffect } from "react";
import { useAuth } from "../utils/auth";
import { apiClient } from "../api/client";
import { useSearch } from "../utils/SearchContext";

const LOGGED_OUT_LINKS = [];

const LOGGED_IN_LINKS = [
  { to: "/dashboard", label: "Home" },
  { to: "/fyp", label: "For You" },
  { to: "/opportunities", label: "Opportunities" },
  { to: "/network", label: "Network" },
  { to: "/chats", label: "Chats", exact: true },
];

/* ─── Sliding pill hook ─── */
function useNavPill(activeKey) {
  const containerRef = useRef(null);
  const itemRefs = useRef({});
  const hasAnimated = useRef(false);
  const [style, setStyle] = useState({ left: 0, width: 0, opacity: 0 });

  const measure = useCallback(() => {
    const container = containerRef.current;
    const el = activeKey ? itemRefs.current[activeKey] : null;
    if (!container || !el) {
      setStyle((s) => ({ ...s, opacity: 0 }));
      return;
    }
    const cRect = container.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();
    const left = eRect.left - cRect.left;
    const width = eRect.width;

    // Suppress transition on first paint so pill doesn't slide in from 0,0
    if (!hasAnimated.current) {
      hasAnimated.current = true;
      setStyle({ left, width, opacity: 1 });
    } else {
      setStyle({ left, width, opacity: 1 });
    }
  }, [activeKey]);

  // Measure after DOM paint
  useLayoutEffect(() => {
    // Double-rAF ensures fonts/layout have settled
    let id1, id2;
    id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(measure);
    });
    return () => { cancelAnimationFrame(id1); cancelAnimationFrame(id2); };
  }, [measure]);

  // Re-measure on resize
  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  const setRef = useCallback((key) => (el) => {
    itemRefs.current[key] = el;
  }, []);

  // Build the pill's inline style
  const pillStyle = {
    position: "absolute",
    top: "50%",
    height: 34,
    borderRadius: 9999,
    pointerEvents: "none",
    left: style.left,
    width: style.width,
    opacity: style.opacity,
    transform: "translateY(-50%)",
    // Only transition after initial mount
    transition: hasAnimated.current
      ? "left 0.4s cubic-bezier(0.34,1.56,0.64,1), width 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.15s ease"
      : "none",
  };

  return { containerRef, setRef, pillStyle };
}

/* ─── Navbar ─── */
export default function Navbar() {
  const { user, token, logout } = useAuth();
  const { open: openSearch } = useSearch();
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close mobile nav on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!user || !token) return;
    (async () => {
      try {
        const notifications = await apiClient.get("/notifications", token);
        setUnreadCount(notifications.filter((n) => !n.read).length);
      } catch { setUnreadCount(0); }
    })();
  }, [user, token]);

  const links = user ? LOGGED_IN_LINKS : LOGGED_OUT_LINKS;
  const adminVisible = user && (user.isAdmin || (user.roles || []).some((r) => ["staffC", "staffB", "adminA"].includes(r)));
  const allLinks = adminVisible ? [...links, { to: "/admin", label: "Admin" }] : links;

  const isActive = useCallback(
    (to, exact) => {
      if (to === "/") return location.pathname === "/";
      if (exact) return location.pathname === to;
      return location.pathname.startsWith(to);
    },
    [location.pathname]
  );

  const activeKey = allLinks.find((l) => isActive(l.to, l.exact))?.to ?? null;

  // Desktop pill
  const { containerRef, setRef, pillStyle } = useNavPill(activeKey);

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        {/* Logo */}
        <Link to="/" className="font-display text-2xl text-sand">
          BridgeAZ
        </Link>

        {/* ─── Desktop nav ─── */}
        <nav ref={containerRef} className="relative hidden items-center md:flex">
          {/* Pill */}
          <span
            style={{
              ...pillStyle,
              background: "rgba(27, 31, 35, 0.05)",
              border: "1.5px solid rgba(27, 31, 35, 0.1)",
            }}
          />

          {allLinks.map((link) => {
            const active = isActive(link.to, link.exact);
            return (
              <NavLink
                key={link.to}
                ref={setRef(link.to)}
                to={link.to}
                end={link.to === "/"}
                className={`relative z-10 px-4 py-1.5 text-[13px] font-medium uppercase tracking-widest transition-colors duration-200 ${
                  active ? "text-sand" : "text-mist hover:text-sand"
                }`}
              >
                {link.label}
              </NavLink>
            );
          })}
        </nav>

        {/* ─── Right section ─── */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <button
                onClick={openSearch}
                className="flex items-center gap-1.5 rounded-xl border border-border bg-charcoal/50 px-2.5 py-1.5 text-mist/50 transition-colors hover:border-sand/30 hover:text-sand"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <span className="hidden text-xs sm:inline">Search</span>
                <kbd className="hidden rounded border border-border bg-white/80 px-1 py-0.5 text-[10px] font-medium text-mist/40 sm:inline">
                  &#8984;K
                </kbd>
              </button>
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
                className="text-sm text-mist transition-colors duration-200 hover:text-accent"
              >
                {user.name.split(" ")[0]}
              </Link>
              <button
                onClick={logout}
                className="hidden rounded-full border border-border px-4 py-2 text-xs uppercase tracking-wide text-sand hover:border-sand/30 md:block"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-[13px] font-medium uppercase tracking-widest text-mist transition-colors hover:text-sand"
              >
                Log in
              </Link>
              <Link
                to="/join"
                className="rounded-full border border-coral/30 bg-coral/8 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-coral/90 transition-all duration-300 hover:bg-coral/15 hover:border-coral/50"
              >
                Join
              </Link>
            </>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="flex flex-col gap-1 p-1 md:hidden"
            aria-label="Toggle menu"
          >
            <span className={`h-0.5 w-5 rounded bg-sand transition-transform duration-200 ${mobileOpen ? "translate-y-[6px] rotate-45" : ""}`} />
            <span className={`h-0.5 w-5 rounded bg-sand transition-opacity duration-200 ${mobileOpen ? "opacity-0" : ""}`} />
            <span className={`h-0.5 w-5 rounded bg-sand transition-transform duration-200 ${mobileOpen ? "-translate-y-[6px] -rotate-45" : ""}`} />
          </button>
        </div>
      </div>

      {/* ─── Mobile dropdown ─── */}
      <div
        className={`overflow-hidden border-t border-border bg-white/95 backdrop-blur-xl transition-[max-height] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] md:hidden ${
          mobileOpen ? "max-h-96" : "max-h-0 border-t-0"
        }`}
      >
        <div className="flex flex-col gap-1 px-6 py-3">
          {allLinks.map((link) => {
            const active = isActive(link.to, link.exact);
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                className={`rounded-xl px-4 py-2.5 text-sm font-medium uppercase tracking-widest transition-colors duration-200 ${
                  active
                    ? "bg-sand/5 text-sand"
                    : "text-mist hover:bg-sand/5 hover:text-sand"
                }`}
              >
                {link.label}
              </NavLink>
            );
          })}
          {user && (
            <button
              onClick={logout}
              className="mt-2 rounded-xl border border-border px-4 py-2.5 text-left text-sm uppercase tracking-widest text-mist hover:border-sand/30"
            >
              Log out
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
