import api from './axios';

export async function loginRequest(email, password) {
  const res = await api.post('/auth/login', { email, password });
  return res.data; // { token, user }
}

export async function fetchMe() {
  const res = await api.get('/auth/me');
  return res.data.user;
}

export async function logoutRequest() {
  await api.post('/auth/logout');
}
