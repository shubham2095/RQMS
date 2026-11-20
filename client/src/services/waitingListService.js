import api from './axios';

// filters: { type, station }
export async function getWaitingList(filters = {}) {
  const params = {};
  if (filters.type) params.type = filters.type;
  if (filters.station) params.station = filters.station;
  const res = await api.get('/waiting-list', { params });
  return res.data.entries;
}
