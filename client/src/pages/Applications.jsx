import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import FormField from '../components/FormField';
import StatusBadge from '../components/StatusBadge';
import { listApplications } from '../services/applicationService';
import { APPLICATION_STATUSES } from '../utils/constants';
import formatDate from '../utils/formatDate';
import getErrorMessage from '../utils/getErrorMessage';

// Do routes isi page ko use karte hain:
//   /my-applications (employee) ... API sirf apni applications deta hai
//   /applications (clerk / estate officer) ... API sab deta hai
function Applications() {
  const mine = useLocation().pathname === '/my-applications';

  const [status, setStatus] = useState('');
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    listApplications({ status })
      .then((data) => {
        if (cancelled) return;
        setApplications(data);
        setError('');
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  return (
    <div>
      <div className="page-header">
        <h1>{mine ? 'My Applications' : 'Applications'}</h1>
        {mine && (
          <Link to="/applications/new" className="btn btn-link-button">
            Apply for quarter
          </Link>
        )}
      </div>

      <div className="toolbar">
        <FormField label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            {APPLICATION_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      {error && <p className="form-error">{error}</p>}
      {loading ? (
        <p className="muted">Loading...</p>
      ) : applications.length === 0 ? (
        <p className="muted">No applications found.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Reference</th>
              {!mine && <th>Applicant</th>}
              <th>Type</th>
              <th>Station</th>
              <th>Status</th>
              <th>Waiting list rank</th>
              <th>Registered on</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {applications.map((application) => {
              const entry = application.waiting_entry;
              const rank = entry && entry.is_active ? entry.rank : null;
              return (
                <tr key={application.id}>
                  <td>{application.reference_no}</td>
                  {!mine && (
                    <td>
                      {application.employee.user.name} ({application.employee.employee_id})
                    </td>
                  )}
                  <td>{application.preferred_quarter_type}</td>
                  <td>{application.station}</td>
                  <td>
                    <StatusBadge status={application.status} />
                  </td>
                  <td>{rank || '-'}</td>
                  <td>{formatDate(application.applied_at)}</td>
                  <td>
                    <Link to={`/applications/${application.id}`}>Open</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Applications;
