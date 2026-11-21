import api from './axios';

export async function listRetirements(filters = {}) {
  const params = {};
  if (filters.status) params.status = filters.status;
  const res = await api.get('/retirements', { params });
  return res.data.retirements;
}

// Manual trigger — deploy par daily cron yahi cycle chalayega (Phase 6)
export async function runRetentionCycle() {
  const res = await api.post('/retirements/run-cycle');
  return res.data.summary;
}
