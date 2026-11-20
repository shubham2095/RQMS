const fileService = require('../services/fileService');
const { parse } = require('../utils/validate');
const { idParamSchema } = require('../validators/commonValidator');

function sendFile(res, next, file) {
  res.download(file.absolutePath, file.downloadName, (err) => {
    if (err && !res.headersSent) next(err);
  });
}

async function downloadDocument(req, res, next) {
  try {
    const { id } = parse(idParamSchema, req.params);
    sendFile(res, next, await fileService.getDocumentFile(id, req.user));
  } catch (err) {
    next(err);
  }
}

async function downloadCertificate(req, res, next) {
  try {
    const { id } = parse(idParamSchema, req.params);
    sendFile(res, next, await fileService.getCertificateFile(id, req.user));
  } catch (err) {
    next(err);
  }
}

module.exports = { downloadDocument, downloadCertificate };
