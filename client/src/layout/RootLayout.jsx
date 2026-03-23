import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function RootLayout() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-teal/20 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-1/3 h-80 w-80 rounded-full bg-coral/20 blur-3xl" />
      <Navbar />
      <main className="relative z-10 px-6 pb-20 pt-6 md:px-12">
        <Outlet />
      </main>
    </div>
  );
}
