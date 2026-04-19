import { Link, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../utils/auth";
import { useSearch } from "../utils/SearchContext";

export default function BizimHeader() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { open: openSearch } = useSearch();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-grey-300 bg-white">
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-2.5">
        <div className="flex items-center gap-4">

          {/* ─── Logo (◯ bizim circle) ─── */}
          <Link to="/dashboard" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-full border-2 border-sand flex items-center justify-center">
              <span className="text-sand text-[10px] font-bold tracking-tight">iii</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-display text-sm font-bold text-sand">bizim</span>
              <span className="font-display text-sm font-bold text-sand">circle</span>
            </div>
          </Link>

          {/* ─── Search bar (click-to-open) ─── */}
          <button
            type="button"
            onClick={openSearch}
            className="flex-1 max-w-lg mx-auto group"
          >
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-full border border-grey-300 bg-grey-100 group-hover:border-grey-500 group-hover:bg-white transition-colors">
              <svg className="w-4 h-4 text-grey-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="flex-1 text-left text-sm text-grey-500">
                Search people, circles, posts...
              </span>
            </div>
          </button>

          {/* ─── Right: Notifications + Profile + Sign Out ─── */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Notifications */}
            <button className="relative p-2 hover:bg-grey-100 rounded-full transition-colors">
              <svg className="w-5 h-5 text-sand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* Profile avatar */}
            <div ref={profileRef} className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="w-9 h-9 rounded-full bg-gradient-to-br from-grey-300 to-grey-400 flex items-center justify-center hover:ring-2 hover:ring-grey-300 transition-all"
              >
                <svg className="w-5 h-5 text-grey-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white border border-grey-300 rounded-xl shadow-floating z-50 py-1">
                  <div className="px-4 py-3 border-b border-grey-200">
                    <p className="text-sm font-semibold text-sand truncate">{user?.name || "User"}</p>
                    <p className="text-xs text-mist truncate">{user?.email}</p>
                  </div>
                  <Link
                    to={`/profile/${user?._id}`}
                    onClick={() => setProfileOpen(false)}
                    className="block px-4 py-2.5 text-sm text-mist hover:bg-grey-100 transition-colors"
                  >
                    View Profile
                  </Link>
                  <Link
                    to={`/profile/${user?._id}/edit`}
                    onClick={() => setProfileOpen(false)}
                    className="block px-4 py-2.5 text-sm text-mist hover:bg-grey-100 transition-colors"
                  >
                    Edit Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-sm text-mist hover:bg-grey-100 transition-colors border-t border-grey-200 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
