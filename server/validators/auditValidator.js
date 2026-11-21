const { z } = require('zod');
const { isoDate } = require('./helpers');

// GET /api/audit?action=&user_id=&from=&to=&page=&page_size=
const auditQuerySchema = z
  .object({
    action: z.string().trim().max(60).optional(),
    user_id: z.coerce.number('Invalid user').int('Invalid user').positive('Invalid user').optional(),
    from: isoDate.optional(),
    to: isoDate.optional(),
    page: z.coerce.number('Invalid page').int().min(1, 'Page must be at least 1').default(1),
    page_size: z.coerce.number('Invalid page size').int().min(1).max(100, 'Page size must be at most 100').default(25),
  })
  .refine((data) => !data.from || !data.to || data.from <= data.to, {
    message: 'From date cannot be after to date',
    path: ['from'],
  });

module.exports = { auditQuerySchema };
