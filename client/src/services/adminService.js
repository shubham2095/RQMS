import api from './axios';

export async function listUsers() {
  const res = await api.get('/admin/users');
  return res.data.users;
}

export async function listRoles() {
  const res = await api.get('/admin/roles');
  return res.data.roles;
}

export async function createUser(data) {
  const res = await api.post('/admin/users', data);
  return res.data.user;
}

export async function updateUser(id, data) {
  const res = await api.put(`/admin/users/${id}`, data);
  return res.data.user;
}
