import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import { SearchProvider } from "../utils/SearchContext";
import SearchOverlay from "../components/SearchOverlay";

export default function RootLayout() {
  const location = useLocation();
  const isLanding = location.pathname === "/";

  return (
    <SearchProvider>
      <div className="relative min-h-screen overflow-hidden bg-charcoal">
        <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-accent/5 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-1/3 h-80 w-80 rounded-full bg-accent-soft/5 blur-3xl" />
        {!isLanding && <Navbar />}
        <main className={`relative z-10 ${isLanding ? "pb-0 pt-0" : "mx-auto max-w-6xl px-6 pb-20 pt-6 md:px-12"}`}>
          <Outlet />
        </main>
        <SearchOverlay />
      </div>
    </SearchProvider>
  );
}
