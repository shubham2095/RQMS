import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import CertificateLinks from '../components/CertificateLinks';
import StatusBadge from '../components/StatusBadge';
import VacationTimeline from '../components/VacationTimeline';
import useAuth from '../hooks/useAuth';
import { actOnVacation, getVacation } from '../services/vacationService';
import { CLEARANCE_STEP_LABELS } from '../utils/constants';
import formatDate from '../utils/formatDate';
import getErrorMessage from '../utils/getErrorMessage';

// Optional informational fields har step ke (approve ko block nahi karte)
const STEP_FIELDS = {
  clerk_inspection: ['has_damage'],
  electrical: ['meter_reading', 'dues_amount'],
  water: ['dues_amount'],
  accounts: ['dues_amount'],
  estate_officer: [],
};

// has_damage: '' = record nahi kiya, 'no' / 'yes'
const emptyForm = { has_damage: '', meter_reading: '', dues_amount: '', remarks: '' };

// Form -> API payload: sirf is step ke fields, khali value skip
function buildPayload(step, form, decision) {
  const payload = { decision, remarks: form.remarks };
  const fields = STEP_FIELDS[step];
  if (fields.includes('has_damage') && form.has_damage !== '') payload.has_damage = form.has_damage === 'yes';
  if (fields.includes('meter_reading') && form.meter_reading !== '') payload.meter_reading = Number(form.meter_reading);
  if (fields.includes('dues_amount') && form.dues_amount !== '') payload.dues_amount = Number(form.dues_amount);
  return payload;
}

function VacationDetail() {
  const { id } = useParams();
  const { hasPermission } = useAuth();
  // Staff (koi bhi vacation.* permission) list par wapas, employee apne Vacation Request page par
  const isStaff = hasPermission(
    'vacation.clerk_inspection',
    'vacation.electrical',
    'vacation.water',
    'vacation.accounts',
    'vacation.estate_officer'
  );

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null); // { type, text }
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getVacation(id)
      .then((data) => {
        if (!cancelled) setRequest(data);
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

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function submit(decision) {
    if (decision === 'reject' && !form.remarks.trim()) {
      setMessage({ type: 'error', text: 'Remarks are required to reject.' });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const updated = await actOnVacation(request.id, request.current_step, buildPayload(request.current_step, form, decision));
      setRequest(updated);
      setForm(emptyForm);
      setMessage({
        type: 'success',
        text: decision === 'approve' ? 'Step approved.' : 'Request rejected.',
      });
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="muted">Loading...</p>;
  if (!request) return <p className="form-error">{message ? message.text : 'Vacation request not found'}</p>;

  const step = request.current_step;
  const fields = request.can_act ? STEP_FIELDS[step] : [];

  return (
    <div>
      <div className="page-header">
        <h1>
          Vacation {request.reference_no} <StatusBadge status={request.status} />
        </h1>
      </div>

      {message && <p className={message.type === 'error' ? 'form-error' : 'form-success'}>{message.text}</p>}

      <div className="card">
        <h2>Details</h2>
        <dl className="details">
          <dt>Employee</dt>
          <dd>
            {request.employee.user.name} ({request.employee.employee_id}
            {request.employee.designation ? `, ${request.employee.designation}` : ''})
          </dd>
          <dt>Quarter</dt>
          <dd>
            {request.quarter.quarter_number} (Type {request.quarter.quarter_type}), {request.quarter.colony_name},{' '}
            {request.quarter.station}
          </dd>
          <dt>Allotment order</dt>
          <dd>{request.allotment.allotment_order_no}</dd>
          <dt>Reason for vacating</dt>
          <dd>{request.trigger}</dd>
          <dt>Requested vacation date</dt>
          <dd>{formatDate(request.requested_vacation_date)}</dd>
          <dt>Remarks</dt>
          <dd>{request.reason || '-'}</dd>
          {request.status === 'in_clearance' && (
            <>
              <dt>Waiting at</dt>
              <dd>{CLEARANCE_STEP_LABELS[request.current_step]}</dd>
            </>
          )}
          {request.completed_at && (
            <>
              <dt>Completed on</dt>
              <dd>{formatDate(request.completed_at)}</dd>
            </>
          )}
        </dl>
      </div>

      <div className="card">
        <h2>Clearance timeline</h2>
        <VacationTimeline request={request} />
      </div>

      {request.certificates.length > 0 && (
        <div className="card">
          <h2>Certificates</h2>
          <CertificateLinks certificates={request.certificates} />
        </div>
      )}

      {request.can_act && (
        <div className="card">
          <h2>{CLEARANCE_STEP_LABELS[step]} — your action</h2>
          <p className="muted small">
            The values below are recorded on the timeline for information. They do not block an approval.
          </p>
          <div className="form-grid">
            {fields.includes('has_damage') && (
              <label className="field">
                <span>Damage found during inspection</span>
                <select value={form.has_damage} onChange={(e) => updateField('has_damage', e.target.value)}>
                  <option value="">Not recorded</option>
                  <option value="no">No damage</option>
                  <option value="yes">Damage found</option>
                </select>
              </label>
            )}
            {fields.includes('meter_reading') && (
              <label className="field">
                <span>Meter reading</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.meter_reading}
                  onChange={(e) => updateField('meter_reading', e.target.value)}
                />
              </label>
            )}
            {fields.includes('dues_amount') && (
              <label className="field">
                <span>Dues amount (₹)</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={form.dues_amount}
                  onChange={(e) => updateField('dues_amount', e.target.value)}
                />
              </label>
            )}
          </div>
          <label className="field decision-remarks">
            <span>Remarks (required to reject)</span>
            <textarea rows="2" value={form.remarks} onChange={(e) => updateField('remarks', e.target.value)} />
          </label>
          <div className="button-row">
            <button type="button" className="btn" disabled={busy} onClick={() => submit('approve')}>
              Approve
            </button>
            <button type="button" className="btn btn-danger" disabled={busy} onClick={() => submit('reject')}>
              Reject
            </button>
          </div>
        </div>
      )}

      <p>
        <Link to={isStaff ? '/vacations' : '/vacations/new'} className="muted small">
          Back
        </Link>
      </p>
    </div>
  );
}

export default VacationDetail;
