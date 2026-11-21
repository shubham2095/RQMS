const { z } = require('zod');

// GET /api/notifications?unread_only=true&limit=50
const notificationQuerySchema = z.object({
  unread_only: z.stringbool('unread_only must be true or false').optional(),
  limit: z.coerce.number('Invalid limit').int().min(1).max(100, 'Limit must be at most 100').default(50),
});

module.exports = { notificationQuerySchema };
