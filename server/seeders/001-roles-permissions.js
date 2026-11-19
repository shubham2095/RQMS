// 8 roles + permissions + role->permission matrix (CLAUDE.md section 5).
const { QueryTypes } = require('sequelize');

const roles = [
  { slug: 'employee', name: 'Employee', description: 'Apply for quarters, accept offers, request vacation' },
  { slug: 'quarter_clerk', name: 'Quarter Clerk', description: 'Verifies applications, manages quarters, records possession' },
  { slug: 'estate_officer', name: 'Estate Officer', description: 'Decides applications, approves allotments, final clearance' },
  { slug: 'electrical_dept', name: 'Electrical Department', description: 'Electrical clearance on vacation' },
  { slug: 'water_dept', name: 'Water Department', description: 'Water clearance on vacation' },
  { slug: 'accounts_dept', name: 'Accounts Department', description: 'Dues clearance on vacation' },
  { slug: 'admin', name: 'Admin', description: 'Users, master data and settings' },
  { slug: 'super_admin', name: 'Super Admin', description: 'Full access' },
];

const permissions = [
  { slug: 'application.verify', name: 'Verify applications', group: 'application' },
  { slug: 'application.decide', name: 'Approve / reject applications', group: 'application' },
  { slug: 'quarter.manage', name: 'Manage quarters', group: 'quarter' },
  { slug: 'allotment.approve', name: 'Approve allotments', group: 'allotment' },
  { slug: 'allotment.possession', name: 'Record possession', group: 'allotment' },
  { slug: 'vacation.clerk_inspection', name: 'Vacation: clerk inspection', group: 'vacation' },
  { slug: 'vacation.electrical', name: 'Vacation: electrical clearance', group: 'vacation' },
  { slug: 'vacation.water', name: 'Vacation: water clearance', group: 'vacation' },
  { slug: 'vacation.accounts', name: 'Vacation: accounts clearance', group: 'vacation' },
  { slug: 'vacation.estate_officer', name: 'Vacation: estate officer clearance', group: 'vacation' },
  { slug: 'reports.view', name: 'View reports', group: 'reports' },
  { slug: 'users.manage', name: 'Manage users', group: 'users' },
  { slug: 'master.manage', name: 'Manage master data', group: 'master' },
  { slug: 'settings.manage', name: 'Manage settings', group: 'settings' },
];

// role slug -> permission slugs. employee ke paas koi special permission nahi.
// super_admin = sab kuch (middleware mein bypass bhi hai, yahan sab permissions link hain taaki /me poora dikhaye).
const matrix = {
  employee: [],
  quarter_clerk: [
    'application.verify',
    'quarter.manage',
    'allotment.approve',
    'allotment.possession',
    'vacation.clerk_inspection',
  ],
  estate_officer: [
    'application.decide',
    'allotment.approve',
    'allotment.possession',
    'vacation.estate_officer',
    'reports.view',
  ],
  electrical_dept: ['vacation.electrical'],
  water_dept: ['vacation.water'],
  accounts_dept: ['vacation.accounts'],
  admin: ['users.manage', 'master.manage', 'settings.manage', 'quarter.manage', 'reports.view'],
  super_admin: permissions.map((p) => p.slug),
};

function idsBySlug(rows) {
  const map = {};
  rows.forEach((row) => {
    map[row.slug] = row.id;
  });
  return map;
}

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert(
      'roles',
      roles.map((r) => ({ ...r, created_at: now, updated_at: now }))
    );
    await queryInterface.bulkInsert(
      'permissions',
      permissions.map((p) => ({ ...p, created_at: now, updated_at: now }))
    );

    const sql = queryInterface.sequelize;
    const roleIds = idsBySlug(await sql.query('SELECT id, slug FROM roles', { type: QueryTypes.SELECT }));
    const permissionIds = idsBySlug(
      await sql.query('SELECT id, slug FROM permissions', { type: QueryTypes.SELECT })
    );

    const links = [];
    Object.keys(matrix).forEach((roleSlug) => {
      matrix[roleSlug].forEach((permissionSlug) => {
        links.push({ role_id: roleIds[roleSlug], permission_id: permissionIds[permissionSlug] });
      });
    });
    await queryInterface.bulkInsert('permission_role', links);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('permission_role', null, {});
    await queryInterface.bulkDelete('permissions', null, {});
    await queryInterface.bulkDelete('roles', null, {});
  },
};
