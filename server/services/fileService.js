const fs = require('fs');
const path = require('path');
const { Document, Certificate } = require('../models');
const { uploadsDir, certificatesDir } = require('../config/storage');
const { canSeeDocument, canSeeCertificate } = require('./fileAccess');
const httpError = require('../utils/httpError');

// File disk par honi chahiye; path.basename — DB mein kuch bhi ho, folder se bahar nahi jayega.
function resolveFile(dir, storedName, downloadName, mime) {
  const absolutePath = path.join(dir, path.basename(storedName));
  if (!fs.existsSync(absolutePath)) throw httpError(404, 'File not found');
  return { absolutePath, downloadName, mime };
}

// Access rules `config/rqms.js` fileAccess se (lists ke saath same) — dekhne ka haq na ho to 404.
async function getDocumentFile(documentId, actor) {
  const document = await Document.findByPk(documentId);
  if (!document || !(await canSeeDocument(document, actor))) throw httpError(404, 'Document not found');
  return resolveFile(uploadsDir, document.path, document.original_name, document.mime);
}

async function getCertificateFile(certificateId, actor) {
  const certificate = await Certificate.findByPk(certificateId);
  if (!certificate || !certificate.file_path || !(await canSeeCertificate(certificate, actor))) {
    throw httpError(404, 'Certificate not found');
  }
  return resolveFile(certificatesDir, certificate.file_path, `${certificate.number}.pdf`, 'application/pdf');
}

module.exports = { getDocumentFile, getCertificateFile };
