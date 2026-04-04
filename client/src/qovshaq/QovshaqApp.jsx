// Qovshaq Phase 0B — Inner router for /q/* routes
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../utils/auth";
import QLayout from "./layouts/QLayout";
import { lazy, Suspense } from "react";

const QFeed = lazy(() => import("./pages/QFeed"));
const QCompose = lazy(() => import("./pages/QCompose"));
const QPostDetail = lazy(() => import("./pages/QPostDetail"));
const QOnboard = lazy(() => import("./pages/QOnboard"));
const QProfile = lazy(() => import("./pages/QProfile"));
const QDiscover = lazy(() => import("./pages/QDiscover"));
const QMessages = lazy(() => import("./pages/QMessages"));
const QSettings = lazy(() => import("./pages/QSettings"));
const QGuidelines = lazy(() => import("./pages/QGuidelines"));

function QLoading() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-q-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function QProtected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <QLoading />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function QovshaqApp() {
  return (
    <Suspense fallback={<div className="qovshaq-root min-h-screen bg-q-bg"><QLoading /></div>}>
      <Routes>
        <Route element={<QProtected><QLayout /></QProtected>}>
          <Route index element={<QFeed />} />
          <Route path="compose" element={<QCompose />} />
          <Route path="post/:id" element={<QPostDetail />} />
          <Route path="onboard" element={<QOnboard />} />
          <Route path="profile/:id" element={<QProfile />} />
          <Route path="discover" element={<QDiscover />} />
          <Route path="messages" element={<QMessages />} />
          <Route path="settings" element={<QSettings />} />
          <Route path="guidelines" element={<QGuidelines />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
