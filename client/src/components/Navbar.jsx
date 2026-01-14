import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../utils/auth";

const navClass = ({ isActive }) =>
  `text-sm uppercase tracking-wide transition ${
    isActive ? "text-teal" : "text-mist hover:text-sand"
  }`;

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="relative z-20 border-b border-white/10 bg-slate/60 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="font-display text-2xl text-sand">
          BridgeAZ
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          <NavLink className={navClass} to="/">
            About
          </NavLink>
          {user && (
            <>
              <NavLink className={navClass} to="/fyp">
                For You
              </NavLink>
              <NavLink className={navClass} to="/opportunities">
                Opportunities
              </NavLink>
              <NavLink className={navClass} to="/explore">
                Explore
              </NavLink>
              <NavLink className={navClass} to="/dashboard">
                Home
              </NavLink>
              <NavLink className={navClass} to={`/profile/${user._id}`}>
                Profile
              </NavLink>
            </>
          )}
          {!user && (
            <NavLink className={navClass} to="/login">
              Login
            </NavLink>
          )}
          {!user && (
            <NavLink className={navClass} to="/register">
              Sign Up
            </NavLink>
          )}
          {user && user.isAdmin && (
            <NavLink className={navClass} to="/admin">
              Admin
            </NavLink>
          )}
        </nav>
        {user ? (
          <div className="flex items-center gap-3">
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
            to="/register"
            className="rounded-full bg-coral px-5 py-2 text-xs font-semibold uppercase tracking-wide text-charcoal"
          >
            Join
          </Link>
        )}
      </div>
    </header>
  );
}
