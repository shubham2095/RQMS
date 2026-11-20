const { z } = require('zod');
const { enums } = require('../config/rqms');
const { requiredText, optionalText } = require('./helpers');

// POST /api/applications — multipart/form-data hai, isliye saari values strings aati hain.
const applySchema = z.object({
  preferred_quarter_type: z.enum(enums.quarterTypes, 'Select a valid quarter type (I to VI)'),
  preferred_colony: optionalText('Preferred colony', 150),
  station: requiredText('Station', 100),
  family_size: z.coerce
    .number('Family size must be a number')
    .int('Family size must be a whole number')
    .min(1, 'Family size must be at least 1')
    .max(20, 'Family size must be at most 20'),
  medical_ground: z.stringbool('Medical ground must be true or false').default(false),
  special_grounds: optionalText('Special grounds', 1000),
});

// GET /api/applications?status=
const applicationQuerySchema = z.object({
  status: z.enum(enums.applicationStatuses, 'Invalid status').optional(),
});

// POST /api/applications/:id/decide
const decideSchema = z
  .object({
    decision: z.enum(['approve', 'reject'], 'Decision must be approve or reject'),
    remarks: optionalText('Remarks', 1000),
  })
  .refine((data) => data.decision !== 'reject' || Boolean(data.remarks), {
    message: 'Remarks are required when rejecting',
    path: ['remarks'],
  });

module.exports = { applySchema, applicationQuerySchema, decideSchema };
