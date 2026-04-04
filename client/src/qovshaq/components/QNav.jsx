// Qovshaq Phase 0B — Navigation bar
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../utils/auth";
import { motion } from "framer-motion";
import QAvatar from "./QAvatar";

const navLinks = [
  { to: "/q", label: "Feed", icon: HomeIcon },
  { to: "/q/discover", label: "Discover", icon: CompassIcon },
  { to: "/q/messages", label: "Messages", icon: ChatIcon },
];

function HomeIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}

function CompassIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="currentColor" opacity={0.15} stroke="none" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function ChatIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
    </svg>
  );
}

function PlusIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export default function QNav() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => {
    if (path === "/q") return location.pathname === "/q" || location.pathname === "/q/";
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Desktop Nav */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 h-16 bg-q-surface/80 backdrop-blur-xl border-b border-q-border items-center px-6">
        <Link to="/q" className="flex items-center gap-2.5 mr-8">
          <div className="w-8 h-8 rounded-lg bg-q-primary flex items-center justify-center">
            <span className="text-white font-q-display text-lg font-bold leading-none">Q</span>
          </div>
          <span className="font-q-display text-xl text-q-text">Qovshaq</span>
        </Link>

        <div className="flex items-center gap-1 relative">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive(to)
                  ? "text-q-primary"
                  : "text-q-text-muted hover:text-q-text hover:bg-q-surface-alt"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{label}</span>
              {isActive(to) && (
                <motion.div
                  layoutId="q-nav-pill"
                  className="absolute inset-0 bg-q-primary-light rounded-lg -z-10"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate("/q/compose")}
            className="flex items-center gap-2 px-4 py-2 bg-q-primary text-white rounded-lg text-sm font-medium shadow-q-card hover:shadow-q-elevated transition-shadow"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Post</span>
          </motion.button>

          <Link to={user ? `/q/profile/${user._id}` : "/q"} className="flex items-center gap-2">
            <QAvatar user={user} size="sm" />
          </Link>
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-q-surface/90 backdrop-blur-xl border-t border-q-border safe-area-pb">
        <div className="flex items-center justify-around h-16 px-2">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${
                isActive(to) ? "text-q-primary" : "text-q-text-muted"
              }`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          ))}

          <button
            onClick={() => navigate("/q/compose")}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-q-secondary"
          >
            <div className="w-6 h-6 rounded-full bg-q-secondary flex items-center justify-center">
              <PlusIcon className="w-4 h-4 text-white" />
            </div>
            <span className="text-[10px] font-medium">Post</span>
          </button>

          <Link
            to={user ? `/q/profile/${user._id}` : "/q"}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 ${
              location.pathname.includes("/q/profile") ? "text-q-primary" : "text-q-text-muted"
            }`}
          >
            <QAvatar user={user} size="xs" />
            <span className="text-[10px] font-medium">Me</span>
          </Link>
        </div>
      </nav>
    </>
  );
}
