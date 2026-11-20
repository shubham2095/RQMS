// '2026-11-20' ya ISO datetime -> '20 Nov 2026'. Khali value par '-'.
function formatDate(value) {
  if (!value) return '-';
  // Sirf date ('YYYY-MM-DD') ko local midnight maano, warna timezone ki wajah se din badal sakta hai
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default formatDate;
