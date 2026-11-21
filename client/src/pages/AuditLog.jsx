import { useEffect, useState } from 'react';
import FormField from '../components/FormField';
import Pager from '../components/Pager';
import { listUsers } from '../services/adminService';
import { listAuditLogs } from '../services/auditService';
import { AUDIT_ACTIONS } from '../utils/constants';
import getErrorMessage from '../utils/getErrorMessage';

const PAGE_SIZE = 20;
const emptyFilters = { action: '', user_id: '', from: '', to: '' };

function formatTime(value) {
  return new Date(value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'medium' });
}

// Admin / super_admin: kisne kya kiya (login, applications, allotments, vacations, quarters, users...).
function AuditLog() {
  const [draft, setDraft] = useState(emptyFilters); // form mein jo likha
  const [filters, setFilters] = useState(emptyFilters); // jo lagu hai
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState([]);
  const [result, setResult] = useState({ logs: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    listUsers()
      .then(setUsers)
      .catch(() => setUsers([])); // dropdown na bane to bhi page chale
  }, []);

  useEffect(() => {
    let cancelled = false;
    listAuditLogs({ ...filters, page, page_size: PAGE_SIZE })
      .then((data) => {
        if (cancelled) return;
        setResult(data);
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
  }, [filters, page]);

  function applyFilters(event) {
    event.preventDefault();
    setPage(1);
    setFilters(draft);
  }

  function resetFilters() {
    setDraft(emptyFilters);
    setFilters(emptyFilters);
    setPage(1);
  }

  return (
    <div>
      <h1>Audit Log</h1>

      <form className="toolbar" onSubmit={applyFilters}>
        <FormField label="Action">
          <select value={draft.action} onChange={(e) => setDraft({ ...draft, action: e.target.value })}>
            <option value="">All</option>
            {AUDIT_ACTIONS.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="User">
          <select value={draft.user_id} onChange={(e) => setDraft({ ...draft, user_id: e.target.value })}>
            <option value="">All</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="From">
          <input type="date" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
        </FormField>
        <FormField label="To">
          <input type="date" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
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
      ) : result.logs.length === 0 ? (
        <p className="muted">No audit entries found.</p>
      ) : (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Action</th>
                <th>Description</th>
                <th>IP</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {result.logs.map((log) => (
                <tr key={log.id}>
                  <td>{formatTime(log.createdAt)}</td>
                  <td>{log.user ? log.user.name : '-'}</td>
                  <td>
                    <code>{log.action}</code>
                  </td>
                  <td>
                    {log.description}
                    {openId === log.id && log.properties && (
                      <pre className="audit-properties">{JSON.stringify(log.properties, null, 2)}</pre>
                    )}
                  </td>
                  <td>{log.ip_address || '-'}</td>
                  <td>
                    {log.properties && (
                      <button type="button" className="btn-link" onClick={() => setOpenId(openId === log.id ? null : log.id)}>
                        {openId === log.id ? 'Hide' : 'Details'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Pager page={page} pageSize={PAGE_SIZE} total={result.total} onChange={setPage} />
        </>
      )}
    </div>
  );
}

export default AuditLog;
