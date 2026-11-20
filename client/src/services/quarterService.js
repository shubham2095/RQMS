import api from './axios';

// filters: { type, station, status } — khali values bhejte nahi.
export async function listQuarters(filters = {}) {
  const params = {};
  Object.keys(filters).forEach((key) => {
    if (filters[key]) params[key] = filters[key];
  });
  const res = await api.get('/quarters', { params });
  return res.data.quarters;
}

export async function createQuarter(data) {
  const res = await api.post('/quarters', data);
  return res.data.quarter;
}

export async function updateQuarter(id, data) {
  const res = await api.put(`/quarters/${id}`, data);
  return res.data.quarter;
}
