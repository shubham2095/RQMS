const httpError = require('./httpError');

// zod schema se data parse karo. Fail hone par 400 + field-wise details throw.
function parse(schema, data) {
  const result = schema.safeParse(data);
  if (result.success) return result.data;

  const details = result.error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
  throw httpError(400, 'Validation failed', details);
}

module.exports = { parse };
