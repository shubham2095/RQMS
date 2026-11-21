import api from './axios';

function cleanParams(filters) {
  const params = {};
  Object.keys(filters).forEach((key) => {
    if (filters[key] !== '' && filters[key] !== null && filters[key] !== undefined) params[key] = filters[key];
  });
  return params;
}

// filters: { documentable_type, category, uploaded_by, from, to, q, page, page_size }
export async function listDocuments(filters = {}) {
  const res = await api.get('/documents', { params: cleanParams(filters) });
  return res.data; // { items, page, page_size, total }
}

export async function getDocumentMeta(id) {
  const res = await api.get(`/documents/${id}`);
  return res.data.document;
}

// filters: { type, certifiable_type, from, to, q, page, page_size }
export async function listCertificates(filters = {}) {
  const res = await api.get('/certificates', { params: cleanParams(filters) });
  return res.data;
}

export async function getCertificateMeta(id) {
  const res = await api.get(`/certificates/${id}`);
  return res.data.certificate;
}
