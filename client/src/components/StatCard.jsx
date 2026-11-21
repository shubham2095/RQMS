import { Link } from 'react-router-dom';

// Number card. `to` ho to click karke us page par; tone: 'warn' (peela) / 'danger' (laal) / default.
function StatCard({ label, value, to, tone }) {
  const body = (
    <>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </>
  );
  const className = `stat-card${tone ? ` stat-${tone}` : ''}`;

  return to ? (
    <Link to={to} className={`${className} stat-link`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

export default StatCard;
