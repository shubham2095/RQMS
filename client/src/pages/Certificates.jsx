import { useEffect, useState } from 'react';
import FormField from '../components/FormField';
import Pager from '../components/Pager';
import { getCertificateMeta, listCertificates } from '../services/documentService';
import { CERTIFICATE_LABELS } from '../utils/constants';
import downloadFile from '../utils/download';
import formatDate from '../utils/formatDate';
import getErrorMessage from '../utils/getErrorMessage';

const PAGE_SIZE = 20;
const emptyFilters = { type: '', certifiable_type: '', q: '', from: '', to: '' };
const SOURCE_LABELS = { Allotment: 'Allotment', VacationRequest: 'Vacation' };

// Issued certificates: staff ko apne types ke sab, employee ko sirf apne. Server scope karta hai.
function Certificates() {
  const [draft, setDraft] = useState(emptyFilters);
  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null); // { id, meta }

  useEffect(() => {
    let cancelled = false;
    listCertificates({ ...filters, page, page_size: PAGE_SIZE })
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

  async function handleDownload(certificate) {
    setError('');
    try {
      await downloadFile(`/certificates/${certificate.id}/download`, `${certificate.number}.pdf`);
    } catch (err) {
      setError(getErrorMessage(err, 'Download failed'));
    }
  }

  async function toggleDetails(certificate) {
    if (open && open.id === certificate.id) {
      setOpen(null);
      return;
    }
    try {
      setOpen({ id: certificate.id, meta: await getCertificateMeta(certificate.id) });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div>
      <h1>Certificates</h1>

      <form className="toolbar" onSubmit={applyFilters}>
        <FormField label="Type">
          <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
            <option value="">All</option>
            {Object.keys(CERTIFICATE_LABELS).map((type) => (
              <option key={type} value={type}>
                {CERTIFICATE_LABELS[type]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Issued for">
          <select value={draft.certifiable_type} onChange={(e) => setDraft({ ...draft, certifiable_type: e.target.value })}>
            <option value="">All</option>
            {Object.keys(SOURCE_LABELS).map((type) => (
              <option key={type} value={type}>
                {SOURCE_LABELS[type]}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Search number">
          <input value={draft.q} onChange={(e) => setDraft({ ...draft, q: e.target.value })} placeholder="e.g. NOC-2026" />
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
      ) : result.items.length === 0 ? (
        <p className="muted">No certificates found.</p>
      ) : (
        <>
          <table className="table">
            <thead>
              <tr>
                <th>Certificate</th>
                <th>Number</th>
                <th>For</th>
                <th>Holder</th>
                <th>Issued by</th>
                <th>Issued on</th>
                <th>Signed</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {result.items.map((certificate) => (
                <tr key={certificate.id}>
                  <td>
                    {CERTIFICATE_LABELS[certificate.type] || certificate.type}
                    {open && open.id === certificate.id && (
                      <dl className="details doc-details">
                        {Object.keys(open.meta.payload || {}).map((key) => (
                          <div className="detail-row" key={key}>
                            <dt>{key.replace(/_/g, ' ')}</dt>
                            <dd>{String(open.meta.payload[key])}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </td>
                  <td className="mono">{certificate.number}</td>
                  <td>
                    {certificate.related
                      ? `${SOURCE_LABELS[certificate.certifiable_type]} ${certificate.related.label}${certificate.related.quarter_number ? `, quarter ${certificate.related.quarter_number}` : ''}`
                      : '-'}
                  </td>
                  <td>
                    {certificate.related ? `${certificate.related.employee_name} (${certificate.related.employee_id})` : '-'}
                  </td>
                  <td>{certificate.issuer ? certificate.issuer.name : '-'}</td>
                  <td>{formatDate(certificate.issued_at)}</td>
                  <td>{certificate.is_signed ? 'Yes' : 'No'}</td>
                  <td className="actions">
                    <button type="button" className="btn-link" onClick={() => handleDownload(certificate)}>
                      Download
                    </button>
                    <button type="button" className="btn-link" onClick={() => toggleDetails(certificate)}>
                      {open && open.id === certificate.id ? 'Hide' : 'Details'}
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

export default Certificates;
