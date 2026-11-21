// 3 demo applicants jo Type III @ Lucknow ki waiting list mein PEHLE SE hain, alag-alag (purani) registration dates ke saath —
// taaki date-wise ranking turant dikhe aur EMP1001-1004 khud apply karke inke PEECHE lagein.
// Sirf development/testing ke liye. Password sabka same (002 wala).
const bcrypt = require('bcryptjs');
const { Op, QueryTypes } = require('sequelize');
const eligibilityService = require('../services/eligibilityService');

const DEMO_PASSWORD = 'Rqms@12345';

// Registration date jaanbujh kar order se alag likhi hain (list date se sort hogi, listing order se nahi).
const applicants = [
  {
    name: 'Demo Applicant 6',
    email: 'employee6@rqms.test',
    appliedAt: '2025-09-15T10:00:00',
    profile: { employee_id: 'EMP1006', designation: 'Technician Grade I', department: 'Mechanical', category: 'GENERAL', service_type: 'essential', grade_pay: 4200, pay_level: 'Level 6', date_of_joining: '2012-06-01' },
  },
  {
    name: 'Demo Applicant 5',
    email: 'employee5@rqms.test',
    appliedAt: '2025-02-03T10:00:00',
    profile: { employee_id: 'EMP1005', designation: 'Section Engineer', department: 'Civil', category: 'SC', service_type: 'non_essential', grade_pay: 2800, pay_level: 'Level 5', date_of_joining: '2018-03-12' },
  },
  {
    name: 'Demo Applicant 7',
    email: 'employee7@rqms.test',
    appliedAt: '2026-03-01T10:00:00',
    profile: { employee_id: 'EMP1007', designation: 'Office Superintendent', department: 'Accounts', category: 'OBC', service_type: 'non_essential', grade_pay: 3600, pay_level: 'Level 6', date_of_joining: '2009-11-20' },
  },
];

const stamp = (date) => date.slice(0, 10).replace(/-/g, '');

module.exports = {
  async up(queryInterface) {
    if (process.env.NODE_ENV === 'production') {
      console.log('Skipping demo waitlist (NODE_ENV=production).');
      return;
    }

    const sql = queryInterface.sequelize;
    const [employeeRole] = await sql.query("SELECT id FROM roles WHERE slug = 'employee'", { type: QueryTypes.SELECT });
    if (!employeeRole) {
      console.log('Employee role not found — skipping demo waitlist.');
      return;
    }

    const existing = await sql.query('SELECT email FROM users WHERE email IN (:emails)', {
      replacements: { emails: applicants.map((a) => a.email) },
      type: QueryTypes.SELECT,
    });
    if (existing.length > 0) {
      console.log('Demo waitlist applicants already exist — skipping.');
      return;
    }

    const now = new Date();
    const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);

    await queryInterface.bulkInsert(
      'users',
      applicants.map((a) => ({ name: a.name, email: a.email, password_hash: passwordHash, is_active: true, created_at: now, updated_at: now }))
    );
    const users = await sql.query('SELECT id, email FROM users WHERE email IN (:emails)', {
      replacements: { emails: applicants.map((a) => a.email) },
      type: QueryTypes.SELECT,
    });
    const userId = {};
    users.forEach((u) => {
      userId[u.email] = u.id;
    });

    await queryInterface.bulkInsert('role_user', applicants.map((a) => ({ user_id: userId[a.email], role_id: employeeRole.id })));
    await queryInterface.bulkInsert(
      'employee_profiles',
      applicants.map((a) => ({
        user_id: userId[a.email],
        station: 'Lucknow',
        division: 'Lucknow',
        railway_zone: 'Northern Railway',
        is_gazetted: false,
        has_active_allotment: false,
        created_at: now,
        updated_at: now,
        ...a.profile,
      }))
    );
    const profiles = await sql.query('SELECT id, employee_id FROM employee_profiles WHERE employee_id IN (:ids)', {
      replacements: { ids: applicants.map((a) => a.profile.employee_id) },
      type: QueryTypes.SELECT,
    });
    const profileId = {};
    profiles.forEach((p) => {
      profileId[p.employee_id] = p.id;
    });

    // Applications (status waitlisted) — eligibility result real pure service se nikala hua
    const applications = applicants.map((a) => {
      const application = { preferred_quarter_type: 'III', station: 'Lucknow' };
      const profile = { ...a.profile, station: 'Lucknow', is_gazetted: false, has_active_allotment: false };
      return {
        reference_no: `QA-${stamp(a.appliedAt)}-0001`,
        employee_profile_id: profileId[a.profile.employee_id],
        preferred_quarter_type: 'III',
        station: 'Lucknow',
        division: 'Lucknow',
        service_type: a.profile.service_type,
        category: a.profile.category,
        family_size: 3,
        medical_ground: false,
        status: 'waitlisted',
        eligibility_result: JSON.stringify(eligibilityService.evaluate(application, profile)),
        applied_at: new Date(a.appliedAt),
        created_at: now,
        updated_at: now,
      };
    });
    await queryInterface.bulkInsert('quarter_applications', applications);

    const savedApps = await sql.query('SELECT id, reference_no, applied_at FROM quarter_applications WHERE reference_no IN (:refs) ORDER BY applied_at ASC', {
      replacements: { refs: applications.map((a) => a.reference_no) },
      type: QueryTypes.SELECT,
    });
    await queryInterface.bulkInsert(
      'waiting_list_entries',
      savedApps.map((app, index) => ({
        quarter_application_id: app.id,
        quarter_type: 'III',
        station: 'Lucknow',
        priority_score: 0,
        rank: index + 1, // registration date order
        waiting_since: app.applied_at,
        is_active: true,
        created_at: now,
        updated_at: now,
      }))
    );

    console.log('Demo waitlist (Type III @ Lucknow, by registration date): EMP1005 (2025-02-03), EMP1006 (2025-09-15), EMP1007 (2026-03-01).');
  },

  // Order: waiting entries -> applications -> users (profiles cascade). Fail hoga agar in logon ko allotment mil chuka ho.
  async down(queryInterface) {
    const sql = queryInterface.sequelize;
    const ids = applicants.map((a) => a.profile.employee_id);
    await sql.query(
      'DELETE w FROM waiting_list_entries w JOIN quarter_applications a ON a.id = w.quarter_application_id JOIN employee_profiles p ON p.id = a.employee_profile_id WHERE p.employee_id IN (:ids)',
      { replacements: { ids } }
    );
    await sql.query(
      'DELETE a FROM quarter_applications a JOIN employee_profiles p ON p.id = a.employee_profile_id WHERE p.employee_id IN (:ids)',
      { replacements: { ids } }
    );
    await queryInterface.bulkDelete('users', { email: { [Op.in]: applicants.map((a) => a.email) } });
  },
};
