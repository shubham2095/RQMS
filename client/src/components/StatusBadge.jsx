// status ko coloured badge mein dikhata hai (css: .badge-<status> in index.css)
function StatusBadge({ status }) {
  return <span className={`badge badge-${status}`}>{String(status).replace(/_/g, ' ')}</span>;
}

export default StatusBadge;
