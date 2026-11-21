import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StatCard from '../components/StatCard';
import SummaryCards from '../components/SummaryCards';
import useAuth from '../hooks/useAuth';
import { getSummary, getWorkQueue } from '../services/reportService';
import getErrorMessage from '../utils/getErrorMessage';

// "Mera kaam" cards: key -> label + kis page par le jana hai
const WORK_QUEUE = {
  applications_to_verify: { label: 'Applications to verify', to: '/applications' },
  applications_to_check: { label: 'Verified, awaiting eligibility check', to: '/applications' },
  applications_to_decide: { label: 'Waitlisted, awaiting decision', to: '/applications' },
  offers_awaiting_possession: { label: 'Accepted offers awaiting possession', to: '/allotments' },
  vacations_at_my_step: { label: 'Vacation requests at your step', to: '/vacations' },
};

// Landing: reports.view wale ko summary numbers, baaki staff ko apna work queue, employee ko simple welcome.
function Dashboard() {
  const { user, hasPermission } = useAuth();
  const canSeeReports = hasPermission('reports.view');

  const [summary, setSummary] = useState(null);
  const [queue, setQueue] = useState({});
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const request = canSeeReports ? getSummary().then((data) => !cancelled && setSummary(data)) : getWorkQueue().then((data) => !cancelled && setQueue(data));
    request.catch((err) => {
      if (!cancelled) setError(getErrorMessage(err));
    });
    return () => {
      cancelled = true;
    };
  }, [canSeeReports]);

  const queueKeys = Object.keys(queue).filter((key) => WORK_QUEUE[key]);

  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <p className="muted">{user.email}</p>
      {error && <p className="form-error">{error}</p>}

      {summary && (
        <>
          <SummaryCards summary={summary} />
          <p>
            <Link to="/reports">Open full reports</Link>
          </p>
        </>
      )}

      {queueKeys.length > 0 && (
        <>
          <h3>Your work queue</h3>
          <div className="stat-grid">
            {queueKeys.map((key) => (
              <StatCard
                key={key}
                label={WORK_QUEUE[key].label}
                value={queue[key]}
                to={WORK_QUEUE[key].to}
                tone={queue[key] > 0 ? 'warn' : undefined}
              />
            ))}
          </div>
        </>
      )}

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
