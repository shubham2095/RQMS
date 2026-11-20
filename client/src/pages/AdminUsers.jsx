import { useEffect, useState } from 'react';
import FormField from '../components/FormField';
import useAuth from '../hooks/useAuth';
import { createUser, listRoles, listUsers, updateUser } from '../services/adminService';
import getErrorMessage from '../utils/getErrorMessage';

const emptyForm = { name: '', email: '', password: '', role_slugs: [], is_active: true };

function userToForm(user) {
  return {
    name: user.name,
    email: user.email,
    password: '', // khali = purana password rahega
    role_slugs: user.roles.map((role) => role.slug),
    is_active: user.is_active,
  };
}

function isSuperAdminUser(user) {
  return user.roles.some((role) => role.slug === 'super_admin');
}

function AdminUsers() {
  const { user: currentUser, hasRole } = useAuth();
  const actorIsSuperAdmin = hasRole('super_admin');

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [reloadCount, setReloadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editing, setEditing] = useState(null); // null | 'new' | user
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listUsers(), listRoles()])
      .then(([userList, roleList]) => {
        if (cancelled) return;
        setUsers(userList);
        setRoles(roleList);
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

  function startCreate() {
    setEditing('new');
    setForm(emptyForm);
    setFormError('');
  }

  function startEdit(user) {
    setEditing(user);
    setForm(userToForm(user));
    setFormError('');
  }

  function cancelEdit() {
    setEditing(null);
    setFormError('');
  }

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function toggleRole(slug) {
    setForm((prev) => {
      const has = prev.role_slugs.includes(slug);
      const role_slugs = has ? prev.role_slugs.filter((s) => s !== slug) : [...prev.role_slugs, slug];
      return { ...prev, role_slugs };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      if (editing === 'new') {
        await createUser(form);
      } else {
        const payload = { ...form };
        if (!payload.password) delete payload.password;
        await updateUser(editing.id, payload);
      }
      setEditing(null);
      setReloadCount((count) => count + 1);
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(user) {
    setError('');
    try {
      await updateUser(user.id, { is_active: !user.is_active });
      setReloadCount((count) => count + 1);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // super_admin role sirf super admin de sakta hai (server bhi yehi check karta hai)
  const assignableRoles = roles.filter((role) => role.slug !== 'super_admin' || actorIsSuperAdmin);

  return (
    <div>
      <div className="page-header">
        <h1>Users</h1>
        {!editing && (
          <button type="button" className="btn" onClick={startCreate}>
            Add user
          </button>
        )}
      </div>

      {editing && (
        <form className="card" onSubmit={handleSubmit}>
          <h2>{editing === 'new' ? 'Add user' : `Edit ${editing.name}`}</h2>
          <div className="form-grid">
            <FormField label="Name *">
              <input value={form.name} onChange={(e) => updateField('name', e.target.value)} required />
            </FormField>
            <FormField label="Email *">
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                required
              />
            </FormField>
            <FormField label={editing === 'new' ? 'Password * (min 8 characters)' : 'New password (leave blank to keep)'}>
              <input
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                required={editing === 'new'}
                minLength={8}
              />
            </FormField>
          </div>

          <fieldset className="role-box">
            <legend>Roles *</legend>
            {assignableRoles.map((role) => (
              <label key={role.slug} className="checkbox">
                <input
                  type="checkbox"
                  checked={form.role_slugs.includes(role.slug)}
                  onChange={() => toggleRole(role.slug)}
                />
                {role.name}
              </label>
            ))}
          </fieldset>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => updateField('is_active', e.target.checked)}
            />
            Active (can log in)
          </label>

          {formError && <p className="form-error">{formError}</p>}
          <div className="button-row">
            <button type="submit" className="btn" disabled={saving}>
              {saving ? 'Saving...' : 'Save user'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && <p className="form-error">{error}</p>}
      {loading ? (
        <p className="muted">Loading...</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Employee ID</th>
              <th>Roles</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const locked = isSuperAdminUser(user) && !actorIsSuperAdmin;
              const isSelf = user.id === currentUser.id;
              return (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.employee_id || '-'}</td>
                  <td>{user.roles.map((role) => role.name).join(', ')}</td>
                  <td>
                    <span className={`badge ${user.is_active ? 'badge-vacant' : 'badge-under_maintenance'}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="actions">
                    {!locked && (
                      <button type="button" className="btn-link" onClick={() => startEdit(user)}>
                        Edit
                      </button>
                    )}
                    {!locked && !isSelf && (
                      <button type="button" className="btn-link" onClick={() => handleToggleActive(user)}>
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default AdminUsers;
