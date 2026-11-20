// 3 extra demo employees (profiles ke saath) — alag service years / category / essential service,
// taaki waiting-list ranking test ho sake. Sirf development/testing ke liye. Password sabka same (002 wala).
const bcrypt = require('bcryptjs');
const { Op, QueryTypes } = require('sequelize');

const DEMO_PASSWORD = 'Rqms@12345';

const employees = [
  {
    name: 'Demo Employee 2',
    email: 'employee2@rqms.test',
    profile: {
      employee_id: 'EMP1002',
      designation: 'Station Master',
      department: 'Operating',
      category: 'SC',
      service_type: 'essential', // +50
      grade_pay: 4200,
      pay_level: 'Level 6',
      date_of_joining: '2005-04-01', // ~21 saal (seniority cap 15)
    },
  },
  {
    name: 'Demo Employee 3',
    email: 'employee3@rqms.test',
    profile: {
      employee_id: 'EMP1003',
      designation: 'Junior Engineer',
      department: 'Signal & Telecom',
      category: 'GENERAL',
      service_type: 'non_essential',
      grade_pay: 2800,
      pay_level: 'Level 5',
      date_of_joining: '2022-08-16', // ~4 saal (Type III tak eligible)
    },
  },
  {
    name: 'Demo Employee 4',
    email: 'employee4@rqms.test',
    profile: {
      employee_id: 'EMP1004',
      designation: 'Senior Technician',
      department: 'Mechanical',
      category: 'OBC',
      service_type: 'non_essential',
      grade_pay: 4200,
      pay_level: 'Level 6',
      date_of_joining: '2010-01-10', // ~16 saal
    },
  },
];

module.exports = {
  async up(queryInterface) {
    if (process.env.NODE_ENV === 'production') {
      console.log('Skipping demo employees (NODE_ENV=production).');
      return;
    }

    const sql = queryInterface.sequelize;
    const now = new Date();
    const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);

    const [employeeRole] = await sql.query("SELECT id FROM roles WHERE slug = 'employee'", { type: QueryTypes.SELECT });
    if (!employeeRole) {
      console.log('Employee role not found — skipping demo employees.');
      return;
    }

    await queryInterface.bulkInsert(
      'users',
      employees.map((e) => ({
        name: e.name,
        email: e.email,
        password_hash: passwordHash,
        is_active: true,
        created_at: now,
        updated_at: now,
      }))
    );

    const users = await sql.query('SELECT id, email FROM users WHERE email IN (:emails)', {
      replacements: { emails: employees.map((e) => e.email) },
      type: QueryTypes.SELECT,
    });
    const userIds = {};
    users.forEach((u) => {
      userIds[u.email] = u.id;
    });

    await queryInterface.bulkInsert(
      'role_user',
      employees.map((e) => ({ user_id: userIds[e.email], role_id: employeeRole.id }))
    );

    await queryInterface.bulkInsert(
      'employee_profiles',
      employees.map((e) => ({
        user_id: userIds[e.email],
        station: 'Lucknow',
        division: 'Lucknow',
        railway_zone: 'Northern Railway',
        retirement_date: null,
        has_active_allotment: false,
        created_at: now,
        updated_at: now,
        ...e.profile,
      }))
    );

    console.log('Demo employees created (password same as other demo users):');
    console.table(employees.map((e) => ({ email: e.email, employee_id: e.profile.employee_id, category: e.profile.category, service: e.profile.service_type, joined: e.profile.date_of_joining })));
  },

  async down(queryInterface) {
    // employee_profiles users ke saath cascade se hat jati hain
    await queryInterface.bulkDelete('users', { email: { [Op.in]: employees.map((e) => e.email) } });
  },
};
