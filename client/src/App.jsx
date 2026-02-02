import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./utils/auth";
import RootLayout from "./layout/RootLayout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Join from "./pages/Join";
import Contact from "./pages/Contact";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import PublicProfile from "./pages/PublicProfile";
import Explore from "./pages/Explore";
import Admin from "./pages/Admin";
import AccessDenied from "./pages/AccessDenied";
import ForYou from "./pages/ForYou";
import PostDetail from "./pages/PostDetail";
import Opportunities from "./pages/Opportunities";
import OpportunityDetail from "./pages/OpportunityDetail";
import Notifications from "./pages/Notifications";
import Chats from "./pages/Chats";
import Network from "./pages/Network";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  const roles = Array.isArray(user.roles) ? user.roles : [];
  const isAdmin = user.isAdmin || roles.includes("staffC") || roles.includes("staffB") || roles.includes("adminA");
  if (!isAdmin) return <AccessDenied />;
  return children;
};

export default function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/join" element={<Join />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/contact" element={<Contact />} />
        <Route
          path="/fyp"
          element={
            <ProtectedRoute>
              <ForYou />
            </ProtectedRoute>
          }
        />
        <Route
          path="/post/:id"
          element={
            <ProtectedRoute>
              <PostDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/opportunities"
          element={
            <ProtectedRoute>
              <Opportunities />
            </ProtectedRoute>
          }
        />
        <Route
          path="/opportunities/:id"
          element={
            <ProtectedRoute>
              <OpportunityDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/:id"
          element={
            <ProtectedRoute>
              <PublicProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/:id/edit"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chats"
          element={
            <ProtectedRoute>
              <Chats />
            </ProtectedRoute>
          }
        />
        <Route
          path="/network"
          element={
            <ProtectedRoute>
              <Network />
            </ProtectedRoute>
          }
        />
        <Route
          path="/explore"
          element={
            <ProtectedRoute>
              <Explore />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          }
        />
      </Route>
    </Routes>
  );
}
