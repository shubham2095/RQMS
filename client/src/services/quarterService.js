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

// Vacant quarter ke liye queue ka top applicant + offer ho sakta hai ya nahi (aur wajah)
export async function getOfferSuggestion(id) {
  const res = await api.get(`/quarters/${id}/offer-suggestion`);
  return res.data.suggestion;
}

// Queue ke rank-1 (approved) applicant ko quarter offer karo
export async function offerQuarter(id) {
  const res = await api.post(`/quarters/${id}/offer`);
  return res.data.allotment;
}
