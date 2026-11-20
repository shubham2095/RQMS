import api from '../services/axios';

// Auth header zaroori hai, isliye seedha <a href> nahi: blob mangwa kar browser se save karwate hain.
async function downloadFile(url, filename) {
  const res = await api.get(url, { responseType: 'blob' });
  const blobUrl = URL.createObjectURL(res.data);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
}

export default downloadFile;
