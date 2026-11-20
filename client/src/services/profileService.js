import api from './axios';

// Profile abhi nahi bana to null milta hai.
export async function getProfile() {
  const res = await api.get('/profile');
  return res.data.profile;
}

export async function saveProfile(data) {
  const res = await api.put('/profile', data);
  return res.data.profile;
}

export async function addFamilyMember(data) {
  const res = await api.post('/profile/family', data);
  return res.data.member;
}

export async function removeFamilyMember(id) {
  await api.delete(`/profile/family/${id}`);
}
