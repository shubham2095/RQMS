import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import CertificateLinks from '../components/CertificateLinks';
import StatusBadge from '../components/StatusBadge';
import { listAllotments, respondToOffer } from '../services/allotmentService';
import formatDate from '../utils/formatDate';
import getErrorMessage from '../utils/getErrorMessage';

function AllotmentCard({ allotment, onChanged }) {
  const { quarter } = allotment;
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function respond(decision) {
    if (decision === 'reject' && !window.confirm('Decline this quarter? Your application will be closed and you must apply again.')) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      await respondToOffer(allotment.id, decision, remarks);
      onChanged();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>
        Allotment {allotment.allotment_order_no} <StatusBadge status={allotment.status} />
      </h2>
      <dl className="details">
        <dt>Quarter</dt>
        <dd>
          {quarter.quarter_number} (Type {quarter.quarter_type})
        </dd>
        <dt>Colony</dt>
        <dd>{quarter.colony_name}</dd>
        <dt>Station / division</dt>
        <dd>
          {quarter.station} / {quarter.division || '-'}
        </dd>
        <dt>Block / floor</dt>
        <dd>
          {quarter.block || '-'} / {quarter.floor || '-'}
        </dd>
        <dt>Address</dt>
        <dd>{quarter.address || '-'}</dd>
        <dt>Offered on</dt>
        <dd>{formatDate(allotment.offered_at)}</dd>
        {allotment.responded_at && (
          <>
            <dt>Your response on</dt>
            <dd>{formatDate(allotment.responded_at)}</dd>
          </>
        )}
        {allotment.possession_date && (
          <>
            <dt>Possession date</dt>
            <dd>{formatDate(allotment.possession_date)}</dd>
          </>
        )}
        {allotment.remarks && (
          <>
            <dt>Remarks</dt>
            <dd>{allotment.remarks}</dd>
          </>
        )}
        <dt>Certificates</dt>
        <dd>
          <CertificateLinks certificates={allotment.certificates} />
        </dd>
      </dl>

      {allotment.status === 'offered' && (
        <div className="decision">
          <p>This quarter has been offered to you. Please accept or decline.</p>
          <label className="field">
            <span>Remarks (optional)</span>
            <textarea rows="2" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </label>
          {error && <p className="form-error">{error}</p>}
          <div className="button-row">
            <button type="button" className="btn" disabled={busy} onClick={() => respond('accept')}>
              Accept quarter
            </button>
            <button type="button" className="btn btn-danger" disabled={busy} onClick={() => respond('reject')}>
              Decline
            </button>
          </div>
        </div>
      )}
      {allotment.status === 'accepted' && (
        <p className="muted">You accepted this quarter. The quarter clerk will record your possession.</p>
      )}
    </div>
  );
}

function MyAllotment() {
  const [allotments, setAllotments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    listAllotments()
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
  }, [reloadCount]);

  return (
    <div>
      <h1>My Allotment</h1>
      {error && <p className="form-error">{error}</p>}
      {loading ? (
        <p className="muted">Loading...</p>
      ) : allotments.length === 0 ? (
        <p className="muted">
          No quarter has been offered to you yet. Track your request under{' '}
          <Link to="/my-applications">My Applications</Link>.
        </p>
      ) : (
        allotments.map((allotment) => (
          <AllotmentCard
            key={allotment.id}
            allotment={allotment}
            onChanged={() => setReloadCount((count) => count + 1)}
          />
        ))
      )}
    </div>
  );
}

export default MyAllotment;
