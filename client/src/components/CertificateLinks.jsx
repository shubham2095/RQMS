import { useState } from 'react';
import downloadFile from '../utils/download';
import getErrorMessage from '../utils/getErrorMessage';
import { CERTIFICATE_LABELS } from '../utils/constants';

// Allotment ke certificates (PDF) ki download list.
function CertificateLinks({ certificates }) {
  const [error, setError] = useState('');

  async function handleDownload(certificate) {
    setError('');
    try {
      await downloadFile(`/certificates/${certificate.id}/download`, `${certificate.number}.pdf`);
    } catch (err) {
      setError(getErrorMessage(err, 'Download failed'));
    }
  }

  if (!certificates || certificates.length === 0) return <span className="muted">-</span>;

  return (
    <div>
      {certificates.map((certificate) => (
        <div key={certificate.id}>
          <button type="button" className="btn-link" onClick={() => handleDownload(certificate)}>
            {CERTIFICATE_LABELS[certificate.type] || certificate.type}
          </button>
          <span className="muted small"> {certificate.number}</span>
        </div>
      ))}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}

export default CertificateLinks;
