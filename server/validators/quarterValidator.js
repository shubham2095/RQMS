const { z } = require('zod');
const { enums, manualQuarterStatuses } = require('../config/rqms');
const { requiredText, optionalText } = require('./helpers');

// Create aur update dono mein full set bhejna hai (PUT). status optional: create par default 'vacant';
// sirf manual statuses allowed — allotted/occupied wagairah allotment flow set karta hai.
const createQuarterSchema = z.object({
  quarter_number: requiredText('Quarter number', 30),
  quarter_type: z.enum(enums.quarterTypes, 'Select a valid quarter type (I to VI)'),
  colony_name: requiredText('Colony name', 150),
  address: optionalText('Address', 255),
  railway_zone: optionalText('Railway zone', 100),
  division: optionalText('Division', 100),
  station: requiredText('Station', 100),
  block: optionalText('Block', 50),
  floor: optionalText('Floor', 30),
  status: z.enum(manualQuarterStatuses, `Status must be one of: ${manualQuarterStatuses.join(', ')}`).optional(),
});

const updateQuarterSchema = createQuarterSchema;

// GET /api/quarters?type=&station=&status=
const quarterQuerySchema = z.object({
  type: z.enum(enums.quarterTypes, 'Invalid quarter type').optional(),
  station: z.string().trim().max(100).optional(),
  status: z.enum(enums.quarterStatuses, 'Invalid status').optional(),
});

module.exports = { createQuarterSchema, updateQuarterSchema, quarterQuerySchema };
