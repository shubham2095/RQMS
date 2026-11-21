const { z } = require('zod');
const { enums } = require('../config/rqms');

// GET /api/reports/vacant-quarters?type=&station=
const vacantQuartersQuerySchema = z.object({
  type: z.enum(enums.quarterTypes, 'Invalid quarter type').optional(),
  station: z.string().trim().max(100).optional(),
});

module.exports = { vacantQuartersQuerySchema };
