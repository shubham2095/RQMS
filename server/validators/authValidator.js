const { z } = require('zod');

const loginSchema = z.object({
  email: z
    .string('Email is required')
    .trim()
    .toLowerCase()
    .pipe(z.email('Enter a valid email')),
  password: z.string('Password is required').min(1, 'Password is required'),
});

module.exports = { loginSchema };
