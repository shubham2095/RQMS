// Demo users: ek har role ke liye, sabka password same. Sirf development/testing ke liye.
const bcrypt = require('bcryptjs');
const { QueryTypes } = require('sequelize');

const DEMO_PASSWORD = 'Rqms@12345';

const demoUsers = [
  { name: 'Demo Employee', email: 'employee@rqms.test', role: 'employee' },
  { name: 'Demo Quarter Clerk', email: 'clerk@rqms.test', role: 'quarter_clerk' },
  { name: 'Demo Estate Officer', email: 'estate.officer@rqms.test', role: 'estate_officer' },
  { name: 'Demo Electrical Dept', email: 'electrical@rqms.test', role: 'electrical_dept' },
  { name: 'Demo Water Dept', email: 'water@rqms.test', role: 'water_dept' },
  { name: 'Demo Accounts Dept', email: 'accounts@rqms.test', role: 'accounts_dept' },
  { name: 'Demo Admin', email: 'admin@rqms.test', role: 'admin' },
  { name: 'Demo Super Admin', email: 'superadmin@rqms.test', role: 'super_admin' },
];

module.exports = {
  async up(queryInterface) {
    if (process.env.NODE_ENV === 'production') {
      console.log('Skipping demo users (NODE_ENV=production).');
      return;
    }

    const now = new Date();
    const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);

    await queryInterface.bulkInsert(
      'users',
      demoUsers.map((u) => ({
        name: u.name,
        email: u.email,
        password_hash: passwordHash,
        is_active: true,
        created_at: now,
        updated_at: now,
      }))
    );

    const sql = queryInterface.sequelize;
    const roleRows = await sql.query('SELECT id, slug FROM roles', { type: QueryTypes.SELECT });
    const userRows = await sql.query('SELECT id, email FROM users', { type: QueryTypes.SELECT });
    const roleIds = {};
    roleRows.forEach((r) => {
      roleIds[r.slug] = r.id;
    });
    const userIds = {};
    userRows.forEach((u) => {
      userIds[u.email] = u.id;
    });

    await queryInterface.bulkInsert(
      'role_user',
      demoUsers.map((u) => ({ user_id: userIds[u.email], role_id: roleIds[u.role] }))
    );

    console.log('\nDemo users created (same password for all):');
    console.table(demoUsers.map((u) => ({ email: u.email, role: u.role })));
    console.log(`Password: ${DEMO_PASSWORD}\n`);
  },

  async down(queryInterface, Sequelize) {
    const emails = demoUsers.map((u) => u.email);
    await queryInterface.bulkDelete('users', { email: { [Sequelize.Op.in]: emails } });
  },
};
