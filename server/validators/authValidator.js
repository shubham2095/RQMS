const { z } = require('zod');

// identifier = email YA employee_id (ek hi field). Kaun sa hai, authService decide karta hai.
const loginSchema = z.object({
  identifier: z
    .string('Email or Employee ID is required')
    .trim()
    .min(1, 'Email or Employee ID is required')
    .max(255, 'Email or Employee ID is too long'),
  password: z.string('Password is required').min(1, 'Password is required'),
});

module.exports = { loginSchema };
