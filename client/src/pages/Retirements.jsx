import { useEffect, useState } from 'react';
import FormField from '../components/FormField';
import StatusBadge from '../components/StatusBadge';
import { listRetirements, runRetentionCycle } from '../services/retirementService';
import { RETIREMENT_STATUSES } from '../utils/constants';
import formatDate from '../utils/formatDate';
import getErrorMessage from '../utils/getErrorMessage';

// Estate officer / admin: retirement retention tracking (120 din retention, overstay par ₹ per day penalty).
function Retirements() {
  const [status, setStatus] = useState('');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadCount, setReloadCount] = useState(0);

  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let cancelled = false;
    listRetirements({ status })
      .then((data) => {
        if (cancelled) return;
        setRecords(data);
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
  }, [status, reloadCount]);

  async function handleRunCycle() {
    setRunning(true);
    setError('');
    setSummary(null);
    try {
      setSummary(await runRetentionCycle());
      setReloadCount((count) => count + 1);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Retirements</h1>
        <button type="button" className="btn" disabled={running} onClick={handleRunCycle}>
          {running ? 'Running...' : 'Run cycle'}
        </button>
      </div>
      <p className="muted">
        Retained quarters of retiring employees. The cycle re-checks every open record: it marks records expiring (inside
        the alert window) or overstaying (penalty per day) and sends alerts once per change. It will run daily
        automatically after deployment; for now run it here.
      </p>

      {summary && (
        <p className="form-success">
          Cycle done: {summary.evaluated} evaluated, {summary.changed} updated, {summary.expiring} newly expiring,{' '}
          {summary.overstaying} newly overstaying, {summary.notifications} notification(s) sent.
        </p>
      )}

      <div className="toolbar">
        <FormField label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            {RETIREMENT_STATUSES.map((value) => (
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
      ) : records.length === 0 ? (
        <p className="muted">No retirement records.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Quarter</th>
              <th>Retirement date</th>
              <th>Retention expiry</th>
              <th>Status</th>
              <th>Overstay days</th>
              <th>Penalty (₹)</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id}>
                <td>
                  {record.employee.user.name} ({record.employee.employee_id})
                </td>
                <td>
                  {record.allotment && record.allotment.quarter
                    ? `${record.allotment.quarter.quarter_number} (Type ${record.allotment.quarter.quarter_type}), ${record.allotment.quarter.station}`
                    : '-'}
                </td>
                <td>{formatDate(record.retirement_date)}</td>
                <td>{formatDate(record.retention_expiry_date)}</td>
                <td>
                  <StatusBadge status={record.status} />
                </td>
                <td>{record.overstay_days}</td>
                <td>{record.penalty_amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Retirements;
