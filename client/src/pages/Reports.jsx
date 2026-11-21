import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import FormField from '../components/FormField';
import SummaryCards from '../components/SummaryCards';
import { getOverstaying, getSummary, getVacantQuarters } from '../services/reportService';
import { CLEARANCE_STEP_LABELS, QUARTER_TYPES } from '../utils/constants';
import formatDate from '../utils/formatDate';
import getErrorMessage from '../utils/getErrorMessage';

function humanize(key) {
  return key.replace(/_/g, ' ');
}

// { status: count } ko 2-column table mein dikhao
function CountTable({ title, counts, labels = {} }) {
  const keys = Object.keys(counts);
  const total = keys.reduce((sum, key) => sum + counts[key], 0);
  return (
    <div className="card">
      <h2>{title}</h2>
      <table className="table">
        <tbody>
          {keys.map((key) => (
            <tr key={key}>
              <td>{labels[key] || humanize(key)}</td>
              <td className="points">{counts[key]}</td>
            </tr>
          ))}
          <tr>
            <td>
              <strong>Total</strong>
            </td>
            <td className="points">
              <strong>{total}</strong>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function QuarterMatrix({ quarters }) {
  const statuses = Object.keys(quarters.by_status);
  return (
    <div className="card">
      <h2>Quarters by type and status</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Type</th>
            {statuses.map((status) => (
              <th key={status}>{humanize(status)}</th>
            ))}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {QUARTER_TYPES.map((type) => (
            <tr key={type}>
              <td>Type {type}</td>
              {statuses.map((status) => (
                <td key={status}>{quarters.by_type_status[type][status]}</td>
              ))}
              <td>
                <strong>{quarters.by_type[type]}</strong>
              </td>
            </tr>
          ))}
          <tr>
            <td>
              <strong>All</strong>
            </td>
            {statuses.map((status) => (
              <td key={status}>
                <strong>{quarters.by_status[status]}</strong>
              </td>
            ))}
            <td>
              <strong>{quarters.total}</strong>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function StationTable({ quarters }) {
  const stations = Object.keys(quarters.by_station).sort();
  return (
    <div className="card">
      <h2>Quarters by station</h2>
      {stations.length === 0 ? (
        <p className="muted">No quarters yet.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Station</th>
              <th>Total</th>
              <th>Vacant</th>
              <th>Allotted</th>
              <th>Occupied</th>
              <th>Vacation pending</th>
              <th>Other</th>
            </tr>
          </thead>
          <tbody>
            {stations.map((station) => {
              const row = quarters.by_station[station];
              const other = row.total - row.vacant - row.allotted - row.occupied - row.vacation_pending;
              return (
                <tr key={station}>
                  <td>{station}</td>
                  <td>
                    <strong>{row.total}</strong>
                  </td>
                  <td>{row.vacant}</td>
                  <td>{row.allotted}</td>
                  <td>{row.occupied}</td>
                  <td>{row.vacation_pending}</td>
                  <td>{other}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function WaitingTable({ waiting }) {
  return (
    <div className="card">
      <h2>
        Waiting list <span className="muted small">({waiting.total} waiting)</span>
      </h2>
      {waiting.by_queue.length === 0 ? (
        <p className="muted">Nobody is waiting.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Quarter type</th>
              <th>Station</th>
              <th>Waiting</th>
              <th>Oldest registration</th>
            </tr>
          </thead>
          <tbody>
            {waiting.by_queue.map((row) => (
              <tr key={`${row.quarter_type}|${row.station}`}>
                <td>Type {row.quarter_type}</td>
                <td>{row.station}</td>
                <td>{row.count}</td>
                <td>{formatDate(row.oldest_waiting_since)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="muted small">
        <Link to="/waiting-list">Open the full waiting list</Link>
      </p>
    </div>
  );
}

// reports.view: summary cards + tables + do drill-downs (vacant quarters, overstaying retirees).
function Reports() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [vacantFilters, setVacantFilters] = useState({ type: '', station: '' });
  const [appliedVacant, setAppliedVacant] = useState({ type: '', station: '' });
  const [vacant, setVacant] = useState(null);
  const [overstaying, setOverstaying] = useState(null);

  useEffect(() => {
    getSummary()
      .then(setSummary)
      .catch((err) => setError(getErrorMessage(err)));
    getOverstaying()
      .then(setOverstaying)
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  useEffect(() => {
    getVacantQuarters(appliedVacant)
      .then(setVacant)
      .catch((err) => setError(getErrorMessage(err)));
  }, [appliedVacant]);

  function applyVacantFilters(event) {
    event.preventDefault();
    setAppliedVacant(vacantFilters);
  }

  if (!summary) return error ? <p className="form-error">{error}</p> : <p className="muted">Loading...</p>;

  return (
    <div>
      <h1>Reports</h1>
      <p className="muted small">As of {new Date(summary.generated_at).toLocaleString('en-GB')}</p>
      {error && <p className="form-error">{error}</p>}

      <SummaryCards summary={summary} />

      <QuarterMatrix quarters={summary.quarters} />
      <StationTable quarters={summary.quarters} />
      <WaitingTable waiting={summary.waiting_list} />

      <div className="report-grid">
        <CountTable title="Applications by status" counts={summary.applications.by_status} />
        <CountTable title="Allotments by status" counts={summary.allotments.by_status} />
        <CountTable title="Vacation requests by status" counts={summary.vacations.by_status} />
        <CountTable
          title="Vacations in clearance, by step"
          counts={summary.vacations.in_clearance_by_step}
          labels={CLEARANCE_STEP_LABELS}
        />
        <CountTable title="Retirements by status" counts={summary.retirements.by_status} />
      </div>

      <div className="card">
        <h2>Vacant quarters {vacant && <span className="muted small">({vacant.total})</span>}</h2>
        <form className="toolbar" onSubmit={applyVacantFilters}>
          <FormField label="Type">
            <select value={vacantFilters.type} onChange={(e) => setVacantFilters({ ...vacantFilters, type: e.target.value })}>
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
              value={vacantFilters.station}
              onChange={(e) => setVacantFilters({ ...vacantFilters, station: e.target.value })}
              placeholder="Exact station name"
            />
          </FormField>
          <button type="submit" className="btn">
            Apply
          </button>
        </form>
        {!vacant ? (
          <p className="muted">Loading...</p>
        ) : vacant.items.length === 0 ? (
          <p className="muted">No vacant quarters match.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Quarter</th>
                <th>Type</th>
                <th>Colony</th>
                <th>Station</th>
                <th>Block / floor</th>
              </tr>
            </thead>
            <tbody>
              {vacant.items.map((quarter) => (
                <tr key={quarter.id}>
                  <td>{quarter.quarter_number}</td>
                  <td>{quarter.quarter_type}</td>
                  <td>{quarter.colony_name}</td>
                  <td>{quarter.station}</td>
                  <td>
                    {quarter.block || '-'} / {quarter.floor || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {vacant && vacant.total > vacant.items.length && (
          <p className="muted small">Showing the first {vacant.limit} of {vacant.total}. Narrow the filters.</p>
        )}
      </div>

      <div className="card">
        <h2>Overstaying retirees {overstaying && <span className="muted small">({overstaying.total})</span>}</h2>
        {!overstaying ? (
          <p className="muted">Loading...</p>
        ) : overstaying.items.length === 0 ? (
          <p className="muted">Nobody is overstaying.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Retired on</th>
                <th>Retention ended</th>
                <th>Overstay days</th>
                <th>Penalty (₹)</th>
              </tr>
            </thead>
            <tbody>
              {overstaying.items.map((record) => (
                <tr key={record.id}>
                  <td>
                    {record.employee.user.name} ({record.employee.employee_id})
                  </td>
                  <td>{formatDate(record.retirement_date)}</td>
                  <td>{formatDate(record.retention_expiry_date)}</td>
                  <td>{record.overstay_days}</td>
                  <td>{record.penalty_amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Reports;
