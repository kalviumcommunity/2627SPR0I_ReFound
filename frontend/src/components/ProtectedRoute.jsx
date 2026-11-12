import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

// Redirects to login when signed out. With `role`, also blocks other roles.
// The real role check must happen on the server — this only guards the UI.
export default function ProtectedRoute({ role, children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (role && user.role !== role) return <Navigate to="/welcome" replace />;
  return children;
}
