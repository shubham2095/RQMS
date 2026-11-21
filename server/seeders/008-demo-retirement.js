// Demo: 3 retirement records (retained / expiring / overstaying) + kuch sample notifications, taaki Retirements aur
// Notifications screens khali na dikhein. Sirf development/testing ke liye.
// Records EMP1005-1007 (007 wale demo applicants) ke profiles par bante hain; dates seed ke din se relative hain.
// Status/penalty wahi pure evaluate() se nikalte hain jo daily cycle use karta hai.
const dayjs = require('dayjs');
const { Op, QueryTypes } = require('sequelize');
const retirementService = require('../services/retirementService');
const { retention } = require('../config/rqms');

const SEED_MARK = 'demo-seed'; // notification_logs.response mein, taaki down() inhi ko hataye

// employee_id -> kitne din pehle retire hue
const retirements = [
  { employee_id: 'EMP1006', daysAgo: 60 }, // expiry 60 din aage -> retained
  { employee_id: 'EMP1005', daysAgo: retention.periodDays - 10 }, // expiry 10 din aage -> expiring
  { employee_id: 'EMP1007', daysAgo: retention.periodDays + 30 }, // expiry 30 din pehle nikli -> overstaying
];

module.exports = {
  async up(queryInterface) {
    if (process.env.NODE_ENV === 'production') {
      console.log('Skipping demo retirement data (NODE_ENV=production).');
      return;
    }

    const sql = queryInterface.sequelize;
    const now = new Date();
    const ids = retirements.map((r) => r.employee_id);

    const profiles = await sql.query('SELECT id, employee_id FROM employee_profiles WHERE employee_id IN (:ids)', {
      replacements: { ids },
      type: QueryTypes.SELECT,
    });
    if (profiles.length === 0) {
      console.log('Demo profiles EMP1005-1007 not found — skipping demo retirement data.');
      return;
    }
    const existing = await sql.query(
      'SELECT id FROM retirement_records WHERE employee_profile_id IN (:profileIds)',
      { replacements: { profileIds: profiles.map((p) => p.id) }, type: QueryTypes.SELECT }
    );
    if (existing.length > 0) {
      console.log('Demo retirement records already exist — skipping.');
      return;
    }

    const rows = retirements
      .map((item) => {
        const profile = profiles.find((p) => p.employee_id === item.employee_id);
        if (!profile) return null;
        const retirementDate = dayjs(now).subtract(item.daysAgo, 'day').format('YYYY-MM-DD');
        const record = {
          retirement_date: retirementDate,
          retention_expiry_date: retirementService.expiryFor(retirementDate),
        };
        const result = retirementService.evaluate(record, now);
        return {
          employee_profile_id: profile.id,
          allotment_id: null,
          retirement_date: retirementDate,
          retention_granted: true,
          retention_period_days: retention.periodDays,
          retention_expiry_date: record.retention_expiry_date,
          ...result,
          last_evaluated_at: now,
          created_at: now,
          updated_at: now,
        };
      })
      .filter(Boolean);
    await queryInterface.bulkInsert('retirement_records', rows);

    // Sample notifications: demo employee ko 3, estate officer ko retirement alerts
    const users = await sql.query("SELECT id, email FROM users WHERE email IN ('employee@rqms.test', 'estate.officer@rqms.test')", {
      type: QueryTypes.SELECT,
    });
    const idOf = (email) => (users.find((u) => u.email === email) || {}).id;
    const note = (email, event, title, message, status) => ({
      user_id: idOf(email),
      channel: 'system',
      event,
      title,
      message,
      status,
      response: SEED_MARK,
      sent_at: now,
      created_at: now,
      updated_at: now,
    });
    const notifications = [
      note('employee@rqms.test', 'application.submitted', 'Application submitted', 'Your application has been received. The quarter clerk will verify it.', 'read'),
      note('employee@rqms.test', 'application.approved', 'Application approved', 'Your application has been approved. You will be offered a quarter when one is available for your turn.', 'logged'),
      note('employee@rqms.test', 'allotment.offered', 'Quarter allotted', 'A quarter has been allotted to you. Please accept or decline it under My Allotment.', 'logged'),
      note('estate.officer@rqms.test', 'retirement.expiring', 'Retention expiring', 'Demo Applicant 5 (EMP1005): retention ends in 10 days.', 'logged'),
      note('estate.officer@rqms.test', 'retirement.overstaying', 'Overstaying', 'Demo Applicant 7 (EMP1007) is overstaying by 30 day(s); penalty so far ₹7500.', 'logged'),
    ].filter((n) => n.user_id);
    if (notifications.length > 0) await queryInterface.bulkInsert('notification_logs', notifications);

    console.log('Demo retirement records: EMP1006 (retained), EMP1005 (expiring), EMP1007 (overstaying) + sample notifications.');
  },

  async down(queryInterface) {
    const sql = queryInterface.sequelize;
    await queryInterface.bulkDelete('notification_logs', { response: SEED_MARK });
    await sql.query(
      'DELETE r FROM retirement_records r JOIN employee_profiles p ON p.id = r.employee_profile_id WHERE p.employee_id IN (:ids) AND r.allotment_id IS NULL',
      { replacements: { ids: retirements.map((r) => r.employee_id) } }
    );
  },
};
