const fs = require('fs');
const path = require('path');
const {
  Document,
  Certificate,
  QuarterApplication,
  Allotment,
  VacationRequest,
  EmployeeProfile,
} = require('../models');
const { uploadsDir, certificatesDir } = require('../config/storage');
const { vacationStepPermissions } = require('../config/rqms');
const { hasAnyPermission } = require('./userAccessService');
const httpError = require('../utils/httpError');

async function ownsProfile(actor, profileId) {
  const profile = await EmployeeProfile.findOne({ where: { user_id: actor.id }, attributes: ['id'] });
  return Boolean(profile) && profile.id === profileId;
}

// File disk par honi chahiye; path.basename — DB mein kuch bhi ho, folder se bahar nahi jayega.
function resolveFile(dir, storedName, downloadName, mime) {
  const absolutePath = path.join(dir, path.basename(storedName));
  if (!fs.existsSync(absolutePath)) throw httpError(404, 'File not found');
  return { absolutePath, downloadName, mime };
}

// Application attachment: application ka owner ya staff (application.verify / decide).
async function getDocumentFile(documentId, actor) {
  const document = await Document.findByPk(documentId);
  if (!document || document.documentable_type !== 'QuarterApplication') throw httpError(404, 'Document not found');

  const application = await QuarterApplication.findByPk(document.documentable_id, { attributes: ['id', 'employee_profile_id'] });
  if (!application) throw httpError(404, 'Document not found');

  const allowed =
    hasAnyPermission(actor, 'application.verify', 'application.decide') ||
    (await ownsProfile(actor, application.employee_profile_id));
  if (!allowed) throw httpError(404, 'Document not found');

  return resolveFile(uploadsDir, document.path, document.original_name, document.mime);
}

// Certificate kis cheez ka hai (certifiable_type) -> uska model + kaun staff dekh sakta hai.
// Owner (employee) hamesha dekh sakta hai.
const certificateSources = {
  Allotment: { model: Allotment, staffPermissions: ['allotment.approve', 'allotment.possession'] },
  VacationRequest: { model: VacationRequest, staffPermissions: Object.values(vacationStepPermissions) },
};

async function getCertificateFile(certificateId, actor) {
  const certificate = await Certificate.findByPk(certificateId);
  const source = certificate && certificateSources[certificate.certifiable_type];
  if (!source || !certificate.file_path) throw httpError(404, 'Certificate not found');

  const owner = await source.model.findByPk(certificate.certifiable_id, { attributes: ['id', 'employee_profile_id'] });
  if (!owner) throw httpError(404, 'Certificate not found');

  const allowed =
    hasAnyPermission(actor, ...source.staffPermissions) || (await ownsProfile(actor, owner.employee_profile_id));
  if (!allowed) throw httpError(404, 'Certificate not found');

  return resolveFile(certificatesDir, certificate.file_path, `${certificate.number}.pdf`, 'application/pdf');
}

module.exports = { getDocumentFile, getCertificateFile };
