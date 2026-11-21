import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FormField from '../components/FormField';
import { applyForQuarter } from '../services/applicationService';
import { getProfile } from '../services/profileService';
import { QUARTER_TYPES } from '../utils/constants';
import getErrorMessage from '../utils/getErrorMessage';

const MAX_FILES = 5;
const MAX_FILE_MB = 5;

function ApplyForQuarter() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    preferred_quarter_type: 'I',
    preferred_colony: '',
    station: '',
    family_size: 1,
    medical_ground: false,
    special_grounds: '',
  });
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getProfile()
      .then((data) => {
        setProfile(data);
        // Posting station se prefill (eligibility mein station match zaroori hai);
        // quarter type entitled type se shuru (grade pay se)
        if (data) {
          setForm((prev) => ({
            ...prev,
            station: data.station || prev.station,
            preferred_quarter_type: data.entitlement ? data.entitlement.entitled_type : prev.preferred_quarter_type,
          }));
        }
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleFiles(event) {
    const selected = Array.from(event.target.files);
    if (selected.length > MAX_FILES) {
      setError(`You can attach at most ${MAX_FILES} files.`);
      event.target.value = '';
      setFiles([]);
      return;
    }
    setError('');
    setFiles(selected);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const application = await applyForQuarter(form, files);
      navigate(`/applications/${application.id}`);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="muted">Loading...</p>;

  if (!profile) {
    return (
      <div>
        <h1>Apply for Quarter</h1>
        <p className="form-error">
          Please <Link to="/profile">complete your profile</Link> first. Your grade pay decides which quarter type
          you are entitled to.
        </p>
      </div>
    );
  }

  // Grade pay nahi ya kisi rule mein nahi aata -> entitled type pata nahi, apply nahi ho sakta
  if (!profile.entitlement) {
    return (
      <div>
        <h1>Apply for Quarter</h1>
        <p className="form-error">
          Your entitled quarter type cannot be determined. Please add your grade pay in{' '}
          <Link to="/profile">My Profile</Link>.
        </p>
      </div>
    );
  }

  const entitlement = profile.entitlement;

  return (
    <div>
      <h1>Apply for Quarter</h1>
      <p>
        Your entitled quarter type: <strong>{entitlement.label}</strong> (grade pay {profile.grade_pay}
        {profile.is_gazetted ? ', gazetted' : ''}). You can apply for{' '}
        {entitlement.allowed_types.map((type) => `Type ${type}`).join(', ')}.
      </p>
      <p className="muted">
        Your profile ({profile.employee_id}) details are used for your application. Your place in the waiting list is
        decided by your registration date, i.e. the day you apply. Eligibility is checked after the clerk verifies
        your application.
      </p>

      <form className="card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <FormField label="Quarter type *">
            <select
              value={form.preferred_quarter_type}
              onChange={(e) => updateField('preferred_quarter_type', e.target.value)}
            >
              {QUARTER_TYPES.filter((type) => entitlement.allowed_types.includes(type)).map((type) => (
                <option key={type} value={type}>
                  Type {type}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Station *">
            <input value={form.station} onChange={(e) => updateField('station', e.target.value)} required />
          </FormField>
          <FormField label="Preferred colony">
            <input
              value={form.preferred_colony}
              onChange={(e) => updateField('preferred_colony', e.target.value)}
            />
          </FormField>
          <FormField label="Family size *">
            <input
              type="number"
              min="1"
              max="20"
              value={form.family_size}
              onChange={(e) => updateField('family_size', e.target.value)}
              required
            />
          </FormField>
        </div>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={form.medical_ground}
            onChange={(e) => updateField('medical_ground', e.target.checked)}
          />
          Medical ground (attach supporting documents)
        </label>

        <div className="form-grid">
          <FormField label="Special grounds (optional)">
            <textarea
              rows="3"
              value={form.special_grounds}
              onChange={(e) => updateField('special_grounds', e.target.value)}
            />
          </FormField>
          <FormField label={`Supporting documents (PDF, JPG, PNG; max ${MAX_FILES} files, ${MAX_FILE_MB} MB each)`}>
            <input type="file" name="documents" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={handleFiles} />
          </FormField>
        </div>
        {files.length > 0 && <p className="muted small">{files.map((file) => file.name).join(', ')}</p>}

        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit application'}
        </button>
      </form>
    </div>
  );
}

export default ApplyForQuarter;
