import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CertificateLinks from '../components/CertificateLinks';
import FormField from '../components/FormField';
import StatusBadge from '../components/StatusBadge';
import VacationTimeline from '../components/VacationTimeline';
import { listAllotments } from '../services/allotmentService';
import { getVacation, initiateVacation, listVacations } from '../services/vacationService';
import { VACATION_TRIGGERS } from '../utils/constants';
import formatDate from '../utils/formatDate';
import getErrorMessage from '../utils/getErrorMessage';

function todayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

const OPEN_STATUSES = ['submitted', 'in_clearance'];

// Employee: apna active quarter khali karne ki request + uski progress (5-step timeline) + certificates.
function VacationRequest() {
  const [allotment, setAllotment] = useState(null); // active (possession_taken) allotment
  const [requests, setRequests] = useState([]);
  const [latest, setLatest] = useState(null); // sabse nayi request (detail, timeline ke saath)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadCount, setReloadCount] = useState(0);

  const [form, setForm] = useState({ trigger: 'transfer', requested_vacation_date: todayString(), reason: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [active, mine] = await Promise.all([listAllotments({ status: 'possession_taken' }), listVacations()]);
        const detail = mine.length > 0 ? await getVacation(mine[0].id) : null;
        if (cancelled) return;
        setAllotment(active.length > 0 ? active[0] : null);
        setRequests(mine);
        setLatest(detail);
        setError('');
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [reloadCount]);

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await initiateVacation(form);
      setReloadCount((count) => count + 1);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="muted">Loading...</p>;

  const hasOpenRequest = latest && OPEN_STATUSES.includes(latest.status);

  return (
    <div>
      <h1>Vacation Request</h1>
      {error && <p className="form-error">{error}</p>}

      {!hasOpenRequest && allotment && (
        <form className="card" onSubmit={handleSubmit}>
          <h2>Vacate my quarter</h2>
          <p className="muted">
            Quarter {allotment.quarter.quarter_number} (Type {allotment.quarter.quarter_type},{' '}
            {allotment.quarter.colony_name}, {allotment.quarter.station}) — possession since{' '}
            {formatDate(allotment.possession_date)}.
          </p>
          <div className="form-grid">
            <FormField label="Reason for vacating *">
              <select value={form.trigger} onChange={(e) => updateField('trigger', e.target.value)}>
                {VACATION_TRIGGERS.map((trigger) => (
                  <option key={trigger.value} value={trigger.value}>
                    {trigger.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Vacation date *">
              <input
                type="date"
                value={form.requested_vacation_date}
                min={allotment.possession_date || undefined}
                onChange={(e) => updateField('requested_vacation_date', e.target.value)}
                required
              />
            </FormField>
            <FormField label="Remarks (optional)">
              <textarea rows="2" value={form.reason} onChange={(e) => updateField('reason', e.target.value)} />
            </FormField>
          </div>
          <p className="muted small">
            Your request goes through 5 clearances: clerk inspection, electrical, water, accounts and the Estate Officer.
          </p>
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit vacation request'}
          </button>
        </form>
      )}

      {!hasOpenRequest && !allotment && (
        <p className="muted">
          You do not hold an active quarter, so there is nothing to vacate. Check <Link to="/my-allotment">My Allotment</Link>.
        </p>
      )}

      {latest && (
        <div className="card">
          <h2>
            {hasOpenRequest ? 'Your request' : 'Latest request'} {latest.reference_no} <StatusBadge status={latest.status} />
          </h2>
          <dl className="details">
            <dt>Quarter</dt>
            <dd>
              {latest.quarter.quarter_number} (Type {latest.quarter.quarter_type}), {latest.quarter.colony_name}
            </dd>
            <dt>Reason / vacation date</dt>
            <dd>
              {latest.trigger} / {formatDate(latest.requested_vacation_date)}
            </dd>
            {latest.completed_at && (
              <>
                <dt>Completed on</dt>
                <dd>{formatDate(latest.completed_at)}</dd>
              </>
            )}
          </dl>
          <h3>Clearance progress</h3>
          <VacationTimeline request={latest} />
          {latest.certificates.length > 0 && (
            <>
              <h3>Certificates</h3>
              <CertificateLinks certificates={latest.certificates} />
            </>
          )}
          {latest.status === 'rejected' && (
            <p className="muted">This request was rejected. You can submit a new one once the issue is resolved.</p>
          )}
          <p>
            <Link to={`/vacations/${latest.id}`}>Open full details</Link>
          </p>
        </div>
      )}

      {requests.length > 1 && (
        <div className="card">
          <h2>Earlier requests</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Reason</th>
                <th>Vacation date</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {requests.slice(1).map((request) => (
                <tr key={request.id}>
                  <td>{request.reference_no}</td>
                  <td>{request.trigger}</td>
                  <td>{formatDate(request.requested_vacation_date)}</td>
                  <td>
                    <StatusBadge status={request.status} />
                  </td>
                  <td>
                    <Link to={`/vacations/${request.id}`}>Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default VacationRequest;
