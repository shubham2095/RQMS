import api from './axios';

// identifier = email ya employee id
export async function loginRequest(identifier, password) {
  const res = await api.post('/auth/login', { identifier, password });
  return res.data; // { token, user }
}

export async function fetchMe() {
  const res = await api.get('/auth/me');
  return res.data.user;
}

export async function logoutRequest() {
  await api.post('/auth/logout');
}
