// PURE: koi DB / network nahi. Grade pay (+ gazetted) -> kis quarter type ka hakk (config/rqms.js `entitlement`).
const { entitlement, enums } = require('../config/rqms');

function ruleMatches(rule, gradePay, isGazetted) {
  if (rule.gazetted !== isGazetted) return false;
  if (gradePay < rule.min) return false;
  if (rule.max !== undefined && gradePay > rule.max) return false;
  return true;
}

// Entitled type se lekar sabse chhote type tak (allowLowerTypes ho to), warna sirf entitled type.
function allowedTypesFor(entitledType) {
  const position = enums.quarterTypes.indexOf(entitledType);
  if (!entitlement.allowLowerTypes) return [entitledType];
  return enums.quarterTypes.slice(0, position + 1);
}

// profile: { grade_pay, is_gazetted }
// Returns { entitled_type, label, allowed_types } ya null (grade pay nahi hai / koi rule match nahi).
function getEntitlement(profile) {
  const gradePay = profile.grade_pay;
  if (gradePay === null || gradePay === undefined || Number.isNaN(Number(gradePay))) return null;

  const isGazetted = Boolean(profile.is_gazetted);
  const rule = entitlement.rules.find((item) => ruleMatches(item, Number(gradePay), isGazetted));
  if (!rule) return null;

  return {
    entitled_type: rule.type,
    label: rule.label || `Type ${rule.type}`,
    allowed_types: allowedTypesFor(rule.type),
  };
}

module.exports = { getEntitlement, allowedTypesFor };
