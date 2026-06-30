import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

const ProtectedRoute = ({ allowedRoles, children }) => {
  // Assuming your authSlice has an 'isLoading' or 'loading' property
  const { user, isAuthenticated, loading } = useSelector((state) => state.auth);

  
  if (loading) {
    return <div>Loading...</div>; 
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userRole = user.role ? user.role.toUpperCase() : "";
  const allowed = allowedRoles.map(r => r.toUpperCase());

  if (!allowed.includes(userRole)) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
