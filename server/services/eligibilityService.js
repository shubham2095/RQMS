// PURE: koi DB / network nahi. Plain objects lo, plain object lautao — isliye alag se test ho sakta hai.
const { eligibility } = require('../config/rqms');
const { completedYears } = require('../utils/serviceYears');

function sameText(a, b) {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
}

// application: { preferred_quarter_type, station }
// profile:     { designation, date_of_joining, station, has_active_allotment }
// Returns { eligible, reasons[], checks{ name: { passed, ...detail } } }
function evaluate(application, profile, asOf = new Date()) {
  const checks = {};
  const reasons = [];

  function record(name, passed, detail, failReason) {
    checks[name] = { passed, ...detail };
    if (!passed) reasons.push(failReason);
  }

  if (eligibility.requireCompleteProfile) {
    const missing = [];
    if (!profile.designation) missing.push('designation');
    if (!profile.date_of_joining) missing.push('date of joining');
    record('profile_complete', missing.length === 0, { missing }, `Profile incomplete: ${missing.join(', ')} missing`);
  }

  const type = application.preferred_quarter_type;
  const required = eligibility.minServiceYears[type];
  const actual = completedYears(profile.date_of_joining, asOf);
  if (required === undefined) {
    record('service_years', false, { required: null, actual }, `Unknown quarter type "${type}"`);
  } else {
    record(
      'service_years',
      actual >= required,
      { required, actual },
      `Type ${type} needs ${required} completed service years; you have ${actual}`
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

  return { eligible: reasons.length === 0, reasons, checks };
}

module.exports = { evaluate };
