import api from './axios';

// filters: { action, user_id, from, to, page, page_size } — khali values bhejte nahi
export async function listAuditLogs(filters = {}) {
  const params = {};
  Object.keys(filters).forEach((key) => {
    if (filters[key] !== '' && filters[key] !== null && filters[key] !== undefined) params[key] = filters[key];
  });
  const res = await api.get('/audit', { params });
  return res.data; // { logs, page, page_size, total }
}
