import { useEffect, useState } from 'react';
import FormField from '../components/FormField';
import {
  addFamilyMember,
  getProfile,
  removeFamilyMember,
  saveProfile,
} from '../services/profileService';
import { CATEGORIES, FAMILY_RELATIONS, SERVICE_TYPES } from '../utils/constants';
import getErrorMessage from '../utils/getErrorMessage';

const emptyProfile = {
  employee_id: '',
  designation: '',
  department: '',
  station: '',
  division: '',
  railway_zone: '',
  category: 'GENERAL',
  service_type: 'non_essential',
  grade_pay: '',
  is_gazetted: false,
  pay_level: '',
  date_of_joining: '',
  retirement_date: '',
};

const emptyFamily = { name: '', relation: 'Spouse', date_of_birth: '', is_dependent: true };

// API (null values) -> form (empty strings)
function profileToForm(profile) {
  const form = { ...emptyProfile };
  Object.keys(emptyProfile).forEach((key) => {
    if (profile[key] !== null && profile[key] !== undefined) form[key] = profile[key];
  });
  return form;
}

function MyProfile() {
  const [profile, setProfile] = useState(null); // saved profile (family ke saath) ya null
  const [form, setForm] = useState(emptyProfile);
  const [familyForm, setFamilyForm] = useState(emptyFamily);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'error' | 'success', text }
  const [familyMessage, setFamilyMessage] = useState(null);

  useEffect(() => {
    getProfile()
      .then((data) => {
        if (data) {
          setProfile(data);
          setForm(profileToForm(data));
        }
      })
      .catch((err) => setMessage({ type: 'error', text: getErrorMessage(err) }))
      .finally(() => setLoading(false));
  }, []);

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function updateFamilyField(name, value) {
    setFamilyForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSave(event) {
    event.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      const payload = { ...form, grade_pay: form.grade_pay === '' ? null : Number(form.grade_pay) };
      const saved = await saveProfile(payload);
      setProfile(saved);
      setForm(profileToForm(saved));
      setMessage({ type: 'success', text: 'Profile saved.' });
    } catch (err) {
      setMessage({ type: 'error', text: getErrorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  async function handleAddFamily(event) {
    event.preventDefault();
    setFamilyMessage(null);
    try {
      await addFamilyMember(familyForm);
      setProfile(await getProfile());
      setFamilyForm(emptyFamily);
    } catch (err) {
      setFamilyMessage({ type: 'error', text: getErrorMessage(err) });
    }
  }

  async function handleRemoveFamily(member) {
    if (!window.confirm(`Remove ${member.name} from your family list?`)) return;
    setFamilyMessage(null);
    try {
      await removeFamilyMember(member.id);
      setProfile(await getProfile());
    } catch (err) {
      setFamilyMessage({ type: 'error', text: getErrorMessage(err) });
    }
  }

  if (loading) return <p className="muted">Loading...</p>;

  const familyMembers = profile ? profile.family_members : [];

  return (
    <div>
      <h1>My Profile</h1>
      {!profile && (
        <p className="muted">Fill in your service details and save. You can then add family members.</p>
      )}

      <form className="card" onSubmit={handleSave}>
        <h2>Service details</h2>
        <div className="form-grid">
          <FormField label="Employee ID *">
            <input
              value={form.employee_id}
              onChange={(e) => updateField('employee_id', e.target.value)}
              required
            />
          </FormField>
          <FormField label="Designation (needed for eligibility)">
            <input value={form.designation} onChange={(e) => updateField('designation', e.target.value)} />
          </FormField>
          <FormField label="Department">
            <input value={form.department} onChange={(e) => updateField('department', e.target.value)} />
          </FormField>
          <FormField label="Station (posting)">
            <input value={form.station} onChange={(e) => updateField('station', e.target.value)} />
          </FormField>
          <FormField label="Division">
            <input value={form.division} onChange={(e) => updateField('division', e.target.value)} />
          </FormField>
          <FormField label="Railway zone">
            <input value={form.railway_zone} onChange={(e) => updateField('railway_zone', e.target.value)} />
          </FormField>
          <FormField label="Category">
            <select value={form.category} onChange={(e) => updateField('category', e.target.value)}>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Service type">
            <select value={form.service_type} onChange={(e) => updateField('service_type', e.target.value)}>
              {SERVICE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Grade pay *">
            <input
              type="number"
              min="1"
              value={form.grade_pay}
              onChange={(e) => updateField('grade_pay', e.target.value)}
              required
            />
          </FormField>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.is_gazetted}
              onChange={(e) => updateField('is_gazetted', e.target.checked)}
            />
            Gazetted officer
          </label>
          <FormField label="Pay level">
            <input value={form.pay_level} onChange={(e) => updateField('pay_level', e.target.value)} />
          </FormField>
          <FormField label="Date of joining">
            <input
              type="date"
              value={form.date_of_joining}
              onChange={(e) => updateField('date_of_joining', e.target.value)}
            />
          </FormField>
          <FormField label="Retirement date">
            <input
              type="date"
              value={form.retirement_date}
              onChange={(e) => updateField('retirement_date', e.target.value)}
            />
          </FormField>
        </div>

        <p className="muted">
          Entitled quarter type (from grade pay{profile ? ' as last saved' : ''}):{' '}
          {profile && profile.entitlement ? (
            <strong>
              {profile.entitlement.label} (you can apply for{' '}
              {profile.entitlement.allowed_types.map((type) => `Type ${type}`).join(', ')})
            </strong>
          ) : (
            'save your grade pay to see it'
          )}
        </p>

        {message && (
          <p className={message.type === 'error' ? 'form-error' : 'form-success'}>{message.text}</p>
        )}
        <button type="submit" className="btn" disabled={saving}>
          {saving ? 'Saving...' : 'Save profile'}
        </button>
      </form>

      <div className="card">
        <h2>Family members</h2>
        {!profile ? (
          <p className="muted">Save your profile first to add family members.</p>
        ) : (
          <>
            {familyMembers.length === 0 ? (
              <p className="muted">No family members added yet.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Relation</th>
                    <th>Date of birth</th>
                    <th>Dependent</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {familyMembers.map((member) => (
                    <tr key={member.id}>
                      <td>{member.name}</td>
                      <td>{member.relation}</td>
                      <td>{member.date_of_birth || '-'}</td>
                      <td>{member.is_dependent ? 'Yes' : 'No'}</td>
                      <td>
                        <button type="button" className="btn-link" onClick={() => handleRemoveFamily(member)}>
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <form onSubmit={handleAddFamily} className="inline-form">
              <h3>Add family member</h3>
              <div className="form-grid">
                <FormField label="Name *">
                  <input
                    value={familyForm.name}
                    onChange={(e) => updateFamilyField('name', e.target.value)}
                    required
                  />
                </FormField>
                <FormField label="Relation *">
                  <select
                    value={familyForm.relation}
                    onChange={(e) => updateFamilyField('relation', e.target.value)}
                  >
                    {FAMILY_RELATIONS.map((relation) => (
                      <option key={relation} value={relation}>
                        {relation}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Date of birth">
                  <input
                    type="date"
                    value={familyForm.date_of_birth}
                    onChange={(e) => updateFamilyField('date_of_birth', e.target.value)}
                  />
                </FormField>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={familyForm.is_dependent}
                    onChange={(e) => updateFamilyField('is_dependent', e.target.checked)}
                  />
                  Dependent
                </label>
              </div>
              {familyMessage && <p className="form-error">{familyMessage.text}</p>}
              <button type="submit" className="btn">
                Add member
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default MyProfile;
