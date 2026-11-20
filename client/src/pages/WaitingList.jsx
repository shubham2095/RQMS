import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import FormField from '../components/FormField';
import StatusBadge from '../components/StatusBadge';
import { getWaitingList } from '../services/waitingListService';
import { QUARTER_TYPES } from '../utils/constants';
import formatDate from '../utils/formatDate';
import getErrorMessage from '../utils/getErrorMessage';

// Entries (type, station, rank order mein) ko queue-wise groups mein todo
function groupByQueue(entries) {
  const groups = [];
  entries.forEach((entry) => {
    const key = `${entry.quarter_type}|${entry.station}`;
    let group = groups.find((item) => item.key === key);
    if (!group) {
      group = { key, quarter_type: entry.quarter_type, station: entry.station, entries: [] };
      groups.push(group);
    }
    group.entries.push(entry);
  });
  return groups;
}

function WaitingList() {
  const [draft, setDraft] = useState({ type: '', station: '' });
  const [filters, setFilters] = useState({ type: '', station: '' });
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getWaitingList(filters)
      .then((data) => {
        if (cancelled) return;
        setEntries(data);
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
  }, [filters]);

  function applyFilters(event) {
    event.preventDefault();
    setFilters(draft);
  }

  function resetFilters() {
    setDraft({ type: '', station: '' });
    setFilters({ type: '', station: '' });
  }

  const groups = groupByQueue(entries);

  return (
    <div>
      <h1>Waiting List</h1>
      <p className="muted">
        One queue per quarter type and station. Ranked by priority score (highest first); equal scores go to the
        earlier applicant.
      </p>

      <form className="toolbar" onSubmit={applyFilters}>
        <FormField label="Type">
          <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
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
            value={draft.station}
            onChange={(e) => setDraft({ ...draft, station: e.target.value })}
            placeholder="Exact station name"
          />
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
      ) : groups.length === 0 ? (
        <p className="muted">Nobody is waiting.</p>
      ) : (
        groups.map((group) => (
          <div className="card" key={group.key}>
            <h2>
              Type {group.quarter_type} — {group.station}{' '}
              <span className="muted small">({group.entries.length} waiting)</span>
            </h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Applicant</th>
                  <th>Category</th>
                  <th>Service</th>
                  <th>Medical</th>
                  <th>Score</th>
                  <th>Waiting since</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {group.entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <strong>{entry.rank}</strong>
                    </td>
                    <td>
                      {entry.application.employee.user.name} ({entry.application.employee.employee_id})
                    </td>
                    <td>{entry.application.category}</td>
                    <td>{entry.application.service_type.replace('_', '-')}</td>
                    <td>{entry.application.medical_ground ? 'Yes' : '-'}</td>
                    <td>{entry.priority_score}</td>
                    <td>{formatDate(entry.waiting_since)}</td>
                    <td>
                      <StatusBadge status={entry.application.status} />
                    </td>
                    <td>
                      <Link to={`/applications/${entry.application.id}`}>{entry.application.reference_no}</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}

export default WaitingList;
