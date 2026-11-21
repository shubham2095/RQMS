// DATA migration: waiting list ab registration date se rank hoti hai (waiting_since ASC, application id ASC),
// pehle points se hoti thi. Purani stored ranks galat ho gayi hain — har queue ko dobara 1..n rank do.
// Sirf rank badalta hai; kisi application ka status nahi.
const { QueryTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    const sql = queryInterface.sequelize;
    await sql.transaction(async (transaction) => {
      const entries = await sql.query(
        'SELECT id, quarter_type, station, `rank` FROM waiting_list_entries WHERE is_active = 1 ORDER BY quarter_type, station, waiting_since ASC, quarter_application_id ASC',
        { type: QueryTypes.SELECT, transaction }
      );

      const nextRank = {};
      for (const entry of entries) {
        const key = `${entry.quarter_type}|${entry.station}`;
        nextRank[key] = (nextRank[key] || 0) + 1;
        if (entry.rank !== nextRank[key]) {
          await sql.query('UPDATE waiting_list_entries SET `rank` = ? WHERE id = ?', {
            replacements: [nextRank[key], entry.id],
            transaction,
          });
        }
      }
    });
  },

  // Purana (score-based) order wapas banana mumkin nahi — kuch nahi karna.
  async down() {},
};
