const { z } = require('zod');
const { enums } = require('../config/rqms');
const { optionalText, optionalValue, isoDate } = require('./helpers');

// POST /api/allotments/:id/respond
const respondSchema = z.object({
  decision: z.enum(['accept', 'reject'], 'Decision must be accept or reject'),
  remarks: optionalText('Remarks', 1000),
});

// POST /api/allotments/:id/possession — date na ho to aaj ki
const possessionSchema = z.object({
  possession_date: optionalValue(isoDate),
});

// GET /api/allotments?status=
const allotmentQuerySchema = z.object({
  status: z.enum(enums.allotmentStatuses, 'Invalid status').optional(),
});

// GET /api/waiting-list?type=&station=
const waitingListQuerySchema = z.object({
  type: z.enum(enums.quarterTypes, 'Invalid quarter type').optional(),
  station: z.string().trim().max(100).optional(),
});

module.exports = { respondSchema, possessionSchema, allotmentQuerySchema, waitingListQuerySchema };
