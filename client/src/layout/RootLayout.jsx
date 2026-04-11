import { Outlet } from "react-router-dom";

export default function RootLayout() {
  return (
    <div className="relative min-h-screen bg-charcoal">
      <main className="relative z-10">
        <Outlet />
      </main>
    </div>
  );
}
