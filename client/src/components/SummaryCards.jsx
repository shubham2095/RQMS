import StatCard from './StatCard';

// Dashboard aur Reports dono par wahi key numbers. summary = GET /api/reports/summary.
function SummaryCards({ summary }) {
  const { quarters, applications, waiting_list: waiting, allotments, vacations, retirements } = summary;
  const pendingApplications =
    applications.by_status.submitted +
    applications.by_status.verified +
    applications.by_status.waitlisted +
    applications.by_status.approved;
  const overstaying = retirements.by_status.overstaying;
  const expiring = retirements.by_status.expiring;

  return (
    <div className="stat-grid">
      <StatCard label="Total quarters" value={quarters.total} to="/quarters" />
      <StatCard label="Vacant" value={quarters.by_status.vacant} to="/quarters" tone="good" />
      <StatCard label="Occupied" value={quarters.by_status.occupied} />
      <StatCard label="Allotted (not yet occupied)" value={quarters.by_status.allotted} />
      <StatCard label="Active allotments" value={allotments.active} to="/allotments" />
      <StatCard label="Pending applications" value={pendingApplications} to="/applications" />
      <StatCard label="On waiting list" value={waiting.total} to="/waiting-list" />
      <StatCard label="Vacations in clearance" value={vacations.by_status.in_clearance} to="/vacations" />
      <StatCard label="Retention expiring" value={expiring} to="/retirements" tone={expiring > 0 ? 'warn' : undefined} />
      <StatCard label="Overstaying" value={overstaying} to="/retirements" tone={overstaying > 0 ? 'danger' : undefined} />
      <StatCard label="Open penalty (₹)" value={retirements.open_penalty_total} tone={overstaying > 0 ? 'danger' : undefined} />
    </div>
  );
}

export default SummaryCards;
