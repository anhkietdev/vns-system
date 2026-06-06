import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ allowedRoles, children }) {
  const { user } = useAuth();

  if (!user || !user.token) {
    return <Navigate to="/LoginPartner" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/LoginPartner" replace />;
  }

  return children;
}
