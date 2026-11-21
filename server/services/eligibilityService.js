// PURE: koi DB / network nahi. Plain objects lo, plain object lautao — isliye alag se test ho sakta hai.
const { eligibility } = require('../config/rqms');
const { getEntitlement } = require('./entitlementService');

const FIELD_LABELS = { designation: 'designation', grade_pay: 'grade pay' };

function sameText(a, b) {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
}

function isMissing(value) {
  return value === null || value === undefined || value === '';
}

// application: { preferred_quarter_type, station }
// profile:     { designation, grade_pay, is_gazetted, station, has_active_allotment }
// Returns { eligible, reasons[], checks{ name: { passed, ...detail } }, entitlement }
function evaluate(application, profile) {
  const checks = {};
  const reasons = [];

  function record(name, passed, detail, failReason) {
    checks[name] = { passed, ...detail };
    if (!passed) reasons.push(failReason);
  }

  if (eligibility.requireCompleteProfile) {
    const missing = eligibility.requiredProfileFields
      .filter((field) => isMissing(profile[field]))
      .map((field) => FIELD_LABELS[field] || field);
    record('profile_complete', missing.length === 0, { missing }, `Profile incomplete: ${missing.join(', ')} missing`);
  }

  // Grade pay (+ gazetted) -> entitled type. Applied type entitled ya usse neeche hona chahiye.
  const entitled = getEntitlement(profile);
  const applied = application.preferred_quarter_type;
  if (!entitled) {
    record(
      'entitlement',
      false,
      { entitled_type: null, applied_type: applied, allowed_types: [] },
      'Your entitled quarter type cannot be determined (grade pay missing or not covered by the rules)'
    );
  } else {
    record(
      'entitlement',
      entitled.allowed_types.includes(applied),
      { entitled_type: entitled.entitled_type, label: entitled.label, applied_type: applied, allowed_types: entitled.allowed_types },
      `Type ${applied} is above your entitlement (${entitled.label}); you can apply for ${entitled.allowed_types.map((type) => `Type ${type}`).join(', ')}`
    );
  }

  if (eligibility.blockIfExistingAllotment) {
    const hasAllotment = Boolean(profile.has_active_allotment);
    record('existing_allotment', !hasAllotment, { has_active_allotment: hasAllotment }, 'You already hold an active quarter allotment');
  }

  if (eligibility.requireStationMatch) {
    const matches = sameText(application.station, profile.station);
    record(
      'station_match',
      matches,
      { requested: application.station || null, posting: profile.station || null },
      `Requested station "${application.station}" does not match your posting station "${profile.station || 'not set'}"`
    );
  }

  return { eligible: reasons.length === 0, reasons, checks, entitlement: entitled };
}

module.exports = { evaluate };
