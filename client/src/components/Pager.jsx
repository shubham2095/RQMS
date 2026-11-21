// Previous / Next + "Page x of y (n entries)". Audit, Documents, Certificates teeno use karte hain.
function Pager({ page, pageSize, total, onChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="pager">
      <button type="button" className="btn btn-secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Previous
      </button>
      <span className="muted">
        Page {page} of {totalPages} ({total} entries)
      </span>
      <button type="button" className="btn btn-secondary" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Next
      </button>
    </div>
  );
}

export default Pager;
