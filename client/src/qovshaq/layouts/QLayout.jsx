// Qovshaq Phase 0B — Main layout shell
import { Outlet, useLocation } from "react-router-dom";
import QNav from "../components/QNav";
import "../index.css";

export default function QLayout() {
  const location = useLocation();
  const isMessages = location.pathname === "/q/messages";

  return (
    <div className="qovshaq-root">
      <div className="q-ambient" />
      <QNav />

      {/* Main content — offset for fixed nav */}
      <main className="relative z-10 pt-16 pb-20 md:pb-8 min-h-screen">
        <div className={`${isMessages ? "max-w-6xl" : "max-w-2xl"} mx-auto px-4 py-6`}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
