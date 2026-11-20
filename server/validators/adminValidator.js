const { z } = require('zod');
const { requiredText } = require('./helpers');

const email = z.string('Email is required').trim().toLowerCase().pipe(z.email('Enter a valid email'));
const password = z
  .string('Password is required')
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters'); // bcrypt 72 bytes tak hi padhta hai
const roleSlugs = z
  .array(z.string(), 'Select at least one role')
  .min(1, 'Select at least one role');

const createUserSchema = z.object({
  name: requiredText('Name', 150),
  email,
  password,
  role_slugs: roleSlugs,
  is_active: z.boolean('is_active must be true or false').default(true),
});

// Sab optional: jo bheja wahi badlega. password na bhejo to purana rahega.
const updateUserSchema = z.object({
  name: requiredText('Name', 150).optional(),
  email: email.optional(),
  password: password.optional(),
  role_slugs: roleSlugs.optional(),
  is_active: z.boolean('is_active must be true or false').optional(),
});

module.exports = { createUserSchema, updateUserSchema };
