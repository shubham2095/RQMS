const { z } = require('zod');
const { enums } = require('../config/rqms');
const { requiredText, optionalValue, optionalText, isoDate } = require('./helpers');
// grade_pay + is_gazetted: admin bhi badal sakta hai (adminValidator) — wahi rules

// PUT /api/profile — editable fields ka full set. has_active_allotment system-managed hai, yahan nahi.
const profileSchema = z
  .object({
    employee_id: z
      .string('Employee ID is required')
      .trim()
      .min(3, 'Employee ID must be at least 3 characters')
      .max(50, 'Employee ID must be at most 50 characters')
      // '@' allowed nahi: login identifier email aur employee id mein isi se alag hota hai
      .regex(/^[A-Za-z0-9._/-]+$/, 'Employee ID can only contain letters, numbers and . _ / -'),
    designation: optionalText('Designation', 100),
    department: optionalText('Department', 100),
    station: optionalText('Station', 100),
    division: optionalText('Division', 100),
    railway_zone: optionalText('Railway zone', 100),
    category: z.enum(enums.categories, 'Select a valid category').default('GENERAL'),
    service_type: z.enum(enums.serviceTypes, 'Select a valid service type').default('non_essential'),
    // Grade pay ZAROORI hai: isi se quarter type ka hakk (entitlement) tay hota hai
    grade_pay: z.number('Grade pay is required').int('Grade pay must be a whole number').min(1, 'Grade pay must be at least 1'),
    is_gazetted: z.boolean('is_gazetted must be true or false').default(false),
    pay_level: optionalText('Pay level', 30),
    date_of_joining: optionalValue(isoDate),
    retirement_date: optionalValue(isoDate),
  })
  .refine(
    (data) =>
      !data.date_of_joining || !data.retirement_date || data.retirement_date >= data.date_of_joining,
    { message: 'Retirement date cannot be before date of joining', path: ['retirement_date'] }
  );

// POST /api/profile/family
const familyMemberSchema = z.object({
  name: requiredText('Name', 150),
  relation: requiredText('Relation', 50),
  date_of_birth: optionalValue(isoDate),
  is_dependent: z.boolean('is_dependent must be true or false').default(true),
});

module.exports = { profileSchema, familyMemberSchema };
