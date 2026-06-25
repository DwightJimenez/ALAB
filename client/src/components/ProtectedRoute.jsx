import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

const ProtectedRoute = ({ allowedRoles, children }) => {

  const user = useSelector((state) => state.auth.user);

  // 1. If no user is logged in, kick them back to the login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 2. If they are logged in but have the wrong role, kick them out
  if (!allowedRoles.includes(user.role)) {
    // You could redirect them to a specific "Unauthorized" page, or back to login
    return <Navigate to="/login" replace />;
  }

  // 3. If they pass both checks, render the page they asked for
  return children;
};

export default ProtectedRoute;