import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

// Redirects to login when signed out. With `role` (a string or a list), also
// blocks other roles. The real role check happens on the server — this only guards the UI.
export default function ProtectedRoute({ role, children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  const allowed = role ? [].concat(role) : null;
  if (allowed && !allowed.includes(user.role)) return <Navigate to="/welcome" replace />;
  return children;
}
