import { NavLink, Outlet } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { canAccess, navItems } from '../utils/navItems';

function MainLayout() {
  const { user, logout, hasRole, hasPermission } = useAuth();

  const visibleItems = navItems.filter((item) => canAccess(item, hasRole, hasPermission));
  const roleNames = user.roles.map((role) => role.name).join(', ');

  // logout ke baad ProtectedRoute khud /login par bhej deta hai.
  async function handleLogout() {
    await logout();
  }

  return (
    <div className="layout">
      <header className="header">
        <span className="brand">RQMS</span>
        <span className="tagline">Railway Quarter Management System</span>
        <div className="header-user">
          <span>
            {user.name} <span className="role-label">({roleNames})</span>
          </span>
          <button type="button" className="btn-light" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <nav className="nav">
        {visibleItems.map((item) => (
          <NavLink key={item.to} to={item.to} className="nav-link">
            {item.label}
          </NavLink>
        ))}
      </nav>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}

export default MainLayout;
