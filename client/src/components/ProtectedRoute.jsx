import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute — guards routes based on authentication and role.
 * @param {string[]} roles — allowed roles (e.g. ['admin'], ['customer'])
 */
const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    // Redirect admin to admin dashboard, customer to customer dashboard
    if (user.role === 'admin') {
      return <Navigate to="/admin/reservations" replace />;
    }
    return <Navigate to="/reservations" replace />;
  }

  return children;
};

export default ProtectedRoute;
