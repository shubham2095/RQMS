const { z } = require('zod');
const { enums, vacationClearanceSteps } = require('../config/rqms');
const { optionalText, optionalValue, isoDate } = require('./helpers');
const { parse } = require('../utils/validate');

// POST /api/vacations
const initiateSchema = z.object({
  trigger: z.enum(enums.vacationTriggers, `Trigger must be one of: ${enums.vacationTriggers.join(', ')}`),
  requested_vacation_date: isoDate,
  reason: optionalText('Reason', 1000),
});

// POST /api/vacations/:id/act — pehle sirf step chahiye (baaki data step ke hisaab se parseStepData mein)
const actStepSchema = z.object({
  step: z.enum(vacationClearanceSteps, 'Select a valid clearance step'),
});

// GET /api/vacations?status=&step=&waiting_for_me=
const vacationQuerySchema = z.object({
  status: z.enum(enums.vacationStatuses, 'Invalid status').optional(),
  step: z.enum(vacationClearanceSteps, 'Invalid step').optional(),
  waiting_for_me: z.stringbool('waiting_for_me must be true or false').optional(),
});

function amount(label) {
  return optionalValue(
    z.number(`${label} must be a number`).min(0, `${label} cannot be negative`).max(9999999999, `${label} is too large`)
  );
}

// Har step ke OPTIONAL informational fields — ye approve ko kabhi block nahi karte.
const stepFields = {
  clerk_inspection: { has_damage: optionalValue(z.boolean('has_damage must be true or false')) },
  electrical: { meter_reading: amount('Meter reading'), dues_amount: amount('Dues amount') },
  water: { dues_amount: amount('Dues amount') },
  accounts: { dues_amount: amount('Dues amount') },
  estate_officer: {},
};

// Us step ka body parse karo: decision + remarks + (sirf us step ke) optional fields. Dusre fields ignore.
// Reject par remarks zaroori; approve par kuch bhi zaroori nahi.
function parseStepData(step, body) {
  const schema = z
    .object({
      decision: z.enum(['approve', 'reject'], 'Decision must be approve or reject'),
      remarks: optionalText('Remarks', 1000),
      ...stepFields[step],
    })
    .refine((data) => data.decision !== 'reject' || Boolean(data.remarks), {
      message: 'Remarks are required when rejecting',
      path: ['remarks'],
    });
  return parse(schema, body);
}

module.exports = { initiateSchema, actStepSchema, vacationQuerySchema, parseStepData };
