import useAuth from '../hooks/useAuth';

// Placeholder dashboard (Phase 1): sirf naam + roles + permissions. Real dashboard Phase 5 mein.
function Dashboard() {
  const { user } = useAuth();

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <p className="muted">{user.email}</p>

      <h3>Your roles</h3>
      <ul className="chips">
        {user.roles.map((role) => (
          <li key={role.slug} className="chip">
            {role.name}
          </li>
        ))}
      </ul>

      <h3>Your permissions</h3>
      {user.permissions.length === 0 ? (
        <p className="muted">No special permissions.</p>
      ) : (
        <ul className="chips">
          {user.permissions.map((slug) => (
            <li key={slug} className="chip chip-light">
              {slug}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Dashboard;
