const { z } = require('zod');
const { certificateTypes, fileAccess } = require('../config/rqms');
const { isoDate } = require('./helpers');

// Dono lists ke common filters: tareekh range + pagination
const rangeAndPaging = {
  from: isoDate.optional(),
  to: isoDate.optional(),
  page: z.coerce.number('Invalid page').int('Invalid page').min(1, 'Page must be at least 1').default(1),
  page_size: z.coerce.number('Invalid page size').int('Invalid page size').min(1, 'Page size must be at least 1').max(100, 'Page size must be at most 100').default(25),
};

function validRange(data) {
  return !data.from || !data.to || data.from <= data.to;
}
const rangeError = { message: 'From date cannot be after to date', path: ['from'] };

// GET /api/documents?documentable_type=&category=&uploaded_by=&from=&to=&q=&page=&page_size=
const documentQuerySchema = z
  .object({
    documentable_type: z.enum(Object.keys(fileAccess.documents), 'Invalid document type').optional(),
    category: z.string().trim().max(50).optional(),
    uploaded_by: z.coerce.number('Invalid user').int('Invalid user').positive('Invalid user').optional(),
    q: z.string().trim().max(100).optional(),
    ...rangeAndPaging,
  })
  .refine(validRange, rangeError);

// GET /api/certificates?type=&certifiable_type=&from=&to=&q=&page=&page_size=
const certificateQuerySchema = z
  .object({
    type: z.enum(Object.keys(certificateTypes), 'Invalid certificate type').optional(),
    certifiable_type: z.enum(Object.keys(fileAccess.certificates), 'Invalid certificate source').optional(),
    q: z.string().trim().max(60).optional(),
    ...rangeAndPaging,
  })
  .refine(validRange, rangeError);

module.exports = { documentQuerySchema, certificateQuerySchema };
