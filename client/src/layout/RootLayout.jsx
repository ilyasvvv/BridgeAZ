import { Outlet, useLocation } from "react-router-dom";
import { SearchProvider } from "../utils/SearchContext";
import SearchOverlay from "../components/SearchOverlay";

// Pages that handle their own header (Landing, Dashboard)
const SELF_HEADER_PAGES = ["/", "/dashboard"];

// Pages that are public / unauthenticated
const PUBLIC_PAGES = ["/", "/login", "/join", "/register", "/forgot-password", "/reset-password", "/contact"];

export default function RootLayout() {
  const location = useLocation();
  const isLanding = location.pathname === "/";
  const hasSelfHeader = SELF_HEADER_PAGES.includes(location.pathname);
  const isPublic = PUBLIC_PAGES.some(
    (p) => location.pathname === p || location.pathname.startsWith(p + "/")
  );

  return (
    <SearchProvider>
      <div className="relative min-h-screen bg-charcoal">
        {/* No Navbar — BizimHeader is embedded in Dashboard and Landing handles its own header.
            For other authenticated pages, we render a minimal top bar. */}
        {!hasSelfHeader && !isPublic && <MinimalHeader />}
        <main className={`relative z-10 ${isLanding ? "" : hasSelfHeader ? "" : "pb-20 pt-6"}`}>
          <Outlet />
        </main>
        <SearchOverlay />
      </div>
    </SearchProvider>
  );
}

// Lightweight header for pages that don't embed BizimHeader (e.g. Chats, Network, Opportunities)
import { Link } from "react-router-dom";
import { useAuth } from "../utils/auth";

function MinimalHeader() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-grey-300 bg-white">
      <div className="mx-auto max-w-7xl flex items-center justify-between px-4 md:px-6 py-3">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-sand flex items-center justify-center">
            <span className="text-white text-xs font-bold">iii</span>
          </div>
          <span className="font-display text-sm font-bold text-sand">bizim circle</span>
        </Link>
        <div className="flex items-center gap-4">
          {user && (
            <>
              <Link to="/dashboard" className="text-sm text-mist hover:text-sand transition-colors">Home</Link>
              <Link to="/notifications" className="relative text-mist hover:text-sand transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </Link>
              <Link
                to={`/profile/${user._id}`}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-grey-300 to-grey-400 flex items-center justify-center text-xs font-bold text-sand"
              >
                {user.name?.charAt(0).toUpperCase() || "U"}
              </Link>
              <button
                onClick={logout}
                className="text-xs text-mist hover:text-sand transition-colors"
              >
                Sign Out
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
