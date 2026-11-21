import api from './axios';

export async function listNotifications(filters = {}) {
  const params = {};
  if (filters.unread_only) params.unread_only = 'true';
  const res = await api.get('/notifications', { params });
  return res.data; // { notifications, unread_count }
}

export async function markNotificationRead(id) {
  const res = await api.post(`/notifications/${id}/read`);
  return res.data.notification;
}

export async function markAllNotificationsRead() {
  const res = await api.post('/notifications/read-all');
  return res.data.updated;
}
