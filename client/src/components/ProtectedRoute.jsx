import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { canAccess } from '../utils/navItems';

// Login zaroori. Optional roles / permissions (any-of) de do to un par bhi guard.
// children do to wahi render hota hai, warna nested routes ke liye <Outlet />.
function ProtectedRoute({ roles, permissions, children }) {
  const { user, loading, loggedOut, hasRole, hasPermission } = useAuth();
  const location = useLocation();

  if (loading) return <p className="center-note">Loading...</p>;

  if (!user) {
    // Explicit logout ke baad purana page yaad nahi (next user dashboard par jaye).
    const state = loggedOut ? null : { from: location };
    return <Navigate to="/login" replace state={state} />;
  }

  if (!canAccess({ roles, permissions }, hasRole, hasPermission)) {
    return (
      <div>
        <h1>Not authorized</h1>
        <p>You do not have access to this page.</p>
      </div>
    );
  }

  return children || <Outlet />;
}

export default ProtectedRoute;
