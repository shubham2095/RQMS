const documentService = require('../services/documentService');
const certificateQueryService = require('../services/certificateQueryService');
const { parse } = require('../utils/validate');
const { documentQuerySchema, certificateQuerySchema } = require('../validators/documentValidator');
const { idParamSchema } = require('../validators/commonValidator');

// Documents (download `fileController` mein hai)
async function listDocuments(req, res, next) {
  try {
    const filters = parse(documentQuerySchema, req.query);
    res.json(await documentService.list(req.user, filters));
  } catch (err) {
    next(err);
  }
}

async function getDocument(req, res, next) {
  try {
    const { id } = parse(idParamSchema, req.params);
    res.json({ document: await documentService.get(id, req.user) });
  } catch (err) {
    next(err);
  }
}

// Certificates
async function listCertificates(req, res, next) {
  try {
    const filters = parse(certificateQuerySchema, req.query);
    res.json(await certificateQueryService.list(req.user, filters));
  } catch (err) {
    next(err);
  }
}

async function getCertificate(req, res, next) {
  try {
    const { id } = parse(idParamSchema, req.params);
    res.json({ certificate: await certificateQueryService.get(id, req.user) });
  } catch (err) {
    next(err);
  }
}

module.exports = { listDocuments, getDocument, listCertificates, getCertificate };
