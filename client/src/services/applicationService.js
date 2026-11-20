import api from './axios';

// fields: { preferred_quarter_type, preferred_colony, station, family_size, medical_ground, special_grounds }
// files: File[] (input name "documents")
export async function applyForQuarter(fields, files = []) {
  const formData = new FormData();
  Object.keys(fields).forEach((key) => {
    if (fields[key] !== '' && fields[key] !== null && fields[key] !== undefined) {
      formData.append(key, String(fields[key]));
    }
  });
  files.forEach((file) => formData.append('documents', file));

  const res = await api.post('/applications', formData);
  return res.data.application;
}

export async function listApplications(filters = {}) {
  const params = {};
  if (filters.status) params.status = filters.status;
  const res = await api.get('/applications', { params });
  return res.data.applications;
}

export async function getApplication(id) {
  const res = await api.get(`/applications/${id}`);
  return res.data.application;
}

export async function verifyApplication(id) {
  const res = await api.post(`/applications/${id}/verify`);
  return res.data.application;
}

export async function runEngine(id) {
  const res = await api.post(`/applications/${id}/run-engine`);
  return res.data.application;
}

// decision: 'approve' | 'reject' (reject par remarks zaroori)
export async function decideApplication(id, decision, remarks) {
  const res = await api.post(`/applications/${id}/decide`, { decision, remarks });
  return res.data.application;
}
