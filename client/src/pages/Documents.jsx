import { useEffect, useState } from 'react';
import FormField from '../components/FormField';
import Pager from '../components/Pager';
import useAuth from '../hooks/useAuth';
import { listUsers } from '../services/adminService';
import { getDocumentMeta, listDocuments } from '../services/documentService';
import downloadFile from '../utils/download';
import formatDate from '../utils/formatDate';
import getErrorMessage from '../utils/getErrorMessage';

const PAGE_SIZE = 20;
const emptyFilters = { q: '', category: '', uploaded_by: '', from: '', to: '' };

function formatSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// Uploaded documents: staff ko sab (jis type ke wo staff hain), employee ko sirf apne. Server scope karta hai.
function Documents() {
  const { hasPermission } = useAuth();
  const canFilterByUser = hasPermission('users.manage'); // users list sirf admin dekh sakta hai

  const [draft, setDraft] = useState(emptyFilters);
  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState([]);
  const [result, setResult] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null); // { id, meta }

  useEffect(() => {
    if (!canFilterByUser) return;
    listUsers()
      .then(setUsers)
      .catch(() => setUsers([]));
  }, [canFilterByUser]);

  useEffect(() => {
    let cancelled = false;
    listDocuments({ ...filters, page, page_size: PAGE_SIZE })
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

  async function handleDownload(document) {
    setError('');
    try {
      await downloadFile(`/documents/${document.id}/download`, document.original_name);
    } catch (err) {
      setError(getErrorMessage(err, 'Download failed'));
    }
  }

  async function toggleDetails(document) {
    if (open && open.id === document.id) {
      setOpen(null);
      return;
    }
    try {
      setOpen({ id: document.id, meta: await getDocumentMeta(document.id) });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div>
      <h1>Documents</h1>

      <form className="toolbar" onSubmit={applyFilters}>
        <FormField label="Search file name">
          <input value={draft.q} onChange={(e) => setDraft({ ...draft, q: e.target.value })} placeholder="e.g. proof" />
        </FormField>
        <FormField label="Category">
          <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
            <option value="">All</option>
            <option value="application_attachment">Application attachment</option>
          </select>
        </FormField>
        {canFilterByUser && (
          <FormField label="Uploaded by">
            <select value={draft.uploaded_by} onChange={(e) => setDraft({ ...draft, uploaded_by: e.target.value })}>
              <option value="">All</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </FormField>
        )}
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
      ) : result.items.length === 0 ? (
        <p className="muted">No documents found.</p>
      ) : (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>File</th>
                <th>Application</th>
                <th>Size</th>
                <th>Uploaded by</th>
                <th>Uploaded on</th>
                <th>Hash</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {result.items.map((document) => (
                <tr key={document.id}>
                  <td>
                    {document.original_name}
                    {open && open.id === document.id && (
                      <dl className="details doc-details">
                        <dt>SHA-256</dt>
                        <dd className="mono">{open.meta.hash || 'not computed'}</dd>
                        <dt>Same file elsewhere</dt>
                        <dd>{open.meta.same_hash_count} other document(s)</dd>
                        <dt>Type</dt>
                        <dd>{open.meta.mime}</dd>
                        <dt>Category</dt>
                        <dd>{open.meta.category}</dd>
                      </dl>
                    )}
                  </td>
                  <td>
                    {document.related
                      ? `${document.related.reference_no} (${document.related.employee_name}, ${document.related.employee_id})`
                      : '-'}
                  </td>
                  <td>{formatSize(document.size)}</td>
                  <td>{document.uploader ? document.uploader.name : '-'}</td>
                  <td>{formatDate(document.createdAt)}</td>
                  <td className="mono">{document.hash ? document.hash.slice(0, 12) : '-'}</td>
                  <td className="actions">
                    <button type="button" className="btn-link" onClick={() => handleDownload(document)}>
                      Download
                    </button>
                    <button type="button" className="btn-link" onClick={() => toggleDetails(document)}>
                      {open && open.id === document.id ? 'Hide' : 'Details'}
                    </button>
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

export default Documents;
