// Chhote zod helpers — saare validators yahin se use karte hain.
const { z } = require('zod');

function requiredText(label, max) {
  return z
    .string(`${label} is required`)
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be at most ${max} characters`);
}

// Optional value: missing / null / '' (form blank) -> null
function optionalValue(schema) {
  return z
    .preprocess((value) => (value === '' ? null : value), schema.nullish())
    .transform((value) => (value === undefined ? null : value));
}

function optionalText(label, max) {
  return optionalValue(z.string().trim().max(max, `${label} must be at most ${max} characters`));
}

const isoDate = z.iso.date('Enter a valid date (YYYY-MM-DD)');

module.exports = { requiredText, optionalValue, optionalText, isoDate };
