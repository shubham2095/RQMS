import api from './axios';

// data: { trigger, requested_vacation_date: 'YYYY-MM-DD', reason }
export async function initiateVacation(data) {
  const res = await api.post('/vacations', data);
  return res.data.request;
}

// filters: { status, step, waiting_for_me }
export async function listVacations(filters = {}) {
  const params = {};
  if (filters.status) params.status = filters.status;
  if (filters.step) params.step = filters.step;
  if (filters.waiting_for_me) params.waiting_for_me = 'true';
  const res = await api.get('/vacations', { params });
  return res.data.requests;
}

export async function getVacation(id) {
  const res = await api.get(`/vacations/${id}`);
  return res.data.request;
}

// payload: { decision: 'approve'|'reject', remarks, has_damage?, meter_reading?, dues_amount? }
export async function actOnVacation(id, step, payload) {
  const res = await api.post(`/vacations/${id}/act`, { step, ...payload });
  return res.data.request;
}
