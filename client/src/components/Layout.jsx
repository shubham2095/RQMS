import { Link, Outlet } from 'react-router-dom';

function Layout() {
  return (
    <div className="layout">
      <header className="header">
        <Link to="/" className="brand">
          RQMS
        </Link>
        <span className="tagline">Railway Quarter Management System</span>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
