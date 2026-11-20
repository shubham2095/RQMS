import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CertificateLinks from '../components/CertificateLinks';
import FormField from '../components/FormField';
import StatusBadge from '../components/StatusBadge';
import useAuth from '../hooks/useAuth';
import { listAllotments, recordPossession } from '../services/allotmentService';
import { ALLOTMENT_STATUSES } from '../utils/constants';
import formatDate from '../utils/formatDate';
import getErrorMessage from '../utils/getErrorMessage';

function today() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

// Staff view: sab allotments. Clerk / estate officer possession yahin se record karte hain.
function Allotments() {
  const { hasPermission } = useAuth();
  const canRecord = hasPermission('allotment.possession');

  const [status, setStatus] = useState('');
  const [allotments, setAllotments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reloadCount, setReloadCount] = useState(0);

  const [recordingId, setRecordingId] = useState(null);
  const [possessionDate, setPossessionDate] = useState(today());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listAllotments({ status })
      .then((data) => {
        if (cancelled) return;
        setAllotments(data);
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

  function startRecording(allotment) {
    setRecordingId(allotment.id);
    setPossessionDate(today());
    setError('');
    setMessage('');
  }

  async function confirmPossession(allotment) {
    setSaving(true);
    setError('');
    try {
      await recordPossession(allotment.id, possessionDate);
      setRecordingId(null);
      setMessage(`Possession recorded for ${allotment.allotment_order_no}. Certificates generated.`);
      setReloadCount((count) => count + 1);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1>Allotments</h1>

      <div className="toolbar">
        <FormField label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            {ALLOTMENT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      {message && <p className="form-success">{message}</p>}
      {error && <p className="form-error">{error}</p>}
      {loading ? (
        <p className="muted">Loading...</p>
      ) : allotments.length === 0 ? (
        <p className="muted">
          No allotments yet. Offer a vacant quarter from the <Link to="/quarters">Quarters</Link> page.
        </p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Order no</th>
              <th>Employee</th>
              <th>Quarter</th>
              <th>Status</th>
              <th>Offered</th>
              <th>Possession</th>
              <th>Certificates</th>
              {canRecord && <th />}
            </tr>
          </thead>
          <tbody>
            {allotments.map((allotment) => (
              <tr key={allotment.id}>
                <td>{allotment.allotment_order_no}</td>
                <td>
                  {allotment.employee.user.name} ({allotment.employee.employee_id})
                </td>
                <td>
                  {allotment.quarter.quarter_number} (Type {allotment.quarter.quarter_type}), {allotment.quarter.colony_name},{' '}
                  {allotment.quarter.station}
                </td>
                <td>
                  <StatusBadge status={allotment.status} />
                </td>
                <td>{formatDate(allotment.offered_at)}</td>
                <td>{formatDate(allotment.possession_date)}</td>
                <td>
                  <CertificateLinks certificates={allotment.certificates} />
                </td>
                {canRecord && (
                  <td>
                    {allotment.status === 'accepted' && recordingId !== allotment.id && (
                      <button type="button" className="btn-link" onClick={() => startRecording(allotment)}>
                        Record possession
                      </button>
                    )}
                    {recordingId === allotment.id && (
                      <div className="inline-record">
                        <input
                          type="date"
                          value={possessionDate}
                          max={today()}
                          onChange={(e) => setPossessionDate(e.target.value)}
                        />
                        <button type="button" className="btn" disabled={saving} onClick={() => confirmPossession(allotment)}>
                          Confirm
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => setRecordingId(null)}>
                          Cancel
                        </button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Allotments;
