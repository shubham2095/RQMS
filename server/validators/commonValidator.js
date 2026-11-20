const { z } = require('zod');

// /:id route param
const idParamSchema = z.object({
  id: z.coerce.number('Invalid id').int('Invalid id').positive('Invalid id'),
});

module.exports = { idParamSchema };
