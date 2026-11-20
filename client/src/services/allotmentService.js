import api from './axios';

export async function listAllotments(filters = {}) {
  const params = {};
  if (filters.status) params.status = filters.status;
  const res = await api.get('/allotments', { params });
  return res.data.allotments;
}

// decision: 'accept' | 'reject'
export async function respondToOffer(id, decision, remarks) {
  const res = await api.post(`/allotments/${id}/respond`, { decision, remarks });
  return res.data.allotment;
}

// possessionDate: 'YYYY-MM-DD' (khali = aaj)
export async function recordPossession(id, possessionDate) {
  const res = await api.post(`/allotments/${id}/possession`, { possession_date: possessionDate || undefined });
  return res.data.allotment;
}
