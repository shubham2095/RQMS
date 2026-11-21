// documents.hash (sha256) pehle se column hai (Phase 3). Yahan: lookup ke liye index + purani rows ka backfill.
// Backfill sirf wahi rows jinki hash NULL hai AUR file storage folder mein hai; file na mile to chhod do (fatal nahi).
const fs = require('fs');
const path = require('path');
const { QueryTypes } = require('sequelize');
const { uploadsDir } = require('../config/storage');
const { sha256File } = require('../utils/fileHash');

module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex('documents', ['hash'], { name: 'documents_hash' });

    const sql = queryInterface.sequelize;
    const rows = await sql.query('SELECT id, path FROM documents WHERE hash IS NULL', { type: QueryTypes.SELECT });
    let filled = 0;
    for (const row of rows) {
      const file = path.join(uploadsDir, path.basename(row.path));
      if (!fs.existsSync(file)) continue;
      const hash = await sha256File(file);
      await sql.query('UPDATE documents SET hash = ? WHERE id = ?', { replacements: [hash, row.id] });
      filled += 1;
    }
    if (rows.length > 0) console.log(`Document hashes backfilled: ${filled} of ${rows.length}.`);
  },

  // Backfill wapas nahi hota (hash galat nahi hai); sirf index hatao.
  async down(queryInterface) {
    await queryInterface.removeIndex('documents', 'documents_hash');
  },
};
