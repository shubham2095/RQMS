const { tableOptions, timestampColumns, foreignKey } = require('../utils/migrationHelpers');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'waiting_list_entries',
      {
        id: { type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        quarter_application_id: foreignKey(Sequelize, 'quarter_applications', { unique: true }),
        quarter_type: { type: Sequelize.STRING(10), allowNull: false },
        station: { type: Sequelize.STRING(100), allowNull: false },
        priority_score: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        // "rank" naam mein reserved-word ka dar nahi (Sequelize quote karta hai); raw SQL mein `rank` likhna.
        rank: { type: Sequelize.INTEGER, allowNull: true },
        waiting_since: { type: Sequelize.DATE, allowNull: false },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...timestampColumns(Sequelize),
      },
      tableOptions
    );

    await queryInterface.addIndex('waiting_list_entries', ['quarter_type', 'station', 'is_active'], {
      name: 'waiting_list_type_station_active',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('waiting_list_entries');
  },
};
