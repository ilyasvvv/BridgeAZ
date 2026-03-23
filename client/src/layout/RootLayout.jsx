import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function RootLayout() {
  return (
    <div className="relative min-h-screen bg-bg-app">
      <Navbar />
      <main className="relative z-10 px-6 pb-20 pt-10 md:px-12">
        <div className="mx-auto max-w-7xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
