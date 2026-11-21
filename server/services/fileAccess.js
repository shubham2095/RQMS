// Documents / certificates ka access ek hi jagah: lists (scope) aur download/metadata (can see) dono yahin se,
// taaki alag-alag na padein. Rules `config/rqms.js` `fileAccess` mein. super_admin hamesha bypass (hasAnyPermission).
const { Op } = require('sequelize');
const { QuarterApplication, Allotment, VacationRequest, EmployeeProfile } = require('../models');
const { fileAccess } = require('../config/rqms');
const { hasAnyPermission } = require('./userAccessService');

// Polymorphic parent type -> model (jisme employee_profile_id hai, yani owner pata chalta hai)
const parentModels = { QuarterApplication, Allotment, VacationRequest };

async function ownProfileId(actor) {
  const profile = await EmployeeProfile.findOne({ where: { user_id: actor.id }, attributes: ['id'] });
  return profile ? profile.id : null;
}

// Un parent types ke ids jo is actor ke apne hain
async function ownIds(type, actor) {
  const profileId = await ownProfileId(actor);
  if (!profileId) return [];
  const rows = await parentModels[type].findAll({ where: { employee_profile_id: profileId }, attributes: ['id'] });
  return rows.map((row) => row.id);
}

function isStaffFor(permissionsByType, type, actor) {
  const permissions = permissionsByType[type];
  return Boolean(permissions) && hasAnyPermission(actor, ...permissions);
}

// Sequelize where: staff ko poore type ki rows, baaki sirf apni. Kuch bhi na mile to koi row nahi (id = 0).
async function scopeFor(permissionsByType, typeColumn, idColumn, actor) {
  const parts = [];
  for (const type of Object.keys(permissionsByType)) {
    if (isStaffFor(permissionsByType, type, actor)) {
      parts.push({ [typeColumn]: type });
      continue;
    }
    const ids = await ownIds(type, actor);
    if (ids.length > 0) parts.push({ [typeColumn]: type, [idColumn]: { [Op.in]: ids } });
  }
  return parts.length > 0 ? { [Op.or]: parts } : { id: 0 };
}

function documentScope(actor) {
  return scopeFor(fileAccess.documents, 'documentable_type', 'documentable_id', actor);
}

function certificateScope(actor) {
  return scopeFor(fileAccess.certificates, 'certifiable_type', 'certifiable_id', actor);
}

async function ownsParent(type, id, actor) {
  const model = parentModels[type];
  if (!model) return false;
  const profileId = await ownProfileId(actor);
  if (!profileId) return false;
  const parent = await model.findByPk(id, { attributes: ['id', 'employee_profile_id'] });
  return Boolean(parent) && parent.employee_profile_id === profileId;
}

async function canSeeDocument(document, actor) {
  if (!fileAccess.documents[document.documentable_type]) return false;
  if (isStaffFor(fileAccess.documents, document.documentable_type, actor)) return true;
  return ownsParent(document.documentable_type, document.documentable_id, actor);
}

async function canSeeCertificate(certificate, actor) {
  if (!fileAccess.certificates[certificate.certifiable_type]) return false;
  if (isStaffFor(fileAccess.certificates, certificate.certifiable_type, actor)) return true;
  return ownsParent(certificate.certifiable_type, certificate.certifiable_id, actor);
}

module.exports = { documentScope, certificateScope, canSeeDocument, canSeeCertificate };
