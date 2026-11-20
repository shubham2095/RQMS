import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import FormField from '../components/FormField';
import StatusBadge from '../components/StatusBadge';
import { listVacations } from '../services/vacationService';
import { CLEARANCE_STEP_LABELS, VACATION_STATUSES } from '../utils/constants';
import formatDate from '../utils/formatDate';
import getErrorMessage from '../utils/getErrorMessage';

// Staff (clerk / electrical / water / accounts / estate officer): jo requests ABHI mere step par hain.
function VacationClearances() {
  const [waitingForMe, setWaitingForMe] = useState(true);
  const [status, setStatus] = useState('');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    listVacations({ waiting_for_me: waitingForMe, status: waitingForMe ? '' : status })
      .then((data) => {
        if (cancelled) return;
        setRequests(data);
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
  }, [waitingForMe, status]);

  return (
    <div>
      <h1>Vacation Clearances</h1>

      <div className="toolbar">
        <label className="checkbox">
          <input type="checkbox" checked={waitingForMe} onChange={(e) => setWaitingForMe(e.target.checked)} />
          Only requests waiting for my step
        </label>
        {!waitingForMe && (
          <FormField label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              {VACATION_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value.replace('_', ' ')}
                </option>
              ))}
            </select>
          </FormField>
        )}
      </div>

      {error && <p className="form-error">{error}</p>}
      {loading ? (
        <p className="muted">Loading...</p>
      ) : requests.length === 0 ? (
        <p className="muted">{waitingForMe ? 'Nothing is waiting for you right now.' : 'No vacation requests found.'}</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Employee</th>
              <th>Quarter</th>
              <th>Reason</th>
              <th>Vacation date</th>
              <th>Status</th>
              <th>Waiting at</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id}>
                <td>{request.reference_no}</td>
                <td>
                  {request.employee.user.name} ({request.employee.employee_id})
                </td>
                <td>
                  {request.quarter.quarter_number} (Type {request.quarter.quarter_type}), {request.quarter.station}
                </td>
                <td>{request.trigger}</td>
                <td>{formatDate(request.requested_vacation_date)}</td>
                <td>
                  <StatusBadge status={request.status} />
                </td>
                <td>{request.current_step ? CLEARANCE_STEP_LABELS[request.current_step] : '-'}</td>
                <td>
                  <Link to={`/vacations/${request.id}`}>Open</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default VacationClearances;
