const { z } = require('zod');
const { enums } = require('../config/rqms');

// GET /api/retirements?status=
const retirementQuerySchema = z.object({
  status: z.enum(enums.retirementStatuses, 'Invalid status').optional(),
});

module.exports = { retirementQuerySchema };
