// Demo employee (employee@rqms.test) ko sample profile + family. Sirf development/testing ke liye.
const { QueryTypes } = require('sequelize');

const DEMO_EMAIL = 'employee@rqms.test';
const DEMO_EMPLOYEE_ID = 'EMP1001';

module.exports = {
  async up(queryInterface) {
    if (process.env.NODE_ENV === 'production') {
      console.log('Skipping demo employee profile (NODE_ENV=production).');
      return;
    }

    const sql = queryInterface.sequelize;
    const users = await sql.query('SELECT id FROM users WHERE email = ?', {
      replacements: [DEMO_EMAIL],
      type: QueryTypes.SELECT,
    });
    if (users.length === 0) {
      console.log(`Demo user ${DEMO_EMAIL} not found — skipping demo profile.`);
      return;
    }

    const now = new Date();
    await queryInterface.bulkInsert('employee_profiles', [
      {
        user_id: users[0].id,
        employee_id: DEMO_EMPLOYEE_ID,
        designation: 'Senior Section Engineer',
        department: 'Engineering',
        station: 'Lucknow',
        division: 'Lucknow',
        railway_zone: 'Northern Railway',
        category: 'OBC',
        service_type: 'non_essential',
        grade_pay: 4600,
        pay_level: 'Level 7',
        date_of_joining: '2015-07-01',
        retirement_date: null,
        has_active_allotment: false,
        created_at: now,
        updated_at: now,
      },
    ]);

    const profiles = await sql.query('SELECT id FROM employee_profiles WHERE employee_id = ?', {
      replacements: [DEMO_EMPLOYEE_ID],
      type: QueryTypes.SELECT,
    });
    const profileId = profiles[0].id;

    await queryInterface.bulkInsert('family_members', [
      {
        employee_profile_id: profileId,
        name: 'Sunita Demo',
        relation: 'Spouse',
        date_of_birth: '1988-03-12',
        is_dependent: true,
        created_at: now,
        updated_at: now,
      },
      {
        employee_profile_id: profileId,
        name: 'Aarav Demo',
        relation: 'Son',
        date_of_birth: '2016-09-05',
        is_dependent: true,
        created_at: now,
        updated_at: now,
      },
    ]);

    console.log(`Demo profile created: ${DEMO_EMAIL} -> Employee ID ${DEMO_EMPLOYEE_ID} (can log in with it too).`);
  },

  async down(queryInterface) {
    // family_members ON DELETE CASCADE se saath hi hat jate hain
    await queryInterface.bulkDelete('employee_profiles', { employee_id: DEMO_EMPLOYEE_ID });
  },
};
