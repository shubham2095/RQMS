import api from './axios';

export async function getSummary() {
  const res = await api.get('/reports/summary');
  return res.data.summary;
}

export async function getVacantQuarters(filters = {}) {
  const params = {};
  if (filters.type) params.type = filters.type;
  if (filters.station) params.station = filters.station;
  const res = await api.get('/reports/vacant-quarters', { params });
  return res.data; // { items, total, limit }
}

export async function getOverstaying() {
  const res = await api.get('/reports/overstaying');
  return res.data;
}

// Har logged-in user ka "mera kaam" count (employee ko khali {})
export async function getWorkQueue() {
  const res = await api.get('/reports/work-queue');
  return res.data.queue;
}
