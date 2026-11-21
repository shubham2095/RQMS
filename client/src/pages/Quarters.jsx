import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import FormField from '../components/FormField';
import StatusBadge from '../components/StatusBadge';
import useAuth from '../hooks/useAuth';
import {
  createQuarter,
  getOfferSuggestion,
  listQuarters,
  offerQuarter,
  updateQuarter,
} from '../services/quarterService';
import { MANUAL_QUARTER_STATUSES, QUARTER_STATUSES, QUARTER_TYPES } from '../utils/constants';
import formatDate from '../utils/formatDate';
import getErrorMessage from '../utils/getErrorMessage';

const emptyFilters = { type: '', station: '', status: '' };

const emptyForm = {
  quarter_number: '',
  quarter_type: 'I',
  colony_name: '',
  address: '',
  railway_zone: '',
  division: '',
  station: '',
  block: '',
  floor: '',
  status: 'vacant',
};

function quarterToForm(quarter) {
  const form = { ...emptyForm };
  Object.keys(emptyForm).forEach((key) => {
    if (quarter[key] !== null && quarter[key] !== undefined) form[key] = quarter[key];
  });
  return form;
}

function Quarters() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('quarter.manage');
  const canOffer = hasPermission('allotment.approve');

  const [quarters, setQuarters] = useState([]);
  const [draftFilters, setDraftFilters] = useState(emptyFilters); // form mein jo likha
  const [filters, setFilters] = useState(emptyFilters); // jo lagu hai
  const [reloadCount, setReloadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editing, setEditing] = useState(null); // null | 'new' | quarter
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Offer: vacant quarter ko queue ke rank-1 (approved) applicant ko
  const [offerFor, setOfferFor] = useState(null); // quarter
  const [suggestion, setSuggestion] = useState(null);
  const [offerBusy, setOfferBusy] = useState(false);
  const [offerError, setOfferError] = useState('');
  const [offerDone, setOfferDone] = useState('');

  useEffect(() => {
    let cancelled = false;
    listQuarters(filters)
      .then((data) => {
        if (cancelled) return;
        setQuarters(data);
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
  }, [filters, reloadCount]);

  function applyFilters(event) {
    event.preventDefault();
    setFilters(draftFilters);
  }

  function resetFilters() {
    setDraftFilters(emptyFilters);
    setFilters(emptyFilters);
  }

  function startCreate() {
    setEditing('new');
    setForm(emptyForm);
    setFormError('');
  }

  function startEdit(quarter) {
    setEditing(quarter);
    setForm(quarterToForm(quarter));
    setFormError('');
  }

  function cancelEdit() {
    setEditing(null);
    setFormError('');
  }

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // allotted / occupied wagairah status haath se nahi badalte (allotment flow karta hai)
  const statusLocked =
    editing && editing !== 'new' && !MANUAL_QUARTER_STATUSES.includes(editing.status);

  async function startOffer(quarter) {
    setOfferFor(quarter);
    setSuggestion(null);
    setOfferError('');
    setOfferDone('');
    try {
      setSuggestion(await getOfferSuggestion(quarter.id));
    } catch (err) {
      setOfferError(getErrorMessage(err));
    }
  }

  function cancelOffer() {
    setOfferFor(null);
    setSuggestion(null);
    setOfferError('');
  }

  async function confirmOffer() {
    setOfferBusy(true);
    setOfferError('');
    try {
      const allotment = await offerQuarter(offerFor.id);
      setOfferDone(
        `Quarter ${offerFor.quarter_number} offered to ${allotment.employee.user.name} (${allotment.employee.employee_id}). Order ${allotment.allotment_order_no}.`
      );
      setOfferFor(null);
      setSuggestion(null);
      setReloadCount((count) => count + 1);
    } catch (err) {
      setOfferError(getErrorMessage(err));
    } finally {
      setOfferBusy(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const payload = { ...form };
      if (statusLocked) delete payload.status;

      if (editing === 'new') {
        await createQuarter(payload);
      } else {
        await updateQuarter(editing.id, payload);
      }
      setEditing(null);
      setReloadCount((count) => count + 1);
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Quarters</h1>
        {canManage && !editing && (
          <button type="button" className="btn" onClick={startCreate}>
            Add quarter
          </button>
        )}
      </div>

      {canManage && editing && (
        <form className="card" onSubmit={handleSubmit}>
          <h2>{editing === 'new' ? 'Add quarter' : `Edit quarter ${editing.quarter_number}`}</h2>
          <div className="form-grid">
            <FormField label="Quarter number *">
              <input
                value={form.quarter_number}
                onChange={(e) => updateField('quarter_number', e.target.value)}
                required
              />
            </FormField>
            <FormField label="Type *">
              <select value={form.quarter_type} onChange={(e) => updateField('quarter_type', e.target.value)}>
                {QUARTER_TYPES.map((type) => (
                  <option key={type} value={type}>
                    Type {type}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Colony name *">
              <input
                value={form.colony_name}
                onChange={(e) => updateField('colony_name', e.target.value)}
                required
              />
            </FormField>
            <FormField label="Station *">
              <input value={form.station} onChange={(e) => updateField('station', e.target.value)} required />
            </FormField>
            <FormField label="Division">
              <input value={form.division} onChange={(e) => updateField('division', e.target.value)} />
            </FormField>
            <FormField label="Railway zone">
              <input value={form.railway_zone} onChange={(e) => updateField('railway_zone', e.target.value)} />
            </FormField>
            <FormField label="Block">
              <input value={form.block} onChange={(e) => updateField('block', e.target.value)} />
            </FormField>
            <FormField label="Floor">
              <input value={form.floor} onChange={(e) => updateField('floor', e.target.value)} />
            </FormField>
            <FormField label="Address">
              <input value={form.address} onChange={(e) => updateField('address', e.target.value)} />
            </FormField>
            <FormField label="Status">
              {statusLocked ? (
                <input value={`${editing.status} (managed by allotment)`} disabled />
              ) : (
                <select value={form.status} onChange={(e) => updateField('status', e.target.value)}>
                  {MANUAL_QUARTER_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              )}
            </FormField>
          </div>

          {formError && <p className="form-error">{formError}</p>}
          <div className="button-row">
            <button type="submit" className="btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save quarter'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {offerDone && (
        <p className="form-success">
          {offerDone} <Link to="/allotments">View allotments</Link>
        </p>
      )}

      {offerFor && (
        <div className="card">
          <h2>
            Offer quarter {offerFor.quarter_number} (Type {offerFor.quarter_type}, {offerFor.station})
          </h2>
          {!suggestion && !offerError && <p className="muted">Checking the waiting list...</p>}
          {suggestion && suggestion.applicant && (
            <dl className="details">
              <dt>Rank 1 applicant</dt>
              <dd>
                {suggestion.applicant.name} ({suggestion.applicant.employee_id})
              </dd>
              <dt>Registered on</dt>
              <dd>{formatDate(suggestion.applicant.waiting_since)}</dd>
              <dt>Application</dt>
              <dd>
                <Link to={`/applications/${suggestion.applicant.application_id}`}>{suggestion.applicant.reference_no}</Link>{' '}
                <StatusBadge status={suggestion.applicant.application_status} />
              </dd>
            </dl>
          )}
          {suggestion && !suggestion.can_offer && <p className="form-error">{suggestion.reason}</p>}
          {offerError && <p className="form-error">{offerError}</p>}
          <div className="button-row">
            {suggestion && suggestion.can_offer && (
              <button type="button" className="btn" disabled={offerBusy} onClick={confirmOffer}>
                {offerBusy ? 'Offering...' : `Offer to ${suggestion.applicant.name}`}
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={cancelOffer}>
              Close
            </button>
          </div>
        </div>
      )}

      <form className="toolbar" onSubmit={applyFilters}>
        <FormField label="Type">
          <select
            value={draftFilters.type}
            onChange={(e) => setDraftFilters({ ...draftFilters, type: e.target.value })}
          >
            <option value="">All</option>
            {QUARTER_TYPES.map((type) => (
              <option key={type} value={type}>
                Type {type}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Station">
          <input
            value={draftFilters.station}
            onChange={(e) => setDraftFilters({ ...draftFilters, station: e.target.value })}
            placeholder="Exact station name"
          />
        </FormField>
        <FormField label="Status">
          <select
            value={draftFilters.status}
            onChange={(e) => setDraftFilters({ ...draftFilters, status: e.target.value })}
          >
            <option value="">All</option>
            {QUARTER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </FormField>
        <button type="submit" className="btn">
          Apply
        </button>
        <button type="button" className="btn btn-secondary" onClick={resetFilters}>
          Reset
        </button>
      </form>

      {error && <p className="form-error">{error}</p>}
      {loading ? (
        <p className="muted">Loading...</p>
      ) : quarters.length === 0 ? (
        <p className="muted">No quarters found.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Number</th>
              <th>Type</th>
              <th>Colony</th>
              <th>Station</th>
              <th>Division</th>
              <th>Block / Floor</th>
              <th>Status</th>
              <th>Occupant</th>
              {(canManage || canOffer) && <th />}
            </tr>
          </thead>
          <tbody>
            {quarters.map((quarter) => (
              <tr key={quarter.id}>
                <td>{quarter.quarter_number}</td>
                <td>{quarter.quarter_type}</td>
                <td>{quarter.colony_name}</td>
                <td>{quarter.station}</td>
                <td>{quarter.division || '-'}</td>
                <td>
                  {quarter.block || '-'} / {quarter.floor || '-'}
                </td>
                <td>
                  <StatusBadge status={quarter.status} />
                </td>
                <td>{quarter.current_occupant ? quarter.current_occupant.employee_id : '-'}</td>
                {(canManage || canOffer) && (
                  <td className="actions">
                    {canManage && (
                      <button type="button" className="btn-link" onClick={() => startEdit(quarter)}>
                        Edit
                      </button>
                    )}
                    {canOffer && quarter.status === 'vacant' && (
                      <button type="button" className="btn-link" onClick={() => startOffer(quarter)}>
                        Offer
                      </button>
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

export default Quarters;
