import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import useAuth from '../hooks/useAuth';
import {
  decideApplication,
  getApplication,
  runEngine,
  verifyApplication,
} from '../services/applicationService';
import downloadFile from '../utils/download';
import formatDate from '../utils/formatDate';
import getErrorMessage from '../utils/getErrorMessage';

const CHECK_LABELS = {
  profile_complete: 'Profile complete (designation + grade pay)',
  entitlement: 'Applied quarter type is within grade-pay entitlement',
  existing_allotment: 'No existing quarter allotment',
  station_match: 'Requested station matches posting station',
};

function checkDetail(name, check) {
  if (name === 'entitlement') {
    if (!check.entitled_type) return 'entitled type could not be determined';
    return `entitled ${check.label}, applied Type ${check.applied_type}`;
  }
  if (name === 'profile_complete') return check.missing.length > 0 ? `missing: ${check.missing.join(', ')}` : '';
  if (name === 'station_match') return `requested "${check.requested}", posting "${check.posting || 'not set'}"`;
  return '';
}

const ENGINE_STATUSES = ['verified', 'ineligible', 'waitlisted'];
const REJECTABLE_STATUSES = ['submitted', 'verified', 'ineligible', 'waitlisted', 'approved'];

function EligibilityBlock({ result }) {
  return (
    <div className="card">
      <h2>
        Eligibility <StatusBadge status={result.eligible ? 'eligible' : 'ineligible'} />
      </h2>
      <table className="table">
        <tbody>
          {Object.keys(result.checks).map((name) => (
            <tr key={name}>
              <td>{CHECK_LABELS[name] || name}</td>
              <td>
                <span className={result.checks[name].passed ? 'pass' : 'fail'}>
                  {result.checks[name].passed ? 'Pass' : 'Fail'}
                </span>
              </td>
              <td className="muted">{checkDetail(name, result.checks[name])}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {result.reasons.length > 0 && (
        <ul className="reasons">
          {result.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Hakk (grade pay se) vs jis type ke liye apply kiya, aur waiting list mein jagah (registration date se).
// Points / score ab nahi hain — rank sirf registration date (waiting since) se aata hai.
function WaitingListBlock({ application }) {
  const { entitlement, waiting_entry: entry } = application;
  const onList = entry && entry.is_active;

  return (
    <div className="card">
      <h2>Entitlement and waiting list</h2>
      <dl className="details">
        <dt>Entitled type (from grade pay)</dt>
        <dd>
          {entitlement
            ? `${entitlement.label} (can apply for ${entitlement.allowed_types.map((type) => `Type ${type}`).join(', ')})`
            : 'Cannot be determined (grade pay missing)'}
        </dd>
        <dt>Applied for</dt>
        <dd>Type {application.preferred_quarter_type}</dd>
        <dt>Registration date (waiting since)</dt>
        <dd>{formatDate(onList ? entry.waiting_since : application.applied_at)}</dd>
        <dt>Waiting list rank</dt>
        <dd>{onList ? <strong>{entry.rank}</strong> : 'Not on the waiting list'}</dd>
      </dl>
      <p className="muted small">Rank is decided by registration date only (earliest first).</p>
    </div>
  );
}

function ApplicationDetail() {
  const { id } = useParams();
  const { hasPermission } = useAuth();
  const canVerify = hasPermission('application.verify');
  const canDecide = hasPermission('application.decide');

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null); // { type: 'error' | 'success', text }
  const [busy, setBusy] = useState(false);
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    let cancelled = false;
    getApplication(id)
      .then((data) => {
        if (!cancelled) setApplication(data);
      })
      .catch((err) => {
        if (!cancelled) setMessage({ type: 'error', text: getErrorMessage(err) });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function runAction(action, successText) {
    setBusy(true);
    setMessage(null);
    try {
      setApplication(await action());
      setMessage({ type: 'success', text: successText });
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  async function handleDownload(document) {
    setMessage(null);
    try {
      await downloadFile(`/documents/${document.id}/download`, document.original_name);
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err, 'Download failed') });
    }
  }

  if (loading) return <p className="muted">Loading...</p>;
  if (!application) return <p className="form-error">{message ? message.text : 'Application not found'}</p>;

  const status = application.status;
  const canRun = canVerify && ENGINE_STATUSES.includes(status);
  const canVerifyNow = canVerify && status === 'submitted';
  const canApprove = canDecide && status === 'waitlisted';
  const canReject = canDecide && REJECTABLE_STATUSES.includes(status);

  return (
    <div>
      <div className="page-header">
        <h1>
          Application {application.reference_no} <StatusBadge status={status} />
        </h1>
      </div>

      {message && <p className={message.type === 'error' ? 'form-error' : 'form-success'}>{message.text}</p>}

      <div className="card">
        <h2>Details</h2>
        <dl className="details">
          <dt>Applicant</dt>
          <dd>
            {application.employee.user.name} ({application.employee.employee_id})
            {application.employee.designation ? `, ${application.employee.designation}` : ''}
          </dd>
          <dt>Quarter type</dt>
          <dd>Type {application.preferred_quarter_type}</dd>
          <dt>Station / division</dt>
          <dd>
            {application.station} / {application.division || '-'}
          </dd>
          <dt>Preferred colony</dt>
          <dd>{application.preferred_colony || '-'}</dd>
          <dt>Family size</dt>
          <dd>{application.family_size}</dd>
          <dt>Category / service</dt>
          <dd>
            {application.category} / {application.service_type.replace('_', '-')} (as on application date)
          </dd>
          <dt>Medical ground</dt>
          <dd>{application.medical_ground ? 'Yes' : 'No'}</dd>
          <dt>Special grounds</dt>
          <dd>{application.special_grounds || '-'}</dd>
          <dt>Applied on</dt>
          <dd>{formatDate(application.applied_at)}</dd>
          {application.verifier && (
            <>
              <dt>Verified by</dt>
              <dd>
                {application.verifier.name} on {formatDate(application.verified_at)}
              </dd>
            </>
          )}
          {application.decider && (
            <>
              <dt>Decision by</dt>
              <dd>
                {application.decider.name} on {formatDate(application.decided_at)}
              </dd>
            </>
          )}
          {application.remarks && (
            <>
              <dt>Remarks</dt>
              <dd>{application.remarks}</dd>
            </>
          )}
        </dl>
      </div>

      <div className="card">
        <h2>Documents</h2>
        {application.documents.length === 0 ? (
          <p className="muted">No documents attached.</p>
        ) : (
          <ul className="file-list">
            {application.documents.map((document) => (
              <li key={document.id}>
                <button type="button" className="btn-link" onClick={() => handleDownload(document)}>
                  {document.original_name}
                </button>
                <span className="muted small"> ({Math.max(1, Math.round(document.size / 1024))} KB)</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <WaitingListBlock application={application} />
      {application.eligibility_result && <EligibilityBlock result={application.eligibility_result} />}

      {application.allotments.length > 0 && (
        <div className="card">
          <h2>Allotment</h2>
          {application.allotments.map((allotment) => (
            <p key={allotment.id}>
              {allotment.allotment_order_no} — Quarter {allotment.quarter.quarter_number} (Type{' '}
              {allotment.quarter.quarter_type}, {allotment.quarter.colony_name}) <StatusBadge status={allotment.status} />{' '}
              <Link to={canVerify || canDecide ? '/allotments' : '/my-allotment'}>View</Link>
            </p>
          ))}
        </div>
      )}

      {(canVerifyNow || canRun || canApprove || canReject) && (
        <div className="card">
          <h2>Actions</h2>
          <div className="button-row">
            {canVerifyNow && (
              <button
                type="button"
                className="btn"
                disabled={busy}
                onClick={() => runAction(() => verifyApplication(application.id), 'Application verified.')}
              >
                Verify application
              </button>
            )}
            {canRun && (
              <button
                type="button"
                className="btn"
                disabled={busy}
                onClick={() => runAction(() => runEngine(application.id), 'Eligibility checked.')}
              >
                {status === 'verified' ? 'Check eligibility and join waiting list' : 'Re-check eligibility'}
              </button>
            )}
          </div>

          {(canApprove || canReject) && (
            <div className="decision">
              <label className="field">
                <span>Remarks (required to reject)</span>
                <textarea rows="2" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              </label>
              <div className="button-row">
                {canApprove && (
                  <button
                    type="button"
                    className="btn"
                    disabled={busy}
                    onClick={() => runAction(() => decideApplication(application.id, 'approve', remarks), 'Application approved.')}
                  >
                    Approve
                  </button>
                )}
                {canReject && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled={busy}
                    onClick={() => runAction(() => decideApplication(application.id, 'reject', remarks), 'Application rejected.')}
                  >
                    Reject
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ApplicationDetail;
